import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { PrismaService } from "@app/prisma/prisma.service"
import { createHash, randomBytes } from "node:crypto"

@Injectable()
export class RefreshTokenService {
  private readonly refreshTokenTtlSeconds: number

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.refreshTokenTtlSeconds = Number(
      this.config.get<string>("APP_JWT_REFRESH_TOKEN_TTL_SECONDS") ?? "2592000", // 30d
    )

    if (!Number.isFinite(this.refreshTokenTtlSeconds) || this.refreshTokenTtlSeconds <= 0) {
      throw new Error("APP_JWT_REFRESH_TOKEN_TTL_SECONDS must be a positive number")
    }
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token, "utf8").digest("hex")
  }

  private mintOpaqueToken() {
    // 32 bytes -> 43 chars base64url (no padding)
    return randomBytes(32).toString("base64url")
  }

  async issueForAuthAccount(authAccountId: string) {
    const token = this.mintOpaqueToken()
    const tokenHash = this.hashToken(token)

    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.refreshTokenTtlSeconds * 1000)

    await (this.prisma as any).refreshToken.create({
      data: {
        authAccountId,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    })

    return { refreshToken: token, expiresAt }
  }

  async rotate(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken)
    const now = new Date()

    return this.prisma.$transaction(async (tx) => {
      const existing = await (tx as any).refreshToken.findUnique({
        where: { tokenHash },
        select: {
          id: true,
          authAccountId: true,
          expiresAt: true,
          revokedAt: true,
        },
      })

      if (!existing) throw new Error("Invalid refresh token")
      if (existing.revokedAt) throw new Error("Refresh token revoked")
      if (existing.expiresAt.getTime() <= now.getTime()) throw new Error("Refresh token expired")

      // Revoke old token
      await (tx as any).refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: now },
        select: { id: true },
      })

      // Issue new token
      const nextToken = this.mintOpaqueToken()
      const nextTokenHash = this.hashToken(nextToken)
      const nextExpiresAt = new Date(now.getTime() + this.refreshTokenTtlSeconds * 1000)

      const created = await (tx as any).refreshToken.create({
        data: {
          authAccountId: existing.authAccountId,
          tokenHash: nextTokenHash,
          expiresAt: nextExpiresAt,
        },
        select: { id: true },
      })

      await (tx as any).refreshToken.update({
        where: { id: existing.id },
        data: { replacedByTokenId: created.id },
        select: { id: true },
      })

      const authAccount = await tx.authAccount.findUnique({
        where: { id: existing.authAccountId },
        select: {
          id: true,
          provider: true,
          providerUserId: true,
          userId: true,
        },
      })

      if (!authAccount) throw new Error("Auth account not found")

      return {
        authAccount,
        refreshToken: nextToken,
        expiresAt: nextExpiresAt,
      }
    })
  }
}
