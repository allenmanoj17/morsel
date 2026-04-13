-- 🚨 MORSEL ACCOUNT RESET SCRIPT 🚨
-- This will wipe YOUR data so you can restart onboarding.
-- Paste this into Supabase Dashboard -> SQL Editor and run it.

DO $$
DECLARE
    -- REPLACE THIS WITH YOUR USER ID (Found in Supabase Auth -> Users)
    -- Or leave it as is if you want to wipe based on the currently logged in user context
    target_user_id UUID := auth.uid(); 
BEGIN
    -- Delete all your data
    DELETE FROM public.meal_entries WHERE user_id = target_user_id;
    DELETE FROM public.daily_targets WHERE user_id = target_user_id;
    DELETE FROM public.daily_rollups WHERE user_id = target_user_id;
    DELETE FROM public.weights       WHERE user_id = target_user_id;
    DELETE FROM public.profiles      WHERE user_id = target_user_id;

    RAISE NOTICE 'Your account has been reset. Refresh the app to start onboarding! ✨';
END $$;
