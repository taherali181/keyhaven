<div align="center">

# KeyHaven

### A quiet place to read, type, and improve.

KeyHaven is a minimalist typing workspace built around focused reading. Read or type through thousands of public-domain stories and books, practice with quotations, build technique through an adaptive academy, measure speed, or unwind in the arcade—all without turning the screen into a dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16-111512?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-111512?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-111512?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Local first](https://img.shields.io/badge/data-local--first-536b54?style=flat-square)](#local-first-by-default)

</div>

![KeyHaven Read mode](docs/keyhaven-read.png)

## What makes KeyHaven different

Most typing apps place controls, charts, and live metrics at the center of the experience. KeyHaven keeps the prose there instead. Frosted-glass controls float over calm scenery, literary typography sits on page-like surfaces, and everything else—title bar, stats, navigation—can fade into a thin strip so attention stays on the next character.

| Space | Purpose |
| --- | --- |
| **Read** | Open a full short story on arrival, then read or type through stories, public-domain books, EPUBs, and PDFs in one reader. |
| **Quotes** | Type a single quotation at a time, filtered by category, in the same reader layout. |
| **Academy** | Follow an adaptive beginner-to-advanced curriculum shaped by placement and weak-key analysis. |
| **Speed** | Run timed or word-count tests in a stable three-line viewport and compare verified results. |
| **Arcade** | Practice through Alphabet Sprint, Word Rain, Ghost Racer, and a rotating daily challenge. |

## Highlights

### One reader for reading and typing

- Arrives on a story: resumes the one you left unfinished, otherwise picks a random unread story
- **Read / Type** toggle sharing one position—read page by page, or type the same text in paragraph-sized parts
- Title bar with the work, author, and chapter, plus a control box for Library, contents, full screen, mute, and reading settings
- **Auto-hide title bar**: collapses to a small indicator pill with the chapter name beneath it; point at the top edge to bring it back
- **Bottom bar** that combines previous/next, segmented progress (one segment per page in Read, per part in Type), and the stats you choose
- A compact, translucent strip in auto-hide mode that grows on hover without moving the text
- A separate **Random story** button beside the bar, and a turn-pages hint in the corner
- Stable page numbers across a whole book, with even spacing around the text in every layout
- Stable overlay caret that never shifts line wrapping while you type

### Library

Press the Library button or <kbd>Ctrl</kbd> <kbd>K</kbd> to open a large library window:

- **My library** — books you have started or imported, with saved progress
- **Stories** — 320 hand-picked short stories from classic collections, cleaned so every character is typeable
- **Discover** — the 5,000 most-downloaded English books on Project Gutenberg, browsable by category and searchable across the full English catalog
- Book text is fetched on demand through a small server route (`/api/gutenberg/[id]`) that only contacts gutenberg.org and caches responses
- Import EPUB or PDF files directly in the browser, with spine-order and metadata extraction, native PDF text, and English OCR fallback for scanned pages (50 MB and 500-page limits; original files stay on the device)

### Make it yours, per section

Read and Quotes each keep their own typography and bottom bar, while theme, scenery, sound, and other reading preferences apply across the whole site.

- **Appearance** — page tone, scenery (misty mountains, quiet lake, soft forest, twilight peaks, forest sunset, cherry blossoms, mountain valley, alpine lake, or a quiet atmosphere), readability veil, and optional background motion
- **Typography** — typeface, size, weight, line spacing, letter spacing, margins, and caret style
- **Ambience** — rain, forest, river, fireplace, café, or alpha waves, plus switch sounds and a one-click mute
- **Bottom bar** — choose up to six stats (time left in chapter or book, page in book, WPM, accuracy, raw WPM, elapsed time, clock, and more), labels, and how faint the compact strip should be

### Designed to stay light

- Glass surfaces (sidebar, settings, library window, title and bottom bars) use a shared set of design tokens and blur only where content sits behind them
- The ambient light is static gradients; animated motes and drifting scenery are opt-in
- Custom tooltips across the site show keyboard shortcuts as key chips, appear on hover or keyboard focus, and stay out of the way on touch screens

### Practice that grows with you

The Academy includes a placement assessment, adaptive daily plan, weak-key drills, mastery tracking, practice goals, and a twelve-stage course spanning fundamentals through endurance.

### Tests that behave like tests

Speed mode supports 15, 30, 60, and 120-second sessions or 10, 25, 50, and 100-word sessions. Punctuation and numbers are optional. The active line stays centered inside an exact three-line viewport, timers end once at their real deadline, and results include WPM, raw WPM, accuracy, consistency, and error data.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| <kbd>Ctrl</kbd> <kbd>K</kbd> | Open or close the Library |
| <kbd>Ctrl</kbd> <kbd>\\</kbd> | Hide or show the sidebar |
| <kbd>←</kbd> <kbd>→</kbd> / <kbd>Space</kbd> / <kbd>Home</kbd> <kbd>End</kbd> | Turn pages, or jump to the first or last page, in Read mode |
| <kbd>Esc</kbd> | Restart the current part while typing; close windows |

## Local-first by default

KeyHaven works without an account or server database. Settings, reading progress, imported text, Academy state, typing history, and arcade scores are stored in IndexedDB through Dexie.

Cloud mode is optional. When configured, signed-in users can sync their normalized library text and progress across devices, maintain a public handle, and participate in leaderboards. Email/password and Google sign-in are supported; password-reset email is delivered through Resend.

## Getting started

### Requirements

- Node.js 20.9 or newer
- npm
- A modern browser with IndexedDB support

### Run locally

```bash
git clone https://github.com/taherali181/keyhaven.git
cd keyhaven
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables are required for guest, local-first use. Opening Discover books needs internet access so the server can fetch text from Project Gutenberg; bundled stories work offline.

### Useful commands

```bash
npm run dev                 # Start the development server
npm run typecheck           # Check TypeScript
npm run lint                # Run ESLint
npm test                    # Run the Vitest suite
npm run test:e2e            # Run Playwright browser tests
npm run build -- --webpack  # Create the verified production build
npm start                   # Serve the production build
```

Playwright is configured to use Google Chrome at `/usr/bin/google-chrome`. Change `launchOptions.executablePath` in `playwright.config.ts` if Chrome is installed elsewhere.

### Rebuilding the catalog

The story and book catalogs in `public/catalog/` are generated and checked in. To rebuild them:

```bash
node scripts/catalog/build-stories.mjs                        # Stories from scripts/catalog/story-sources.json
node scripts/catalog/build-books.mjs path/to/rdf-files.tar.bz2  # Discover catalog from Gutenberg's offline catalogs
```

Downloads are cached in `node_modules/.cache/keyhaven-catalog` (override with `CATALOG_CACHE`) so Project Gutenberg is only contacted once per file.

## Optional accounts and cloud sync

Copy the example environment file:

```bash
cp .env.example .env.local
```

Then configure the values you need:

| Variable | Required for | Description |
| --- | --- | --- |
| `DATABASE_URL` | Accounts and sync | PostgreSQL connection string; Neon is the current serverless driver. |
| `NEXT_PUBLIC_KEYHAVEN_CLOUD` | Accounts and sync | Set to `true` to enable client-side cloud synchronization. |
| `AUTH_SECRET` | Authentication | A strong random secret used by Auth.js. |
| `AUTH_GOOGLE_ID` | Google sign-in | Google OAuth client ID. |
| `AUTH_GOOGLE_SECRET` | Google sign-in | Google OAuth client secret. |
| `AUTH_RESEND_KEY` | Password recovery | Resend API key used to send reset links. |
| `AUTH_EMAIL_FROM` | Password recovery | Verified sender identity for reset emails. |

Apply the checked-in Drizzle migrations before starting a cloud-enabled deployment:

```bash
npm run db:migrate
npm run dev
```

Google OAuth and Resend are optional. Email/password registration and database-backed synchronization require `DATABASE_URL`; password-reset delivery additionally requires Resend.

## Project structure

```text
keyhaven/
├── drizzle/                    # Versioned PostgreSQL migrations
├── public/
│   ├── backgrounds/            # Reader scenery
│   ├── brand/                  # Logo, icons, and preview images
│   └── catalog/                # Generated story and book catalogs
├── scripts/catalog/            # Catalog build scripts for Project Gutenberg
├── src/
│   ├── app/                    # Next.js routes, auth pages, and API handlers (incl. Gutenberg proxy)
│   ├── components/
│   │   ├── reader/             # Unified reader, quotes, title and bottom bars, reading settings
│   │   ├── library/            # Library window: my library, stories, discover, imports
│   │   ├── learn/              # Adaptive Academy
│   │   ├── speed-test/         # Timed and word-count tests
│   │   ├── arcade/             # Typing games and daily challenge
│   │   ├── analytics/          # Progress and leaderboards
│   │   ├── typing/             # Shared typing surface, caret, and results
│   │   └── ui/                 # Shared controls, brand, and tooltips
│   ├── hooks/                  # Typing engine, settings, sound, and sync
│   ├── lib/                    # Browser storage, metrics, parsing, reader stats, and styles
│   └── server/                 # Drizzle schema, challenges, and rate limits
└── tests/                      # Unit, integration, and browser acceptance tests
```

## Technology

- **Application:** Next.js 16 App Router, React 19, TypeScript
- **Interface:** Tailwind CSS 4, custom CSS, Framer Motion, Lucide
- **Local data:** Dexie and IndexedDB
- **Cloud data:** PostgreSQL, Neon serverless driver, Drizzle ORM
- **Authentication:** Auth.js, Google OAuth, bcrypt credentials
- **Content:** Project Gutenberg catalogs and texts, JSZip, PDF.js, Tesseract.js
- **Quality:** Vitest, Testing Library, Playwright, ESLint

## Quality and accessibility

The automated suite covers typing-engine completion semantics, strict mode, absolute timer deadlines, challenge validation, document importing, Gutenberg parsing, story chunking and catalog integrity, reader stats, per-section settings, reader layout spacing, responsive overflow, reader contrast, stable line layout, speed-test viewport behavior, and core navigation flows.

The interface also includes visible keyboard focus, tooltips on keyboard focus, reduced-motion support, semantic labels, keyboard-first typing input, responsive mobile navigation, and a distraction-free Zen mode.

## Data and privacy notes

- Guest data stays in the browser unless cloud mode is enabled and the user signs in.
- Imported EPUB and PDF binaries are not uploaded by the application.
- Discover books are fetched from Project Gutenberg through the app's server route; no user data is sent with those requests.
- Cloud sync stores extracted plain-text sections when enabled.
- OCR runs in the browser and may download Tesseract language assets when first needed.
- Leaderboard visibility is controlled through the user profile.

## Credits

Stories and books come from [Project Gutenberg](https://www.gutenberg.org/) and are in the public domain in the United States. Please check the copyright laws of your country before redistributing them.

## Current status

KeyHaven is under active development. The local-first experience is ready to run immediately. Account creation, cloud synchronization, Google OAuth, password email, and hosted leaderboards require the external services described above.

---

<div align="center">
  Built for deliberate practice and quieter screens.
</div>
