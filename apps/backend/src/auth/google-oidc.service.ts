import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { JWTPayload } from "jose"
import { GoogleJwtVerifier } from "./google-jwt.verifier"

type GoogleTokenResponse = {
  access_token?: string
  expires_in?: number
  refresh_token?: string
  scope?: string
  token_type?: string
  id_token?: string
  error?: string
  error_description?: string
}

@Injectable()
export class GoogleOidcService {
  private readonly clientId: string
  private readonly clientSecret?: string

  constructor(
    private readonly config: ConfigService,
    private readonly verifier: GoogleJwtVerifier,
  ) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID")
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured")
    this.clientId = clientId
    this.clientSecret = this.config.get<string>("GOOGLE_CLIENT_SECRET") ?? undefined
  }

  async exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }) {
    const tokenEndpoint = "https://oauth2.googleapis.com/token"

    const body = new URLSearchParams()
    body.set("grant_type", "authorization_code")
    body.set("client_id", this.clientId)
    if (this.clientSecret) body.set("client_secret", this.clientSecret)
    body.set("redirect_uri", input.redirectUri)
    body.set("code", input.code)
    body.set("code_verifier", input.codeVerifier)

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse
    if (!res.ok) {
      const msg = json.error_description ?? json.error ?? `Token exchange failed (${res.status})`
      throw new Error(msg)
    }
    if (!json.id_token) throw new Error("Google did not return id_token")
    return json
  }

  async verifyIdToken(idToken: string, expectedNonce?: string): Promise<JWTPayload> {
    return this.verifier.verifyIdToken(idToken, expectedNonce)
  }
}
