import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { KakaoJwtVerifier } from "./kakao-jwt.verifier"
import type { JWTPayload } from "jose"

type KakaoTokenResponse = {
  token_type?: string
  access_token?: string
  expires_in?: number
  refresh_token?: string
  refresh_token_expires_in?: number
  scope?: string
  id_token?: string
  error?: string
  error_description?: string
}

@Injectable()
export class KakaoOidcService {
  private readonly issuer: string
  private readonly clientId: string
  private readonly clientSecret?: string

  constructor(
    private readonly config: ConfigService,
    private readonly verifier: KakaoJwtVerifier,
  ) {
    this.issuer = this.config.get<string>("KAKAO_ISSUER") ?? "https://kauth.kakao.com"
    const clientId = this.config.get<string>("KAKAO_CLIENT_ID")
    if (!clientId) throw new Error("KAKAO_CLIENT_ID is not configured")
    this.clientId = clientId
    this.clientSecret = this.config.get<string>("KAKAO_CLIENT_SECRET") ?? undefined
  }

  /**
   * Authorization Code + PKCE 교환.
   * client가 code_verifier를 생성/보관하고, backend는 교환만 수행하는 BFF 스타일.
   */
  async exchangeCode(input: { code: string; redirectUri: string; codeVerifier: string }) {
    const tokenEndpoint = new URL("/oauth/token", this.issuer).toString()

    const body = new URLSearchParams()
    body.set("grant_type", "authorization_code")
    body.set("client_id", this.clientId)
    body.set("redirect_uri", input.redirectUri)
    body.set("code", input.code)
    body.set("code_verifier", input.codeVerifier)
    if (this.clientSecret) body.set("client_secret", this.clientSecret)

    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    const json = (await res.json().catch(() => ({}))) as KakaoTokenResponse
    if (!res.ok) {
      const msg = json.error_description ?? json.error ?? `Token exchange failed (${res.status})`
      throw new Error(msg)
    }
    if (!json.id_token) throw new Error("Kakao did not return id_token")

    return json
  }

  async verifyIdToken(idToken: string, expectedNonce?: string): Promise<JWTPayload> {
    return this.verifier.verifyIdTokenWithNonce(idToken, expectedNonce)
  }
}
