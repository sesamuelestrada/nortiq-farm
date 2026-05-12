-- Synopsis Farm — Maintenance Intelligence
-- Adds: current_hours + avg_hours_per_week to assets,
--       maintenance_schedules (per-subsystem triggers),
--       maintenance_findings (persistent open issues)

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS current_hours NUMERIC(8,0),
  ADD COLUMN IF NOT EXISTS avg_hours_per_week NUMERIC(5,1);

CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  subsystem TEXT NOT NULL CHECK (subsystem IN (
    'engine', 'transmission', 'hydraulics', 'filters', 'tires', 'electrical', 'general'
  )),
  title TEXT NOT NULL,
  hours_interval NUMERIC(8,0),
  calendar_interval_days INTEGER,
  next_due_hours NUMERIC(8,0),
  next_due_date DATE,
  last_performed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'snoozed', 'completed')),
  snooze_until DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  discovered_in_log_id UUID REFERENCES public.maintenance_logs(id),
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'snoozed', 'resolved')),
  follow_up_date DATE,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_schedules_all" ON public.maintenance_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.maintenance_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_findings_all" ON public.maintenance_findings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Expose via Realtime for future dashboard use
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_findings;
