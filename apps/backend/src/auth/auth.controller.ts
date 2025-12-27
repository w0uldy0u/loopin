import { BadRequestException, Body, Controller, Param, Post } from "@nestjs/common"
import { PrismaService } from "@app/prisma/prisma.service"
import { KakaoOidcService } from "./kakao-oidc.service"
import { AppJwtService } from "./app-jwt.service"
import { AuthCodeExchangeDto } from "./dto/auth-code-exchange.dto"
import { IdTokenSigninDto } from "./dto/id-token-signin.dto"
import { parseAuthProvider, type AuthProvider } from "./auth-provider"
import { GoogleOidcService } from "./google-oidc.service"
import { AppleOidcService } from "./apple-oidc.service"

@Controller("auth")
export class AuthController {
  constructor(
    private readonly kakaoOidc: KakaoOidcService,
    private readonly googleOidc: GoogleOidcService,
    private readonly appleOidc: AppleOidcService,
    private readonly prisma: PrismaService,
    private readonly appJwt: AppJwtService,
  ) {}

  @Post(":provider/exchange")
  async exchange(@Param("provider") providerParam: string, @Body() dto: AuthCodeExchangeDto) {
    const provider = this.safeProvider(providerParam)

    const tokenSet = await this.exchangeCodeByProvider(provider, {
      code: dto.code,
      redirectUri: dto.redirectUri,
      codeVerifier: dto.codeVerifier,
    })

    const payload = await this.verifyIdTokenByProvider(provider, tokenSet.idToken, dto.nonce)
    return this.finishSignin(provider, payload)
  }

  /**
   * RN/클라이언트가 이미 id_token을 보유한 경우.
   * id_token 검증 후 서비스용 accessToken(1st-party JWT)을 발급한다.
   */
  @Post(":provider/id-token")
  async idToken(@Param("provider") providerParam: string, @Body() dto: IdTokenSigninDto) {
    const provider = this.safeProvider(providerParam)
    const payload = await this.verifyIdTokenByProvider(provider, dto.idToken, dto.nonce)
    return this.finishSignin(provider, payload)
  }

  private safeProvider(raw: string): AuthProvider {
    try {
      return parseAuthProvider(raw)
    } catch {
      throw new BadRequestException("Unsupported auth provider")
    }
  }

  private async exchangeCodeByProvider(
    provider: AuthProvider,
    input: { code: string; redirectUri: string; codeVerifier: string },
  ): Promise<{ idToken: string }> {
    if (provider === "kakao") {
      const tokenSet = await this.kakaoOidc.exchangeCode(input)
      return { idToken: tokenSet.id_token! }
    }
    if (provider === "google") {
      const tokenSet = await this.googleOidc.exchangeCode(input)
      return { idToken: tokenSet.id_token! }
    }
    if (provider === "apple") {
      const tokenSet = await this.appleOidc.exchangeCode(input)
      return { idToken: tokenSet.id_token! }
    }
    throw new BadRequestException("Unsupported auth provider")
  }

  private async verifyIdTokenByProvider(provider: AuthProvider, idToken: string, nonce?: string) {
    if (provider === "kakao") return this.kakaoOidc.verifyIdToken(idToken, nonce)
    if (provider === "google") return this.googleOidc.verifyIdToken(idToken, nonce)
    if (provider === "apple") return this.appleOidc.verifyIdToken(idToken, nonce)
    throw new BadRequestException("Unsupported auth provider")
  }

  private async finishSignin(provider: AuthProvider, payload: { sub?: string; email?: string }) {
    const sub = typeof payload.sub === "string" ? payload.sub : undefined
    if (!sub) throw new BadRequestException("Missing subject in id_token")

    const email = typeof payload.email === "string" ? payload.email : undefined

    const account = await this.prisma.authAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: provider as any,
          providerUserId: sub,
        },
      },
      create: {
        provider: provider as any,
        providerUserId: sub,
        email,
        userId: null,
      },
      update: {
        ...(email ? { email } : {}),
      },
      select: { userId: true },
    })

    const userId = account.userId ?? null
    const user = userId
      ? await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, nickname: true, profileImageUrl: true },
        })
      : null

    const accessToken = await this.appJwt.signAccessToken({
      userId: user?.id ?? null,
      provider,
      sub,
    })

    return {
      accessToken,
      onboardingRequired: !user,
      user: user ?? null,
    }
  }
}
