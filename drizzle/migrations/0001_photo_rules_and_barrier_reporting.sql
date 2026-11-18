CREATE POLICY "Report photos are viewable" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'report-photos');
CREATE POLICY "Upload photos to own folder" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-photos' AND owner_id = auth.uid()::text);

ALTER TABLE public.barriers ADD COLUMN client_ref text CHECK (char_length(client_ref) <= 64);
CREATE UNIQUE INDEX barriers_client_ref_idx ON public.barriers (reporter_id, client_ref) WHERE client_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.report_barrier(
  p_type text, p_severity text, p_lat double precision, p_lng double precision,
  p_temporary boolean, p_note text, p_area text, p_client_ref text, p_ai_triaged boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  new_id text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_signed_in' USING ERRCODE = 'P0001'; END IF;

  -- Same report re-sent from the offline queue
  IF p_client_ref IS NOT NULL THEN
    SELECT id INTO existing FROM public.barriers WHERE reporter_id = uid AND client_ref = p_client_ref;
    IF existing IS NOT NULL THEN RETURN jsonb_build_object('id', existing, 'merged', false, 'duplicate', true); END IF;
  END IF;

  -- Same kind of barrier already reported within ~30 m
  SELECT id INTO existing FROM public.barriers
   WHERE type = p_type AND status <> 'resolved'
     AND last_confirmed_at > now() - interval '30 days'
     AND 111320 * sqrt(power(lat - p_lat, 2) + power((lng - p_lng) * cos(radians(p_lat)), 2)) < 30
   ORDER BY 111320 * sqrt(power(lat - p_lat, 2) + power((lng - p_lng) * cos(radians(p_lat)), 2))
   LIMIT 1;
  IF existing IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.barriers WHERE id = existing AND reporter_id = uid) THEN
      BEGIN
        INSERT INTO public.verifications (target_type, target_id, vote) VALUES ('barrier', existing, 'confirm');
      EXCEPTION WHEN raise_exception THEN
        NULL; -- already confirmed this week: still counts as merged
      END;
    END IF;
    RETURN jsonb_build_object('id', existing, 'merged', true, 'duplicate', false);
  END IF;

  INSERT INTO public.barriers (type, severity, lat, lng, is_temporary, note, area, reporter_id, client_ref, status)
  VALUES (p_type, p_severity, p_lat, p_lng, coalesce(p_temporary, false), nullif(left(p_note, 500), ''),
          left(coalesce(p_area, ''), 60), uid, p_client_ref,
          CASE WHEN p_ai_triaged THEN 'ai_triaged' ELSE 'reported' END)
  RETURNING id INTO new_id;
  RETURN jsonb_build_object('id', new_id, 'merged', false, 'duplicate', false);
END;
$$;
REVOKE ALL ON FUNCTION public.report_barrier(text, text, double precision, double precision, boolean, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_barrier(text, text, double precision, double precision, boolean, text, text, text, boolean) TO authenticated;