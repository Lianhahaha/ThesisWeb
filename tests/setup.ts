/**
 * Node 22 defines a global `localStorage` that is undefined unless the process
 * was started with --localstorage-file, and Vitest's jsdom environment does
 * not replace it. Give the component tests a real in-memory storage so the
 * browser code under test sees the same API it sees in a browser.
 */

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key: string) => items.get(key) ?? null,
    key: (index: number) => [...items.keys()][index] ?? null,
    removeItem: (key: string) => void items.delete(key),
    setItem: (key: string, value: string) => void items.set(key, String(value)),
  };
}

if (typeof window !== "undefined") {
  for (const name of ["localStorage", "sessionStorage"] as const) {
    const storage = window[name] ?? memoryStorage();
    Object.defineProperty(window, name, { value: storage, configurable: true });
    Object.defineProperty(globalThis, name, { value: storage, configurable: true });
  }
}
