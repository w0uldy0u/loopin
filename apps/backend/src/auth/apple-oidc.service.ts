import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { JWTPayload } from "jose"
import { AppleJwtVerifier } from "./apple-jwt.verifier"

type AppleTokenResponse = {
  access_token?: string
  expires_in?: number
  id_token?: string
  refresh_token?: string
  token_type?: string
  error?: string
}

@Injectable()
export class AppleOidcService {
  private readonly clientId: string
  private readonly teamId: string
  private readonly keyId: string
  private readonly privateKey: string

  constructor(
    private readonly config: ConfigService,
    private readonly verifier: AppleJwtVerifier,
  ) {
    const clientId = this.config.get<string>("APPLE_CLIENT_ID")
    const teamId = this.config.get<string>("APPLE_TEAM_ID")
    const keyId = this.config.get<string>("APPLE_KEY_ID")
    const privateKey = this.config.get<string>("APPLE_PRIVATE_KEY")

    if (!clientId) throw new Error("APPLE_CLIENT_ID is not configured")
    if (!teamId) throw new Error("APPLE_TEAM_ID is not configured")
    if (!keyId) throw new Error("APPLE_KEY_ID is not configured")
    if (!privateKey) throw new Error("APPLE_PRIVATE_KEY is not configured")

    this.clientId = clientId
    this.teamId = teamId
    this.keyId = keyId
    this.privateKey = privateKey
  }

  private async createClientSecret() {
    const { SignJWT, importPKCS8 } = await import("jose")
    const now = Math.floor(Date.now() / 1000)

    const pem = this.privateKey.includes("\\n")
      ? this.privateKey.replace(/\\n/g, "\n")
      : this.privateKey

    const key = await importPKCS8(pem, "ES256")

    // Apple: exp can be up to 6 months. Use short TTL for safety.
    const exp = now + 60 * 5

    return new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: this.keyId })
      .setIssuer(this.teamId)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setAudience("https://appleid.apple.com")
      .setSubject(this.clientId)
      .sign(key)
  }

  async exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }) {
    const tokenEndpoint = "https://appleid.apple.com/auth/token"
    const clientSecret = await this.createClientSecret()

    const body = new URLSearchParams()
    body.set("grant_type", "authorization_code")
    body.set("client_id", this.clientId)
    body.set("client_secret", clientSecret)
    body.set("redirect_uri", input.redirectUri)
    body.set("code", input.code)
    body.set("code_verifier", input.codeVerifier)

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    const json = (await res.json().catch(() => ({}))) as AppleTokenResponse
    if (!res.ok) {
      const msg = json.error ?? `Token exchange failed (${res.status})`
      throw new Error(msg)
    }
    if (!json.id_token) throw new Error("Apple did not return id_token")
    return json
  }

  async verifyIdToken(idToken: string, expectedNonce?: string): Promise<JWTPayload> {
    return this.verifier.verifyIdToken(idToken, expectedNonce)
  }
}
