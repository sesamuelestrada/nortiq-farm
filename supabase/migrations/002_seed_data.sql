-- Synopsis Farm — Seed Data (Demo en español mexicano)
-- Apply AFTER migration 001
-- Apply via: Supabase Dashboard > SQL Editor > Run

-- ============================================================
-- ASSETS (activos del rancho lechero)
-- ============================================================
INSERT INTO public.assets (name, type, brand, model, year, status, location, has_telemetry, notes) VALUES
  ('Tractor JD 6155M — Potrero Norte', 'tractor', 'John Deere', '6155M', 2021, 'operational', 'Potrero Norte', true, 'Unidad principal de labranza. Con monitor de rendimiento.'),
  ('Tractor NH T6.180 — Potrero Sur', 'tractor', 'New Holland', 'T6.180', 2019, 'maintenance', 'Taller', false, 'En servicio preventivo. Cambio de aceite y filtros.'),
  ('Tractor JD 5075E — Ordeña', 'tractor', 'John Deere', '5075E', 2018, 'operational', 'Zona de Ordeña', false, 'Exclusivo para maniobras en área de ganado.'),
  ('Camión International ProStar — Transporte', 'truck', 'International', 'ProStar', 2017, 'operational', 'Portón Principal', false, 'Transporte de forraje y leche a planta.'),
  ('Camión Kenworth T680 — Distribución', 'truck', 'Kenworth', 'T680', 2020, 'operational', 'Portón Principal', false, 'Distribución regional. Ruta Hermosillo-Guaymas.'),
  ('Cosechadora JD S660 — Almacén', 'implement', 'John Deere', 'S660', 2016, 'out_of_service', 'Almacén General', false, 'Fuera de temporada. Requiere revisión de cabezal.'),
  ('Rastra de Discos 30" — Bodega', 'implement', NULL, NULL, NULL, 'operational', 'Bodega de Implementos', false, 'Para preparación de suelos en potrero sur.'),
  ('Segadora-Acondicionadora JD 956 — Bodega', 'implement', 'John Deere', '956', 2020, 'operational', 'Bodega de Implementos', false, 'Para corte de alfalfa. Última revisión hace 2 semanas.'),
  ('Pipa de Agua 10,000L — Patio', 'implement', NULL, NULL, 2015, 'operational', 'Patio Central', false, 'Abastecimiento de agua a potreros remotos.'),
  ('Juego de Llaves Combinadas 1/2"–2"', 'tool', NULL, NULL, NULL, 'operational', 'Taller', false, 'Set completo, inventario revisado en enero.'),
  ('Soldadora Lincoln Electric 180A', 'tool', 'Lincoln Electric', '180A', 2019, 'operational', 'Taller', false, NULL),
  ('Compresor de Aire 60 Galones', 'tool', 'Ingersoll Rand', NULL, 2020, 'operational', 'Taller', false, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- MAINTENANCE LOGS (historial de mantenimiento)
-- ============================================================
INSERT INTO public.maintenance_logs (asset_id, performed_by_name, type, description, parts_used, hours_spent, cost_estimate, status, created_at)
SELECT
  a.id,
  'Carlos Mendoza',
  'preventive',
  'Cambio de aceite de motor y filtros. Se revisó nivel de refrigerante y líquido de frenos. Todo dentro de especificaciones del fabricante.',
  ARRAY['Aceite 15W-40 (20L)', 'Filtro de aceite JD AT101288', 'Filtro de combustible JD RE522878'],
  3.5,
  2800.00,
  'completed',
  NOW() - INTERVAL '15 days'
FROM public.assets a WHERE a.name LIKE '%6155M%'
LIMIT 1;

INSERT INTO public.maintenance_logs (asset_id, performed_by_name, type, description, parts_used, hours_spent, cost_estimate, status, created_at)
SELECT
  a.id,
  'Roberto Sánchez',
  'corrective',
  'Reparación de sistema hidráulico. Se detectó fuga en manguera de dirección asistida. Se reemplazó manguera y se purgó el sistema.',
  ARRAY['Manguera hidráulica 3/8" x 1.2m', 'Abrazaderas (4 pzas)', 'Aceite hidráulico JD HY-GARD (2L)'],
  5.0,
  1450.00,
  'completed',
  NOW() - INTERVAL '30 days'
FROM public.assets a WHERE a.name LIKE '%T6.180%'
LIMIT 1;

INSERT INTO public.maintenance_logs (asset_id, performed_by_name, type, description, parts_used, hours_spent, cost_estimate, status, created_at)
SELECT
  a.id,
  'Carlos Mendoza',
  'inspection',
  'Inspección de rutina antes de temporada de cosecha. Se verificaron frenos, luces, sistema eléctrico y neumáticos. Se ajustaron presiones.',
  ARRAY[]::TEXT[],
  1.5,
  0.00,
  'completed',
  NOW() - INTERVAL '7 days'
FROM public.assets a WHERE a.name LIKE '%ProStar%'
LIMIT 1;

INSERT INTO public.maintenance_logs (asset_id, performed_by_name, type, description, parts_used, hours_spent, cost_estimate, status, created_at)
SELECT
  a.id,
  'Miguel Torres',
  'preventive',
  'Servicio de 500 horas. Cambio de aceite de transmisión y diferencial. Revisión de correas de distribución. Engrase general de articulaciones.',
  ARRAY['Aceite transmisión JD J20C (5L)', 'Aceite diferencial 80W-90 (3L)', 'Kit de engrases (5 pzas)'],
  4.0,
  3200.00,
  'completed',
  NOW() - INTERVAL '45 days'
FROM public.assets a WHERE a.name LIKE '%6155M%'
LIMIT 1;

-- ============================================================
-- ALERTS
-- ============================================================
INSERT INTO public.alerts (asset_id, type, message, is_read, created_at)
SELECT
  a.id,
  'overdue_maintenance',
  'Tractor NH T6.180 lleva 3 semanas en taller. Revisar avance de servicio.',
  false,
  NOW() - INTERVAL '2 days'
FROM public.assets a WHERE a.name LIKE '%T6.180%'
LIMIT 1;

INSERT INTO public.alerts (asset_id, type, message, is_read, created_at)
SELECT
  a.id,
  'critical',
  'Cosechadora JD S660 fuera de servicio. Se acerca temporada de cosecha de alfalfa.',
  false,
  NOW() - INTERVAL '1 day'
FROM public.assets a WHERE a.name LIKE '%S660%'
LIMIT 1;

INSERT INTO public.alerts (asset_id, type, message, is_read, created_at)
SELECT
  a.id,
  'info',
  'Tractor JD 6155M alcanzará 500 horas de servicio en aprox. 2 semanas. Programar servicio preventivo.',
  false,
  NOW()
FROM public.assets a WHERE a.name LIKE '%6155M%'
LIMIT 1;

-- ============================================================
-- TELEMETRY (mock JD data)
-- ============================================================
INSERT INTO public.asset_telemetry (asset_id, hours, fuel_level, next_service_hours, recorded_at)
SELECT
  a.id,
  487,
  72.5,
  500,
  NOW() - INTERVAL '1 hour'
FROM public.assets a WHERE a.name LIKE '%6155M%'
LIMIT 1;

INSERT INTO public.asset_telemetry (asset_id, hours, fuel_level, next_service_hours, recorded_at)
SELECT
  a.id,
  1203,
  45.0,
  1250,
  NOW() - INTERVAL '2 hours'
FROM public.assets a WHERE a.name LIKE '%5075E%'
LIMIT 1;
