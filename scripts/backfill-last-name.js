// One-off backfill: splits existing users' single-field `displayName` into
// `displayName` (given name(s)) + `lastName` (apellidos), Mexican-naming style.
// Only touches names with exactly 3 words (1 nombre / 2 apellidos) or exactly
// 4 words (2 nombres / 2 apellidos) — anything else is skipped and printed so
// it can be split by hand via the Usuarios edit form.
//
// Usage: node scripts/backfill-last-name.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, displayName: true },
    orderBy: { createdAt: 'asc' },
  });

  let updated = 0;
  const skipped = [];

  for (const user of users) {
    const words = (user.displayName || '').trim().split(/\s+/).filter(Boolean);

    if (words.length !== 3 && words.length !== 4) {
      skipped.push({ ...user, wordCount: words.length });
      continue;
    }

    const splitAt = words.length === 3 ? 1 : 2;
    const newDisplayName = words.slice(0, splitAt).join(' ');
    const lastName = words.slice(splitAt).join(' ');

    await prisma.user.update({
      where: { id: user.id },
      data: { displayName: newDisplayName, lastName },
    });
    console.log(`${user.email} -> "${newDisplayName}" / "${lastName}"`);
    updated++;
  }

  console.log(`\nUpdated ${updated} user(s).`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} user(s) — split these manually via Usuarios:`);
    for (const s of skipped) {
      console.log(`  ${s.email} | ${s.wordCount} word(s) | ${JSON.stringify(s.displayName)}`);
    }
  }
}

main().catch((e) => console.error('ERROR:', e.message)).finally(() => prisma.$disconnect());
