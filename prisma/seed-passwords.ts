import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  const { count } = await prisma.user.updateMany({
    where: { password: null },
    data: { password: hash },
  });
  console.log(`Set password for ${count} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
