-- Rode este script no SQL Editor do seu projeto Supabase (https://app.supabase.com)
-- Ele cria a tabela que guarda os dados de cada usuário (um JSON por conta,
-- protegido por Row Level Security para que cada pessoa só veja/edite o seu).

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "Usuários leem o próprio estado"
  on app_state for select
  using (auth.uid() = user_id);

create policy "Usuários criam o próprio estado"
  on app_state for insert
  with check (auth.uid() = user_id);

create policy "Usuários atualizam o próprio estado"
  on app_state for update
  using (auth.uid() = user_id);
