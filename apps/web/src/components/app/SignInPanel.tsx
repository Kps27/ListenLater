'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authLogin, authPin, authStart, authVerify, api } from '@/lib/api';
import { fetchSite, type SiteConfig } from '@/lib/site';

type Step = 'choose' | 'password' | 'pin' | 'set-password';

function message(code: string | undefined) {
  if (code === 'invalid_email') return 'Use a full email, like you@domain.com.';
  if (code === 'invalid_pin') return 'That code does not match, or it has expired.';
  if (code === 'invalid_password') return 'That password does not match.';
  if (code === 'weak_password') return 'Use at least 8 characters.';
  if (code === 'needs_pin') return 'Email yourself a code first, then choose a password.';
  if (code === 'mail_failed') return 'The code could not be emailed. Check the mail settings in Admin.';
  return 'Sign in did not reach the server.';
}

export function SignInPanel({
  open,
  onClose,
  onSignedIn,
  locked = false,
}: {
  open: boolean;
  onClose: () => void;
  onSignedIn: (email: string) => void;
  locked?: boolean;
}) {
  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [sender, setSender] = useState<'saved' | 'none'>('none');
  const [site, setSite] = useState<SiteConfig['auth']>({ email: true, google: false, apple: false, mail: false });
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep('choose');
    setPassword('');
    setPin('');
    setPreview(null);
    setNote('');
    fetchSite().then((next) => setSite(next.auth)).catch(() => undefined);
  }, [open]);

  if (!open) return null;

  async function sendPin(value: string) {
    const issued = await authPin(value);
    setPreview(issued.preview_pin);
    setSender(issued.sender);
    setPin(issued.preview_pin || '');
    setStep('pin');
  }

  async function continueEmail() {
    const value = email.trim();
    setNote('');
    setBusy(true);
    try {
      const status = await authStart(value);
      setEmail(status.email);
      if (status.has_password) {
        setStep('password');
        return;
      }
      await sendPin(status.email);
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword() {
    setNote('');
    setBusy(true);
    try {
      const session = await authLogin(email, password);
      onSignedIn(session.email);
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  async function submitPin() {
    setNote('');
    setBusy(true);
    try {
      const session = await authVerify(email, pin);
      if (session.needs_password) {
        setPassword('');
        setStep('set-password');
        return;
      }
      onSignedIn(session.email);
    } catch (err) {
      setNote(message((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setNote('');
    setBusy(true);
    try {
      await api.setPassword(password);
      onSignedIn(email);
    } catch (err) {
      const code = (err as { detail?: { error?: string } }).detail?.error || (err as Error).message;
      setNote(message(code));
    } finally {
      setBusy(false);
    }
  }

  function provider(name: 'Google' | 'Apple', ready: boolean) {
    setNote(
      ready
        ? `${name} credentials are saved in Admin. The redirect is not connected yet, so this does not sign you in.`
        : `Add the ${name} credentials in Admin. Sign-in stays on email until then.`
    );
  }

  return (
    <div className={locked ? 'signin-layer signin-locked' : 'signin-layer'}>
      {locked ? null : <button type="button" className="signin-scrim" aria-label="Close sign in" onClick={onClose} />}
      <div className="signin-card" role="dialog" aria-labelledby="signin-title">
        <h2 id="signin-title">Sign in</h2>
        {locked ? (
          <p className="fine">
            Sign in to open your library. <Link href="/">Back to the site</Link>
          </p>
        ) : null}
        {step === 'choose' ? (
          <>
            <p className="fine">Use your email, Google, or Apple.</p>
            <div className="signin-options">
              <button type="button" className="ghost" onClick={() => provider('Google', site.google)}>
                Continue with Google
              </button>
              <button type="button" className="ghost" onClick={() => provider('Apple', site.apple)}>
                Continue with Apple
              </button>
              <p className="signin-or">or email</p>
              <label>
                Email
                <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button type="button" className="primary" disabled={busy} onClick={() => void continueEmail()}>
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </div>
          </>
        ) : null}
        {step === 'password' ? (
          <>
            <p className="fine">{email}</p>
            <div className="signin-options">
              <label>
                Password
                <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <button type="button" className="primary" disabled={busy} onClick={() => void submitPassword()}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={busy}
                onClick={() => {
                  setNote('');
                  setBusy(true);
                  sendPin(email)
                    .catch((err) => setNote(message((err as { code?: string }).code)))
                    .finally(() => setBusy(false));
                }}
              >
                Email me a code
              </button>
            </div>
          </>
        ) : null}
        {step === 'pin' ? (
          <>
            <p className="fine">
              {preview
                ? sender === 'saved'
                  ? 'A mail sender is saved in Admin. Sending is not connected yet, so use this code.'
                  : 'Mail is not connected yet. Use this code, then choose a password.'
                : `We emailed a code to ${email}. It expires in 10 minutes.`}
            </p>
            {preview ? <p className="pin-preview">{preview}</p> : null}
            <div className="signin-options">
              <label>
                Code
                <input className="field" inputMode="numeric" autoComplete="one-time-code" value={pin} onChange={(e) => setPin(e.target.value)} />
              </label>
              <button type="button" className="primary" disabled={busy} onClick={() => void submitPin()}>
                {busy ? 'Checking…' : 'Continue'}
              </button>
            </div>
          </>
        ) : null}
        {step === 'set-password' ? (
          <>
            <p className="fine">Choose a password for {email}. Next time you can use it, or ask for a new code.</p>
            <div className="signin-options">
              <label>
                Password
                <input className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              <button type="button" className="primary" disabled={busy} onClick={() => void savePassword()}>
                {busy ? 'Saving…' : 'Save password'}
              </button>
            </div>
          </>
        ) : null}
        {note ? <p className="form-error">{note}</p> : null}
        {step !== 'choose' ? (
          <button type="button" className="ghost signin-back" onClick={() => { setStep('choose'); setNote(''); }}>
            Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
