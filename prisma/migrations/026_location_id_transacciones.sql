-- =============================================================================
-- 026: location_id en las tablas transaccionales (flujo Empresario)
-- =============================================================================
-- Que resuelve: el Empresario tiene 1 empresa con N sucursales, y sus
-- transacciones, inventario y cierres pertenecen a una sucursal concreta. Con
-- "Todas las ubicaciones" la vista se consolida; con una sucursal elegida, la
-- UI filtra por location_id.
--
-- REQUISITO PREVIO: la 024 (company_location) tiene que estar aplicada. Esta
-- migracion no la crea.
--
-- POR QUE location_id QUEDA NULLABLE Y NO SE RELLENA:
-- No hay ninguna fuente de verdad historica que diga a que sucursal pertenecio
-- cada movimiento. Se podria inventar una sede "Principal" y atribuirla todo,
-- pero eso es fabrication de datos, no una migracion. La columna arranca en
-- NULL y la regla queda:
--     NULL  -> la fila es a nivel de EMPRESA, no de sucursal. Cuenta en la vista
--              consolidada, pero no aparece en el filtro de una sucursal.
-- Es el mismo criterio que la 023 aplico con company_id, por el mismo motivo.
--
-- QUE NO SE PONE location_id:
--     warehouse y product_location  -- no: la jerarquia es
--        company -> company_location (sucursal) -> warehouse (bodega)
--                 -> product_location (estante). Una bodega cuelga de una
--        sucursal, no al reves. Se enlaza en 026b, aparte.
--     product                     -- no: su stock se reparte por product_location
--                                    (estante) y por inventario_movement. Un
--                                    producto no pertenece a una sucursal.
--     Account, chart_of_accounts   -- no: el plan de cuentas es de la EMPRESA.
--                                    El plan de cuentas por sucursal no existe
--                                    como concepto y no debe inventarse.
--     BankAccount, company_bank_accounts -- no de momento: una cuenta bancaria
--                                    pertenece a la empresa. Repartirla entre
--                                    sucursales es una decision del cliente,
--                                    no una suposicion.
--
-- Por que esta lista es explicita y 025 no lo era: aqui el criterio NO es "todo
-- lo que tenga tenant_id", es "que tablas representan un movimiento economico
-- que el empresario podria atribuir a una sede". Meter product_location o el
-- plan de cuentas por criterio mecanico seria un error de modelo, no una
-- omision. Las que faltan de esta lista y si sean transaccionales, se agregan a
-- mano y con justificacion.
--
-- Tipos medidos: location_id es uuid, igual que company_location.id, que es
-- gen_random_uuid(). Y como en 025: los nombres van con quote_ident/%I porque
-- hay tablas que solo se distinguen por mayusculas.
--
-- Es idempotente. Prisma no la ejecuta sola: aplicarla en el SQL Editor.
-- =============================================================================

-- company_location tiene que existir. Si no, avisar y no hacer nada raro.
do $$
begin
  if to_regclass('public.company_location') is null then
    raise exception 'Falta la tabla company_location: aplica antes la migracion 024.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Helper: la sucursal por defecto de una empresa
-- -----------------------------------------------------------------------------
-- Se usa como TriggerFunction: si un INSERT llega sin location_id pero con
-- company_id, se le asigna la sede marcada is_default. Si no hay ninguna
-- marcada, se deja NULL (que significa "a nivel de empresa"), NO se elige
-- arbitrariamente la primera: adivinar mal una sucursal es peor que no tenerla.
create or replace function public.default_location_of_company(p_company text)
returns uuid
language sql stable as $$
  select l.id
  from public.company_location l
  where l.company_id = p_company
    and l.is_active
  order by l.is_default desc, l.created_at asc
  limit 1;
$$;

-- -----------------------------------------------------------------------------
-- location_id en las tablas transaccionales
-- -----------------------------------------------------------------------------
-- NOTA DE RIESGO CONOCIDO: se anade location_id a tablas que en este esquema
-- tienen convenciones de columna mezcladas (unas tenant_id, otras "tenantId",
-- InventoryItem ninguna). Aqui solo hace falta company_id, que 025 deja en
-- todas las que tienen tenant. Si alguna de estas NO tuviera company_id tras
-- aplicar la 025, el trigger de abajo no encontraria la columna y por eso cada
-- tabla se procesa en su propio bloque con aviso, no en silencio.
do $$
declare
  r      record;
  vistas text := '';
  fallos text := '';
  ok     integer := 0;
