import type { Metadata } from 'next';
import {
  Atkinson_Hyperlegible_Next, Cormorant_Garamond, EB_Garamond, Geist, Geist_Mono, IBM_Plex_Sans, Inter,
  JetBrains_Mono, Literata, Lora, Merriweather, Source_Serif_4
} from 'next/font/google';
import './globals.css';

const wordmark = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-wordmark' });
const literary = Literata({ subsets: ['latin'], variable: '--font-literary' });
const interfaceFont = Geist({ subsets: ['latin'], variable: '--font-interface' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });

// Optional reading typefaces: not preloaded, so they only download when someone picks one.
// next/font reads these options at build time, so each call needs a literal object (no shared spread).
const sourceSerif = Source_Serif_4({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-source-serif' });
const garamond = EB_Garamond({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-garamond' });
const lora = Lora({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-lora' });
const merriweather = Merriweather({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-merriweather' });
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-inter' });
const plex = IBM_Plex_Sans({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-plex' });
const atkinson = Atkinson_Hyperlegible_Next({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-atkinson' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], display: 'swap', preload: false, variable: '--font-jetbrains' });

const fontVariables = [wordmark, literary, interfaceFont, mono, sourceSerif, garamond, lora, merriweather, inter, plex, atkinson, jetbrains].map(font => font.variable).join(' ');

export const metadata: Metadata = {
  applicationName: 'KeyHaven',
  title: 'KeyHaven — Read deeply. Type naturally.',
  description: 'Read deeply. Type naturally. A considered place for literary typing, focused practice, and thoughtful competition.',
  icons: { icon: { url: '/brand/logo-icon.svg', type: 'image/svg+xml' } }
};

const themeBootstrap = `try{const value=JSON.parse(localStorage.getItem('keyhaven_settings_v1')||'{}').theme;document.documentElement.dataset.theme=(value==='daylight'||value==='zen-sand'||value==='paper-ink')?'daylight':'reading-room'}catch(e){document.documentElement.dataset.theme='reading-room'}try{document.documentElement.dataset.sidebar=localStorage.getItem('keyhaven_sidebar_v2')==='pinned'?'open':'hidden'}catch(e){document.documentElement.dataset.sidebar='hidden'}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="reading-room" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className={fontVariables}>{children}</body>
    </html>
  );
}
