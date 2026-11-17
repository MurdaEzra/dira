-- ---------- Profiles ----------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text CHECK (char_length(display_name) <= 60),
  access_profile jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Create own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 60)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------- Roles ----------
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ---------- Places ----------
CREATE TABLE public.places (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('restaurant','hospital','university','shopping','public','transport')),
  area text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.places TO anon, authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Places are public" ON public.places FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.place_features (
  place_id text NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('step_free_entrance','ramp','door_width','automatic_door','lift','accessible_toilet','accessible_parking','wide_aisles','seating','staff_assistance','tactile_signage','hearing_loop','quiet_hours')),
  status text NOT NULL DEFAULT 'unknown' CHECK (status IN ('yes','partial','no','unknown')),
  source text NOT NULL DEFAULT 'community' CHECK (source IN ('official','audited','community3','community','osm','ai')),
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmations integer NOT NULL DEFAULT 0,
  conflicts integer NOT NULL DEFAULT 0,
  PRIMARY KEY (place_id, feature)
);
GRANT SELECT ON public.place_features TO anon, authenticated;
GRANT ALL ON public.place_features TO service_role;
ALTER TABLE public.place_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Place features are public" ON public.place_features FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.access_points (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('ramp','entrance')),
  area text NOT NULL DEFAULT '',
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  source text NOT NULL DEFAULT 'community' CHECK (source IN ('official','audited','community3','community','osm','ai')),
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmations integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.access_points TO anon, authenticated;
GRANT ALL ON public.access_points TO service_role;
ALTER TABLE public.access_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Access points are public" ON public.access_points FOR SELECT TO anon, authenticated USING (true);

-- ---------- Barriers ----------
CREATE TABLE public.barriers (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  type text NOT NULL CHECK (type IN ('blocked_path','broken_ramp','no_dropped_kerb','stairs_only','narrow','broken_lift','steep','poor_surface','parked_vehicle','construction','flooding','inaccessible_entrance','other')),
  severity text NOT NULL CHECK (severity IN ('low','medium','high','blocking')),
  area text NOT NULL DEFAULT '',
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng double precision NOT NULL CHECK (lng BETWEEN -180 AND 180),
  is_temporary boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported','ai_triaged','community_confirmed','sent_to_authority','resolved','reopened')),
  source text NOT NULL DEFAULT 'community' CHECK (source IN ('official','audited','community3','community','osm','ai')),
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  confirmations integer NOT NULL DEFAULT 1,
  conflicts integer NOT NULL DEFAULT 0,
  note text CHECK (char_length(note) <= 500),
  reporter_id uuid,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX barriers_latlng_idx ON public.barriers (lat, lng);
CREATE INDEX barriers_reporter_idx ON public.barriers (reporter_id, created_at);
GRANT SELECT ON public.barriers TO anon, authenticated;
GRANT INSERT ON public.barriers TO authenticated;
GRANT ALL ON public.barriers TO service_role;
ALTER TABLE public.barriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Barriers are public" ON public.barriers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Signed-in people report barriers" ON public.barriers FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

-- Reporters choose what and where; the system owns trust fields.
CREATE OR REPLACE FUNCTION public.barrier_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.barriers WHERE reporter_id = auth.uid() AND created_at > now() - interval '1 hour') >= 20 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  NEW.reporter_id := auth.uid();
  NEW.status := CASE WHEN NEW.status = 'ai_triaged' THEN 'ai_triaged' ELSE 'reported' END;
  NEW.source := 'community';
  NEW.confirmations := 1;
  NEW.conflicts := 0;
  NEW.last_confirmed_at := now();
  NEW.created_at := now();
  NEW.is_demo := false;
  NEW.resolved_at := NULL;
  RETURN NEW;
END;
$$;
CREATE TRIGGER barriers_before_insert BEFORE INSERT ON public.barriers FOR EACH ROW EXECUTE FUNCTION public.barrier_before_insert();

ALTER PUBLICATION supabase_realtime ADD TABLE public.barriers;

