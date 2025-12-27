import type { Request } from "express"
import type { AuthProvider } from "./auth-provider"

export interface AuthenticatedRequest extends Request {
  user: {
    id: string | null
    provider: AuthProvider
    sub: string
  }
}
