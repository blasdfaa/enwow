/* eslint-disable no-var */

// Minimal Bun global types used in this project
declare var Bun: {
  env: Record<string, string | undefined> & {
    entries: () => IterableIterator<[string, string]>
  }
  file: (path: string) => {
    exists: () => Promise<boolean>
    text: () => Promise<string>
  }
}

// Minimal Deno global types used in this project
declare var Deno: {
  env: {
    get: (key: string) => string | undefined
    toObject: () => Record<string, string>
  }
  readTextFile: (path: string) => Promise<string>
}