-- ---------- Photos ----------
CREATE TABLE public.report_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  barrier_id text REFERENCES public.barriers(id) ON DELETE CASCADE,
  place_id text REFERENCES public.places(id) ON DELETE CASCADE,
  path text NOT NULL,
  ai_analysis jsonb,
  blurred boolean NOT NULL DEFAULT false,
  confirmations integer NOT NULL DEFAULT 0,
  conflicts integer NOT NULL DEFAULT 0,
  last_confirmed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (barrier_id IS NOT NULL OR place_id IS NOT NULL)
);
CREATE INDEX report_media_place_idx ON public.report_media (place_id, created_at DESC);
CREATE INDEX report_media_barrier_idx ON public.report_media (barrier_id);
GRANT SELECT ON public.report_media TO anon, authenticated;
GRANT INSERT, DELETE ON public.report_media TO authenticated;
GRANT ALL ON public.report_media TO service_role;
ALTER TABLE public.report_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photos are public" ON public.report_media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Add own photos" ON public.report_media FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND split_part(path, '/', 1) = auth.uid()::text);
CREATE POLICY "Delete own photos" ON public.report_media FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.media_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF (SELECT count(*) FROM public.report_media WHERE user_id = auth.uid() AND created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  NEW.confirmations := 0;
  NEW.conflicts := 0;
  NEW.last_confirmed_at := now();
  NEW.created_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER report_media_before_insert BEFORE INSERT ON public.report_media FOR EACH ROW EXECUTE FUNCTION public.media_before_insert();

-- ---------- Verifications ----------
CREATE TABLE public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  target_type text NOT NULL CHECK (target_type IN ('barrier','place','feature','media')),
  target_id text NOT NULL CHECK (char_length(target_id) <= 200),
  vote text NOT NULL CHECK (vote IN ('confirm','dispute')),
  proposed_status text CHECK (proposed_status IN ('yes','partial','no','unknown')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verifications_target_idx ON public.verifications (target_type, target_id, created_at DESC);
CREATE INDEX verifications_user_idx ON public.verifications (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own votes" ON public.verifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Cast own votes" ON public.verifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.verification_before_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.created_at := now();
  IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = 'P0001'; END IF;
  IF EXISTS (SELECT 1 FROM public.verifications v WHERE v.user_id = NEW.user_id AND v.target_type = NEW.target_type
             AND v.target_id = NEW.target_id AND v.created_at > now() - interval '7 days') THEN
    RAISE EXCEPTION 'already_verified' USING ERRCODE = 'P0001';
  END IF;
  IF (SELECT count(*) FROM public.verifications WHERE user_id = NEW.user_id AND created_at > now() - interval '1 hour') >= 60 THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.target_type = 'barrier' THEN
    IF NOT EXISTS (SELECT 1 FROM public.barriers WHERE id = NEW.target_id) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
    IF EXISTS (SELECT 1 FROM public.barriers WHERE id = NEW.target_id AND reporter_id = NEW.user_id) THEN
      RAISE EXCEPTION 'own_report' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.target_type = 'media' THEN
    IF EXISTS (SELECT 1 FROM public.report_media WHERE id::text = NEW.target_id AND user_id = NEW.user_id) THEN
      RAISE EXCEPTION 'own_report' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.target_type = 'place' THEN
    IF NOT EXISTS (SELECT 1 FROM public.places WHERE id = NEW.target_id) THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001'; END IF;
  ELSIF NEW.target_type = 'feature' THEN
    IF NOT EXISTS (SELECT 1 FROM public.place_features WHERE place_id || ':' || feature = NEW.target_id) THEN
      RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER verifications_before_insert BEFORE INSERT ON public.verifications FOR EACH ROW EXECUTE FUNCTION public.verification_before_insert();

-- Each vote moves the trust inputs of what it is about.
CREATE OR REPLACE FUNCTION public.apply_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  disputes integer;
  same_proposals integer;
BEGIN
  IF NEW.target_type = 'barrier' THEN
    IF NEW.vote = 'confirm' THEN
      UPDATE public.barriers SET
        confirmations = confirmations + 1,
        last_confirmed_at = now(),
        source = CASE WHEN source IN ('community','ai','osm') AND confirmations + 1 >= 3 THEN 'community3'
                      WHEN source IN ('ai','osm') THEN 'community' ELSE source END,
        status = CASE WHEN status = 'resolved' THEN 'reopened'
                      WHEN status IN ('reported','ai_triaged') AND confirmations + 1 >= 3 THEN 'community_confirmed'
                      ELSE status END,
        resolved_at = CASE WHEN status = 'resolved' THEN NULL ELSE resolved_at END
      WHERE id = NEW.target_id;
    ELSE
      SELECT count(*) INTO disputes FROM public.verifications
        WHERE target_type = 'barrier' AND target_id = NEW.target_id AND vote = 'dispute' AND created_at > now() - interval '14 days';
      UPDATE public.barriers SET
        conflicts = CASE WHEN disputes >= 2 THEN 0 ELSE conflicts + 1 END,
        status = CASE WHEN disputes >= 2 THEN 'resolved' ELSE status END,
        resolved_at = CASE WHEN disputes >= 2 THEN now() ELSE resolved_at END,
        last_confirmed_at = CASE WHEN disputes >= 2 THEN now() ELSE last_confirmed_at END
      WHERE id = NEW.target_id AND status <> 'resolved';
    END IF;
  ELSIF NEW.target_type = 'place' THEN
    IF NEW.vote = 'confirm' THEN
      UPDATE public.place_features SET
        confirmations = confirmations + 1,
        last_confirmed_at = now(),
        source = CASE WHEN source IN ('community','ai','osm') AND confirmations + 1 >= 3 THEN 'community3'
                      WHEN source IN ('ai','osm') THEN 'community' ELSE source END
      WHERE place_id = NEW.target_id AND status <> 'unknown';
    END IF;
  ELSIF NEW.target_type = 'feature' THEN
    IF NEW.vote = 'confirm' THEN
      UPDATE public.place_features SET
        confirmations = confirmations + 1,
        last_confirmed_at = now(),
        source = CASE WHEN source IN ('community','ai','osm') AND confirmations + 1 >= 3 THEN 'community3'
                      WHEN source IN ('ai','osm') THEN 'community' ELSE source END
      WHERE place_id || ':' || feature = NEW.target_id;
    ELSE
      SELECT count(*) INTO same_proposals FROM public.verifications
        WHERE target_type = 'feature' AND target_id = NEW.target_id AND vote = 'dispute'
          AND proposed_status IS NOT DISTINCT FROM NEW.proposed_status AND created_at > now() - interval '30 days';
      IF NEW.proposed_status IS NOT NULL AND same_proposals >= 3 THEN
        UPDATE public.place_features SET
          status = NEW.proposed_status, source = 'community3', confirmations = same_proposals,
          conflicts = 0, last_confirmed_at = now()
        WHERE place_id || ':' || feature = NEW.target_id;
      ELSE
        UPDATE public.place_features SET conflicts = conflicts + 1 WHERE place_id || ':' || feature = NEW.target_id;
      END IF;
    END IF;
  ELSIF NEW.target_type = 'media' THEN
    UPDATE public.report_media SET
      confirmations = confirmations + CASE WHEN NEW.vote = 'confirm' THEN 1 ELSE 0 END,
      conflicts = conflicts + CASE WHEN NEW.vote = 'dispute' THEN 1 ELSE 0 END,
      last_confirmed_at = CASE WHEN NEW.vote = 'confirm' THEN now() ELSE last_confirmed_at END
    WHERE id::text = NEW.target_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER verifications_after_insert AFTER INSERT ON public.verifications FOR EACH ROW EXECUTE FUNCTION public.apply_verification();

-- ---------- Demo data (fictional venues in Nairobi) ----------
INSERT INTO public.places (id, name, category, area, lat, lng) VALUES
('mvule-kitchen', 'Mvule Kitchen', 'restaurant', 'Westlands', -1.2668, 36.8061),
('jacaranda-courtyard', 'Jacaranda Courtyard Café', 'restaurant', 'Kilimani', -1.2903, 36.7871),
('nyama-terrace', 'Nyama Terrace', 'restaurant', 'CBD', -1.2846, 36.8241),
('kahawa-corner', 'Kahawa Corner', 'restaurant', 'Ngara', -1.2747, 36.8262),
('pilau-house', 'Pilau House', 'restaurant', 'South B', -1.3101, 36.8378),
('mango-leaf', 'Mango Leaf Eatery', 'restaurant', 'Hurlingham', -1.2951, 36.7993),
('uhai-clinic', 'Uhai Community Clinic', 'hospital', 'Ngara', -1.2722, 36.8296),
('tumaini-general', 'Tumaini General Hospital', 'hospital', 'Upper Hill', -1.3009, 36.8139),
('afya-bora', 'Afya Bora Medical Centre', 'hospital', 'Parklands', -1.2627, 36.8189),
('faraja-eye', 'Faraja Eye & ENT Centre', 'hospital', 'Kilimani', -1.2937, 36.7832),
('mlimani-tech', 'Mlimani Institute of Technology', 'university', 'Upper Hill', -1.2978, 36.8181),
('chuo-pwani', 'Chuo cha Pwani City Campus', 'university', 'CBD', -1.2817, 36.8166),
('kilele-arts', 'Kilele School of Arts', 'university', 'Lavington', -1.2771, 36.7718),
('hekima-library', 'Hekima Open Library', 'public', 'CBD', -1.2858, 36.8196),
('baraka-mall', 'Baraka Mall', 'shopping', 'Westlands', -1.2649, 36.8031),
('soko-huru', 'Soko Huru Market Hall', 'shopping', 'CBD', -1.2831, 36.8275),
('riverside-arcade', 'Riverside Arcade', 'shopping', 'Parklands', -1.2598, 36.8243),
('jua-kali-crafts', 'Jua Kali Crafts Centre', 'shopping', 'Ngara', -1.2761, 36.8311),
('mwangaza-plaza', 'Mwangaza Plaza', 'shopping', 'Lavington', -1.2797, 36.7681),
('civic-services', 'Civic Services Hall', 'public', 'CBD', -1.2879, 36.8221),
('bustani-park', 'Bustani Pocket Park', 'public', 'Kilimani', -1.2889, 36.7905),
('records-office', 'County Records Office', 'public', 'Upper Hill', -1.2962, 36.8121),
('sauti-centre', 'Sauti Community Centre', 'public', 'South B', -1.3082, 36.8415),
('matatu-north', 'Kituo Matatu Stage North', 'transport', 'CBD', -1.2808, 36.8259),
('reli-terminus', 'Reli Bus Terminus', 'transport', 'CBD', -1.2899, 36.8268),
('westlands-feeder', 'Westlands Feeder Stop', 'transport', 'Westlands', -1.2689, 36.8117),
('gigiri-shuttle', 'Gigiri Link Shuttle Point', 'transport', 'Gigiri', -1.2341, 36.8061),
('ngong-cycle-ride', 'Ngong Road Cycle & Ride', 'transport', 'Kilimani', -1.2995, 36.7889),
('nuru-rooftop', 'Nuru Rooftop Grill', 'restaurant', 'Parklands', -1.2619, 36.8152),
('amani-rehab', 'Amani Rehab & Physio', 'hospital', 'Hurlingham', -1.2974, 36.7962);

INSERT INTO public.place_features (place_id, feature, status, source, last_confirmed_at, confirmations, conflicts)
SELECT r.place_id,
  (ARRAY['step_free_entrance','ramp','door_width','automatic_door','lift','accessible_toilet','accessible_parking','wide_aisles','seating','staff_assistance','tactile_signage','hearing_loop','quiet_hours'])[f.i],
  CASE split_part(f.item, ',', 1) WHEN 'Y' THEN 'yes' WHEN 'P' THEN 'partial' WHEN 'N' THEN 'no' ELSE 'unknown' END,
  CASE split_part(f.item, ',', 2) WHEN 'O' THEN 'official' WHEN 'A' THEN 'audited' WHEN 'C' THEN 'community3' WHEN 'M' THEN 'osm' WHEN 'I' THEN 'ai' ELSE 'community' END,
  now() - make_interval(days => split_part(f.item, ',', 3)::int),
  split_part(f.item, ',', 4)::int,
  split_part(f.item, ',', 5)::int
FROM (VALUES
('mvule-kitchen', 'Y,C,31,8,0;Y,A,28,1,0;Y,C,25,4,0;N,A,22,1,0;U,C,19,6,0;Y,A,16,1,0;P,C,13,8,0;Y,A,10,1,0;Y,C,47,4,0;Y,A,44,1,0;N,C,41,6,0;N,A,38,1,0;P,C,35,8,0'),
('jacaranda-courtyard', 'Y,C,62,5,0;N,S,59,2,0;Y,C,56,7,0;N,S,53,2,0;U,C,50,3,0;P,S,47,2,0;N,C,44,5,0;Y,S,41,2,1;Y,C,38,7,0;Y,S,35,2,0;N,C,32,3,0;N,S,69,2,0;Y,C,66,5,0'),
('nyama-terrace', 'N,S,76,1,0;N,M,73,0,0;P,S,70,1,0;N,M,67,0,1;N,S,64,1,0;N,M,61,0,0;N,S,98,1,0;P,M,95,0,0;Y,S,92,1,0;Y,M,89,0,0;N,S,86,1,0;N,M,83,0,0;N,S,80,1,0'),
('kahawa-corner', 'P,S,54,1,0;Y,I,51,0,0;P,S,48,1,0;N,I,45,0,0;U,S,42,1,0;N,I,39,0,0;N,S,36,1,0;P,I,33,0,0;Y,S,30,1,0;Y,I,27,0,0;U,S,24,1,0;U,I,21,0,0;U,S,58,1,0'),
('pilau-house', 'Y,C,49,6,0;Y,C,46,7,0;Y,C,43,8,0;N,C,40,3,0;U,C,37,4,0;Y,C,34,5,0;Y,C,31,6,0;Y,C,28,7,0;Y,C,25,8,0;Y,C,22,3,0;N,C,19,4,0;N,C,16,5,0;U,C,53,6,0'),
('mango-leaf', 'U,M,216,0,0;U,M,213,0,0;U,M,210,0,0;U,M,207,0,0;U,M,204,0,0;U,M,201,0,0;U,M,238,0,0;U,M,235,0,0;Y,M,232,0,0;U,M,229,0,0;U,M,226,0,0;U,M,223,0,0;U,M,220,0,0'),
('uhai-clinic', 'Y,A,32,2,0;Y,O,29,1,0;Y,A,26,2,0;Y,O,23,1,0;Y,A,20,2,0;Y,O,17,1,0;Y,A,14,2,0;Y,O,11,1,1;Y,A,8,2,0;Y,O,5,1,0;Y,A,42,2,0;P,O,39,1,0;Y,A,36,2,0'),
('tumaini-general', 'Y,O,23,2,0;Y,O,20,1,0;Y,O,17,2,0;Y,O,14,1,0;Y,O,51,2,0;Y,O,48,1,0;Y,O,45,2,0;Y,O,42,1,0;Y,O,39,2,0;Y,O,36,1,0;P,O,33,2,0;Y,O,30,1,0;N,O,27,2,0'),
('afya-bora', 'Y,C,77,8,0;Y,A,74,1,0;Y,C,71,4,0;N,A,68,1,0;Y,C,65,6,0;Y,A,62,1,0;P,C,59,8,0;Y,A,56,1,0;Y,C,53,4,0;Y,A,50,1,0;N,C,47,6,0;N,A,44,1,0;N,C,41,8,0'),
('faraja-eye', 'Y,A,61,1,0;Y,A,58,2,0;Y,A,55,1,0;Y,A,52,2,0;Y,A,49,1,1;Y,A,46,2,0;P,A,43,1,0;Y,A,40,2,0;Y,A,37,1,0;Y,A,34,2,0;Y,A,31,1,0;Y,A,28,2,0;Y,A,25,1,0'),
('mlimani-tech', 'P,S,59,2,0;Y,C,56,7,1;Y,S,53,2,0;N,C,50,3,0;Y,S,87,2,0;P,C,84,5,0;Y,S,81,2,0;Y,C,78,7,0;Y,S,75,2,0;Y,C,72,3,0;P,S,69,2,0;N,C,66,5,0;N,S,63,2,0'),
('chuo-pwani', 'Y,O,38,1,0;Y,O,35,2,0;Y,O,32,1,0;Y,O,29,2,0;Y,O,26,1,0;Y,O,23,2,0;Y,O,20,1,0;Y,O,17,2,0;Y,O,14,1,0;Y,O,11,2,0;Y,O,8,1,0;Y,O,45,2,0;P,O,42,1,0'),
('kilele-arts', 'N,S,53,1,0;N,I,50,0,0;P,S,47,1,0;N,I,44,0,0;N,S,41,1,0;N,I,38,0,0;P,S,35,1,0;U,I,32,0,0;Y,S,29,1,0;Y,I,26,0,1;U,S,23,1,0;U,I,20,0,0;U,S,17,1,0'),
('hekima-library', 'Y,O,18,1,0;Y,A,15,2,0;Y,O,12,1,0;Y,A,9,2,0;Y,O,6,1,0;Y,A,43,2,0;N,O,40,1,0;Y,A,37,2,0;Y,O,34,1,0;Y,A,31,2,1;Y,O,28,1,0;Y,A,25,2,0;Y,O,22,1,0'),
('baraka-mall', 'Y,A,42,1,0;Y,C,39,8,0;Y,A,36,1,0;Y,C,33,4,0;Y,A,30,1,0;Y,C,27,6,0;Y,A,24,1,0;Y,C,21,8,0;Y,A,58,1,0;Y,C,55,4,0;N,A,52,1,0;N,C,49,6,0;N,A,46,1,0'),
('soko-huru', 'P,S,106,1,0;N,M,103,0,0;P,S,100,1,0;N,M,137,0,0;N,S,134,1,1;N,M,131,0,0;N,S,128,1,0;N,M,125,0,0;Y,S,122,1,0;Y,M,119,0,0;N,S,116,1,0;N,M,113,0,0;N,S,110,1,0'),
('riverside-arcade', 'Y,C,44,6,1;Y,C,41,7,0;Y,C,38,8,0;Y,C,35,3,0;P,C,72,4,0;Y,C,69,5,0;Y,C,66,6,0;Y,C,63,7,0;Y,C,60,8,0;Y,C,57,3,0;N,C,54,4,0;N,C,51,5,0;U,C,48,6,0'),
('jua-kali-crafts', 'N,S,17,2,0;N,S,14,1,0;N,S,11,2,0;N,S,48,1,0;N,S,45,2,0;N,S,42,1,0;N,S,39,2,0;N,S,36,1,0;Y,S,33,2,1;Y,S,30,1,0;N,S,27,2,0;N,S,24,1,0;N,S,21,2,0'),
('mwangaza-plaza', 'Y,A,68,1,0;Y,A,65,2,0;Y,A,62,1,0;Y,A,59,2,0;Y,A,56,1,0;Y,A,53,2,0;Y,A,50,1,0;Y,A,47,2,0;Y,A,44,1,0;Y,A,41,2,0;P,A,38,1,0;N,A,35,2,1;P,A,32,1,0'),
('civic-services', 'Y,O,15,1,0;Y,O,52,2,0;Y,O,49,1,0;N,O,46,2,0;Y,O,43,1,0;Y,O,40,2,0;Y,O,37,1,0;Y,O,34,2,0;Y,O,31,1,0;Y,O,28,2,0;Y,O,25,1,0;P,O,22,2,0;N,O,19,1,0'),
('bustani-park', 'Y,C,70,3,0;Y,C,67,4,0;U,C,64,5,0;N,C,61,6,0;U,C,58,7,0;P,C,55,8,0;N,C,52,3,0;U,C,49,4,0;Y,C,46,5,0;N,C,43,6,1;N,C,40,7,0;N,C,77,8,0;Y,C,74,3,0'),
('records-office', 'P,S,100,1,0;Y,S,97,2,0;P,S,94,1,0;N,S,91,2,0;P,S,88,1,0;N,S,85,2,0;Y,S,82,1,0;N,S,79,2,0;Y,S,76,1,0;Y,S,73,2,0;N,S,70,1,0;N,S,107,2,0;N,S,104,1,0'),
('sauti-centre', 'Y,C,29,4,0;Y,C,26,5,0;Y,C,23,6,1;N,C,20,7,0;N,C,57,8,0;Y,C,54,3,0;N,C,51,4,0;Y,C,48,5,0;Y,C,45,6,0;Y,C,42,7,0;Y,C,39,8,0;Y,C,36,3,0;Y,C,33,4,0'),
('matatu-north', 'P,M,58,0,0;N,S,55,1,0;N,M,52,0,0;N,S,49,1,0;N,M,46,0,0;N,S,43,1,0;N,M,40,0,0;N,S,37,1,0;P,M,34,0,0;P,S,31,1,0;N,M,28,0,0;N,S,25,1,0;N,M,62,0,1'),
('reli-terminus', 'Y,C,66,6,0;Y,A,63,1,0;Y,C,60,8,0;N,A,57,1,0;N,C,54,4,0;P,A,51,1,0;N,C,48,6,0;Y,A,45,1,0;Y,C,82,8,0;Y,A,79,1,0;Y,C,76,4,0;N,A,73,1,0;N,C,70,6,1'),
('westlands-feeder', 'Y,I,25,0,0;Y,I,22,0,0;U,I,19,0,0;N,I,16,0,0;U,I,13,0,0;N,I,10,0,0;N,I,7,0,0;U,I,4,0,0;P,I,41,0,0;N,I,38,0,1;Y,I,35,0,0;U,I,32,0,0;U,I,29,0,0'),
('gigiri-shuttle', 'Y,O,42,1,0;Y,O,39,2,0;Y,O,36,1,0;Y,O,33,2,0;U,O,30,1,0;Y,O,27,2,0;Y,O,24,1,0;Y,O,21,2,0;Y,O,58,1,0;Y,O,55,2,0;Y,O,52,1,0;N,O,49,2,0;N,O,46,1,1'),
('ngong-cycle-ride', 'Y,M,158,0,0;P,M,155,0,0;Y,M,152,0,0;N,M,149,0,0;N,M,146,0,0;N,M,143,0,0;Y,M,140,0,0;U,M,137,0,0;P,M,134,0,0;N,M,131,0,0;N,M,168,0,0;N,M,165,0,0;N,M,162,0,1'),
('nuru-rooftop', 'N,S,59,2,0;N,C,56,7,0;Y,S,53,2,0;N,C,50,3,0;Y,S,47,2,0;P,C,44,5,0;N,S,41,2,0;Y,C,38,7,0;Y,S,35,2,0;Y,C,32,3,0;N,S,29,2,0;N,C,26,5,0;N,S,23,2,0'),
('amani-rehab', 'Y,O,21,1,0;Y,A,18,2,0;Y,O,15,1,0;Y,A,12,2,0;Y,O,9,1,0;Y,A,6,2,0;Y,O,3,1,0;Y,A,40,2,0;Y,O,37,1,0;Y,A,34,2,0;Y,O,31,1,0;Y,A,28,2,0;Y,O,25,1,0')
) AS r(place_id, enc)
CROSS JOIN LATERAL unnest(string_to_array(r.enc, ';')) WITH ORDINALITY AS f(item, i);

INSERT INTO public.barriers (id, type, severity, area, lat, lng, is_temporary, status, source, last_confirmed_at, confirmations, conflicts, is_demo, created_at) VALUES
('b01', 'blocked_path', 'blocking', 'CBD', -1.2852, 36.8229, true, 'community_confirmed', 'community3', now() - interval '2 days', 5, 0, true, now() - interval '2 days'),
('b02', 'broken_ramp', 'high', 'CBD', -1.2869, 36.8188, false, 'sent_to_authority', 'audited', now() - interval '20 days', 4, 0, true, now() - interval '20 days'),
('b03', 'no_dropped_kerb', 'high', 'Westlands', -1.2672, 36.8089, false, 'community_confirmed', 'community3', now() - interval '35 days', 6, 0, true, now() - interval '35 days'),
('b04', 'stairs_only', 'blocking', 'Ngara', -1.2741, 36.8283, false, 'reported', 'community', now() - interval '12 days', 1, 0, true, now() - interval '12 days'),
('b05', 'narrow', 'medium', 'Kilimani', -1.2911, 36.7859, false, 'ai_triaged', 'ai', now() - interval '4 days', 0, 0, true, now() - interval '4 days'),
('b06', 'broken_lift', 'blocking', 'Upper Hill', -1.2988, 36.8148, true, 'community_confirmed', 'community3', now() - interval '1 days', 3, 0, true, now() - interval '1 days'),
('b07', 'steep', 'medium', 'Upper Hill', -1.3015, 36.8171, false, 'sent_to_authority', 'official', now() - interval '60 days', 2, 0, true, now() - interval '60 days'),
('b08', 'poor_surface', 'medium', 'South B', -1.3092, 36.8396, false, 'reported', 'community', now() - interval '25 days', 1, 1, true, now() - interval '25 days'),
('b09', 'parked_vehicle', 'high', 'CBD', -1.2838, 36.8212, true, 'reported', 'community', now() - interval '1 days', 1, 0, true, now() - interval '1 days'),
('b10', 'construction', 'blocking', 'Parklands', -1.2612, 36.8205, true, 'community_confirmed', 'community3', now() - interval '3 days', 4, 0, true, now() - interval '3 days'),
('b11', 'flooding', 'high', 'South B', -1.3071, 36.8402, true, 'reported', 'community', now() - interval '15 days', 2, 0, true, now() - interval '15 days'),
('b12', 'inaccessible_entrance', 'high', 'Lavington', -1.2783, 36.7702, false, 'reported', 'osm', now() - interval '40 days', 0, 0, true, now() - interval '40 days'),
('b13', 'blocked_path', 'medium', 'Hurlingham', -1.2958, 36.7978, true, 'ai_triaged', 'ai', now() - interval '2 days', 0, 0, true, now() - interval '2 days'),
('b14', 'no_dropped_kerb', 'medium', 'Kilimani', -1.2897, 36.7884, false, 'reported', 'community', now() - interval '230 days', 1, 0, true, now() - interval '230 days'),
('b15', 'broken_ramp', 'high', 'Parklands', -1.2633, 36.8171, false, 'resolved', 'audited', now() - interval '8 days', 3, 0, true, now() - interval '8 days'),
('b16', 'steep', 'low', 'Westlands', -1.2659, 36.8045, false, 'community_confirmed', 'community3', now() - interval '70 days', 3, 0, true, now() - interval '70 days'),
('b17', 'poor_surface', 'low', 'Ngara', -1.2755, 36.8247, false, 'reported', 'osm', now() - interval '300 days', 0, 0, true, now() - interval '300 days'),
('b18', 'construction', 'high', 'Upper Hill', -1.2969, 36.8109, true, 'resolved', 'community3', now() - interval '20 days', 5, 0, true, now() - interval '20 days'),
('b19', 'narrow', 'high', 'CBD', -1.2824, 36.8249, false, 'reopened', 'community', now() - interval '9 days', 2, 1, true, now() - interval '9 days'),
('b20', 'parked_vehicle', 'medium', 'Kilimani', -1.2929, 36.7848, true, 'reported', 'community', now() - interval '11 days', 1, 0, true, now() - interval '11 days'),
('b21', 'stairs_only', 'high', 'CBD', -1.2889, 36.8241, false, 'sent_to_authority', 'official', now() - interval '30 days', 2, 0, true, now() - interval '30 days'),
('b22', 'flooding', 'medium', 'CBD', -1.2875, 36.8262, true, 'reported', 'ai', now() - interval '5 days', 0, 0, true, now() - interval '5 days'),
('b23', 'broken_lift', 'high', 'Westlands', -1.2643, 36.8022, false, 'resolved', 'official', now() - interval '4 days', 1, 0, true, now() - interval '4 days'),
('b24', 'inaccessible_entrance', 'medium', 'Gigiri', -1.2352, 36.8072, false, 'reported', 'community', now() - interval '190 days', 1, 0, true, now() - interval '190 days'),
('b25', 'other', 'low', 'Hurlingham', -1.2981, 36.7951, false, 'ai_triaged', 'ai', now() - interval '6 days', 0, 0, true, now() - interval '6 days');

INSERT INTO public.access_points (id, kind, area, lat, lng, source, last_confirmed_at, confirmations) VALUES
('r01', 'ramp', 'CBD', -1.2861, 36.8201, 'audited', now() - interval '14 days', 3),
('r02', 'ramp', 'CBD', -1.2829, 36.8183, 'community3', now() - interval '22 days', 4),
('r03', 'entrance', 'CBD', -1.2856, 36.8193, 'official', now() - interval '6 days', 1),
('r04', 'ramp', 'Westlands', -1.2665, 36.8072, 'community3', now() - interval '30 days', 3),
('r05', 'entrance', 'Westlands', -1.2646, 36.8034, 'audited', now() - interval '18 days', 2),
('r06', 'ramp', 'Ngara', -1.2725, 36.8292, 'official', now() - interval '9 days', 1),
('r07', 'entrance', 'Upper Hill', -1.3005, 36.8142, 'official', now() - interval '12 days', 1),
('r08', 'ramp', 'Kilimani', -1.2934, 36.7835, 'community', now() - interval '50 days', 1),
('r09', 'entrance', 'Hurlingham', -1.2971, 36.7965, 'audited', now() - interval '5 days', 2),
('r10', 'ramp', 'South B', -1.3085, 36.8381, 'community3', now() - interval '40 days', 5);