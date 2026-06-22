-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ShelfStatus" AS ENUM ('READING', 'WANT_TO_READ', 'FINISHED', 'DNF');

-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "coverUrl" TEXT,
    "pageCount" INTEGER,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfEntry" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "status" "ShelfStatus" NOT NULL DEFAULT 'WANT_TO_READ',
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShelfEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressLog" (
    "id" SERIAL NOT NULL,
    "shelfEntryId" INTEGER NOT NULL,
    "currentPage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Book_externalId_key" ON "Book"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfEntry_bookId_key" ON "ShelfEntry"("bookId");

-- AddForeignKey
ALTER TABLE "ShelfEntry" ADD CONSTRAINT "ShelfEntry_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressLog" ADD CONSTRAINT "ProgressLog_shelfEntryId_fkey" FOREIGN KEY ("shelfEntryId") REFERENCES "ShelfEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
