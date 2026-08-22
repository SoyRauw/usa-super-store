import { supabase } from './supabaseClient'

const LOW_STOCK_THRESHOLD = 2

export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data || []
}

export async function createCategory(name) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id, name) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function fetchProducts(filters = {}) {
  const { search = '', categoryId = '', lowStock = false, activeOnly = false } =
    filters

  let query = supabase
    .from('products')
    .select('*, categories(name)')
    .order('name')

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`
    )
  }

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  if (lowStock) {
    query = query.lte('stock', LOW_STOCK_THRESHOLD)
  }

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(id, product) {
  const { data, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export function calculateSalePrice({ cost, tax, shipping_cost, profit_margin }) {
  const c = parseFloat(cost) || 0
  const t = parseFloat(tax) || 0
  const s = parseFloat(shipping_cost) || 0
  const m = parseFloat(profit_margin) || 0
  return c + t + s + c * (m / 100)
}

export function isLowStock(stock) {
  return stock <= LOW_STOCK_THRESHOLD
}
