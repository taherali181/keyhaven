/** Lets surfaces other than the floating trigger (e.g. the Stories bar) open the reading settings sheet. */
export const OPEN_READER_SETTINGS_EVENT = 'keyhaven:open-reader-settings';

export function openReaderSettings() {
  window.dispatchEvent(new Event(OPEN_READER_SETTINGS_EVENT));
}

export const OPEN_LIBRARY_EVENT = 'keyhaven:open-library';
export type LibraryTab = 'mine' | 'stories' | 'discover';
export interface OpenLibraryDetail { tab?: LibraryTab; focusSearch?: boolean; bookId?: number; category?: string }
/** Opens the Library window, optionally on a tab and with its search focused. */
export function openLibrary(tab?: LibraryTab, focusSearch = false) {
  window.dispatchEvent(new CustomEvent<OpenLibraryDetail>(OPEN_LIBRARY_EVENT, { detail: { tab, focusSearch } }));
}
/** Opens the Library on a book's details, or on a Discover category. */
export function openLibraryAt(detail: { bookId?: number; category?: string }) {
  window.dispatchEvent(new CustomEvent<OpenLibraryDetail>(OPEN_LIBRARY_EVENT, { detail: { tab: 'discover', ...detail } }));
}

/** Asks the app to switch to a section (e.g. the reader's "Original pages" going to PDFs). */
export const OPEN_SECTION_EVENT = 'keyhaven:open-section';
export function openSection(mode: import('@/types').TypingMode) {
  window.dispatchEvent(new CustomEvent(OPEN_SECTION_EVENT, { detail: { mode } }));
}

export const OPEN_WORK_EVENT = 'keyhaven:open-work';
/** Opens a story, book or import in the reader, optionally switching between reading and typing. From outside the reader, the app switches to Read first. */
export function openWork(key: string, mode?: 'read' | 'type') {
  window.dispatchEvent(new CustomEvent(OPEN_WORK_EVENT, { detail: { key, mode } }));
}
