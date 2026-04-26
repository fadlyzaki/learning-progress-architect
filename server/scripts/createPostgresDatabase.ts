import { Pool } from 'pg';

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function createMaintenanceUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));

  if (!databaseName) {
    throw new Error('DATABASE_URL must include a database name.');
  }

  url.pathname = '/postgres';
  return {
    databaseName,
    maintenanceUrl: url.toString(),
  };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to create the Postgres database.');
  }

  const { databaseName, maintenanceUrl } = createMaintenanceUrl(databaseUrl);
  const pool = new Pool({
    connectionString: maintenanceUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const existing = await pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists',
      [databaseName],
    );

    if (existing.rows[0]?.exists) {
      console.log(`Database ${databaseName} already exists.`);
      return;
    }

    await pool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    console.log(`Database ${databaseName} created.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Database creation failed.', error);
  process.exitCode = 1;
});
