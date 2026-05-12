-- Synopsis Farm — Initial Schema
-- Apply via: Supabase Dashboard > SQL Editor > Run

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'mechanic' CHECK (role IN ('admin', 'mechanic', 'supervisor')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ASSETS (tractors, trucks, implements, tools)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tractor', 'truck', 'implement', 'tool')),
  brand TEXT,
  model TEXT,
  year INTEGER,
  serial_number TEXT,
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'out_of_service')),
  location TEXT,
  has_telemetry BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- For demo: all authenticated users can read/write assets
CREATE POLICY "Authenticated users can view assets"
  ON public.assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert assets"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update assets"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete assets"
  ON public.assets FOR DELETE
  TO authenticated
  USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- MAINTENANCE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('preventive', 'corrective', 'inspection')),
  description TEXT NOT NULL,
  parts_used TEXT[] DEFAULT '{}',
  hours_spent NUMERIC(5,2),
  asset_hours_at_service NUMERIC(8,0),
  next_service_date DATE,
  cost_estimate NUMERIC(10,2),
  status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'in_progress')),
  voice_transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view maintenance logs"
  ON public.maintenance_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert maintenance logs"
  ON public.maintenance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance logs"
  ON public.maintenance_logs FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- ALERTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('overdue_maintenance', 'critical', 'info')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- ASSET TELEMETRY (mock JD data for demo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.asset_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  hours NUMERIC(8,0),
  fuel_level NUMERIC(5,2),
  next_service_hours NUMERIC(8,0),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.asset_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view telemetry"
  ON public.asset_telemetry FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert telemetry"
  ON public.asset_telemetry FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Enable Realtime on assets and alerts tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_logs;
