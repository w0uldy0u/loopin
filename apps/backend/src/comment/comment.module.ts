import { Module } from "@nestjs/common"
import { CommentController } from "./comment.controller"
import { CommentService } from "./comment.service"
import { PrismaModule } from "@app/prisma/prisma.module"
import { AuthModule } from "@app/auth/auth.module"

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CommentController],
  providers: [CommentService],
})
export class CommentModule {}
