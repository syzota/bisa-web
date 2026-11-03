import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BISA | Basis Informasi Sampah',
  description: 'BISA Web — platform manajemen bank sampah dan Smart Camera.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}</body></html>;
}
