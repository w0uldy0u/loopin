import { IsString, ValidateIf } from "class-validator"

export class IdTokenSigninDto {
  @IsString()
  idToken!: string

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  nonce?: string
}
