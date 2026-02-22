import { defineSourceAdapter } from './define'

/**
 * Options for the JSON source adapter
 */
export interface JsonAdapterOptions {
  path: string | URL
}

/**
 * Create an adapter that reads from a JSON file
 *
 * Expects the JSON file to contain a flat object with string values:
 * ```json
 * { "PORT": "3000", "HOST": "localhost" }
 * ```
 *
 * @example
 * ```ts
 * import { fromJSON } from 'enwow/adapters'
 *
 * const env = await Env.create(schema, {
 *   sources: [fromJSON({ path: './config/env.json' })],
 * })
 * ```
 */
export const fromJSON = defineSourceAdapter<JsonAdapterOptions>((opts) => {
  return {
    name: 'json',
    async load() {
      const filePath = opts.path instanceof URL ? opts.path.pathname : opts.path
      const contents = await readFileContent(filePath)

      if (contents === null) {
        return {}
      }

      const data = JSON.parse(contents)

      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new TypeError(`[enwow] fromJSON: expected a flat object in "${filePath}", got ${Array.isArray(data) ? 'array' : typeof data}`)
      }

      const result: Record<string, string | undefined> = {}
      for (const [key, value] of Object.entries(data)) {
        result[key] = value == null ? undefined : String(value)
      }
      return result
    },
  }
})

/**
 * Cross-platform file reading helper
 */
async function readFileContent(path: string): Promise<string | null> {
  const { runtime } = await import('std-env')

  if (runtime === 'bun') {
    const file = Bun.file(path)
    const exists = await file.exists()
    if (!exists)
      return null
    return file.text()
  }

  if (runtime === 'deno') {
    try {
      return await Deno.readTextFile(path)
    }
    catch {
      return null
    }
  }

  const { readFile } = await import('node:fs/promises')
  try {
    return await readFile(path, 'utf-8')
  }
  catch {
    return null
  }
}
