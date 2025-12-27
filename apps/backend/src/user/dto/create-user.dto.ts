import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator"
import { Type } from "class-transformer"

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nickname!: string

  @IsBoolean()
  @IsOptional()
  hasAgreedToTerms?: boolean

  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  @IsOptional()
  @ArrayMaxSize(3)
  favoriteGenres?: number[]

  @IsInt()
  @Type(() => Number)
  mainGenreId!: number

  @IsString()
  @IsOptional()
  phone?: string | null

  @IsEmail()
  @IsOptional()
  email?: string | null

  @IsUrl()
  @IsOptional()
  profileImageUrl?: string | null
}
