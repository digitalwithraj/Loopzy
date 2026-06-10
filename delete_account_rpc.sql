-- ============================================================
-- delete_account_rpc.sql
-- Creates a SECURITY DEFINER function that lets an authenticated
-- user permanently delete their own Supabase Auth account and all
-- associated data (cascaded via foreign key ON DELETE CASCADE).
--
-- Run this in your Supabase SQL Editor (or via migration) ONCE.
-- ============================================================

-- IMPORTANT: Supabase does NOT grant EXECUTE on new functions to
-- the authenticated role by default. The GRANT below is required.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid;
BEGIN
  -- Read the authenticated user's ID from the JWT
  _uid := auth.uid();

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'delete_user_account: auth.uid() returned NULL — user is not authenticated.';
  END IF;

  DELETE FROM auth.users WHERE id = _uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'delete_user_account: no auth.users row found for uid %', _uid;
  END IF;
END;
$$;

-- THIS IS CRITICAL: without this grant, the authenticated role
-- (and thus the client-side anon key) cannot call this function.
GRANT EXECUTE ON FUNCTION public.delete_user_account TO authenticated;
