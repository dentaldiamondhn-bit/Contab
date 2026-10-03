-- =============================================================================
-- 023: AISLAMIENTO POR EMPRESA (company_id), no solo por tenant
-- =============================================================================
-- Por que: un tenant puede tener VARIAS empresas (ej. TEST1DS tiene "test 1" y
-- "test 2" con RTN distinto). Las tablas de negocio solo filtraban por
-- tenant_id, asi que esas empresas compartian inventario, facturas y libro
-- contable. Para que no compartan nada, el isolation key pasa a ser company_id.
--
-- Hallazgo previo: la columna company_id YA existia en varias tablas pero con
-- dos convenciones distintas. En product/Invoice/Account guardaba el UUID de
-- companies.id; en cai/warehouse/Transaction/Purchase/talonarios guardaba el
-- CODIGO del tenant. Esta migracion normaliza todo a companies.id.
--
-- CONVENCIONES (medidas contra la BD, no suponidas):
--   product, cai, warehouse, bankaccount, customer, inventory_movement,
--   "File", Purchase, talonarios      -> tenant_id
--   Invoice, Transaction, JournalEntry -> "tenantId"   (Prisma camelCase)
--   Account, Transaction, JournalEntry, "File" -> ambos (duplicado historico)
--   InvoiceItem, paymentlink           -> ninguno; cuelgan de Invoice
-- Por eso el backfill va en tres grupos y hay dos funciones de trigger: una
-- funcion generica que usa NEW.tenant_id fallaria en Invoice (que solo tiene
-- "tenantId"), porque PL/pgSQL no encuentra el campo.
--
-- Es idempotente. Prisma no la ejecuta sola: aplicarla en el SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper: empresa mas antigua de un tenant
--    "Mas antigua" = created_at mas bajo, desempatando por id (determinista).
--    Para TEST1DS da "test 1" (04:54:51.391, 5 s antes que "test 2").
-- -----------------------------------------------------------------------------
-- TIPOS (medidos con el OpenAPI de PostgREST, no supuestos):
--   companies.id     -> text
--   Invoice.id       -> text
--   product.id       -> uuid
--   company_id (ya)  -> text / varchar
-- Por eso company_id es **text**, no uuid: si se declarara uuid, Postgres no
-- podria hacer el cast desde companies.id y la migracion fallaria entera.
-- El esquema es mixto, asi que no se puede asumir un tipo unico.

create or replace function public.oldest_company_of_tenant(p_tenant text)
returns text
language sql
stable
as $$
  select c.id::text
  from public.companies c
  where c.tenant_id = p_tenant
  order by c.created_at asc nulls last, c.id asc
  limit 1;
$$;

comment on function public.oldest_company_of_tenant(text) is
  'companies.id (text) de la empresa mas antigua del tenant. Atribuye filas huerfanas.';


-- -----------------------------------------------------------------------------
-- 1. company_id donde NO existia. Sin la columna no hay aislamiento posible.
--    text, para igualar las que ya existen.
-- -----------------------------------------------------------------------------
alter table public.bankaccount         add column if not exists company_id text;
alter table public.customer            add column if not exists company_id text;
alter table public.inventory_movement  add column if not exists company_id text;
alter table public."File"              add column if not exists company_id text;
alter table public.paymentlink         add column if not exists company_id text;

-- OJO con paymentlink: ya tenia `invoice_id` (uuid) y `tenant_id` (varchar), y NO
-- se le anaden columnas. Motivo: `Invoice.id` es **text**, asi que un
-- `invoice_id uuid` no puede referenciarlo —`where f.id = p.invoice_id` da
-- "operator does not exist: text = uuid"— y por eso esa columna no tiene ninguna
-- FK. El vinculo real con la factura es `invoice_number` = `Invoice."invoiceNumber"`
-- (ambos texto), que es el que usa el backfill de 2d.

create index if not exists bankaccount_company_id_idx        on public.bankaccount(company_id);
create index if not exists customer_company_id_idx           on public.customer(company_id);
create index if not exists inventory_movement_company_id_idx on public.inventory_movement(company_id);
create index if not exists file_company_id_idx               on public."File"(company_id);
create index if not exists paymentlink_company_id_idx        on public.paymentlink(company_id);


-- -----------------------------------------------------------------------------
-- 2. Backfill
--    Si company_id es NULL o no es un companies.id valido -> empresa mas
--    antigua del tenant. Si el tenant no tiene ninguna empresa, queda NULL:
--    no se inventa, queda a decision del usuario.
-- -----------------------------------------------------------------------------

