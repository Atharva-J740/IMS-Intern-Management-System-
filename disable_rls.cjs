const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:bits@23103775@db.xrojndhnabfoykawdrxd.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log("Disabling RLS since we use Mock Auth...");
  await client.query(`
    alter table public.profiles disable row level security;
    alter table public.tasks disable row level security;
    alter table public.progress_logs disable row level security;
    alter table public.deliverables disable row level security;
    alter table public.learning_topics disable row level security;
    alter table public.time_sessions disable row level security;
  `);

  console.log('RLS disabled successfully.');
  await client.end();
}

run().catch(console.error);
