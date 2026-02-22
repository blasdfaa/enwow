import type { ParsedEnv } from './types'
import { env } from 'std-env'

export interface ParseOptions {
  /**
   * Ignore existing process.env values when resolving interpolations
   * @default false
   */
  ignoreProcessEnv?: boolean

  /**
   * Custom environment source for interpolation
   */
  envSource?: Record<string, string | undefined>
}

/**
 * Parse .env file contents into a key-value object
 *
 * Supports:
 * - Comments (lines starting with #)
 * - Empty lines
 * - Single and double quoted values
 * - Multi-line values with quoted strings
 * - Variable interpolation with $VAR or ${VAR} syntax (not in single quotes)
 *
 * @example
 * ```ts
 * const parser = new EnvParser(`
 *   PORT=3000
 *   HOST=localhost
 *   MESSAGE="Hello World"
 * `)
 * const result = parser.parse()
 * // { PORT: '3000', HOST: 'localhost', MESSAGE: 'Hello World' }
 * ```
 */
export class EnvParser {
  private readonly contents: string
  private readonly options: ParseOptions

  constructor(contents: string, options: ParseOptions = {}) {
    this.contents = contents
    this.options = options
  }

  /**
   * Parse the .env contents and return a key-value object
   */
  parse(): ParsedEnv {
    const result: ParsedEnv = {}
    const lines = this.contents.split(/\r?\n/)
    let currentLine = ''
    let inQuotes: '\'' | '"' | null = null
    let currentKey = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // If we're inside a multi-line quoted string
      if (inQuotes) {
        currentLine += `\n${line}`
        if (line.includes(inQuotes)) {
          // End of quoted value
          const cleanValue = this.extractQuotedValue(currentLine, inQuotes)
          // Don't interpolate single-quoted values
          if (inQuotes === '\'') {
            result[currentKey] = cleanValue
          }
          else {
            result[currentKey] = this.interpolate(cleanValue, result)
          }
          inQuotes = null
          currentLine = ''
          currentKey = ''
        }
        continue
      }

      // Skip empty lines and comments
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
        continue
      }

      // Find the first = sign
      const equalsIndex = trimmed.indexOf('=')
      if (equalsIndex === -1) {
        // Invalid line, skip
        continue
      }

      const key = trimmed.slice(0, equalsIndex).trim()
      let value = trimmed.slice(equalsIndex + 1)

      // Check for quoted values
      const firstChar = value[0]
      if (firstChar === '"' || firstChar === '\'') {
        // Check if the quote is closed on the same line
        const closingQuote = value.lastIndexOf(firstChar)
        if (closingQuote > 0 && closingQuote !== 0) {
          // Quote is closed on the same line
          const cleanValue = this.extractQuotedValue(value, firstChar)
          // Don't interpolate single-quoted values
          if (firstChar === '\'') {
            result[key] = cleanValue
          }
          else {
            result[key] = this.interpolate(cleanValue, result)
          }
        }
        else {
          // Multi-line quoted string
          inQuotes = firstChar
          currentLine = value
          currentKey = key
        }
      }
      else {
        // Unquoted value - remove inline comments
        const commentIndex = value.indexOf(' #')
        if (commentIndex !== -1) {
          value = value.slice(0, commentIndex)
        }
        // Trim trailing whitespace
        value = value.trim()
        result[key] = this.interpolate(value, result)
      }
    }

    return result
  }

  /**
   * Extract value from quoted string, removing the quotes
   */
  private extractQuotedValue(value: string, quote: '\'' | '"'): string {
    // Remove opening quote
    let cleanValue = value.slice(1)
    // Find and remove closing quote
    const closingIndex = cleanValue.lastIndexOf(quote)
    if (closingIndex !== -1) {
      cleanValue = cleanValue.slice(0, closingIndex)
    }
    return cleanValue
  }

  /**
   * Interpolate variables in a value
   * Supports $VAR and ${VAR} syntax
   */
  private interpolate(value: string, parsed: ParsedEnv): string {
    // Get the environment source
    const envSource = this.options.envSource ?? env

    // Replace ${VAR} syntax
    let result = value.replace(/\$\{([^}]+)\}/g, (_, varName: string) => {
      // First check already parsed values, then process.env
      if (parsed[varName] !== undefined) {
        return parsed[varName]
      }
      if (!this.options.ignoreProcessEnv && envSource[varName] !== undefined) {
        return envSource[varName]!
      }
      return ''
    })

    // Replace $VAR syntax (not preceded by $ or {)
    result = result.replace(/(?<!\$)\$([A-Z_]\w*)/gi, (_, varName: string) => {
      // First check already parsed values, then process.env
      if (parsed[varName] !== undefined) {
        return parsed[varName]
      }
      if (!this.options.ignoreProcessEnv && envSource[varName] !== undefined) {
        return envSource[varName]!
      }
      return ''
    })

    return result
  }
}

/**
 * Convenience function to parse .env contents
 */
export function parseEnv(contents: string, options?: ParseOptions): ParsedEnv {
  return new EnvParser(contents, options).parse()
}
