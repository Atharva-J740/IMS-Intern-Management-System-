-- Allow users to insert their own profile during sign up
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Create a trigger to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', 'New Intern'), coalesce(new.raw_user_meta_data->>'role', 'INTERN'));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- FEEDBACKS TABLE
create table public.feedbacks (
  id uuid default uuid_generate_v4() primary key,
  intern_id uuid references public.profiles(id) on delete cascade not null,
  admin_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for feedbacks
alter table public.feedbacks enable row level security;

-- Policies for feedbacks
create policy "Feedbacks viewable by everyone" on public.feedbacks for select using (true);
create policy "Admins can insert feedbacks" on public.feedbacks for insert with check (true);
create policy "Admins can update feedbacks" on public.feedbacks for update using (true);
create policy "Admins can delete feedbacks" on public.feedbacks for delete using (true);
