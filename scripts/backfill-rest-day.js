// One-off backfill: assigns a "restDay" to every existing user that doesn't
// have one yet, so the column can be made NOT NULL. Run once, then re-run
// `npx prisma migrate dev --name make-user-rest-day-required` to tighten it.
//
// Usage: node scripts/backfill-rest-day.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

async function main() {
  const users = await prisma.user.findMany({
    where: { restDay: null },
    orderBy: { createdAt: 'asc' },
  });

  if (users.length === 0) {
    console.log('No users need backfilling — every user already has a restDay.');
    return;
  }

  for (let i = 0; i < users.length; i++) {
    const restDay = DIAS[i % DIAS.length];
    await prisma.user.update({ where: { id: users[i].id }, data: { restDay } });
    console.log(`${users[i].email} -> ${restDay}`);
  }

  console.log(`Backfilled ${users.length} user(s).`);
}

main().catch((e) => console.error('ERROR:', e.message)).finally(() => prisma.$disconnect());
