-- CreateTable
CREATE TABLE "Role" (
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("value")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "phoneNumber" TEXT,
    "roleValue" TEXT NOT NULL,
    "restaurantId" INTEGER,
    "allFiles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "color" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "targetRole" TEXT,
    "targetRestaurantId" INTEGER,
    "minutaId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Minuta" (
    "id" TEXT NOT NULL,
    "supervisor" TEXT,
    "restaurantId" INTEGER,
    "role" TEXT,
    "whatHappened" TEXT,
    "expectations" TEXT,
    "nextMeetingDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "legacyEventId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "responsibleUids" TEXT[],
    "generalInfo" JSONB,

    CONSTRAINT "Minuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinutaArea" (
    "id" SERIAL NOT NULL,
    "minutaId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "area" TEXT NOT NULL,
    "planteamiento" TEXT NOT NULL,
    "seguimiento" TEXT NOT NULL,
    "fechaCompromiso" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "encargadoName" TEXT,
    "encargadoUids" TEXT[],
    "calendarEventId" TEXT,

    CONSTRAINT "MinutaArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MinutaAttendee" (
    "id" SERIAL NOT NULL,
    "minutaId" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "area" TEXT,

    CONSTRAINT "MinutaAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE INDEX "Event_year_idx" ON "Event"("year");

-- CreateIndex
CREATE INDEX "Event_minutaId_idx" ON "Event"("minutaId");

-- CreateIndex
CREATE INDEX "Minuta_restaurantId_idx" ON "Minuta"("restaurantId");

-- CreateIndex
CREATE INDEX "Minuta_status_idx" ON "Minuta"("status");

-- CreateIndex
CREATE INDEX "Minuta_createdAt_idx" ON "Minuta"("createdAt");

-- CreateIndex
CREATE INDEX "MinutaArea_minutaId_idx" ON "MinutaArea"("minutaId");

-- CreateIndex
CREATE UNIQUE INDEX "MinutaArea_minutaId_index_key" ON "MinutaArea"("minutaId", "index");

-- CreateIndex
CREATE INDEX "MinutaAttendee_minutaId_idx" ON "MinutaAttendee"("minutaId");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_storagePath_key" ON "Resource"("storagePath");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleValue_fkey" FOREIGN KEY ("roleValue") REFERENCES "Role"("value") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_targetRestaurantId_fkey" FOREIGN KEY ("targetRestaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_minutaId_fkey" FOREIGN KEY ("minutaId") REFERENCES "Minuta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minuta" ADD CONSTRAINT "Minuta_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Minuta" ADD CONSTRAINT "Minuta_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinutaArea" ADD CONSTRAINT "MinutaArea_minutaId_fkey" FOREIGN KEY ("minutaId") REFERENCES "Minuta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinutaAttendee" ADD CONSTRAINT "MinutaAttendee_minutaId_fkey" FOREIGN KEY ("minutaId") REFERENCES "Minuta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MinutaAttendee" ADD CONSTRAINT "MinutaAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
