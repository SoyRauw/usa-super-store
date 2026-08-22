-- Migration: variant-based inventory (USA Super Store)
-- Run this in Supabase SQL Editor before loading products manually.

-- 1. Categories: prefix + optional size config
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS prefix TEXT,
  ADD COLUMN IF NOT EXISTS size_label TEXT DEFAULT 'Peso',
  ADD COLUMN IF NOT EXISTS size_options TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE public.categories
SET prefix = CASE
  WHEN name ILIKE 'beauty and home' THEN 'BEA'
  WHEN name ILIKE 'bath & body' THEN 'BAT'
  WHEN name ILIKE 'medicamentos' THEN 'MED'
  WHEN name ILIKE 'food' THEN 'FOO'
  WHEN name ILIKE 'victoria secret' THEN 'VIC'
  WHEN name ILIKE 'home luxury' THEN 'HOM'
  ELSE UPPER(REGEXP_REPLACE(name, '[^a-zA-Z]', '', 'g'))
END
WHERE prefix IS NULL;

UPDATE public.categories SET prefix = 'CAT' WHERE prefix = '' OR prefix IS NULL;

DO $$
DECLARE
  rec RECORD; base TEXT; candidate TEXT; suffix INT;
BEGIN
  FOR rec IN SELECT id, prefix FROM public.categories ORDER BY created_at, id LOOP
    base := rec.prefix; candidate := base; suffix := 2;
    WHILE EXISTS (SELECT 1 FROM public.categories WHERE prefix = candidate AND id != rec.id) LOOP
      candidate := base || suffix::TEXT; suffix := suffix + 1;
    END LOOP;
    UPDATE public.categories SET prefix = candidate WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE public.categories
  ALTER COLUMN prefix SET NOT NULL,
  ADD CONSTRAINT categories_prefix_unique UNIQUE (prefix);

-- 2. Adjust products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5,2) DEFAULT 50;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_barcode_key;

UPDATE public.products
SET cost = COALESCE(cost,0), tax = COALESCE(tax,0),
    shipping_cost = COALESCE(shipping_cost,0), profit_margin = COALESCE(profit_margin,50)
WHERE cost IS NULL OR tax IS NULL OR shipping_cost IS NULL OR profit_margin IS NULL;

-- 3. Product variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  barcode TEXT,
  color TEXT,
  variant_name TEXT,
  size TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price NUMERIC(12,2) CHECK (price >= 0),
  image TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_variants_sku_unique ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_barcode ON public.product_variants(barcode);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- 4. Movements: variant link + discount placeholder
ALTER TABLE public.movements
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.movements ALTER COLUMN discount_amount SET NOT NULL;

ALTER TABLE public.movement_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_movement_items_variant_id ON public.movement_items(variant_id);

-- 5. Wipe old demo data (products + sales) to start clean
DELETE FROM public.movement_payments;
DELETE FROM public.movement_items;
DELETE FROM public.movements;
DELETE FROM public.product_variants;
DELETE FROM public.products;

-- 6. Fix existing categories that still use old clothing defaults
UPDATE public.categories
SET size_label = 'Peso',
    size_options = ARRAY[]::TEXT[]
WHERE size_label = 'Talla'
   OR size_options @> ARRAY['XS','S','M','L','XL']::TEXT[];

-- 7. RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_select ON public.product_variants;
DROP POLICY IF EXISTS product_variants_insert ON public.product_variants;
DROP POLICY IF EXISTS product_variants_update ON public.product_variants;
DROP POLICY IF EXISTS product_variants_delete ON public.product_variants;

CREATE POLICY product_variants_select ON public.product_variants FOR SELECT USING (true);
CREATE POLICY product_variants_insert ON public.product_variants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY product_variants_update ON public.product_variants FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY product_variants_delete ON public.product_variants FOR DELETE USING (auth.uid() IS NOT NULL);
