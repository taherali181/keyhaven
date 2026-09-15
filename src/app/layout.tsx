import type { Metadata } from 'next';
import {
  Atkinson_Hyperlegible_Next, Cormorant_Garamond, EB_Garamond, Geist, Geist_Mono, IBM_Plex_Sans, Inter,
  JetBrains_Mono, Literata, Lora, Merriweather, Source_Serif_4
} from 'next/font/google';
import './globals.css';
import { RECIPE_TONES, toneVariables } from '@/lib/reader-style';

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

const builtInThemeStyles = Object.fromEntries(Object.entries(RECIPE_TONES).map(([id, recipe]) => [
  id,
  id === 'night' || id === 'paper' ? {} : toneVariables(recipe)
]));

// Runs while HTML is parsed so persisted themes—including custom ones—never flash as Night before hydration.
const themeBootstrap = `(()=>{const r=document.documentElement,b=${JSON.stringify(builtInThemeStyles)},ids=new Set(Object.keys(b));try{const s=JSON.parse(localStorage.getItem('keyhaven_settings_v1')||'{}'),c=Array.isArray(s.customTones)?s.customTones:[],ok=v=>ids.has(v)||(typeof v==='string'&&v.startsWith('custom:')&&c.some(t=>'custom:'+t.id===v));let v=s.readerPaper!==undefined?(s.readerPaper!=='system'&&ok(s.readerPaper)?s.readerPaper:'night'):(ok(s.theme)?s.theme:'night'),custom=typeof v==='string'&&v.startsWith('custom:')?c.find(t=>'custom:'+t.id===v):null,vars=b[v]||{};if(custom){const bg=custom.background,text=custom.text,accent=custom.accent,ch=h=>{h=String(h).replace('#','');if(h.length===3)h=h.split('').map(x=>x+x).join('');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)||0)},lum=h=>ch(h).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4}).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0),light=lum(bg)>.35,m=(a,w,z)=>'color-mix(in srgb, '+a+' '+w+'%, '+z+')';vars={'--bg-primary':bg,'--bg-secondary':light?m(bg,94,text):m(bg,80,'#000'),'--bg-card':light?m(bg,70,'#fff'):m(bg,94,text),'--text-primary':text,'--text-secondary':m(text,70,bg),'--text-muted':m(text,light?62:56,bg),'--color-accent':accent,'--color-accent-secondary':m(accent,62,bg),'--color-caret':light?accent:m(accent,55,text),'--color-correct':m(text,light?52:72,bg),'--color-incorrect':light?'#a44f45':'#d98578','--color-extra':light?'#7d332f':'#9e5048','--color-border':m(text,12,bg),'--color-highlight':m(text,7,bg),'--glass-fill':'color-mix(in srgb, '+(light?m(bg,70,'#fff'):bg)+' 55%, transparent)','--glass-fill-strong':'color-mix(in srgb, '+(light?m(bg,60,'#fff'):m(bg,80,'#000'))+' 80%, transparent)','--glass-fill-panel':'color-mix(in srgb, '+(light?m(bg,58,'#fff'):m(bg,78,'#000'))+' 64%, transparent)','--glass-border':'color-mix(in srgb, '+text+' '+(light?10:9)+'%, transparent)','--glass-highlight':light?'rgb(255 255 255 / .7)':'rgb(255 255 255 / .06)','--glow-accent':'color-mix(in srgb, '+accent+' '+(light?22:30)+'%, transparent)','--elev-1':light?'0 1px 2px rgb(39 48 40 / .06), 0 6px 18px -8px rgb(39 48 40 / .12)':'0 1px 2px rgb(0 0 0 / .2), 0 6px 18px -8px rgb(0 0 0 / .35)','--elev-2':light?'0 2px 6px rgb(39 48 40 / .05), 0 18px 40px -14px rgb(39 48 40 / .18)':'0 2px 6px rgb(0 0 0 / .18), 0 18px 40px -14px rgb(0 0 0 / .5)','--elev-3':light?'0 6px 14px rgb(39 48 40 / .06), 0 36px 80px -20px rgb(39 48 40 / .26)':'0 6px 14px rgb(0 0 0 / .2), 0 36px 80px -20px rgb(0 0 0 / .65)','--ambient-opacity':light?.28:.34,colorScheme:light?'light':'dark'};r.dataset.theme='custom';r.dataset.themeScheme=light?'light':'dark'}else{r.dataset.theme=v;r.dataset.themeScheme=v==='paper'||vars.colorScheme==='light'?'light':'dark'}Object.entries(vars).forEach(([k,x])=>k==='colorScheme'?r.style.colorScheme=x:r.style.setProperty(k,x))}catch(e){r.dataset.theme='night';r.dataset.themeScheme='dark'}try{r.dataset.sidebar=localStorage.getItem('keyhaven_sidebar_v2')==='pinned'?'open':'hidden'}catch(e){r.dataset.sidebar='hidden'}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="night" data-theme-scheme="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body className={fontVariables}>{children}</body>
    </html>
  );
}
