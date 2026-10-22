import nodemailer from 'nodemailer';

export async function sendLoginCode({ host, port, user, password, from, to, pin }) {
  const number = Number(port) || 587;
  const transport = nodemailer.createTransport({
    host,
    port: number,
    secure: number === 465,
    auth: { user, pass: password },
  });
  await transport.sendMail({
    from,
    to,
    subject: 'Your Listen Later sign-in code',
    text: `Your Listen Later sign-in code is ${pin}.\n\nIt expires in 10 minutes. If you did not try to sign in, you can ignore this email.`,
  });
}
