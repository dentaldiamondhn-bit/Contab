-- 046: `product_location.company_id` deja de guardar codigos de tenant
--
-- QUE HACE. Corre las 2 filas de `product_location` cuyo `company_id` vale
-- `'TEST1DS'` (un codigo de tenant) a los `companies.id` de verdad. Medido el
-- 7 Oct 2026: las 2 filas estan en la misma empresa de destino (test 1,
-- `8143dd4e-...`), empresa que ademas es la unica de TEST1DS con estantes.
--
--   id                                   name                                hoy      destino
--   20845b5f-8584-4c9b-8510-58a6065e7ddc  Bodega Principal - Estante B2      TEST1DS  test 1 (decidido por el usuario)
--   79d3d2bb-f4ef-4202-8991-a33b143212cc  Area de Refrigeracion - Estante C1 TEST1DS  test 1 (warehouse + producto)
--
-- POR QUE NO SE INFIERE POR TENANT (regla del proyecto). TEST1DS tiene DOS
-- empresas (test 1 y test 2), asi que `tenant_id = 'TEST1DS'` no decide. La
-- unica fuente legitima de empresa es la EVIDENCIA DIRECTA de cada fila o, si
-- no la hay, la DECISION EXPLICITA del usuario. En estas filas:
--
--   - C1 (79d3d2bb): warehouse_id -> warehouse(company_id)=test 1, y 1 producto
--     en el estante -> product(company_id)=test 1. Evidencia unica: test 1.
--   - B2 (20845b5f): sin warehouse_id, sin productos, sin movimientos. Sin
--     evidencia. Lo decidio el usuario (7 Oct 2026) porque es del mismo batch
--     y serie (UB-001/UB-002, mismo segundo) que C1, que si es test 1.
--
-- NUNCA INFIERE: aborta en vez de elegir si una fila rota (a) no esta en la
-- tabla de decision, (b) apunta a una empresa inexistente, (c) tiene evidencia
-- de 2+ empresas entre warehouse y productos, o (d) tiene 1 evidencia distinta
-- de la decidida. La decision del usuario se PISA solo si la evidencia esta de
-- acuerdo; si se contradicen, gana la evidencia y aborta con el nombre de la
-- fila para resolver a mano.
--
-- LO QUE NO TOCA. Las filas con `company_id` NULL no se tocan (el codigo las
-- trata como validas a nivel de empresa, `company_id.is.null` en
-- location-service.ts). El resto de columnas, igual. No escribe `warehouse_id`
-- de B2 aunque quede NULL: no hay con que deducirlo, y no se inventa.
--
-- IDEMPOTENTE. La segunda corrida encuentra 0 filas rotas, 0 afectadas, y el
-- post-check pasa. La decision del usuario queda codificada en la tabla de
-- decision, que es tambien la prueba de que la migracion no esta vieja.

-- ============================================================================
BEGIN;

