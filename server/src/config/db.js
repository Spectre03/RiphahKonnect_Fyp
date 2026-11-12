const { PrismaClient } = require('../../generated/prisma-client');

let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl && !dbUrl.includes('connect_timeout')) {
  const sep = dbUrl.includes('?') ? '&' : '?';
  dbUrl = `${dbUrl}${sep}connect_timeout=30&pool_timeout=30`;
}

const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
});

// Keep Neon DB warm so student/teacher actions don't fail after idle
const keepAliveInterval = setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    // ignore transient wake-up errors
  }
}, 4 * 60 * 1000);
if (keepAliveInterval.unref) keepAliveInterval.unref();

module.exports = prisma;
