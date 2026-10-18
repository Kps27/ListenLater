import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Listen Later',
  description: 'Enterprise audio queue for your reading list',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
