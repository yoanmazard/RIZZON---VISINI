import type { Metadata } from 'next';
import { Bricolage_Grotesque, Lato } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-lato',
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
    <html lang="fr">
      <body className={`${bricolage.variable} ${lato.variable} font-sans`}>{children}</body>
    </html>
  );
}
