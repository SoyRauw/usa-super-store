-- Migration: customers (USA Super Store)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  id_number TEXT UNIQUE,
  phone TEXT,
  email TEXT,
  address TEXT,
  birthday DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add customer columns to movements if not present
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_movements_customer_id ON public.movements(customer_id);

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customers_select ON public.customers;
DROP POLICY IF EXISTS customers_insert ON public.customers;
DROP POLICY IF EXISTS customers_update ON public.customers;
DROP POLICY IF EXISTS customers_delete ON public.customers;

CREATE POLICY customers_select ON public.customers FOR SELECT USING (true);
CREATE POLICY customers_insert ON public.customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY customers_update ON public.customers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY customers_delete ON public.customers FOR DELETE USING (auth.uid() IS NOT NULL);
