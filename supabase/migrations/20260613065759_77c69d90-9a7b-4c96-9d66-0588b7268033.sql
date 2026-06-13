
-- Public read on avatars + portfolio; owner write via user-id-prefixed paths.
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read portfolio" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'portfolio');
CREATE POLICY "Users upload own portfolio" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own portfolio" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own portfolio" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] = auth.uid()::text);
