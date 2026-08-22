import { supabase } from './supabaseClient'
import { calculateSalePrice as calcSalePrice } from './sku'

export const LOW_STOCK_THRESHOLD = 2
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

export function calculateSalePrice(fields) {
  return calcSalePrice(fields)
}

// Categories
export async function fetchCategories() {
  const { data, error } = await supabase.from('categories').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function createCategory(payload) {
  const { data, error } = await supabase.from('categories').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateCategory(id, payload) {
  const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

// Products (parents)
const PRODUCT_SELECT = '*, categories(*), product_variants(*)'

export async function fetchProducts(filters = {}) {
  const { search = '', categoryId = '', lowStock = false, activeOnly = false } = filters
  let query = supabase.from('products').select(PRODUCT_SELECT).order('name')
  if (search) {
    query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`)
  }
  if (categoryId) query = query.eq('category_id', categoryId)
  if (activeOnly) query = query.eq('active', true)

  const { data, error } = await query
  if (error) throw error

  const products = data || []
  if (lowStock) {
    return products.filter((p) =>
      (p.product_variants || []).some((v) => (v.stock || 0) <= LOW_STOCK_THRESHOLD)
    )
  }
  return products
}

export async function fetchProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

function cleanVariantPayload(v) {
  const payload = {
    product_id: v.product_id,
    sku: v.sku,
    barcode: v.barcode || v.sku,
    color: v.color || null,
    variant_name: v.variant_name || null,
    size: v.size || null,
    stock: v.stock,
    price: v.price,
    active: v.active ?? true,
  }
  if (v.id && !String(v.id).startsWith('temp-')) {
    payload.id = v.id
  }
  return payload
}

export async function createProduct({ product, variants }) {
  const { data: prod, error: prodError } = await supabase
    .from('products')
    .insert(product)
    .select(PRODUCT_SELECT)
    .single()
  if (prodError) throw prodError

  if (variants?.length) {
    const rows = variants.map((v) => cleanVariantPayload({ ...v, product_id: prod.id }))
    const { error: varError } = await supabase.from('product_variants').insert(rows)
    if (varError) throw varError
  }
  return fetchProductById(prod.id)
}

export async function updateProduct(id, { product, variants }) {
  const { error: prodError } = await supabase.from('products').update(product).eq('id', id)
  if (prodError) throw prodError

  if (variants) {
    const toInsert = []
    const toUpdate = []
    const toDelete = []

    variants.forEach((v) => {
      if (v.isDeleted && v.id && !String(v.id).startsWith('temp-')) {
        toDelete.push(v.id)
      } else if (!v.isDeleted) {
        const row = cleanVariantPayload({ ...v, product_id: id })
        if (v.id && !String(v.id).startsWith('temp-')) {
          toUpdate.push(row)
        } else {
          toInsert.push(row)
        }
      }
    })

    if (toDelete.length) {
      const { error } = await supabase.from('product_variants').delete().in('id', toDelete)
      if (error) throw error
    }
    for (const row of toUpdate) {
      const { id: varId, ...payload } = row
      const { error } = await supabase.from('product_variants').update(payload).eq('id', varId)
      if (error) throw error
    }
    if (toInsert.length) {
      const { error } = await supabase.from('product_variants').insert(toInsert)
      if (error) throw error
    }
  }
  return fetchProductById(id)
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export function getProductStock(product) {
  return (product?.product_variants || []).reduce((sum, v) => sum + (v.stock || 0), 0)
}

export function isLowStock(stock) {
  return stock <= LOW_STOCK_THRESHOLD
}

// Variants for POS / inventory
export async function fetchVariantsForPos(search = '') {
  let query = supabase
    .from('product_variants')
    .select('*, products(*, categories(*))')
    .gt('stock', 0)
    .eq('active', true)
  if (search) {
    query = query.or(`sku.ilike.%${search}%,barcode.ilike.%${search}%,products.name.ilike.%${search}%`)
  }
  const { data, error } = await query.limit(50)
  if (error) throw error
  return data || []
}

export async function fetchVariantByCode(code) {
  const clean = (code || '').trim().toUpperCase()
  const { data, error } = await supabase
    .from('product_variants')
    .select('*, products(*, categories(*))')
    .or(`sku.ilike.%${clean}%,barcode.ilike.%${clean}%`)
    .gt('stock', 0)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function updateVariantStock(variantId, newStock) {
  const { error } = await supabase
    .from('product_variants')
    .update({ stock: Math.max(0, newStock) })
    .eq('id', variantId)
  if (error) throw error
}

// Movements / sales
const MOVEMENT_SELECT = '*, movement_items(*, products(name, id), product_variants(sku, color, variant_name, size)), movement_payments(*)'

export async function createMovement(movement) {
  const { data, error } = await supabase.from('movements').insert(movement).select().single()
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

export async function fetchMovements({ startDate, endDate } = {}) {
  let query = supabase.from('movements').select(MOVEMENT_SELECT).eq('movement_type', 'venta').order('created_at', { ascending: false })
  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchMovementById(id) {
  const { data, error } = await supabase.from('movements').select(MOVEMENT_SELECT).eq('id', id).single()
  if (error) throw error
  return data
}

// Reports
export async function fetchReportMovements({ startDate, endDate } = {}) {
  let query = supabase
    .from('movements')
    .select(MOVEMENT_SELECT)
    .eq('movement_type', 'venta')
    .eq('status', 'pagado')
    .order('created_at', { ascending: true })
  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchLowStockProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name), product_variants(*)')
    .eq('active', true)
  if (error) throw error
  return (data || []).filter((p) =>
    (p.product_variants || []).some((v) => (v.stock || 0) <= LOW_STOCK_THRESHOLD)
  )
}

export async function fetchDashboardStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const [{ data: movements }, { data: products }] = await Promise.all([
    supabase
      .from('movements')
      .select('total_amount')
      .eq('movement_type', 'venta')
      .eq('status', 'pagado')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString()),
    supabase.from('products').select('product_variants(stock)').eq('active', true),
  ])

  const todaySales = (movements || []).reduce((sum, m) => sum + (parseFloat(m.total_amount) || 0), 0)
  const lowStockCount = (products || []).reduce(
    (count, p) =>
      count +
      (p.product_variants || []).filter((v) => (v.stock || 0) <= LOW_STOCK_THRESHOLD).length,
    0
  )

  return {
    todaySales,
    todayCount: movements?.length || 0,
    lowStockCount,
  }
}

// ============================================================================
// Customers
// ============================================================================
export async function fetchCustomers(search = '') {
  let query = supabase.from('customers').select('*').order('name')
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,id_number.ilike.%${search}%`)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchCustomerByIdNumber(idNumber) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .ilike('id_number', idNumber.trim())
    .limit(2)
  if (error) throw error
  return data || []
}

export async function createCustomer(payload) {
  const { data, error } = await supabase.from('customers').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateCustomer(id, payload) {
  const { data, error } = await supabase.from('customers').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}
