-- CreateTable
CREATE TABLE "JustifiedAbsence" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "justifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JustifiedAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JustifiedAbsence_employeeId_idx" ON "JustifiedAbsence"("employeeId");

-- CreateIndex
CREATE INDEX "JustifiedAbsence_date_idx" ON "JustifiedAbsence"("date");

-- CreateIndex
CREATE UNIQUE INDEX "JustifiedAbsence_employeeId_date_key" ON "JustifiedAbsence"("employeeId", "date");

-- AddForeignKey
ALTER TABLE "JustifiedAbsence" ADD CONSTRAINT "JustifiedAbsence_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
