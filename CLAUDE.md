# Attendance Backend — Claude Code Guide

## Project Overview

NestJS REST API that connects to a Hikvision fingerprint attendance device
via ISAPI protocol, stores records in PostgreSQL via Prisma, and exposes
attendance data to a React + Vite frontend (CSV download included).

This is Phase 1: all endpoints are public (no auth). Auth will be added in Phase 2.

---

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **ORM:** Prisma
- **Database:** PostgreSQL (running via Docker locally, Docker on VPS in production)
- **HTTP Client:** Axios (for Hikvision ISAPI calls)
- **Validation:** class-validator + class-transformer
- **Config:** @nestjs/config with .env file

---

## Bash Commands

- `npm run start:dev` — Start dev server with hot reload
- `npm run build` — Compile TypeScript
- `npm run start:prod` — Run compiled production build
- `npm run test` — Run unit tests
- `npm run lint` — Run ESLint
- `npx prisma migrate dev --name <name>` — Create and apply a new migration
- `npx prisma migrate deploy` — Apply migrations in production
- `npx prisma generate` — Regenerate Prisma client after schema changes
- `npx prisma studio` — Open Prisma Studio GUI

---

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── attendance/
│   ├── attendance.module.ts
│   ├── attendance.service.ts
│   ├── attendance.controller.ts
│   └── dto/
│       ├── query-attendance.dto.ts
│       └── attendance-response.dto.ts
├── hikvision/
│   ├── hikvision.module.ts
│   ├── hikvision.service.ts
│   └── dto/hikvision-event.dto.ts
├── employees/
│   ├── employees.module.ts
│   ├── employees.service.ts
│   ├── employees.controller.ts
│   └── dto/
│       ├── create-employee.dto.ts
│       └── employee-response.dto.ts
└── prisma/
    ├── prisma.module.ts
    └── prisma.service.ts

prisma/
├── schema.prisma
└── migrations/
```

---

## Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Employee {
  id           Int                @id @default(autoincrement())
  hikvisionId  String             @unique
  name         String
  department   String?
  email        String?            @unique
  isActive     Boolean            @default(true)
  records      AttendanceRecord[]
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
}

model AttendanceRecord {
  id          Int      @id @default(autoincrement())
  employeeId  Int
  employee    Employee @relation(fields: [employeeId], references: [id])
  checkedAt   DateTime
  eventType   String   // "check-in" or "check-out"
  deviceIp    String?
  rawData     Json?    // store full Hikvision response for debugging
  createdAt   DateTime @default(now())

  @@unique([employeeId, checkedAt]) // prevent duplicate sync records
  @@index([checkedAt])
  @@index([employeeId])
}

model SyncLog {
  id          Int      @id @default(autoincrement())
  startTime   DateTime
  endTime     DateTime
  recordCount Int
  status      String   // "success" | "error"
  errorMsg    String?
  createdAt   DateTime @default(now())
}
```

---

## Environment Variables

All env variables must be accessed via `ConfigService`. Never hardcode values.

```
# .env
DATABASE_URL=postgresql://admin:password123@localhost:5432/attendance_db
HIKVISION_IP=192.168.1.XX
HIKVISION_USER=admin
HIKVISION_PASS=your_device_password
CORS_ORIGIN=http://localhost:5173
PORT=3001
```

---

## main.ts Setup

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET'],
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
```

---

## API Endpoints (Phase 1 — public, no auth)

### Attendance
- `GET /attendance` — list records
  - Query params: `startDate` (ISO string), `endDate` (ISO string), `employeeId` (number), `page` (default 1), `limit` (default 50)
- `GET /attendance/sync` — trigger manual pull from Hikvision device, saves new records to DB
- `GET /attendance/download` — returns a CSV file
  - Query params: `startDate`, `endDate`, `employeeId`

### Employees
- `GET /employees` — list all active employees
- `POST /employees` — create employee
  - Body: `{ hikvisionId, name, department?, email? }`
- `PATCH /employees/:id` — update employee fields
- `DELETE /employees/:id` — soft delete (sets `isActive = false`)

> No authentication on any route. Auth will be added in Phase 2 without changing any of the above logic.

---

## Hikvision ISAPI Integration

- **Protocol:** HTTP with Digest Authentication (axios handles this with `auth: { username, password }`)
- **Endpoint:** `POST http://<DEVICE_IP>/ISAPI/AccessControl/AcsEvent?format=json`
- **Request body:**

```json
{
  "AcsEventCond": {
    "searchID": "1",
    "searchResultPosition": 0,
    "maxResults": 1000,
    "major": 5,
    "startTime": "2025-01-01T00:00:00",
    "endTime": "2025-12-31T23:59:59"
  }
}
```

- **Key response fields per record:**
  - `employeeNoString` — matches `Employee.hikvisionId`
  - `time` — ISO datetime string
  - `eventType` — map to `"check-in"` or `"check-out"`

- **Rules:**
  - Wrap all ISAPI calls in try/catch
  - Axios timeout must be 10 seconds
  - Device credentials must NEVER appear in API responses or logs
  - Log every sync attempt to the `SyncLog` table (success or error)
  - Sync must be idempotent — use the `@@unique([employeeId, checkedAt])` constraint to skip duplicates

---

## CSV Download Format

The `GET /attendance/download` endpoint must set these headers:

```
Content-Type: text/csv
Content-Disposition: attachment; filename="attendance_YYYY-MM-DD.csv"
```

CSV columns (in order):
`Employee ID, Hikvision ID, Name, Department, Date, Time, Event Type`

---

## Code Style Rules

- Use NestJS decorators and dependency injection everywhere — no standalone classes
- Always use `async/await` — never `.then()` or `.catch()` chains
- All request bodies must have a DTO with class-validator decorators
- All query params must have a DTO with `@IsOptional()` decorators
- Never return raw Prisma model objects — always map to a response DTO
- Use `PrismaService` injected via constructor — never import PrismaClient directly
- Use `ConfigService` for all environment variable access
- Use Prisma transactions (`prisma.$transaction`) when writing multiple records at once

---

## Docker Setup (local development)

`docker-compose.yml` in project root:

```yaml
services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: attendance_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start with: `docker compose up -d`

---

## Docker Setup (VPS production)

`docker-compose.yml` on VPS includes both the app and postgres containers:

```yaml
services:
  postgres:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: attendance_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build: .
    restart: always
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://admin:password123@postgres:5432/attendance_db
      HIKVISION_IP: 192.168.1.XX
      HIKVISION_USER: admin
      HIKVISION_PASS: your_device_password
      CORS_ORIGIN: https://your-frontend-domain.com
      PORT: 3001
    depends_on:
      - postgres

volumes:
  postgres_data:
```

`Dockerfile` in project root:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npx prisma generate
EXPOSE 3001
CMD ["npx", "prisma", "migrate", "deploy", "&&", "node", "dist/main.js"]
```

---

## Testing Rules

- Unit test `HikvisionService` with mocked Axios — never make real device calls in tests
- Unit test `AttendanceService` with mocked `PrismaService`
- Use `@nestjs/testing` and `Test.createTestingModule`
- Mock `ConfigService` with `{ get: jest.fn((key) => testEnv[key]) }`
- Run `npm run test` before every commit

---

## Important Rules

- Never commit `.env` — it must be in `.gitignore`
- Always run `npx prisma generate` after any schema change
- Always create a migration with `prisma migrate dev` — never use `prisma db push` in production
- CORS is restricted to `GET` methods and the origin defined in `CORS_ORIGIN`
- All sync operations must be idempotent (safe to run multiple times)
- When compacting conversation, always preserve: list of modified files, last migration name, and pending tasks