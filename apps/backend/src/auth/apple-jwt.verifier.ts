import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { FlattenedJWSInput, GetKeyFunction, JWSHeaderParameters, JWTPayload } from "jose"

type JWKGetter = GetKeyFunction<JWSHeaderParameters, FlattenedJWSInput>

@Injectable()
export class AppleJwtVerifier {
  private readonly issuer = "https://appleid.apple.com"
  private readonly audience: string | string[]
  private readonly jwksPromise: Promise<JWKGetter>

  constructor(private readonly config: ConfigService) {
    const clientId = this.config.get<string>("APPLE_CLIENT_ID")
    if (!clientId) throw new Error("APPLE_CLIENT_ID is not configured")
    const audiences = clientId
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean)
    this.audience = audiences.length > 1 ? audiences : audiences[0]!

    this.jwksPromise = import("jose").then(({ createRemoteJWKSet }) =>
      createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys")),
    )
  }

  async verifyIdToken(idToken: string, expectedNonce?: string): Promise<JWTPayload> {
    const { jwtVerify } = await import("jose")
    const jwks = await this.jwksPromise
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: this.issuer,
      audience: this.audience,
    })

    if (expectedNonce !== undefined) {
      const nonce = (payload as JWTPayload & { nonce?: unknown }).nonce
      if (typeof nonce !== "string") throw new Error("Invalid nonce")

      // Apple Sign In: nonce claim is commonly the base64url(SHA256(originalNonce)).
      // Allow both raw and hashed forms for compatibility.
      const { createHash } = await import("crypto")
      const hashed = createHash("sha256").update(expectedNonce).digest()
      const expectedHashed = Buffer.from(hashed).toString("base64url")

      if (nonce !== expectedNonce && nonce !== expectedHashed) throw new Error("Invalid nonce")
    }
    return payload as JWTPayload
  }
}
