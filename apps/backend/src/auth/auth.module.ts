import { Module } from "@nestjs/common"
import { KakaoJwtVerifier } from "./kakao-jwt.verifier"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { KakaoOidcService } from "./kakao-oidc.service"
import { AppJwtService } from "./app-jwt.service"
import { AuthController } from "./auth.controller"
import { GoogleJwtVerifier } from "./google-jwt.verifier"
import { GoogleOidcService } from "./google-oidc.service"
import { AppleJwtVerifier } from "./apple-jwt.verifier"
import { AppleOidcService } from "./apple-oidc.service"
import { RefreshTokenService } from "./refresh-token.service"

@Module({
  controllers: [AuthController],
  providers: [
    KakaoJwtVerifier,
    KakaoOidcService,
    GoogleJwtVerifier,
    GoogleOidcService,
    AppleJwtVerifier,
    AppleOidcService,
    AppJwtService,
    RefreshTokenService,
    JwtAuthGuard,
  ],
  exports: [
    KakaoJwtVerifier,
    KakaoOidcService,
    GoogleJwtVerifier,
    GoogleOidcService,
    AppleJwtVerifier,
    AppleOidcService,
    AppJwtService,
    RefreshTokenService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
