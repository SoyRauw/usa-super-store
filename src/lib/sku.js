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
    .replace(/[^A-Z0-9]/g, '')
    .trim()
}

/**
 * Genera un prefijo de categoría basado en las primeras letras del nombre.
 * Regla:
 *  1. Si hay mapeo hardcodeado, úsalo.
 *  2. Toma las primeras 3 letras del nombre normalizado.
 *  3. Si colisiona con existingPrefixes, alarga con la siguiente letra del nombre.
 *  4. Si se acaban las letras del nombre, añade un número incremental.
 *
 * Ejemplos:
 *   getCategoryPrefix('Bebidas')               -> 'BEB'
 *   getCategoryPrefix('Bebidas', ['BEB'])      -> 'BEBI'
 *   getCategoryPrefix('Bebidas', ['BEB','BEBI'])-> 'BEBID'
 *   getCategoryPrefix('Foo', ['FOO','FOOO'])   -> 'FOO2'
 */
export function getCategoryPrefix(categoryName, existingPrefixes = []) {
  const key = (categoryName || '').trim().toUpperCase()
  const hardcoded = CATEGORY_PREFIXES[key]
  if (hardcoded && !existingPrefixes.includes(hardcoded)) {
    return hardcoded
  }

  const normalized = normalize(categoryName)
  if (!normalized) return ''

  const baseCandidates = []
  for (let i = 3; i <= normalized.length; i++) {
    baseCandidates.push(normalized.slice(0, i))
  }
  // Si el nombre tiene menos de 3 caracteres, usar el nombre completo y rellenar con X
  if (baseCandidates.length === 0) {
    baseCandidates.push(normalized.padEnd(3, 'X'))
  }

  // Buscar el primer candidato que no colisione
  for (const candidate of baseCandidates) {
    if (!existingPrefixes.includes(candidate)) {
      return candidate
    }
  }

  // Desempate final: agregar número incremental
  const last = baseCandidates[baseCandidates.length - 1]
  let suffix = 2
  while (existingPrefixes.includes(`${last}${suffix}`)) {
    suffix++
  }
  return `${last}${suffix}`
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

export function formatVariantLabel(variant, sizeLabel = 'Peso') {
  const parts = []
  if (variant?.color) parts.push(variant.color)
  if (variant?.variant_name) parts.push(variant.variant_name)
  // Mostrar peso/medida directamente sin prefijo redundante,
  // porque usualmente ya incluye la unidad (950ml, 300g, 1L).
  if (variant?.size) parts.push(variant.size)
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
