import type { EnvIssue } from './types'

/**
 * Error thrown when environment variables validation fails
 */
export class EnvValidationError extends Error {
  name = 'EnvValidationError'
  issues: EnvIssue[]

  constructor(issues: EnvIssue[])
  constructor(message: string, issues?: EnvIssue[])
  constructor(messageOrIssues: string | EnvIssue[], issues?: EnvIssue[]) {
    if (typeof messageOrIssues === 'string') {
      super(messageOrIssues)
      this.issues = issues ?? []
    }
    else {
      super('Environment variables validation failed')
      this.issues = messageOrIssues
    }

    Error.captureStackTrace?.(this, EnvValidationError)
  }
}

/**
 * Error thrown when a required environment variable is missing
 */
export class EnvMissingError extends Error {
  name = 'EnvMissingError'
  variableName: string

  constructor(variableName: string) {
    super(`Missing required environment variable: ${variableName}`)
    this.variableName = variableName

    Error.captureStackTrace?.(this, EnvMissingError)
  }
}
