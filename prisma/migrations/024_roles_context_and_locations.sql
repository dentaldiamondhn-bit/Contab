-- =============================================================================
-- 024: CONTEXTO DE USUARIO POR ROL (Contador / Empresario) + UBICACIONES
-- =============================================================================
-- Que resuelve: los dos flujos del onboarding.
--
--   CONTADOR   -> administra N empresas. Cada empresa es una unidad de
--                 aislamiento TOTAL (su propia contabilidad, su propio plan de
--                 cuentas, su config fiscal). NO existe vista consolidada entre
--                 empresas de un contador.
--   EMPRESARIO -> posee 1 empresa, que puede tener N ubicaciones/sucursales.
--                 SI puede ver sus datos consolidados (sumando sus ubicaciones).
--
-- Decisiones tomadas (ver docs/AISLAMIENTO_EMPRESAS.md):
--   1. La frontera de aislamiento es company_id. tenant_id solo agrupa.
--      NO se deshace la 023: ~50 tablas ya tienen company_id y depende de el.
--   2. Las ubicaciones son una tabla NUEVA, no se reutiliza warehouse.
--      Motivo: warehouse es una BODEGA y product_location un ESTANTE dentro de
--      una bodega. Una sucursal no es una bodega: puede tener N bodegas, y una
--      bodega no puede emitir facturas por una sede. La jerarquia queda:
--        company -> company_location (sucursal) -> warehouse (bodega)
--                 -> product_location (estante)
--      Por eso la tabla se llama company_location y no location: ya existe
--      product_location (creada en 017) y el nombre "location" solo generaria
--      confusiones.
--
-- HALLAZGO QUE IMPONE CUIDADO: en este esquema hay tablas que solo se distinguen
-- por mayusculas y son DISTINTAS de verdad:
--     customer (1 fila)  !=  "Customer" (0 filas)
--     Account  (43 filas) !=  account (0 filas)
--     Transaction (50)    !=  transaction (0)
--     cai (3)             !=  CAI (0)
-- Postgres pliega a minusculas cualquier identificador SIN comillas, asi que
--     ALTER TABLE Customer ADD COLUMN IF NOT EXISTS company_id
-- no toca "Customer": toca customer. Y como lleva IF NOT EXISTS, NO DA ERROR:
-- la migracion "pasa" mientras la tabla real queda sin la columna. Por eso
-- TODA referencia a "User" va entrecomillada. Es el mismo modo de fallo que
-- rompio la 023 (suponer uuid donde hay text).
--
-- Tipos medidos contra la BD, no supuestos: companies.id, "User".id y
-- Tenant.id son TODOS text (User.id parece uuid pero es text, y companies.id
-- incluye valores como 'cVcLafoZitJmBOdSxNOlPgb0m'). Por eso las FK son text.
--
-- Es idempotente. Prisma no la ejecuta sola: aplicarla en el SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. company_location: la sucursal / sede del Empresario
-- -----------------------------------------------------------------------------
-- Se deja VACIA a proposito. Crear una sede "Principal" automatica por empresa
-- inventaria datos que el usuario no declaro. El seed opcional esta en
-- 024b_seed_company_locations.sql, aparte, para que la decision sea explicita.
create table if not exists company_location (
  id          uuid primary key default gen_random_uuid(),
  company_id  text not null references companies(id) on delete cascade,
  code        text not null,
  name        text not null,
  address     text,
  phone       text,
  is_active   boolean not null default true,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  -- El codigo es unico DENTRO de la empresa, no global: dos empresas pueden
  -- tener cada una su "01 - Central".
  constraint company_location_company_code_key unique (company_id, code)
);

create index if not exists idx_company_location_company
  on company_location (company_id);

-- Indice parcial: el selector de ubicaciones casi siempre pregunta por las
-- activas, y sobre 3 filas no importa, pero sobre 3000 si.
create index if not exists idx_company_location_activas
  on company_location (company_id) where is_active;

comment on table company_location is
  'Sucursal/sede. Escribe una ubicacion por fila. company_id es la frontera de aislamiento.';

-- -----------------------------------------------------------------------------
-- 2. user_company_access: la membresia que habilita los dos roles
-- -----------------------------------------------------------------------------
-- POR QUE UNA TABLA NUEVA y no las que ya existen:
--   accountant_managed_companies tiene accountant_id, company_name, rtn, ...
--   pero NO guarda el companies.id: es un duplicado del cliente como TEXTO, no
--   un vinculo. Con 0 filas y sin FK, no puede ser la fuente de permisos.
--   onboarding_companies y business_units tambien estan vacias y tienen otra
--   forma. Se reaprovecha accountant_profiles para los datos profesionales del
--   contador, pero la membresia se modela aqui.
--
-- Un solo modelo para los dos roles, porque en los dos el resultado es
-- "este usuario puede entrar a esta empresa":
--   Contador   -> N filas (una por empresa que administra), relationship='accountant'
--   Empresario -> 1 fila,                            relationship='owner'
create table if not exists user_company_access (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references "User"(id) on delete cascade,
  company_id   text not null references companies(id) on delete cascade,
  relationship text not null default 'owner'
                 check (relationship in ('owner', 'accountant', 'viewer')),
  -- Para que la UI abra en la ultima empresa usada y no pida elegir siempre.
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  -- Un usuario no puede tener dos filas para la misma empresa; la relacion
  -- ("es dueno o es contador?") es una sola.
  constraint user_company_access_user_company_key unique (user_id, company_id)
);

