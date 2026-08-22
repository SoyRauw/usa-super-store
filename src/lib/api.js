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

export async function fetchProductsForPos(search = '') {
  let query = supabase
    .from('products')
    .select('*, categories(name)')
    .eq('active', true)
    .gt('stock', 0)
    .order('name')

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`
    )
  }

  const { data, error } = await query.limit(20)
  if (error) throw error
  return data || []
}

export async function fetchProductByCode(code) {
  const clean = code.trim().toUpperCase()
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .or(`barcode.ilike.%${clean}%,sku.ilike.%${clean}%`)
    .eq('active', true)
    .gt('stock', 0)
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createMovement(movement) {
  const { data, error } = await supabase
    .from('movements')
    .insert(movement)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createMovementItems(items) {
  const { error } = await supabase.from('movement_items').insert(items)
  if (error) throw error
}

export async function createMovementPayments(payments) {
  const { error } = await supabase.from('movement_payments').insert(payments)
  if (error) throw error
}

export async function updateProductStock(productId, newStock) {
  const { error } = await supabase
    .from('products')
    .update({ stock: Math.max(0, newStock) })
    .eq('id', productId)
  if (error) throw error
}

export async function fetchMovements({ startDate, endDate } = {}) {
  let query = supabase
    .from('movements')
    .select('*, movement_items(*, products(name, sku)), movement_payments(*)')
    .eq('movement_type', 'venta')
    .order('created_at', { ascending: false })

  if (startDate) {
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    query = query.lte('created_at', endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchMovementById(id) {
  const { data, error } = await supabase
    .from('movements')
    .select('*, movement_items(*, products(name, sku)), movement_payments(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const PAYMENT_METHODS = {
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
  transferencia: 'Transferencia',
  punto: 'Punto de Venta',
  multiple: 'Múltiple',
}

export function formatMoney(value) {
  return `$${(parseFloat(value) || 0).toFixed(2)}`
}
