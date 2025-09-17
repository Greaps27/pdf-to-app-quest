-- Fix critical security issue: Make user_id NOT NULL in searches table
-- This prevents RLS policy violations when creating searches

ALTER TABLE public.searches 
ALTER COLUMN user_id SET NOT NULL;

-- Add a check constraint to ensure user_id is always set to the authenticated user
ALTER TABLE public.searches 
ADD CONSTRAINT searches_user_id_matches_auth CHECK (user_id = auth.uid());