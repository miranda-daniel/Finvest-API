-- AlterTable
ALTER TABLE "Instrument" ADD COLUMN     "country" TEXT,
ADD COLUMN     "exchange" TEXT;

-- AlterTable
ALTER TABLE "Operation" ADD COLUMN     "fees" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Portfolio" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" SERIAL NOT NULL,
    "instrumentId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "closePrice" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdByIp" TEXT NOT NULL,
    "revoked" TIMESTAMP(3),
    "revokedByIp" TEXT,
    "replacedByToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceSnapshot_instrumentId_date_key" ON "PriceSnapshot"("instrumentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
