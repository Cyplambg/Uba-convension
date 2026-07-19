
-- Enum rôles
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

-- Agences
CREATE TABLE public.agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencies TO authenticated;
GRANT ALL ON public.agencies TO service_role;
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Conventions
CREATE TABLE public.conventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL,
  cc INT NOT NULL DEFAULT 0,
  ce INT NOT NULL DEFAULT 0,
  pm INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conventions TO authenticated;
GRANT ALL ON public.conventions TO service_role;
ALTER TABLE public.conventions ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer, prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Get current user agency
CREATE OR REPLACE FUNCTION public.current_user_agency()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_agencies_updated BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_conventions_updated BEFORE UPDATE ON public.conventions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user: create profile + role (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  new_role public.app_role;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;
  IF user_count = 0 THEN new_role := 'admin'; ELSE new_role := 'agent'; END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, new_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
-- agencies: everyone authenticated can read; admins can write
CREATE POLICY "agencies_select_all_auth" ON public.agencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "agencies_admin_insert" ON public.agencies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agencies_admin_update" ON public.agencies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "agencies_admin_delete" ON public.agencies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- profiles: user reads own; admin reads all; user updates own; admin updates all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_admin_update_all" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: user reads own; admin manages all
CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- conventions: admin sees all; agents see their agency
CREATE POLICY "conv_select" ON public.conventions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR agency_id = public.current_user_agency());
CREATE POLICY "conv_insert" ON public.conventions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR agency_id = public.current_user_agency());
CREATE POLICY "conv_update" ON public.conventions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR agency_id = public.current_user_agency()) WITH CHECK (public.has_role(auth.uid(), 'admin') OR agency_id = public.current_user_agency());
CREATE POLICY "conv_delete" ON public.conventions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed agencies
INSERT INTO public.agencies (name, code, city, address, status) VALUES
  ('Maya-Maya', 'MYM', 'Brazzaville', 'Aéroport Maya-Maya', 'active'),
  ('Poto-Poto', 'PTP', 'Brazzaville', 'Avenue de la Paix', 'active'),
  ('Mfilou', 'MFL', 'Brazzaville', 'Route de Kinkala', 'active'),
  ('Talangaï', 'TLG', 'Brazzaville', 'Boulevard Alfred Raoul', 'active');

-- Seed conventions Jan-Sept 2025 for each agency (partial to demo alerts)
INSERT INTO public.conventions (agency_id, year, month, cc, ce, pm)
SELECT a.id, 2025, m.month,
  (50 + (random()*200)::int),
  (30 + (random()*150)::int),
  (10 + (random()*80)::int)
FROM public.agencies a
CROSS JOIN generate_series(1, 9) AS m(month);
