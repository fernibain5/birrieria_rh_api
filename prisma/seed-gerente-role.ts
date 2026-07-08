import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.role.upsert({
    where: { value: 'gerente' },
    update: { isSystem: true },
    create: {
      value: 'gerente',
      label: 'Gerente',
      color: 'bg-indigo-100 text-indigo-800',
      isSystem: true,
    },
  });
  console.log('Seeded "gerente" role.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