create index if not exists idx_uca_user    on user_company_access (user_id);
create index if not exists idx_uca_company on user_company_access (company_id);

comment on table user_company_access is
  'Membresia usuario<->empresa. Base de los dos flujos: contador (N empresas) y empresario (1 empresa).';

-- -----------------------------------------------------------------------------
-- 3. Backfill: convertir el tenant unico actual en membresia real
-- -----------------------------------------------------------------------------
-- "User" tiene un unico tenantid, asi que hoy NO se puede expresses que un
-- contador administra varias empresas. Se arregla traduciendo:
--     User.tenantid  ->  las empresas de companies con ese tenant_id
--
-- El relationship se deduce de la cantidad de empresas del tenant, que es
-- exactamente la distincion de los dos flujos del onboarding:
--     1 empresa  -> 'owner'      (Empresario: una empresa, N sucursales)
--     N empresas -> 'accountant' (Contador: varias, sin vista consolidada)
do $$
declare
  u        record;
  n_empresas integer;
  n_insertadas integer := 0;
begin
  for u in select id, tenantid from "User" where tenantid is not null loop
    select count(*) into n_empresas from companies where tenant_id = u.tenantid;

    if n_empresas = 0 then
      raise notice 'OJO: usuario % tiene tenant % que no existe en companies. Sin acceso.',
        left(u.id::text, 8), u.tenantid;
    else
      insert into user_company_access (user_id, company_id, relationship, is_default)
      select u.id, c.id,
             case when n_empresas = 1 then 'owner' else 'accountant' end,
             -- Solo una empresa puede ser la por defecto, y solo tiene sentido
             -- en el flujo de empresario. En multi-empresa la UI debe pedir.
             (n_empresas = 1)
      from companies c
      where c.tenant_id = u.tenantid
      on conflict (user_id, company_id) do nothing;

      get diagnostics n_insertadas = row_count;
      raise notice 'Usuario % (tenant %): % empresa(s) -> relationship=%',
        left(u.id::text, 8), u.tenantid, n_empresas,
        case when n_empresas = 1 then 'owner' else 'accountant' end;
    end if;
  end loop;
  raise notice 'Backfill user_company_access: % membresia(s) creada(s).', n_insertadas;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Aviso de lo que falta: tenants con empresas que NADIE tiene asignadas
-- -----------------------------------------------------------------------------
-- Una empresa sin membresia es inalcanzable por la UI. Se reporta en vez de
-- inventar un dueno.
do $$
declare
  huerfana record;
begin
  for huerfana in
    select c.tenant_id, c.name, c.id
    from companies c
    where not exists (
      select 1 from user_company_access uca where uca.company_id = c.id
    )
  loop
    raise notice 'EMPRESA SIN MIEMBRO: % (tenant %) id=% -- nadie puede entrar todavia',
      huerfana.name, huerfana.tenant_id, left(huerfana.id::text, 8);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5. RLS en las tablas nuevas
-- -----------------------------------------------------------------------------
-- OJO, esto NO es lo que protege hoy el sistema: lib/supabase/server-lazy.ts y
-- lib/supabase-db.ts usan SUPABASE_SERVICE_ROLE_KEY, que salta RLS. El
-- aislamiento real lo hace el codigo de aplicacion.
--
-- Se activa igual como defensa en profundidad, y porque YA existe una via que
-- si respeta RLS: lib/supabase-client-jwt.ts (JWT de Clerk). Sin politica, esa
-- via se quedaria sin poder leer estas tablas nuevas.
--
-- Clerk no usa auth.uid() como User.id: el JWT trae 'user_2xxx' y User.id es
-- un uuid, asi que la politica tiene que pasar por User.authid.
alter table company_location     enable row level security;
alter table user_company_access   enable row level security;

drop policy if exists company_location_select on company_location;
create policy company_location_select on company_location
  for select to authenticated
  using (
    company_id in (
      select uca.company_id from user_company_access uca
      join "User" u on u.id = uca.user_id
      where u.authid = auth.uid()::text
    )
  );

drop policy if exists user_company_access_select on user_company_access;
create policy user_company_access_select on user_company_access
  for select to authenticated
  using (
    user_id in (select u.id from "User" u where u.authid = auth.uid()::text)
  );

-- Sin politica de escritura: por ahora la escritura pasa por el service role.
-- Abrirla sin decidir quien puede dar de alta una membresia seria dejar el
-- Contador decide sobre que empresas administra cualquiera que se autentique.
