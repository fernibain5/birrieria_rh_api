-- CreateTable
CREATE TABLE "NavOrder" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "order" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "NavOrder_pkey" PRIMARY KEY ("id")
);
