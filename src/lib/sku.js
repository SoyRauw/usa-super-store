const CATEGORY_PREFIXES = {
  'BEAUTY AND HOME': 'BEA',
  'BATH & BODY': 'BAT',
  'MEDICAMENTOS': 'MED',
  'FOOD': 'FOO',
  'VICTORIA SECRET': 'VIC',
  'HOME LUXURY': 'HOM',
}

function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
}

export function getCategoryPrefix(categoryName) {
  const key = (categoryName || '').trim().toUpperCase()
  return CATEGORY_PREFIXES[key] || generateFallbackPrefix(key)
}

function generateFallbackPrefix(name) {
  const words = normalize(name).split(/\s+/).filter(Boolean)
  let prefix = ''
  for (const word of words) {
    if (prefix.length >= 3) break
    prefix += word[0]
  }
  return prefix.padEnd(3, 'X').toUpperCase()
}

export function generateProductCode(categoryPrefix, existingCodes = []) {
  if (!categoryPrefix) return ''
  const regex = new RegExp(`^${categoryPrefix}-(\\d{3,})$`)
  let max = 0
  existingCodes.forEach((code) => {
    const match = code?.match(regex)
    if (match) max = Math.max(max, parseInt(match[1], 10))
  })
  return `${categoryPrefix}-${String(max + 1).padStart(3, '0')}`
}

export function generateVariantCode(productId, existingVariantCodes = []) {
  if (!productId) return ''
  const prefix = `${productId}-`
  let max = 0
  existingVariantCodes.forEach((code) => {
    if (code?.startsWith(prefix)) {
      const suffix = code.slice(prefix.length)
      const num = suffix.split('-')[0]
      if (/^\d+$/.test(num)) {
        max = Math.max(max, parseInt(num, 10))
      }
    }
  })
  return `${productId}-${String(max + 1).padStart(3, '0')}`
}

export function formatVariantLabel(variant, sizeLabel = 'Talla') {
  const parts = []
  if (variant?.color) parts.push(variant.color)
  if (variant?.variant_name) parts.push(variant.variant_name)
  if (variant?.size) parts.push(`${sizeLabel} ${variant.size}`)
  if (parts.length === 0) return 'Estándar'
  return parts.join(' / ')
}

export function calculateSalePrice({ cost, tax, shipping_cost, profit_margin }) {
  const c = parseFloat(cost) || 0
  const t = parseFloat(tax) || 0
  const s = parseFloat(shipping_cost) || 0
  const m = parseFloat(profit_margin) || 0
  return c + t + s + c * (m / 100)
}
