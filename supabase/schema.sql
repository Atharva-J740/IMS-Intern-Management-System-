-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE (Extends Supabase Auth Auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text not null,
  role text not null check (role in ('ADMIN', 'INTERN', 'VIEWER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TASKS TABLE
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  intern_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  priority text not null,
  estimated_time numeric default 0,
  actual_time numeric default 0,
  status text not null default 'Not Started',
  progress integer default 0,
  due_date date,
  approval_status text default 'Not Submitted',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DAILY PROGRESS LOGS TABLE
create table public.progress_logs (
  id uuid default uuid_generate_v4() primary key,
  intern_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete cascade not null,
  log_date date not null default current_date,
  time_spent numeric not null,
  what_did_you_do text,
  outcome text,
  evidence_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- DELIVERABLES TABLE
create table public.deliverables (
  id uuid default uuid_generate_v4() primary key,
  intern_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  type text not null,
  url text not null,
  status text default 'Draft',
  feedback text,
  submitted_date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- LEARNING TOPICS TABLE
create table public.learning_topics (
  id uuid default uuid_generate_v4() primary key,
  intern_id uuid references public.profiles(id) on delete cascade not null,
  concept text not null,
  description text,
  status text default 'Not Started',
  progress integer default 0,
  evidence_of_mastery text,
  application_in_project text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FEEDBACKS TABLE
create table public.feedbacks (
  id uuid default uuid_generate_v4() primary key,
  intern_id uuid references public.profiles(id) on delete cascade not null,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS)

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.progress_logs enable row level security;
alter table public.deliverables enable row level security;
alter table public.learning_topics enable row level security;

-- 1. Profiles: Admins can see all, Interns/Viewers can see all (to resolve names)
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);

-- 2. Tasks: Interns can see and edit their own tasks. Admins/Viewers can see all tasks.
create policy "Interns can view own tasks" on public.tasks for select using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'VIEWER'));
create policy "Interns can insert own tasks" on public.tasks for insert with check (auth.uid() = intern_id);
create policy "Interns can update own tasks" on public.tasks for update using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) = 'ADMIN');

-- 3. Progress Logs: Interns see/edit own logs. Admins/Viewers see all.
create policy "Interns can view own logs" on public.progress_logs for select using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'VIEWER'));
create policy "Interns can insert own logs" on public.progress_logs for insert with check (auth.uid() = intern_id);
create policy "Interns can update own logs" on public.progress_logs for update using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) = 'ADMIN');

-- 4. Deliverables: Interns see/edit own. Admins/Viewers see all.
create policy "Interns can view own deliverables" on public.deliverables for select using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'VIEWER'));
create policy "Interns can insert own deliverables" on public.deliverables for insert with check (auth.uid() = intern_id);
create policy "Interns can update own deliverables" on public.deliverables for update using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) = 'ADMIN');

-- 5. Learning Topics: Interns see/edit own. Admins/Viewers see all.
create policy "Interns can view own learning" on public.learning_topics for select using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) in ('ADMIN', 'VIEWER'));
create policy "Interns can insert own learning" on public.learning_topics for insert with check (auth.uid() = intern_id);
create policy "Interns can update own learning" on public.learning_topics for update using (auth.uid() = intern_id or (select role from public.profiles where id = auth.uid()) = 'ADMIN');

-- 6. Feedbacks: Everyone can view. Admins can insert/update.
create policy "Feedbacks viewable by everyone" on public.feedbacks for select using (true);
create policy "Admins can insert feedbacks" on public.feedbacks for insert with check (true);
create policy "Admins can update feedbacks" on public.feedbacks for update using (true);
create policy "Admins can delete feedbacks" on public.feedbacks for delete using (true);
