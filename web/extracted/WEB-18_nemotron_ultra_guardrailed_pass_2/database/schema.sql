-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Policy: Users can only read their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Policy: Users can only update their own profile (avatar_path)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- No INSERT/DELETE policies = denied by default

-- Storage bucket policies (run in Supabase dashboard or via migration)
-- Bucket: avatars (private)
-- Policy: Users can upload to their own folder
-- CREATE POLICY "avatars_upload_own" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Policy: Users can read their own avatars
-- CREATE POLICY "avatars_select_own" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Policy: Users can update their own avatars
-- CREATE POLICY "avatars_update_own" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
-- Policy: Users can delete their own avatars
-- CREATE POLICY "avatars_delete_own" ON storage.objects
--   FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);