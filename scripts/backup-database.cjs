const fs = require('fs');
const path = require('path');
const { Prisma, PrismaClient } = require('@prisma/client');

async function main() {
  const requestedPath = process.argv[2];
  if (!requestedPath) {
    throw new Error('Usage: node backup-database.cjs <backups/file.json>');
  }

  const projectRoot = path.resolve(__dirname, '..');
  const backupRoot = path.resolve(projectRoot, 'backups');
  const outputPath = path.resolve(projectRoot, requestedPath);
  if (!outputPath.startsWith(`${backupRoot}${path.sep}`)) {
    throw new Error('Backup output must be inside the project backups folder');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const prisma = new PrismaClient();
  try {
    const databaseColumns = await prisma.$queryRaw`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `;
    const columnsByTable = new Map();
    for (const column of databaseColumns) {
      const columns = columnsByTable.get(column.table_name) ?? new Set();
      columns.add(column.column_name);
      columnsByTable.set(column.table_name, columns);
    }

    const tables = {};
    const rowCounts = {};
    for (const model of Prisma.dmmf.datamodel.models) {
      const tableName = model.dbName ?? model.name;
      const databaseFields = columnsByTable.get(tableName) ?? new Set();
      const select = {};
      for (const field of model.fields) {
        if (field.kind === 'object') continue;
        const columnName = field.dbName ?? field.name;
        if (databaseFields.has(columnName)) select[field.name] = true;
      }

      const delegateName = `${model.name[0].toLowerCase()}${model.name.slice(1)}`;
      const rows = await prisma[delegateName].findMany({ select });
      tables[model.name] = rows;
      rowCounts[model.name] = rows.length;
    }

    const backup = {
      format: 'yoyo-store-prisma-json-backup-v1',
      createdAt: new Date().toISOString(),
      databaseHost: new URL(process.env.DATABASE_URL).hostname,
      schema: fs.readFileSync(
        path.join(projectRoot, 'prisma', 'schema.prisma'),
        'utf8',
      ),
      rowCounts,
      tables,
    };
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2));
    console.log(`Backup saved: ${outputPath}`);
    console.log(`Row counts: ${JSON.stringify(rowCounts)}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(`Backup failed: ${error.message}`);
  process.exitCode = 1;
});
