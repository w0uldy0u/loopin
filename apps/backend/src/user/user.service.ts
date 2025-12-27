import { BadRequestException, Injectable } from "@nestjs/common"
import { getImageExtension } from "@app/storage/image-types.const"
import { ConfigService } from "@nestjs/config"
import type { CreateUserDto } from "./dto/create-user.dto"
import type { UpdateUserDto } from "./dto/update-user.dto"
import { PrismaService } from "@app/prisma/prisma.service"
import { StorageService } from "@app/storage/storage.service"
import { uuidv7 } from "uuidv7"
import type { AuthProvider } from "@app/auth/auth-provider"

@Injectable()
export class UserService {
  private readonly bucket: string
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>("S3_BUCKET") ?? "loopin-media"
  }

  async create(createUserDto: CreateUserDto, identity: { provider: AuthProvider; sub: string }) {
    const { favoriteGenres, mainGenreId, ...rest } = createUserDto

    return this.prisma.$transaction(async (tx) => {
      const existingAccount = await tx.authAccount.findUnique({
        where: {
          provider_providerUserId: {
            provider: identity.provider as any,
            providerUserId: identity.sub,
          },
        },
        select: { userId: true },
      })
      if (existingAccount?.userId) {
        throw new BadRequestException("Auth account already linked")
      }

      const user = await tx.user.create({
        data: {
          ...rest,
          mainGenre: {
            connect: { id: mainGenreId },
          },
          ...(favoriteGenres?.length && {
            favoriteGenres: {
              connect: favoriteGenres.map((id) => ({ id })),
            },
          }),
        },
      })

      await tx.authAccount.upsert({
        where: {
          provider_providerUserId: {
            provider: identity.provider as any,
            providerUserId: identity.sub,
          },
        },
        create: {
          provider: identity.provider as any,
          providerUserId: identity.sub,
          userId: user.id,
        },
        update: {
          userId: user.id,
        },
      })

      return user
    })
  }

  async checkNickname(nickname: string) {
    const nicknameTaken = await this.prisma.user.findUnique({
      where: { nickname },
      select: { hasAgreedToTerms: true },
    })

    return { available: !nicknameTaken }
  }

  getMe(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    })
  }

  getOne(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        nickname: true,
        profileImageUrl: true,
      },
    })
  }

  update(userId: string, updateUserDto: UpdateUserDto) {
    const { favoriteGenres, mainGenreId, ...rest } = updateUserDto

    if (mainGenreId === null) {
      throw new BadRequestException("mainGenreId is required")
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(mainGenreId !== undefined && {
          mainGenre: {
            connect: { id: mainGenreId },
          },
        }),
        ...(favoriteGenres !== undefined && {
          favoriteGenres: {
            set: favoriteGenres.map((id) => ({ id })),
          },
        }),
      },
    })
  }

  remove(userId: string) {
    return this.prisma.user.delete({ where: { id: userId } })
  }

  async getProfileImageUploadUrl(userId: string, contentType?: string) {
    if (!contentType) {
      throw new BadRequestException("contentType required")
    }
    const ext = getImageExtension(contentType)
    if (!ext) {
      throw new BadRequestException("Only image content types are allowed: jpeg, png, webp, avif")
    }
    const unique = uuidv7()
    const objectKey = `users/${userId}/profile/${unique}.${ext}`

    const { url, fields } = await this.storage.getPresignedUploadUrl(this.bucket, objectKey, {
      contentType,
      expiresInSeconds: 60 * 2,
      maxSizeBytes: 5 * 1024 * 1024,
    })

    return { url, fields }
  }
}
