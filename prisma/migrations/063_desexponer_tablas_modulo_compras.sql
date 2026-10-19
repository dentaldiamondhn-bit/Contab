-- 063_desexponer_tablas_modulo_compras.sql
--
-- Complemento de la 062. La 062 solo cambia los DEFAULT privileges (objetos
-- FUTUROS) y a proposito NO toca las tablas existentes. Pero las tablas del
-- modulo de Compras/Ordenes creadas por las migraciones recientes SI quedaron
-- con el GRANT viejo del Data API (anon/authenticated), porque se crearon antes
-- de la 062. La app solo las usa desde el servidor (service_role) y ya tienen
-- RLS activado con politica solo para service_role; esta migracion cierra
-- ademas el GRANT de tabla a los roles publicos del Data API.
--
-- Tablas (059/060/061 + las del modulo de Ordenes de Compra):
--   PurchaseOrder, PurchaseOrderItem, PurchaseOrderReceipt,
--   PurchaseOrderReceiptItem, PurchaseReturn, PurchaseReturnItem,
--   PurchaseApprover
--
-- Que NO toca:
--   * `Purchase` (existe desde antes y una pantalla cliente sube adjuntos con
--     la anon key) ni `PurchaseItem`.
--   * Ninguna otra tabla existente.
--
-- Ojo con un caso: `components/purchasing/PurchaseOrdersManager.tsx` es un
-- componente cliente que lee `PurchaseOrder` con la anon key, pero esta
-- HUERFANO (no lo importa nadie). Hoy no afecta a ninguna pantalla viva; si
-- algun dia se reactiva, habria que darle una ruta /api (o un grant puntual).
--
-- Idempotente y tolerante al orden: si alguna tabla aun no existe (059/060/061
-- sin aplicar), se omite con un NOTICE en vez de abortar. Conviene correr la
-- 063 DESPUES de 059/060/061; o volver a correrla despues (no hace dano).

BEGIN;

-- Guarda de existencia + REVOKE/GRANT + post-check, tabla por tabla.
DO $$
DECLARE
  t text;
  v_tablas text[] := ARRAY[
    'PurchaseOrder',
    'PurchaseOrderItem',
    'PurchaseOrderReceipt',
    'PurchaseOrderReceiptItem',
    'PurchaseReturn',
    'PurchaseReturnItem',
    'PurchaseApprover'
  ];
  v_fuga int := 0;
  v_sin_acceso int := 0;
BEGIN
  FOREACH t IN ARRAY v_tablas LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE '063: la tabla % no existe todavia; se omite', t;
      CONTINUE;
    END IF;

    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);

    IF has_table_privilege('anon', format('public.%I', t), 'SELECT')
       OR has_table_privilege('authenticated', format('public.%I', t), 'SELECT') THEN
      v_fuga := v_fuga + 1;
    END IF;

    IF NOT has_table_privilege('service_role', format('public.%I', t), 'SELECT') THEN
      v_sin_acceso := v_sin_acceso + 1;
    END IF;

    RAISE NOTICE '063: % cerrada a anon/authenticated (service_role conserva acceso)', t;
  END LOOP;

  IF v_fuga > 0 THEN
    RAISE EXCEPTION '063: % tabla(s) siguen accesibles a anon/authenticated', v_fuga;
  END IF;

  IF v_sin_acceso > 0 THEN
    RAISE EXCEPTION '063: % tabla(s) quedaron sin acceso para service_role', v_sin_acceso;
  END IF;

  RAISE NOTICE '063 OK: modulo de Compras cerrado a los roles publicos del Data API.';
END $$;

COMMIT;
