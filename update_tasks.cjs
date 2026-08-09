const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:bits@23103775@db.xrojndhnabfoykawdrxd.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log("Adding completed_at column to tasks table...");
  try {
    await client.query(`
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
    `);
    
    // Also backfill completed_at for tasks that are currently Completed
    await client.query(`
      UPDATE public.tasks 
      SET completed_at = created_at
      WHERE status = 'Completed' AND completed_at IS NULL;
    `);

    console.log("Migration successful.");
  } catch(e) {
    console.error("Migration failed:", e.message);
  }

  await client.end();
}

run().catch(console.error);
