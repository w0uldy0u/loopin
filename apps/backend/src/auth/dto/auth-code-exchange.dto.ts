import { IsString, ValidateIf } from "class-validator"

export class AuthCodeExchangeDto {
  @IsString()
  code!: string

  @IsString()
  redirectUri!: string

  @IsString()
  codeVerifier!: string

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  nonce?: string
}