-- 2a) Tablas que SOLO tienen tenant_id (snake). paymentlink entra aqui: tiene
--     tenant_id varchar. Se afina despues en 2d con el numero de factura.
--     File NO va aqui: tiene las dos columnas, le toca 2c.
do $$
declare
  t text;
  tablas text[] := array[
    'product', 'cai', 'warehouse', 'bankaccount', 'customer',
    'inventory_movement', 'Purchase', 'talonarios', 'paymentlink'
  ];
begin
  foreach t in array tablas loop
    execute format($f$
      update public.%1$I c
      set company_id = public.oldest_company_of_tenant(c.tenant_id)
      where c.company_id is null
         or not exists (select 1 from public.companies x where x.id = c.company_id)
    $f$, t);
    raise notice 'backfill %: % filas', t, found;
  end loop;
end;
$$;

-- 2b) Tablas que SOLO tienen "tenantId" (camel, Prisma). Medido: Invoice no
--     tiene tenant_id. Company_id primero, para no pisar el caso en que
--     "tenantId" este mal pero company_id sea bueno.
do $$
declare
  t text;
  tablas text[] := array['Invoice'];
begin
  foreach t in array tablas loop
    execute format($f$
      update public.%1$I c
      set company_id = public.oldest_company_of_tenant(c."tenantId")
      where c.company_id is null
         or not exists (select 1 from public.companies x where x.id = c.company_id)
    $f$, t);
    raise notice 'backfill %: % filas', t, found;
  end loop;
end;
$$;

-- 2c) Tablas con LAS DOS columnas (duplicado historico). Medido: Account,
--     Transaction, JournalEntry y "File". company_id manda si es valido.
do $$
declare
  t text;
  tablas text[] := array['Account', 'Transaction', 'JournalEntry', 'File'];
begin
  foreach t in array tablas loop
    execute format($f$
      update public.%1$I c
      set company_id = public.oldest_company_of_tenant(coalesce(c.tenant_id, c."tenantId"))
      where c.company_id is null
         or not exists (select 1 from public.companies x where x.id = c.company_id)
    $f$, t);
    raise notice 'backfill %: % filas', t, found;
  end loop;
end;
$$;

-- 2d) InvoiceItem y paymentlink: se afinan con la factura a la que apuntan.
--     InvoiceItem por "invoiceId" (text = text).
--     paymentlink por `invoice_number` = Invoice."invoiceNumber" (los dos varchar).
--     NO por `invoice_id`: esa columna es uuid y `Invoice.id` es text, asi que
--     comparar cualquiera de los dos lanza "operator does not exist: text = uuid".
update public."InvoiceItem" i
set company_id = f.company_id
from public."Invoice" f
where f.id = i."invoiceId"
  and (i.company_id is null
       or not exists (select 1 from public.companies x where x.id = i.company_id));

update public.paymentlink p
set company_id = f.company_id
from public."Invoice" f
where f."invoiceNumber" = p.invoice_number
  and (p.company_id is null
       or not exists (select 1 from public.companies x where x.id = p.company_id));


-- -----------------------------------------------------------------------------
-- 3. Trigger: toda fila nueva hereda company_id de su tenant
--    Sin esto el aislamiento se pudre: el proximo INSERT que solo mande
--    tenant_id deja la fila sin empresa y reaparece el bug. Si el INSERT trae
--    company_id, se respeta.
-- -----------------------------------------------------------------------------
create or replace function public.set_company_id_from_tenant_id()
returns trigger language plpgsql as $$
begin
  if new.company_id is null and new.tenant_id is not null then
    new.company_id := public.oldest_company_of_tenant(new.tenant_id);
  end if;
  return new;
end;
$$;
create or replace function public.set_company_id_from_tenantid()
returns trigger language plpgsql as $$
begin
  if new.company_id is null and new."tenantId" is not null then
    new.company_id := public.oldest_company_of_tenant(new."tenantId");
  end if;
  return new;
end;
$$;

-- 3a) trigger para las de tenant_id (snake)
do $$
declare
  t text;
  tablas text[] := array[
    'product', 'cai', 'warehouse', 'bankaccount', 'customer',
    'inventory_movement', 'Purchase', 'talonarios'
  ];
begin
  foreach t in array tablas loop
    execute format($f$
      drop trigger if exists trg_set_company_id on public.%1$I;
      create trigger trg_set_company_id
        before insert or update of tenant_id on public.%1$I
        for each row execute function public.set_company_id_from_tenant_id();
    $f$, t);
  end loop;
end;
$$;

-- 3b) trigger para las que SOLO tienen "tenantId" (camel)
do $$
declare
  t text;
  tablas text[] := array['Invoice'];
