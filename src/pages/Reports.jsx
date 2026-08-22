import { useEffect, useMemo, useState } from 'react'
import { Calendar, FileSpreadsheet, FileText, TrendingUp, CreditCard, Package, AlertTriangle } from 'lucide-react'
import { fetchReportMovements, fetchLowStockProducts, PAYMENT_METHODS, formatMoney } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { formatVariantLabel } from '../lib/sku'
import {
  exportSalesByDayToExcel,
  exportByMethodToExcel,
  exportTopProductsToExcel,
  exportLowStockToExcel,
  exportSalesByDayToPDF,
} from '../lib/reports'

const TABS = [
  { id: 'day', label: 'Ventas por día', icon: TrendingUp },
  { id: 'method', label: 'Por método de pago', icon: CreditCard },
  { id: 'top', label: 'Más vendidos', icon: Package },
  { id: 'stock', label: 'Bajo stock', icon: AlertTriangle },
]

function formatDateInput(date) {
  return date ? new Date(date).toISOString().split('T')[0] : ''
}

function toStartOfDay(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function toEndOfDay(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export default function Reports() {
  const today = formatDateInput(new Date())
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [activeTab, setActiveTab] = useState('day')
  const [movements, setMovements] = useState([])
  const [movementItems, setMovementItems] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [movs, low] = await Promise.all([
          fetchReportMovements({
            startDate: toStartOfDay(startDate),
            endDate: toEndOfDay(endDate),
          }),
          fetchLowStockProducts(),
        ])

        setMovements(movs)
        setLowStock(low)

        const allItems = movs.flatMap((m) => m.movement_items || [])
        setMovementItems(allItems)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [startDate, endDate])

  const summary = useMemo(() => {
    const totalSales = movements.reduce(
      (sum, m) => sum + (parseFloat(m.total_amount) || 0),
      0
    )
    return {
      totalSales,
      totalTransactions: movements.length,
      averageTicket: movements.length > 0 ? totalSales / movements.length : 0,
    }
  }, [movements])

  const salesByDay = useMemo(() => {
    const map = {}
    movements.forEach((m) => {
      const date = new Date(m.created_at).toLocaleDateString('es-VE')
      if (!map[date]) map[date] = { date, count: 0, total: 0 }
      map[date].count += 1
      map[date].total += parseFloat(m.total_amount) || 0
    })
    return Object.values(map).sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    )
  }, [movements])

  const byMethod = useMemo(() => {
    const map = {}
    movements.forEach((m) => {
      if (m.payment_method === 'multiple' && m.movement_payments?.length) {
        m.movement_payments.forEach((p) => {
          map[p.method] = (map[p.method] || 0) + (parseFloat(p.amount) || 0)
        })
      } else {
        map[m.payment_method] =
          (map[m.payment_method] || 0) + (parseFloat(m.total_amount) || 0)
      }
    })
    const total = Object.values(map).reduce((s, v) => s + v, 0)
    return Object.entries(map)
      .map(([method, amount]) => ({
        method: PAYMENT_METHODS[method] || method,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [movements])

  const topProducts = useMemo(() => {
    const map = {}
    movementItems.forEach((item) => {
      const id = item.product_id
      const name = item.products?.name || '—'
      if (!map[id]) map[id] = { id, name, quantity: 0, total: 0 }
      map[id].quantity += item.quantity || 0
      map[id].total += (item.quantity || 0) * (parseFloat(item.unit_price) || 0)
    })
    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 20)
  }, [movementItems])

  const lowStockVariants = useMemo(() => {
    const rows = []
    lowStock.forEach((p) => {
      ;(p.product_variants || [])
        .filter((v) => (v.stock || 0) <= 2)
        .forEach((v) => {
          rows.push({
            id: v.id,
            name: p.name,
            sku: v.sku,
            stock: v.stock,
            category: p.categories?.name,
            variantLabel: formatVariantLabel(v, p.categories?.size_label),
          })
        })
    })
    return rows.sort((a, b) => a.stock - b.stock)
  }, [lowStock])

  function handleExportExcel() {
    const filename = `reporte_${activeTab}_${startDate}_${endDate}`
    if (activeTab === 'day') exportSalesByDayToExcel(salesByDay, filename)
    if (activeTab === 'method') exportByMethodToExcel(byMethod, filename)
    if (activeTab === 'top') exportTopProductsToExcel(topProducts, filename)
    if (activeTab === 'stock') exportLowStockToExcel(lowStockVariants, filename)
  }

  function handleExportPDF() {
    if (activeTab === 'day') {
      exportSalesByDayToPDF(salesByDay, summary, `ventas_${startDate}_${endDate}`)
    } else {
      alert('PDF disponible por ahora solo para Ventas por día.')
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="pageHeader">
        <h1>Reportes</h1>
        <p>Análisis de ventas y estado del inventario</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="card mb-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Desde</label>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="label">Hasta</label>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
              />
            </div>
          </div>
          <button
            onClick={() => {
              const t = formatDateInput(new Date())
              setStartDate(t)
              setEndDate(t)
            }}
            className="btn btnOutline"
          >
            Hoy
          </button>
          <div className="ml-auto flex gap-2">
            <button onClick={handleExportExcel} className="btn btnOutline">
              <FileSpreadsheet size={18} /> Excel
            </button>
            <button onClick={handleExportPDF} className="btn btnOutline">
              <FileText size={18} /> PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-slate-500">Total ventas</p>
            <p className="text-2xl font-bold text-blue-900">{formatMoney(summary.totalSales)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-slate-500">Transacciones</p>
            <p className="text-2xl font-bold text-blue-900">{summary.totalTransactions}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-slate-500">Ticket promedio</p>
            <p className="text-2xl font-bold text-blue-900">{formatMoney(summary.averageTicket)}</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`btn flex items-center gap-2 ${
                active ? 'btnPrimary' : 'btnOutline'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="card">
        {loading ? (
          <p className="text-slate-500">Cargando...</p>
        ) : activeTab === 'day' ? (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cantidad de ventas</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {salesByDay.map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>{r.count}</td>
                    <td className="font-semibold">{formatMoney(r.total)}</td>
                  </tr>
                ))}
                {salesByDay.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-slate-500">
                      No hay ventas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'method' ? (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Método de pago</th>
                  <th>Monto</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                {byMethod.map((r, i) => (
                  <tr key={i}>
                    <td>{r.method}</td>
                    <td className="font-semibold">{formatMoney(r.amount)}</td>
                    <td>{r.percent.toFixed(1)}%</td>
                  </tr>
                ))}
                {byMethod.length === 0 && (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-slate-500">
                      No hay ventas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'top' ? (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Unidades vendidas</th>
                  <th>Monto total</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="font-mono text-xs text-slate-500">{r.sku}</td>
                    <td>{r.quantity}</td>
                    <td className="font-semibold">{formatMoney(r.total)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">
                      No hay ventas en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="tableWrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {lowStockVariants.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.name}
                      {r.variantLabel && r.variantLabel !== 'Estándar' && (
                        <div className="text-xs text-slate-500">{r.variantLabel}</div>
                      )}
                    </td>
                    <td className="font-mono text-xs text-slate-500">{r.sku}</td>
                    <td>{r.category}</td>
                    <td>
                      <span className="badge badgeDanger">{r.stock}</span>
                    </td>
                  </tr>
                ))}
                {lowStockVariants.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-slate-500">
                      No hay variantes con stock bajo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
