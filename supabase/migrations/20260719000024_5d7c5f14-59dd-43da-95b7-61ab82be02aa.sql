DROP POLICY IF EXISTS conv_insert ON public.conventions;
DROP POLICY IF EXISTS conv_update ON public.conventions;
DROP POLICY IF EXISTS conv_select ON public.conventions;

CREATE POLICY conv_select ON public.conventions FOR SELECT TO authenticated USING (true);
CREATE POLICY conv_insert ON public.conventions FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY conv_update ON public.conventions FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);