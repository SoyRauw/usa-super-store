-- Add role column to profiles for future admin/vendedor support
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'vendedor'
CHECK (role IN ('admin', 'vendedor'));

UPDATE public.profiles
SET role = 'vendedor'
WHERE role IS NULL;
