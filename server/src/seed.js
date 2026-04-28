/**
 * Seed script — creates initial privileged accounts that cannot self-register.
 *
 * Run once:  node src/seed.js
 * Safe to re-run — skips existing accounts.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('./config/db');

const SEED_ACCOUNTS = [
  // ── System level ────────────────────────────────────────────────────────────
  {
    email: 'sysadmin@riphah.edu.pk',
    password: 'Admin@12345',
    name: 'System Administrator',
    role: 'SYSTEM_ADMIN',
    department: 'Administration',
  },
  {
    email: 'registrar@riphah.edu.pk',
    password: 'Registrar@12345',
    name: 'Office of the Registrar',
    role: 'UNIVERSITY_ADMIN',
    department: 'Administration',
  },

  // ── Faculty Coordination — one per faculty ──────────────────────────────────
  // department field = faculty name (used for department-scoping in controllers)
  {
    email: 'coord.computing@riphah.edu.pk',
    password: 'Computing@12345',
    name: 'Computing Coordination',
    role: 'COORDINATION',
    department: 'Faculty of Computing',
  },
  {
    email: 'coord.engineering@riphah.edu.pk',
    password: 'Engineering@12345',
    name: 'Engineering Coordination',
    role: 'COORDINATION',
    department: 'Faculty of Engineering',
  },
  {
    email: 'coord.management@riphah.edu.pk',
    password: 'Management@12345',
    name: 'Management Sciences Coordination',
    role: 'COORDINATION',
    department: 'Faculty of Management Sciences',
  },
  {
    email: 'coord.media@riphah.edu.pk',
    password: 'Media@12345',
    name: 'Media Sciences Coordination',
    role: 'COORDINATION',
    department: 'Faculty of Media Sciences',
  },
  {
    email: 'coord.health@riphah.edu.pk',
    password: 'Health@12345',
    name: 'Health Sciences Coordination',
    role: 'COORDINATION',
    department: 'Faculty of Health Sciences',
  },
  {
    email: 'coord.socialsciences@riphah.edu.pk',
    password: 'Social@12345',
    name: 'Social Sciences Coordination',
    role: 'COORDINATION',
    department: 'Faculty of Social Sciences',
  },
];

async function seed() {
  console.log('Seeding privileged accounts...\n');

  for (const account of SEED_ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: account.email } });
    if (existing) {
      console.log(`  SKIP  ${account.email}  (${existing.role})`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(account.password, 12);
    const user = await prisma.user.create({
      data: {
        email: account.email,
        password: hashedPassword,
        name: account.name,
        role: account.role,
        department: account.department,
        isVerified: true,
      },
    });

    console.log(`  OK    ${user.email}  (${user.role} — ${user.department})`);
  }

  console.log('\nDone. Change passwords after first login.');
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
