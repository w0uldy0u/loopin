import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { PrismaService } from "@app/prisma/prisma.service"
import { AppJwtService } from "@app/auth/app-jwt.service"

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly appJwt: AppJwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest()
    const auth = req.headers["authorization"] as string | undefined
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined
    if (!token) throw new UnauthorizedException("Missing Authorization Token")

    const { uid, provider, sub } = await this.appJwt.verifyAccessToken(token).catch(() => {
      throw new UnauthorizedException("Invalid Authorization Token")
    })

    const onboardingBypass = this.reflector.getAllAndOverride<boolean>("onboarding_bypass", [
      ctx.getHandler(),
      ctx.getClass(),
    ])

    if (!uid) {
      if (onboardingBypass) {
        req.user = { id: null, provider, sub }
        return true
      }
      throw new ForbiddenException("Onboarding required")
    }

    const account = await this.prisma.authAccount.findUnique({
      where: { provider_providerUserId: { provider: provider as any, providerUserId: sub } },
      select: { userId: true },
    })

    if (!account || account.userId !== uid) {
      throw new UnauthorizedException("Invalid Authorization Token")
    }

    const user = await this.prisma.user.findUnique({ where: { id: uid }, select: { id: true } })
    if (!user) throw new UnauthorizedException("Invalid Authorization Token")

    req.user = { id: user.id, provider, sub }
    return true
  }
}
