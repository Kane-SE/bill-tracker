// Minimal localStorage shim so zustand's persist middleware works silently in the node test env.
class MemoryStorage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v))
  }
  removeItem(k: string) {
    this.store.delete(k)
  }
  key(i: number) {
    return [...this.store.keys()][i] ?? null
  }
}

const mem = new MemoryStorage()

// Define globalThis.localStorage if absent
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: mem, configurable: true })
}

// zustand persist default storage reads window.localStorage; ensure it points to the same instance
const g = globalThis as any
if (typeof g.window === 'undefined') g.window = {}
if (!g.window.localStorage) g.window.localStorage = g.localStorage ?? mem