begin
  for r in
    select unnest(array[
      'Transaction', 'journal_entry', 'Invoice', 'InvoiceItem',
      'Purchase', 'PurchaseItem', 'PurchaseOrder', 'PurchaseOrderItem',
      'inventory_movement', 'inventory_adjustment', 'inventory_adjustment_item',
      'inventory_transfer', 'inventory_transfer_item',
      'AccountReceivable', 'AccountPayable', 'BookClosing', 'period_locks',
      'Reconciliation', 'payment_vouchers', 'payroll_vouchers', 'paymentreceipt',
      'recurring_entries', 'recurring_entry_executions', 'budget_lines',
      'itr_produccion', 'time_tracking', 'attendance'
    ]) as tabla
  loop
    if to_regclass(quote_ident(r.tabla)) is null then
      raise notice '   [no existe] %', r.tabla;
      continue;
    end if;

    if (select relkind from pg_class
         where oid = to_regclass(quote_ident(r.tabla))) not in ('r', 'p') then
      raise notice '   [es vista, se salta] %', r.tabla;
      continue;
    end if;

    begin
      execute format('alter table %I add column if not exists location_id uuid', r.tabla);
      ok := ok + 1;
    exception when others then
      fallos := fallos || format('%s[columna] %s; ', r.tabla, sqlerrm);
      continue;
    end;

    -- El indice va en su propio bloque: que falle el indice no debe impedir
    -- que la columna exista.
    begin
      execute format('create index if not exists %I on %I (location_id)',
        'idx_' || left(r.tabla, 40) || '_' || substr(md5(r.tabla), 1, 6) || '_loc',
        r.tabla);
    exception when others then
      fallos := fallos || format('%s[indice] %s; ', r.tabla, sqlerrm);
    end;
  end loop;

  raise notice 'location_id agregada en % tabla(s).', ok;
  if fallos <> '' then
    raise notice 'FALLOS parciales: %', fallos;
  else
    raise notice 'Sin fallos.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: heredar la sede por defecto
-- -----------------------------------------------------------------------------
-- Si NEW.location_id viene NULL pero NEW.company_id no, se busca la sede por
-- defecto de esa empresa.
--
-- OJO, por que el trigger NO se crea en todas las tablas de la lista: la funcion
-- toca NEW.company_id, y si la tabla no tiene esa columna, el error no salta al
-- CREAR el trigger sino en el proximo INSERT, en produccion y lejos de aqui. Por
-- eso antes se comprueba que la columna exista, y si no, se salta con aviso.
create or replace function public.trg_fill_location()
returns trigger
language plpgsql as $$
begin
  if new.location_id is null and new.company_id is not null then
    new.location_id := public.default_location_of_company(new.company_id);
  end if;
  return new;
exception when others then
  -- Que un trigger de convenience no puede impedir guardar un asiento.
  -- Se avisa y se deja la fila como venga, en vez de perder la transaccion.
  raise warning 'trg_fill_location en % no pudo asignar la sede: %', tg_table_name, sqlerrm;
  return new;
end;
$$;

do $$
declare
  r        record;
  fallos   text := '';
  n        integer := 0;
  saltadas text := '';
begin
  for r in
    select t.tabla
    from unnest(array[
      'Transaction', 'journal_entry', 'Invoice', 'InvoiceItem',
      'Purchase', 'PurchaseItem', 'PurchaseOrder', 'PurchaseOrderItem',
      'inventory_movement', 'inventory_adjustment', 'inventory_transfer',
      'AccountReceivable', 'AccountPayable', 'BookClosing',
      'Reconciliation', 'payment_vouchers', 'paymentreceipt',
      'recurring_entries', 'budget_lines', 'itr_produccion'
    ]) as t(tabla)
  loop
    if to_regclass(quote_ident(r.tabla)) is null then
      continue;
    end if;
    if (select relkind from pg_class
         where oid = to_regclass(quote_ident(r.tabla))) not in ('r', 'p') then
      continue;
    end if;

    -- La columna que el trigger necesita DEBE existir. Si 025 no le puso
    -- company_id a esta tabla, se salta en vez de crear un trigger que va a
    -- fallar en cada INSERT.
    if not exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = r.tabla
        and c.column_name = 'company_id'
    ) then
      saltadas := saltadas || r.tabla || ' ';
      continue;
    end if;

    begin
      execute format('drop trigger if exists trg_location_default on %I', r.tabla);
      execute format(
        'create trigger trg_location_default
           before insert on %I
           for each row
           execute function public.trg_fill_location()',
        r.tabla);
      n := n + 1;
    exception when others then
      fallos := fallos || format('%s %s; ', r.tabla, sqlerrm);
    end;
  end loop;

  raise notice 'Trigger de sede en % tabla(s).', n;
  if saltadas <> '' then
    raise notice 'SIN company_id, sin trigger (aplica la 025 antes de usar la sede): %', saltadas;
  end if;
  if fallos <> '' then
    raise notice 'FALLOS: %', fallos;
  end if;
end;
$$;