begin
  foreach t in array tablas loop
    execute format($f$
      drop trigger if exists trg_set_company_id on public.%1$I;
      create trigger trg_set_company_id
        before insert or update of "tenantId" on public.%1$I
        for each row execute function public.set_company_id_from_tenantid();
    $f$, t);
  end loop;
end;
$$;

-- 3c) Account, Transaction, JournalEntry y "File": tienen las dos, se cubren
--     con los dos triggers (cualquiera de las dos columnas las rellena).
do $$
declare
  t text;
  tablas text[] := array['Account', 'Transaction', 'JournalEntry', 'File'];
begin
  foreach t in array tablas loop
    execute format($f$
      drop trigger if exists trg_set_company_id on public.%1$I;
      create trigger trg_set_company_id
        before insert or update on public.%1$I
        for each row execute function public.set_company_id_from_tenant_id();
      drop trigger if exists trg_set_company_id_camel on public.%1$I;
      create trigger trg_set_company_id_camel
        before insert or update on public.%1$I
        for each row execute function public.set_company_id_from_tenantid();
    $f$, t);
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. Indices para el filtro por empresa (el hot path de las rutas)
-- -----------------------------------------------------------------------------
create index if not exists product_company_id_idx        on public.product(company_id);
create index if not exists invoice_company_id_idx        on public."Invoice"(company_id);
create index if not exists invoice_item_company_id_idx   on public."InvoiceItem"(company_id);
create index if not exists cai_company_id_idx            on public.cai(company_id);
create index if not exists warehouse_company_id_idx      on public.warehouse(company_id);
create index if not exists account_company_id_idx        on public."Account"(company_id);
create index if not exists transaction_company_id_idx    on public."Transaction"(company_id);
create index if not exists journal_entry_company_id_idx  on public."JournalEntry"(company_id);
create index if not exists purchase_company_id_idx       on public."Purchase"(company_id);
create index if not exists talonarios_company_id_idx     on public.talonarios(company_id);

-- Compuestos: casi todas las consultas filtran empresa + tenant a la vez.
create index if not exists product_company_tenant_idx        on public.product(company_id, tenant_id);
create index if not exists invoice_company_tenant_idx        on public."Invoice"(company_id, "tenantId");
create index if not exists transaction_company_tenant_idx    on public."Transaction"(company_id, "tenantId");
create index if not exists journal_entry_company_tenant_idx  on public."JournalEntry"(company_id, "tenantId");


-- -----------------------------------------------------------------------------
-- 5. Reporte: que quedo sin atribuir
--    Ojo con esto: si aparece un tenant como 'tenant_001' o 'DENTALWD' es que
--    esa fila apunta a un tenant que NO existe en companies, y por eso no se
--    pudo deducir su empresa. Hay que decidirla a mano.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tablas text[] := array[
    'product', 'Invoice', 'cai', 'warehouse', 'Account', 'Transaction',
    'JournalEntry', 'Purchase', 'talonarios', 'bankaccount', 'customer',
    'inventory_movement', 'File', 'InvoiceItem', 'paymentlink'
  ];
  tiene_snake boolean;
  tiene_camel boolean;
  expr text;
  n bigint;
  tenants text;
begin
  foreach t in array tablas loop
    -- Que convencion de tenant tiene esta tabla (las hay de tres tipos).
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'tenant_id'
    ) into tiene_snake;

    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'tenantId'
    ) into tiene_camel;

    expr := case
      when tiene_snake and tiene_camel then 'coalesce(c.tenant_id, c."tenantId")'
      when tiene_snake                then 'c.tenant_id'
      when tiene_camel                then 'c."tenantId"'
    end;

    if expr is null then
      -- Sin columna de tenant: se cuentan igual, pero no se puede decir de quien.
      execute format('select count(*) from public.%1$I where company_id is null', t) into n;
      if n > 0 then
        raise notice 'PENDIENTE % filas sin company_id en % (no tiene columna de tenant)', n, t;
      end if;
    else
      execute format('select count(*) from public.%1$I c where c.company_id is null', t) into n;
      if n > 0 then
        -- OJO: el nombre de la tabla va SIEMPRE dentro de format(). Poner un
        -- %1$I suelto en el cuerpo del DO no se sustituye: Postgres lo lee como
        -- SQL y da "syntax error at or near %" en la linea del FROM.
        execute format(
          'select string_agg(distinct (%2$s)::text, '', '') from public.%1$I c where c.company_id is null',
          t, expr
        ) into tenants;
        raise notice 'PENDIENTE % filas sin company_id en % -- tenants: %', n, t, tenants;
      end if;
    end if;
  end loop;
  raise notice 'Backfill 023 terminado.';
end;
$$;
