-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('kakao', 'apple', 'google');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "has_agreed_to_term" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "email" TEXT,
    "profile_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "main_genre_id" INTEGER NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_account" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "email" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genre" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post" (
    "id" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "author_id" TEXT NOT NULL,

    CONSTRAINT "post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "post_id" TEXT NOT NULL,

    CONSTRAINT "post_image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment" (
    "id" TEXT NOT NULL,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "parent_id" TEXT,

    CONSTRAINT "comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_like" (
    "post_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_like_pkey" PRIMARY KEY ("post_id","user_id")
);

-- CreateTable
CREATE TABLE "comment_like" (
    "comment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_like_pkey" PRIMARY KEY ("comment_id","user_id")
);

-- CreateTable
CREATE TABLE "_GenreToUser" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GenreToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_nickname_key" ON "user"("nickname");

-- CreateIndex
CREATE INDEX "auth_account_user_id_idx" ON "auth_account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_account_provider_provider_user_id_key" ON "auth_account"("provider", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "genre_label_key" ON "genre"("label");

-- CreateIndex
CREATE INDEX "post_author_id_id_idx" ON "post"("author_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "post_image_post_id_order_key" ON "post_image"("post_id", "order");

-- CreateIndex
CREATE INDEX "comment_post_id_id_idx" ON "comment"("post_id", "id");

-- CreateIndex
CREATE INDEX "comment_parent_id_id_idx" ON "comment"("parent_id", "id");

-- CreateIndex
CREATE INDEX "_GenreToUser_B_index" ON "_GenreToUser"("B");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_main_genre_id_fkey" FOREIGN KEY ("main_genre_id") REFERENCES "genre"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post" ADD CONSTRAINT "post_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_image" ADD CONSTRAINT "post_image_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_like" ADD CONSTRAINT "comment_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToUser" ADD CONSTRAINT "_GenreToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToUser" ADD CONSTRAINT "_GenreToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
