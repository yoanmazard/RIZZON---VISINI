import type { Metadata } from 'next';
import { Bricolage_Grotesque } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Projet RIZZON · Gerimalp',
  description: 'Plateforme privée d\'analyse d\'acquisition immobilière',
  icons: {
    icon: '/brand/gerimalp-g-pictogram.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={bricolage.variable}>
      <body className={`${bricolage.className} font-sans antialiased`}>{children}</body>
    </html>
  );
}
