const CATEGORY_PREFIXES = {
  'BEAUTY AND HOME': 'BEA',
  'BATH & BODY': 'BAT',
  'MEDICAMENTOS': 'MED',
  'FOOD': 'FOO',
  'VICTORIA SECRET': 'VIC',
  'HOME LUXURY': 'HOM',
}

export function getCategoryPrefix(categoryName) {
  const key = categoryName.trim().toUpperCase()
  return CATEGORY_PREFIXES[key] || generateFallbackPrefix(key)
}

function generateFallbackPrefix(name) {
  const words = name.split(/\s+/).filter(Boolean)
  let prefix = ''
  for (const word of words) {
    if (prefix.length >= 3) break
    prefix += word[0]
  }
  return prefix.padEnd(3, 'X').toUpperCase()
}

export function generateSku(categoryName, productName, existingProducts = []) {
  const prefix = getCategoryPrefix(categoryName)
  const upperName = productName.trim().toUpperCase()

  const samePrefixProducts = existingProducts.filter((p) =>
    p.sku?.toUpperCase().startsWith(`${prefix}-`)
  )

  const maxProductNumber = samePrefixProducts.reduce((max, p) => {
    const parts = p.sku?.split('-') || []
    if (parts.length === 3) {
      const n = parseInt(parts[1], 10)
      return isNaN(n) ? max : Math.max(max, n)
    }
    return max
  }, 0)

  const productNumber = maxProductNumber + 1

  const sameNameProducts = existingProducts.filter(
    (p) => p.name?.trim().toUpperCase() === upperName
  )

  const maxVariant = sameNameProducts.reduce((max, p) => {
    const parts = p.sku?.split('-') || []
    if (parts.length === 3) {
      const v = parseInt(parts[2], 10)
      return isNaN(v) ? max : Math.max(max, v)
    }
    return max
  }, 0)

  const variant = maxVariant + 1

  return `${prefix}-${String(productNumber).padStart(3, '0')}-${String(
    variant
  ).padStart(3, '0')}`
}
