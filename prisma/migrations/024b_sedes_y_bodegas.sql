-- =============================================================================
-- 024b: SEDES (company_location) Y VINCULO DE BODEGAS  -- OPCIONAL
-- =============================================================================
-- QUE HACE: crea una sede "Principal" por cada empresa que no tenga ninguna, y
-- enlaza cada bodega con la sede de su empresa.
--
-- POR QUE ESTA SEPARADA DE LA 024 y no dentro:
-- Crear una sede es INVENTAR un dato. El cliente puede tener tres sucursales
-- reales y llamar "Principal" a la sede de San Pedro. Si esto va dentro de la
-- 024, se aplica sin que nadie lo decida. Separada, se lee, se discute y se
-- aplica solo si tiene sentido. Lo mismo con el vinculo de bodegas: las 3
-- bodegas actuales no dicen a que sede pertenecen, asi que este script solo las
-- enlaza cuando la empresa tiene UNA sola sede, que es el unico caso en el que
-- la asignacion no es una suposicion. Con varias sedes, las deja sin tocar.
--
-- Es idempotente. Prisma no la ejecuta sola: aplicarla en el SQL Editor.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Una sede "Principal" por empresa que no tenga ninguna
-- -----------------------------------------------------------------------------
-- is_default = true: es la que heredan los INSERT que no digan ubicacion
-- (ver 026). Y la UI la ofrece por defecto en el selector.
insert into company_location (company_id, code, name, is_default, is_active)
select c.id, 'PRINCIPAL', 'Principal', true, true
from companies c
where not exists (
  select 1 from company_location l where l.company_id = c.id
)
on conflict (company_id, code) do nothing;

-- -----------------------------------------------------------------------------
-- 2. Enlazar bodegas con la sede, solo si la empresa tiene una unica sede
-- -----------------------------------------------------------------------------
-- Con 2+ sedes no hay forma de saber a cual va cada bodega, y adivinar deja
-- inventario en la sucursal equivocada: el reporte consolidado por sede daria
-- numeros que nadie puede defender. Se deja NULL y se avisa.
alter table warehouse add column if not exists location_id uuid;

update warehouse w
set location_id = l.id
from company_location l
where l.company_id = w.company_id
  and (select count(*) from company_location x where x.company_id = w.company_id) = 1
  and w.location_id is null;

create index if not exists idx_warehouse_location on warehouse (location_id);

-- -----------------------------------------------------------------------------
-- 3. Aviso: que bodegas quedan sin sede y por que
-- -----------------------------------------------------------------------------
do $$
declare
  h record;
begin
  for h in
    select w.name, w.company_id, c.name as empresa,
           (select count(*) from company_location x where x.company_id = w.company_id) as sedes
    from warehouse w
    join companies c on c.id = w.company_id
    where w.location_id is null
  loop
    raise notice 'BODEGA SIN SEDE: % (empresa %, % sede(s)) -> asignala a mano',
      h.name, h.empresa, h.sedes;
  end loop;
end;
$$;
