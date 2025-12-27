import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { FlattenedJWSInput, GetKeyFunction, JWSHeaderParameters, JWTPayload } from "jose"

type JWKGetter = GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput>

@Injectable()
export class GoogleJwtVerifier {
  private readonly audience: string | string[]
  private readonly jwksPromise: Promise<JWKGetter>

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID")
    if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured")
    const audiences = clientId
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean)
    this.audience = audiences.length > 1 ? audiences : audiences[0]!

    this.jwksPromise = import("jose").then(({ createRemoteJWKSet }) =>
      createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs")),
    )
  }

  async verifyIdToken(idToken: string, expectedNonce?: string): Promise<JWTPayload> {
    const { jwtVerify } = await import("jose")
    const jwks = await this.jwksPromise
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: this.audience,
    })

    if (expectedNonce !== undefined) {
      const nonce = (payload as JWTPayload & { nonce?: unknown }).nonce
      if (typeof nonce !== "string" || nonce !== expectedNonce) {
        throw new Error("Invalid nonce")
      }
    }
    return payload as JWTPayload
  }
}
