import type { Metadata } from 'next';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import { JetBrains_Mono, Sora } from 'next/font/google';
import './globals.css';

// The identity fonts of the new visual direction (GMD-1). The app screens keep Geist until GMD-2.
const sora = Sora({ subsets: ['latin'], weight: ['200', '300', '400'], variable: '--font-sora', display: 'swap' });
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Astrolabio',
  description: 'Demo de integración de IA: carta natal, prompt visible y informe en streaming.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} ${sora.variable} ${jetbrains.variable}`}>
      <head>
        <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" />
      </head>
      <body>{children}</body>
    </html>
  );
}
