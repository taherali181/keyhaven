/** Lets surfaces other than the floating trigger (e.g. the Stories bar) open the reading settings sheet. */
export const OPEN_READER_SETTINGS_EVENT = 'keyhaven:open-reader-settings';

export function openReaderSettings() {
  window.dispatchEvent(new Event(OPEN_READER_SETTINGS_EVENT));
}

export const OPEN_LIBRARY_EVENT = 'keyhaven:open-library';
export type LibraryTab = 'mine' | 'stories' | 'discover';
/** Opens the Library window, optionally on a tab and with its search focused. */
export function openLibrary(tab?: LibraryTab, focusSearch = false) {
  window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT, { detail: { tab, focusSearch } }));
}

export const OPEN_WORK_EVENT = 'keyhaven:open-work';
/** Opens a story, book or import in the reader, optionally switching between reading and typing. */
export function openWork(key: string, mode?: 'read' | 'type') {
  window.dispatchEvent(new CustomEvent(OPEN_WORK_EVENT, { detail: { key, mode } }));
}
