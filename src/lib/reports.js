import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

function formatMoney(value) {
  return `$${(parseFloat(value) || 0).toFixed(2)}`
}

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
}

export function exportToExcel(rows, sheetName = 'Reporte', filename = 'reporte') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${sanitizeFilename(filename)}.xlsx`)
}

export function exportSalesByDayToExcel(rows, filename = 'ventas_por_dia') {
  exportToExcel(
    rows.map((r) => ({
      Fecha: r.date,
      'Cantidad de ventas': r.count,
      Total: formatMoney(r.total),
    })),
    'Ventas por día',
    filename
  )
}

export function exportByMethodToExcel(rows, filename = 'ventas_por_metodo') {
  exportToExcel(
    rows.map((r) => ({
      'Método de pago': r.method,
      Monto: formatMoney(r.amount),
      Porcentaje: `${r.percent.toFixed(1)}%`,
    })),
    'Ventas por método',
    filename
  )
}

export function exportTopProductsToExcel(rows, filename = 'productos_mas_vendidos') {
  exportToExcel(
    rows.map((r) => ({
      Producto: r.name,
      SKU: r.sku,
      'Unidades vendidas': r.quantity,
      'Monto total': formatMoney(r.total),
    })),
    'Más vendidos',
    filename
  )
}

export function exportLowStockToExcel(rows, filename = 'stock_bajo') {
  exportToExcel(
    rows.map((r) => ({
      Producto: r.name,
      SKU: r.sku,
      Stock: r.stock,
      Categoría: r.category,
    })),
    'Stock bajo',
    filename
  )
}

export function exportSalesByDayToPDF(rows, summary, filename = 'ventas_por_dia') {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(23, 37, 84)
  doc.text('USA Super Store — Ventas por día', 14, 20)

  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 28)

  if (summary) {
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Total ventas: ${formatMoney(summary.totalSales)}`, 14, 40)
    doc.text(`Transacciones: ${summary.totalTransactions || 0}`, 14, 47)
    doc.text(`Ticket promedio: ${formatMoney(summary.averageTicket || 0)}`, 14, 54)
  }

  const tableRows = rows.map((r) => [r.date, r.count, formatMoney(r.total)])

  doc.autoTable({
    startY: summary ? 62 : 40,
    head: [['Fecha', 'Cantidad de ventas', 'Total']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 10, cellPadding: 2 },
  })

  doc.save(`${sanitizeFilename(filename)}.pdf`)
}
