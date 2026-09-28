import app from './app';
import { config } from './config';
import prisma from './config/database';

const REQUIRED_ENV_VARS = [
  { key: 'SUPABASE_URL', value: config.supabase.url },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: config.supabase.serviceRoleKey },
  { key: 'DATABASE_URL', value: config.db.url },
];

const missing = REQUIRED_ENV_VARS.filter(v => !v.value);
if (missing.length > 0) {
  console.error(`
  ╔══════════════════════════════════════════════════════════╗
  ║  Missing required environment variables                  ║
  ║                                                          ║
${missing.map(v => `  ║    - ${v.key}${' '.repeat(56 - v.key.length)}║`).join('\n')}
  ║                                                          ║
  ║  Create backend/.env from backend/.env.example           ║
  ╚══════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

if (config.env === 'production' && (!config.qrSecret || config.qrSecret === 'qr-secret-change-in-production')) {
  console.error(`
  ╔══════════════════════════════════════════════════════════╗
  ║  CRITICAL ERROR: QR_SECRET must be set to a secure       ║
  ║  random secret in production environment!                ║
  ║  Refusing to start server.                               ║
  ╚══════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
} else if (config.qrSecret === 'qr-secret-change-in-production') {
  console.warn(`
  ╔══════════════════════════════════════════════════════════╗
  ║  WARNING: QR_SECRET is still set to the default value!  ║
  ║  Change it in backend/.env for production.              ║
  ╚══════════════════════════════════════════════════════════╝
  `);
}

const server = app.listen(config.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════════╗
  ║     Smart Shuttle Management System             ║
  ║     API Server Running                          ║
  ║     Environment: ${config.env.padEnd(29)}║
  ║     Port: ${String(config.port).padEnd(35)}║
  ║     URL: http://${config.host}:${config.port}${' '.repeat(14)}║
  ╚══════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
