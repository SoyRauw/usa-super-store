import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { PAYMENT_METHODS } from './api'
import { formatVariantLabel } from './sku'

function formatMoney(value) {
  return `$${(parseFloat(value) || 0).toFixed(2)}`
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_\-() ]/gi, '_')
}

function movementMethodLabel(m) {
  return PAYMENT_METHODS[m.payment_method] || m.payment_method || '—'
}

export function formatMovementPayments(movement) {
  if (movement.payment_method === 'multiple' && movement.movement_payments?.length) {
    return movement.movement_payments
      .map((p) => `${PAYMENT_METHODS[p.method] || p.method} ${formatMoney(p.amount)}`)
      .join(' / ')
  }
  return `${movementMethodLabel(movement)} ${formatMoney(movement.total_amount)}`
}

export function exportMovementsToExcel(movements, movementItems, filename = 'reporte_ventas') {
  const salesRows = movements.map((m) => {
    const total = parseFloat(m.total_amount) || 0
    const discount = parseFloat(m.discount_amount) || 0
    return {
      Fecha: new Date(m.created_at).toLocaleString('es-VE'),
      Recibo: `#${(m.id || '').slice(0, 8)}`,
      Tipo: (m.movement_type || '').toUpperCase(),
      Cliente: m.customer_name || 'Cliente general',
      Método: formatMovementPayments(m),
      Subtotal: formatMoney(total + discount),
      Descuento: discount > 0 ? formatMoney(discount) : '—',
      Total: formatMoney(total),
      Estado: (m.status || '').toUpperCase(),
    }
  })

  const itemRows = []
  movementItems.forEach((item) => {
    const movement = movements.find((m) => m.id === item.movement_id)
    if (!movement) return
    const createdAt = new Date(movement.created_at)
    const product = item.products
    const variant = item.product_variants
    itemRows.push({
      Fecha: createdAt.toLocaleDateString('es-VE'),
      Hora: createdAt.toLocaleTimeString('es-VE'),
      Recibo: `#${(movement.id || '').slice(0, 8)}`,
      Cliente: movement.customer_name || 'Cliente general',
      Producto: product?.name || '—',
      Variante: formatVariantLabel(variant, product?.categories?.size_label),
      SKU: variant?.sku || product?.sku || '—',
      Cantidad: item.quantity || 0,
      'Precio unitario': formatMoney(item.unit_price),
      Total: formatMoney((item.quantity || 0) * (parseFloat(item.unit_price) || 0)),
      'Método de pago': formatMovementPayments(movement),
    })
  })

  const summaryMap = {}
  movementItems.forEach((item) => {
    const product = item.products
    const variant = item.product_variants
    const key = `${product?.id || item.product_id}-${variant?.id || ''}`
    const quantity = item.quantity || 0
    const total = quantity * (parseFloat(item.unit_price) || 0)
    if (!summaryMap[key]) {
      summaryMap[key] = {
        producto: product?.name || '—',
        variante: formatVariantLabel(variant, product?.categories?.size_label),
        sku: variant?.sku || product?.sku || '—',
        unidades: 0,
        monto: 0,
      }
    }
    summaryMap[key].unidades += quantity
    summaryMap[key].monto += total
  })
  const summaryRows = Object.values(summaryMap)
    .sort((a, b) => b.unidades - a.unidades)
    .map((r) => ({
      Producto: r.producto,
      Variante: r.variante,
      SKU: r.sku,
      'Unidades vendidas': r.unidades,
      'Monto total': formatMoney(r.monto),
    }))

  const wb = XLSX.utils.book_new()

  const salesWs = XLSX.utils.json_to_sheet(salesRows)
  XLSX.utils.book_append_sheet(wb, salesWs, 'Ventas')

  const itemsWs = XLSX.utils.json_to_sheet(itemRows)
  XLSX.utils.book_append_sheet(wb, itemsWs, 'Productos vendidos')

  const summaryWs = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen por producto')

  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
}

export function exportMovementsToPDF(movements, summary, filename = 'reporte_ventas') {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(23, 37, 84)
  doc.text('USA Super Store - Reporte de Ventas', 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, 14, 28)

  if (summary) {
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Total ventas: ${formatMoney(summary.totalSales)}`, 14, 42)
    doc.text(`Transacciones: ${summary.totalTransactions || 0}`, 14, 49)
    doc.text(`Ticket promedio: ${formatMoney(summary.averageTicket || 0)}`, 14, 56)
  }

  const tableRows = movements.map((m) => [
    new Date(m.created_at).toLocaleString('es-VE'),
    `#${(m.id || '').slice(0, 8)}`,
    m.customer_name || 'Cliente general',
    movementMethodLabel(m),
    formatMoney(m.total_amount),
  ])

  doc.autoTable({
    startY: summary ? 64 : 40,
    head: [['Fecha', 'Recibo', 'Cliente', 'Método', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 9, cellPadding: 2 },
  })

  doc.save(`${sanitizeFilename(filename)}.pdf`)
}

export function exportByMethodToExcel(rows, filename = 'ventas_por_metodo') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      'Método de pago': r.method,
      Monto: formatMoney(r.amount),
      Porcentaje: `${r.percent.toFixed(1)}%`,
    }))
  )
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas por método')
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
}

export function exportTopProductsToExcel(rows, filename = 'productos_mas_vendidos') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Producto: r.name,
      Variante: r.variant || '—',
      'Unidades vendidas': r.quantity,
      'Monto total': formatMoney(r.total),
    }))
  )
  XLSX.utils.book_append_sheet(wb, ws, 'Más vendidos')
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
}

export function exportByCategoryToExcel(rows, filename = 'ventas_por_categoria') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(
    rows.map((r) => ({
      Categoría: r.category,
      Monto: formatMoney(r.amount),
    }))
  )
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas por categoría')
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
}
