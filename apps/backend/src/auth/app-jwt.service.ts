import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import type { AuthProvider } from "./auth-provider"

type AccessTokenPayload = {
  uid: string | null
  provider: AuthProvider
  sub: string
}

@Injectable()
export class AppJwtService {
  private readonly issuer: string
  private readonly audience: string
  private readonly accessTokenTtlSeconds: number
  private readonly secret: Uint8Array

  constructor(private readonly config: ConfigService) {
    const rawSecret = this.config.get<string>("APP_JWT_SECRET")
    if (!rawSecret) throw new Error("APP_JWT_SECRET is not configured")

    this.issuer = this.config.get<string>("APP_JWT_ISSUER") ?? "loopin"
    this.audience = this.config.get<string>("APP_JWT_AUDIENCE") ?? "loopin-api"
    this.accessTokenTtlSeconds = Number(
      this.config.get<string>("APP_JWT_ACCESS_TOKEN_TTL_SECONDS") ?? "3600",
    )

    if (!Number.isFinite(this.accessTokenTtlSeconds) || this.accessTokenTtlSeconds <= 0) {
      throw new Error("APP_JWT_ACCESS_TOKEN_TTL_SECONDS must be a positive number")
    }

    this.secret = new TextEncoder().encode(rawSecret)
  }

  async signAccessToken(input: { userId: string | null; provider: AuthProvider; sub: string }) {
    const { SignJWT } = await import("jose")
    const now = Math.floor(Date.now() / 1000)

    return new SignJWT({ uid: input.userId, provider: input.provider } satisfies Omit<
      AccessTokenPayload,
      "sub"
    >)
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt(now)
      .setIssuer(this.issuer)
      .setAudience(this.audience)
      .setSubject(`${input.provider}:${input.sub}`)
      .setExpirationTime(now + this.accessTokenTtlSeconds)
      .sign(this.secret)
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { jwtVerify } = await import("jose")
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: this.issuer,
      audience: this.audience,
    })

    const subject = typeof payload.sub === "string" ? payload.sub : undefined
    if (!subject) throw new Error("Invalid token subject")

    const idx = subject.indexOf(":")
    if (idx <= 0) throw new Error("Invalid token subject")

    const provider = subject.slice(0, idx) as AccessTokenPayload["provider"]
    const sub = subject.slice(idx + 1)

    if (provider !== "kakao" && provider !== "apple" && provider !== "google") {
      throw new Error("Invalid token provider")
    }
    if (!sub) throw new Error("Invalid token sub")

    const uid = (payload as unknown as { uid?: unknown }).uid
    if (uid !== null && typeof uid !== "string") throw new Error("Invalid token uid")

    const providerClaim = (payload as unknown as { provider?: unknown }).provider
    if (providerClaim !== undefined && providerClaim !== provider) {
      throw new Error("Invalid token provider")
    }

    return { uid: uid ?? null, provider, sub }
  }
}
