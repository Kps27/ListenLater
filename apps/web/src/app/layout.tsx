import type { Metadata } from 'next';
import { Fraunces, Outfit } from 'next/font/google';
import './globals.css';

const serif = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Listen Later',
  description: 'A personal podcast of the things you meant to read',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
