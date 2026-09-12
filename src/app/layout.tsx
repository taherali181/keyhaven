import type { Metadata } from 'next';
import { JetBrains_Mono, Manrope, Newsreader } from 'next/font/google';
import './globals.css';

const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-literary' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-interface' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'KeyHaven — Read deeply. Type beautifully.',
  description: 'A considered place for literary typing, focused practice, and thoughtful competition.'
};

const themeBootstrap = `try{const value=JSON.parse(localStorage.getItem('keyhaven_settings_v1')||'{}').theme;document.documentElement.dataset.theme=(value==='daylight'||value==='zen-sand'||value==='paper-ink')?'daylight':'reading-room'}catch(e){document.documentElement.dataset.theme='reading-room'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="reading-room" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className={`${newsreader.variable} ${manrope.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
