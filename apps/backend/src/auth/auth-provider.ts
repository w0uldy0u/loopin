export const AUTH_PROVIDERS = ["kakao", "apple", "google"] as const

export type AuthProvider = (typeof AUTH_PROVIDERS)[number]

export function isAuthProvider(value: string): value is AuthProvider {
  return (AUTH_PROVIDERS as readonly string[]).includes(value)
}

export function parseAuthProvider(value: string): AuthProvider {
  if (!isAuthProvider(value)) {
    throw new Error(`Unsupported auth provider: ${value}`)
  }
  return value
}
