import type { Metadata } from 'next';
import { Cormorant_Garamond, Geist, Geist_Mono, Literata } from 'next/font/google';
import './globals.css';

const wordmark = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-wordmark' });
const literary = Literata({ subsets: ['latin'], variable: '--font-literary' });
const interfaceFont = Geist({ subsets: ['latin'], variable: '--font-interface' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'KeyHaven — Read deeply. Type beautifully.',
  description: 'A considered place for literary typing, focused practice, and thoughtful competition.'
};

const themeBootstrap = `try{const value=JSON.parse(localStorage.getItem('keyhaven_settings_v1')||'{}').theme;document.documentElement.dataset.theme=(value==='daylight'||value==='zen-sand'||value==='paper-ink')?'daylight':'reading-room'}catch(e){document.documentElement.dataset.theme='reading-room'}try{document.documentElement.dataset.sidebar=localStorage.getItem('keyhaven_sidebar_v1')==='hidden'?'hidden':'open'}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="reading-room" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className={`${wordmark.variable} ${literary.variable} ${interfaceFont.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
