import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  CreditCard,
  Package,
  DollarSign,
  ShoppingBag,
} from 'lucide-react'
import { fetchReportMovements, fetchProfiles, PAYMENT_METHODS, formatMoney } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { formatVariantLabel } from '../lib/sku'
import {
  exportMovementsToExcel,
  exportMovementsToPDF,
} from '../lib/reports'
import styles from './Reports.module.css'

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
  const [userId, setUserId] = useState('')
  const [method, setMethod] = useState('')
  const [movements, setMovements] = useState([])
  const [movementItems, setMovementItems] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [movs, profiles] = await Promise.all([
          fetchReportMovements({
            startDate: toStartOfDay(startDate),
            endDate: toEndOfDay(endDate),
            userId: userId || undefined,
            method: method || undefined,
          }),
          fetchProfiles(),
        ])
        setMovements(movs)
        setUsers(profiles)
        setMovementItems(movs.flatMap((m) => m.movement_items || []))
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [startDate, endDate, userId, method])

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
      .map(([methodKey, amount]) => ({
        method: PAYMENT_METHODS[methodKey] || methodKey,
        amount,
        percent: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [movements])

  const topProducts = useMemo(() => {
    const map = {}
    movementItems.forEach((item) => {
      const product = item.products
      const variant = item.product_variants
      const name = product?.name || '—'
      const variantLabel = formatVariantLabel(variant, product?.categories?.size_label)
      const key = `${product?.id || item.product_id}-${variant?.id || ''}`
      if (!map[key]) {
        map[key] = {
          name,
          variant: variantLabel,
          sku: variant?.sku || '',
          quantity: 0,
          total: 0,
        }
      }
      map[key].quantity += item.quantity || 0
      map[key].total += (item.quantity || 0) * (parseFloat(item.unit_price) || 0)
    })
    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }, [movementItems])

  const byCategory = useMemo(() => {
    const map = {}
    movementItems.forEach((item) => {
      const cat = item.products?.categories?.name || 'Sin categoría'
      map[cat] = (map[cat] || 0) + (item.quantity || 0) * (parseFloat(item.unit_price) || 0)
    })
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [movementItems])

  function handleToday() {
    const t = formatDateInput(new Date())
    setStartDate(t)
    setEndDate(t)
  }

  function handleExportExcel() {
    exportMovementsToExcel(movements, `ventas_${startDate}_${endDate}`)
  }

  function handleExportPDF() {
    exportMovementsToPDF(movements, summary, `ventas_${startDate}_${endDate}`)
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.title}>
          <h1>Reportes de Ventas</h1>
          <p>Analiza y exporta tus ventas</p>
        </div>
        <div className={styles.actions}>
          <button onClick={handleExportExcel} className="btn btnOutline">
            <FileSpreadsheet size={18} /> Excel
          </button>
          <button onClick={handleExportPDF} className="btn btnOutline">
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className={styles.card}>
        <div className={styles.filters}>
          <div className={styles.filterField}>
            <label>Desde</label>
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
          <div className={styles.filterField}>
            <label>Hasta</label>
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
          <div className={styles.filterField}>
            <label>Cajero</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input">
              <option value="">Todos</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email || u.id}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.filterField}>
            <label>Método de pago</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
              <option value="">Todos</option>
              {Object.entries(PAYMENT_METHODS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleToday} className="btn btnOutline">
            Hoy
          </button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <DollarSign size={28} className={styles.summaryIcon} />
            <div>
              <p className={styles.summaryLabel}>Total ventas</p>
              <p className={styles.summaryValue}>{formatMoney(summary.totalSales)}</p>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <ShoppingBag size={28} className={styles.summaryIcon} />
            <div>
              <p className={styles.summaryLabel}>Transacciones</p>
              <p className={styles.summaryValue}>{summary.totalTransactions}</p>
            </div>
          </div>
          <div className={styles.summaryCard}>
            <TrendingUp size={28} className={styles.summaryIcon} />
            <div>
              <p className={styles.summaryLabel}>Ticket promedio</p>
              <p className={styles.summaryValue}>{formatMoney(summary.averageTicket)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.analysisGrid}>
        <div className={styles.analysisCard}>
          <h3>
            <CreditCard size={16} /> Ventas por método
          </h3>
          {byMethod.length === 0 ? (
            <p className={styles.emptyState}>No hay ventas en este período.</p>
          ) : (
            byMethod.map((r, i) => (
              <div key={i} className={styles.listItem}>
                <span className={styles.listLabel}>{r.method}</span>
                <div className="text-right">
                  <span className={styles.listValue}>{formatMoney(r.amount)}</span>
                  <span className="ml-2 text-xs text-slate-500">{r.percent.toFixed(1)}%</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.analysisCard}>
          <h3>
            <Package size={16} /> Productos más vendidos
          </h3>
          {topProducts.length === 0 ? (
            <p className={styles.emptyState}>No hay ventas en este período.</p>
          ) : (
            topProducts.map((r, i) => (
              <div key={i} className={styles.listItem}>
                <div>
                  <span className={styles.listLabel}>{r.name}</span>
                  {r.variant && r.variant !== 'Estándar' && (
                    <p className={styles.variantMeta}>{r.variant}</p>
                  )}
                </div>
                <span className={styles.listValue}>{r.quantity} uds</span>
              </div>
            ))
          )}
        </div>

        <div className={styles.analysisCard}>
          <h3>
            <TrendingUp size={16} /> Ventas por categoría
          </h3>
          {byCategory.length === 0 ? (
            <p className={styles.emptyState}>No hay ventas en este período.</p>
          ) : (
            byCategory.map((r, i) => (
              <div key={i} className={styles.listItem}>
                <span className={styles.listLabel}>{r.category}</span>
                <span className={styles.listValue}>{formatMoney(r.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
          Detalle de ventas
        </h3>
        {loading ? (
          <p className="text-slate-500">Cargando...</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Recibo</th>
                  <th>Cliente</th>
                  <th>Método</th>
                  <th>Descuento</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                  const discount = parseFloat(m.discount_amount) || 0
                  return (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleString('es-VE')}</td>
                      <td className="font-mono text-xs text-slate-500">#{m.id.slice(0, 8)}</td>
                      <td>{m.customer_name || 'Cliente general'}</td>
                      <td>{PAYMENT_METHODS[m.payment_method] || m.payment_method || '—'}</td>
                      <td>{discount > 0 ? formatMoney(discount) : '—'}</td>
                      <td className={styles.totalCell}>{formatMoney(m.total_amount)}</td>
                    </tr>
                  )
                })}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-500">
                      No hay ventas en este período.
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