DO $$
DECLARE
  v_tipo       text;
  v_rotas      int;
  v_sin_decidir int;
  v_mala       int;
  v_conflicto  int;
  v_afectadas  int;
  v_quedan     int;
  v_extraviada text;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 0. Precondiciones: la columna existe y es text (igual que 043/044/045).
  -- ---------------------------------------------------------------------------
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'product_location'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo IS NULL THEN
    RAISE EXCEPTION '046 ABORTA: product_location.company_id no existe. Falta la 017 (location_master).';
  END IF;
  IF v_tipo <> 'text' THEN
    RAISE EXCEPTION '046 ABORTA: product_location.company_id es % y se esperaba text.', v_tipo;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 1. Filas rotas: `company_id` que no existe en `companies`. Es exactamente
  --    la clase de defecto que esta migracion repara (hoy: las 2 de TEST1DS).
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_rotas
    FROM product_location p
   WHERE p.company_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = p.company_id);

  -- ---------------------------------------------------------------------------
  -- 2. Rota SIN decision explicita -> aborta: llegaria una fila rota nueva y la
  --    migracion estaria vieja. La tabla de decision es cerrada a proposito.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_sin_decidir
    FROM product_location p
   WHERE p.company_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = p.company_id)
     AND NOT EXISTS (
       SELECT 1 FROM (VALUES
         ('20845b5f-8584-4c9b-8510-58a6065e7ddc'::uuid),
         ('79d3d2bb-f4ef-4202-8991-a33b143212cc'::uuid)
       ) AS d(pl_id)
       WHERE d.pl_id = p.id
     );

  -- ---------------------------------------------------------------------------
  -- 3. La decision tiene que apuntar a una empresa que existe.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_mala
    FROM (VALUES
      ('20845b5f-8584-4c9b-8510-58a6065e7ddc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'),
      ('79d3d2bb-f4ef-4202-8991-a33b143212cc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a')
    ) AS d(pl_id, empresa)
    LEFT JOIN companies c ON c.id = d.empresa
   WHERE c.id IS NULL;

  -- ---------------------------------------------------------------------------
  -- 4. Cruz de la decision con la EVIDENCIA DIRECTA de cada fila: la bodega a
  --    la que apunta `warehouse_id` y las empresas de los productos que cuelgan
  --    del estante. (Tipos medidos via OpenAPI: warehouse.id es uuid, por eso
  --    el `w.id::text`; product.location_id y product_location.warehouse_id son
  --    text ya.) Manda la evidencia sobre la decision: si una fila a reparar
  --    tiene 2+ empresas de evidencia, o tiene 1 distinta de la decidida, es un
  --    conflicto y aborta. Sin evidencia (B2), manda la decision del usuario.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_conflicto
    FROM (VALUES
      ('20845b5f-8584-4c9b-8510-58a6065e7ddc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'),
      ('79d3d2bb-f4ef-4202-8991-a33b143212cc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a')
    ) AS d(pl_id, empresa)
   WHERE
     (
       SELECT count(DISTINCT e.empresa)
         FROM (
           SELECT w.company_id AS empresa FROM warehouse w WHERE w.id::text = d.pl_id::text
           UNION ALL
           SELECT pr2.company_id AS empresa FROM product pr2 WHERE pr2.location_id = d.pl_id::text
         ) e
     ) > 1
     OR (
       SELECT count(DISTINCT e.empresa)
         FROM (
           SELECT w.company_id AS empresa FROM warehouse w WHERE w.id::text = d.pl_id::text
           UNION ALL
           SELECT pr2.company_id AS empresa FROM product pr2 WHERE pr2.location_id = d.pl_id::text
         ) e
     ) = 1
     AND (
       SELECT min(e.empresa)
         FROM (
           SELECT w.company_id AS empresa FROM warehouse w WHERE w.id::text = d.pl_id::text
           UNION ALL
           SELECT pr2.company_id AS empresa FROM product pr2 WHERE pr2.location_id = d.pl_id::text
         ) e
     ) IS DISTINCT FROM d.empresa;

  IF v_sin_decidir > 0 THEN
    RAISE EXCEPTION '046 ABORTA: % fila(s) rota(s) sin decision en la tabla de reparacion. No se adivina; agrega la fila con su empresa.', v_sin_decidir;
  END IF;
  IF v_mala > 0 THEN
    RAISE EXCEPTION '046 ABORTA: la tabla de reparacion apunta a % empresa(s) inexistente(s) en companies.', v_mala;
  END IF;
  IF v_conflicto > 0 THEN
    RAISE EXCEPTION '046 ABORTA: % fila(s) de la decision cuya evidencia directa contradice la decision o apunta a 2+ empresas. La evidencia no se pisa; resolver a mano.', v_conflicto;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. El UPDATE: solo las filas de la decision que aun no la tienen puesta.
  --    `IS DISTINCT FROM` para que el UPDATE no toque filas ya correctas.
  -- ---------------------------------------------------------------------------
  WITH d AS (
    SELECT * FROM (VALUES
      ('20845b5f-8584-4c9b-8510-58a6065e7ddc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'),
      ('79d3d2bb-f4ef-4202-8991-a33b143212cc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a')
    ) AS v(pl_id, empresa)
  )
  UPDATE product_location p
     SET company_id = d.empresa
    FROM d
   WHERE p.id = d.pl_id
     AND p.company_id IS DISTINCT FROM d.empresa;
  GET DIAGNOSTICS v_afectadas = ROW_COUNT;
  RAISE NOTICE '046: % fila(s) rota(s); % corregida(s).', v_rotas, v_afectadas;

  -- ---------------------------------------------------------------------------
  -- 6. POST-CHECK (corre siempre): 0 filas con company_id invalido, y las 2
  --    filas de la decision con la empresa decidida.
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_quedan
    FROM product_location p
   WHERE p.company_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = p.company_id);

  IF v_quedan <> 0 THEN
    RAISE EXCEPTION '046 POST-CHECK: quedan % fila(s) con company_id que no existe en companies.', v_quedan;
  END IF;

  SELECT p.id INTO v_extraviada
    FROM product_location p
    JOIN (VALUES
      ('20845b5f-8584-4c9b-8510-58a6065e7ddc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'),
      ('79d3d2bb-f4ef-4202-8991-a33b143212cc'::uuid, '8143dd4e-a4ef-4619-87a2-0504d0c8c46a')
    ) AS d(pl_id, empresa) ON d.pl_id = p.id
   WHERE p.company_id IS DISTINCT FROM d.empresa
   LIMIT 1;

  IF v_extraviada IS NOT NULL THEN
    RAISE EXCEPTION '046 POST-CHECK: la fila % no quedo con la empresa decidida.', v_extraviada;
  END IF;

  RAISE NOTICE '046 OK: product_location queda con %, filas corregidas %.', v_quedan, v_afectadas;
END $$;

COMMIT;
