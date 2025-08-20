const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function runMigration(migrationFile) {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    // Get migration file from command line argument
    const migrationFile = process.argv[2];
    
    if (!migrationFile) {
      console.error('❌ Please specify a migration file');
      console.log('Usage: node run-migration.js <migration-file>');
      console.log('Example: node run-migration.js 004_enhance_courts_for_discovery.sql');
      process.exit(1);
    }

    // Run the specified migration
    await runMigration(migrationFile);
    
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runMigration };