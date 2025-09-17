-- Remove invalid CHECK constraint that referenced auth.uid()
ALTER TABLE public.searches 
DROP CONSTRAINT IF EXISTS searches_user_id_matches_auth;