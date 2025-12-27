import { PrismaService } from "@app/prisma/prisma.service"
import { Injectable } from "@nestjs/common"

@Injectable()
export class AttributeService {
  constructor(private readonly prisma: PrismaService) {}

  getGenre() {
    return this.prisma.genre.findMany()
  }
}
