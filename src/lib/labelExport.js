import * as XLSX from 'xlsx'
import { formatVariantLabel } from './sku'

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
}

export function exportProductLabels(product) {
  const variants = (product.product_variants || []).filter((v) => !v.isDeleted && (v.stock || 0) > 0)
  const rows = []

  variants.forEach((v) => {
    const price = v.price || product.sale_price || 0
    const quantity = parseInt(v.stock, 10) || 0
    for (let i = 0; i < quantity; i++) {
      rows.push({
        SKU: v.sku || '',
        Nombre: product.name || '',
        Variante: formatVariantLabel(v, product.categories?.size_label),
        Color: v.color || '',
        Tamaño: v.size || '',
        Precio: parseFloat(price).toFixed(2),
        Barcode: v.barcode || v.sku || '',
      })
    }
  })

  if (rows.length === 0) {
    alert('No hay variantes con stock para generar etiquetas')
    return
  }

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Etiquetas')

  const safeId = sanitizeFilename(product.id || product.name || 'producto')
  const dateStr = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `etiquetas_${safeId}_${dateStr}.xlsx`)
}
