-- AlterTable
ALTER TABLE "User" ADD COLUMN     "favoritePortfolioId" INTEGER;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_favoritePortfolioId_fkey" FOREIGN KEY ("favoritePortfolioId") REFERENCES "Portfolio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
