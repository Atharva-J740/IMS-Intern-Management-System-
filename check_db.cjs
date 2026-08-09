const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:bits@23103775@db.xrojndhnabfoykawdrxd.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  console.log("Checking tables...");
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);
  console.log("Tables in public schema:");
  console.log(res.rows.map(r => r.table_name));

  console.log("\nChecking learning_topics columns:");
  try {
    const res2 = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'learning_topics';
    `);
    console.log(res2.rows);
  } catch (e) {
    console.log("learning_topics error:", e.message);
  }

  await client.end();
}

run().catch(console.error);
