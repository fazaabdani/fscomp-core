import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'CORE FS COMP' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang='id'><body>{children}</body></html>);
}