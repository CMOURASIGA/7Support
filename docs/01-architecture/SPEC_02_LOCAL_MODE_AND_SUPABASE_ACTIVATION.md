# SPEC 02 - modo local e ativação futura do Supabase

## Decisão temporária

Enquanto o projeto Supabase do 7Support não for provisionado, a SPEC 02 opera em **modo local de validação**. A sessão, os usuários de demonstração, os clientes e os vínculos com produtos são persistidos apenas no `localStorage` do navegador.

Esse modo permite validar o fluxo e a superfície por perfil, mas não é autenticação de produção e não oferece segurança contra alteração manual do navegador. Portanto:

- não utilizar dados reais;
- não considerar o isolamento local como RLS;
- não publicar senhas reais ou criar contas reais nele;
- não habilitar Ticket Core, anexos ou dados sensíveis antes da ativação abaixo.

As credenciais visíveis na tela de login são somente contas fictícias de demonstração. A sessão não guarda a senha.

## Estrutura local entregue

- `CLIENT`, `SUPPORT` e `ADMIN`;
- login, logout e recuperação da sessão após refresh;
- contexto de usuário, tenant e produtos autorizados;
- proteção visual de rota e página `/forbidden`;
- campos de preparação para integração: `external_*`, `identity_source` e `sync_status`;
- dois tenants de demonstração para validar que um CLIENT só recebe seu próprio contexto.

## Ativação posterior do Supabase

1. Criar o projeto Supabase de development e definir `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente da aplicação. A `SUPABASE_SERVICE_ROLE_KEY` fica somente em funções/server-side.
2. Criar os usuários no Supabase Auth. Nunca levar senha, hash ou credencial do LocalStorage para o Supabase ou para o 7Service.
3. Aplicar a migration abaixo com papel de proprietário do banco.
4. Trocar o adaptador `src/services/local-identity/store.ts` por repositórios Supabase e autenticação `@supabase/ssr`.
5. Migrar somente cadastros que tenham origem aprovada. Os IDs internos UUID do 7Support permanecem estáveis. Os campos externos continuam opcionais até a SPEC 11.
6. Executar os testes RLS com autenticação real, incluindo tentativa direta por REST usando o token de CLIENT A para acessar CLIENT B.

## Schema inicial a aplicar

```sql
create type public.support_role as enum ('CLIENT', 'SUPPORT', 'ADMIN');
create type public.identity_source as enum ('LOCAL', '7SERVICE');
create type public.sync_status as enum ('LOCAL_ONLY', 'PENDING', 'SYNCED', 'FAILED');

create table public.support_clients (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  status text not null default 'ACTIVE',
  external_client_id text unique null,
  identity_source public.identity_source not null default 'LOCAL',
  sync_status public.sync_status not null default 'LOCAL_ONLY',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.support_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete restrict,
  client_id uuid null references public.support_clients(id) on delete restrict,
  display_name text not null, email_snapshot text not null,
  role public.support_role not null,
  status text not null default 'ACTIVE',
  external_user_id text unique null,
  identity_source public.identity_source not null default 'LOCAL',
  sync_status public.sync_status not null default 'LOCAL_ONLY',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint client_role_requires_tenant check ((role = 'CLIENT' and client_id is not null) or (role in ('SUPPORT', 'ADMIN') and client_id is null))
);

create table public.support_products (
  id uuid primary key default gen_random_uuid(), code text unique not null, display_name text not null,
  status text not null default 'ACTIVE', external_product_id text unique null,
  identity_source public.identity_source not null default 'LOCAL',
  sync_status public.sync_status not null default 'LOCAL_ONLY',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.support_user_client_access (
  user_id uuid not null references public.support_users(id) on delete restrict,
  client_id uuid not null references public.support_clients(id) on delete restrict,
  role public.support_role not null default 'CLIENT',
  created_at timestamptz not null default now(), primary key (user_id, client_id)
);

create table public.support_user_product_access (
  user_id uuid not null references public.support_users(id) on delete restrict,
  client_id uuid not null references public.support_clients(id) on delete restrict,
  product_id uuid not null references public.support_products(id) on delete restrict,
  entitlement_status text not null default 'ACTIVE',
  external_client_id text null, external_product_id text null,
  source_updated_at timestamptz null, synced_at timestamptz null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id, product_id)
);
```

## Helpers e RLS obrigatórios

Aplicar as policies somente depois de criar os helpers. Eles resolvem a identidade pelo `auth.uid()` no banco e não aceitam papel ou tenant enviados pelo frontend.

```sql
create function public.current_support_user() returns public.support_users
language sql stable security definer set search_path = public
as $$ select * from public.support_users where auth_user_id = auth.uid() and status = 'ACTIVE' limit 1 $$;

create function public.is_support_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.support_users where auth_user_id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE') $$;

alter table public.support_clients enable row level security;
alter table public.support_users enable row level security;
alter table public.support_products enable row level security;
alter table public.support_user_client_access enable row level security;
alter table public.support_user_product_access enable row level security;

create policy "client reads own tenant" on public.support_clients for select using (
  id = (select client_id from public.current_support_user()) or public.is_support_admin()
);
create policy "user reads own profile" on public.support_users for select using (
  auth_user_id = auth.uid() or public.is_support_admin()
);
create policy "client reads authorized products" on public.support_products for select using (
  public.is_support_admin() or exists (
    select 1 from public.support_user_product_access a join public.support_users u on u.id = a.user_id
    where a.product_id = support_products.id and u.auth_user_id = auth.uid() and a.entitlement_status = 'ACTIVE'
  )
);
create policy "client reads own user product access" on public.support_user_product_access for select using (
  public.is_support_admin() or user_id = (select id from public.current_support_user())
);
create policy "client reads own user client access" on public.support_user_client_access for select using (
  public.is_support_admin() or user_id = (select id from public.current_support_user())
);
```

SUPPORT precisa receber políticas explícitas de fila somente na SPEC 04. Não conceder acesso global por conveniência nesta ativação.

## Critérios de aceite da ativação real

- token de CLIENT A não lê `support_clients`, acessos ou futuros tickets do CLIENT B;
- URL, payload e query manual não alteram `client_id`, `role`, `requester_user_id` ou produto permitido;
- `SUPPORT` não recebe administração global;
- `ADMIN` é explicitamente autorizado;
- service role não aparece no bundle nem em variáveis `NEXT_PUBLIC_*`;
- subscription/realtime futura respeita as mesmas RLS policies.
