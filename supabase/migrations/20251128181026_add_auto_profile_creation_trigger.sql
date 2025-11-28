/*
  # Add Automatic Profile Creation Trigger

  1. Changes
    - Create a trigger function to automatically create profiles when users sign up
    - Add trigger to auth.users table
    - Backfill any existing auth.users without profiles
    - Ensure proper metadata storage

  2. Security
    - Trigger runs with security definer privileges
    - Only creates profile if it doesn't exist
    - Uses proper error handling
*/

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, employee_id, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'employee_id', 'EMP-' || substr(NEW.id::text, 1, 8)),
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users without profiles
INSERT INTO public.profiles (id, email, full_name, employee_id, is_admin)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(au.raw_user_meta_data->>'employee_id', 'EMP-' || substr(au.id::text, 1, 8)),
  COALESCE((au.raw_user_meta_data->>'is_admin')::boolean, false)
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
