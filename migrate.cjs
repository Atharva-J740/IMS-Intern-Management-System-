const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:bits@23103775@db.xrojndhnabfoykawdrxd.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    create table if not exists public.time_sessions (
      id uuid default uuid_generate_v4() primary key,
      intern_id uuid references public.profiles(id) on delete cascade not null,
      clock_in timestamp with time zone default timezone('utc'::text, now()) not null,
      clock_out timestamp with time zone,
      duration_hours numeric
    );

    alter table public.time_sessions enable row level security;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Interns can view own time' AND tablename = 'time_sessions') THEN
        create policy "Interns can view own time" on public.time_sessions for select using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'VIEWER'));
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Interns can insert own time' AND tablename = 'time_sessions') THEN
        create policy "Interns can insert own time" on public.time_sessions for insert with check (auth.uid() = intern_id);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Interns can update own time' AND tablename = 'time_sessions') THEN
        create policy "Interns can update own time" on public.time_sessions for update using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) = 'ADMIN');
      END IF;
    END
    $$;
  `);
  console.log('Migration ran successfully');
  await client.end();
}

run().catch(console.error);
