-- AlterTable
ALTER TABLE "User" ADD COLUMN     "batchYear" INTEGER,
ADD COLUMN     "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
