import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { PAYMENT_METHODS } from './api'

function formatMoney(value) {
  return `$${(parseFloat(value) || 0).toFixed(2)}`
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
}

function movementMethodLabel(m) {
  return PAYMENT_METHODS[m.payment_method] || m.payment_method || '—'
}

export function exportMovementsToExcel(movements, filename = 'reporte_ventas') {
  const rows = movements.map((m) => {
    const total = parseFloat(m.total_amount) || 0
    const discount = parseFloat(m.discount_amount) || 0
    return {
      Fecha: new Date(m.created_at).toLocaleString('es-VE'),
      Recibo: `#${(m.id || '').slice(0, 8)}`,
      Tipo: (m.movement_type || '').toUpperCase(),
      Cliente: m.customer_name || 'Cliente general',
      Método: movementMethodLabel(m),
      Subtotal: formatMoney(total + discount),
      Descuento: discount > 0 ? formatMoney(discount) : '—',
      Total: formatMoney(total),
      Estado: (m.status || '').toUpperCase(),
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
}

export function exportMovementsToPDF(movements, summary, filename = 'reporte_ventas') {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(23, 37, 84)
  doc.text('USA Super Store — Reporte de Ventas', 14, 20)

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
