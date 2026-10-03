-- =============================================================================
-- 025: company_id en TODAS las tablas que hoy solo filtran por tenant
-- =============================================================================
-- Que resuelve: la 023 puso company_id en 55 tablas, pero quedaron 96 sin ella.
-- Entre las que faltan estan justamente las que un Empresario necesita para su
-- vista consolidada y que un Contador NO debe ver mezcladas:
--     BookClosing, period_locks, Reconciliation, AccountReceivable,
--     AccountPayable, payment_vouchers, payroll_vouchers, recurring_entries,
--     ExchangeRate, Retentions, Withholding, budget_lines, journal_entry, ...
--
-- POR QUE DESCUBRE LAS TABLAS Y NO LAS ESCRIBE A MANO:
-- Hay 222 relaciones expuestas por PostgREST y es facil quedarse corta una
-- lista escrita a mano: lo que no este en la lista pasara inadvertido y volvera
-- a fallar el aislamiento en silencio. Esta migracion pregunta al catalogo
-- ("todo lo que tenga tenant_id o tenantId") y se aplica a lo que encuentre.
-- Las tablas que hoy solo se scopean por tenant son, por definicion, tablas que
-- deben separarse por empresa.
--
-- POR QUE ES PELIGROSO EL CASING:
-- En este esquema hay pares que SOLO se distinguen por el boxing y son tablas
-- distintas de verdad:
--     customer (1 fila)   !=  "Customer" (0 filas)
--     Account  (43 filas) !=  account (0 filas)
--     Transaction (50)    !=  transaction (0)
--     cai (3)             !=  CAI (0)
-- Postgres pliega a minusculas los identificadores SIN comillas. Por eso
-- `alter table Customer ...` no toca "Customer": toca customer, y como lleva
-- IF NOT EXISTS no da error: la migracion aparenta correr y la columna nunca
-- llega. Aqui cada nombre se resuelve con to_regclass(quote_ident(n)), que es
-- case-sensitive, y cada sentencia se arma con format('%I', ...), que respeta
-- el casing.
--
-- Ademas se comprueba pg_class.relkind y se saltan las VISTAS: 38 relaciones sin
-- company_id son vistas (libro_ventas, libro_mayor, balance_general,
-- estado_resultados, balanza_comprobacion, ...) y no admiten ADD COLUMN. Se
-- saltan CON AVISO, no en silencio.
--
-- LAS VISTAS QUEDAN FUERA A PROPOSITO, y no es un descuido: una vista no puede
-- tener columnas propias y sus resultados salen de las tablas base, que si se
-- van a aislar. Para que una vista deje de mezclar empresas hay que rehacer su
-- definicion (ver 027_rebuild_reporting_views.sql, pendiente). Hasta entonces,
-- una consulta a libro_ventas / estado_resultados / balance_general seguira
-- viendo datos de varias empresas: el riesgo pasa a ser de LECTURA en reportes,
-- no de escritura.
--
-- Tipos medidos, no supuestos: company_id es text en las 55 tablas que ya lo
-- tienen, porque companies.id es text. Y companies.id NO es siempre un uuid:
-- una de las empresas actuales es 'cVcLafoZitJmBOdSxNOlPgb0m'.
--
-- Es idempotente. Prisma no la ejecuta sola: aplicarla en el SQL Editor.
-- =============================================================================

-- Helper de la 023, recreado por si la 023 no llego a aplicarse.
-- "Mas antigua" = created_at mas bajo, desempatando por id (determinista).
-- Para TEST1DS da "test 1" (04:54:51.391, 5 s antes que "test 2").
create or replace function public.oldest_company_of_tenant(p_tenant text)
returns text
language sql stable as $$
  select c.id
  from public.companies c
  where c.tenant_id = p_tenant
  order by c.created_at asc nulls last, c.id asc
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- company_id en todo lo que tiene tenant_id o "tenantId" (descubierto)
-- -----------------------------------------------------------------------------
do $$
declare
  r        record;
  col_tenant text;
  vistas   text := '';
  fallos   text := '';
  ok       integer := 0;
  sin_emp  integer := 0;
begin
  for r in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name in ('tenant_id', 'tenantId')
    group by table_name
    order by table_name
  loop
    -- to_regclass(quote_ident()) resuelve el nombre EXACTO respetando el
    -- casing; devuelve NULL si la relacion no existe.
    if to_regclass(quote_ident(r.table_name)) is null then
      raise notice '   [no existe] %', r.table_name;
      continue;
    end if;

    -- relkind: 'r' tabla, 'p' particionada, 'v' vista, 'm' materializada.
    -- Solo 'r' y 'p' admiten ADD COLUMN.
    if (select relkind from pg_class
         where oid = to_regclass(quote_ident(r.table_name))) not in ('r', 'p') then
      vistas := vistas || r.table_name || ' ';
      continue;
    end if;

    -- Que columna de tenant usa esta tabla: hay tablas con tenant_id, con
    -- "tenantId", y con LAS DOS. Inyectar el nombre con %I, nunca con %L:
    -- %L lo convertiria en un literal de texto y el backfill no encontraria
    -- la columna.
    select case when bool_or(column_name = 'tenant_id') then 'tenant_id'
                else '"tenantId"' end
      into col_tenant
    from information_schema.columns
    where table_schema = 'public' and table_name = r.table_name
      and column_name in ('tenant_id', 'tenantId');

    if col_tenant is null then
      continue;
    end if;

    -- Cada sentencia va en su propio bloque: si el ALTER de la FK falla, no
    -- debe llevarse por delante la columna y el indice, que ya quedaron bien.
    begin
      execute format('alter table %I add column if not exists company_id text', r.table_name);
      ok := ok + 1;
    exception when others then
      fallos := fallos || format('%s[columna] %s; ', r.table_name, sqlerrm);
    end;

    begin
      execute format(
        'update %I set company_id = public.oldest_company_of_tenant(%I) where company_id is null',
        r.table_name, col_tenant);
    exception when others then
      fallos := fallos || format('%s[backfill] %s; ', r.table_name, sqlerrm);
    end;

    -- Los nombres de indice y de constraint se cortan a 63 caracteres
    -- (limite de Postgres) con un hash al final, para que dos tablas largas no
    -- colisionen al truncarse.
    begin
      execute format('create index if not exists %I on %I (company_id)',
        'idx_' || left(r.table_name, 40) || '_' || substr(md5(r.table_name), 1, 6) || '_ci',
        r.table_name);
    exception when others then
      fallos := fallos || format('%s[indice] %s; ', r.table_name, sqlerrm);
    end;

    begin
      execute format(
        'alter table %I add constraint %I foreign key (company_id)
           references public.companies(id) on delete set null',
        r.table_name,
        left(r.table_name, 40) || '_' || substr(md5(r.table_name), 1, 6) || '_company_fkey');
    exception when others then
      fallos := fallos || format('%s[FK] %s; ', r.table_name, sqlerrm);
    end;
  end loop;

  raise notice 'company_id agregada en % tabla(s).', ok;
  if vistas <> '' then
    raise notice 'VISTAS saltadas, no admiten ADD COLUMN (%): %', length(vistas), vistas;
  end if;
  if fallos <> '' then
    raise notice 'FALLOS parciales: %', fallos;
  else
    raise notice 'Sin fallos.';
  end if;
  raise notice 'Pendiente: rehacer las vistas de reportes para que filtren por company_id.';
end;
$$;
