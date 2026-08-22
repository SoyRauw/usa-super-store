import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderTree,
  Package,
  Store,
  Banknote,
  FileText,
  BarChart3,
  DollarSign,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchDashboardStats, formatMoney } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

const cards = [
  { to: '/categories', icon: FolderTree, title: 'Categorías', desc: 'Administrar categorías', color: 'bg-blue-50 text-blue-700' },
  { to: '/products', icon: Package, title: 'Productos', desc: 'Inventario y precios', color: 'bg-sky-50 text-sky-700' },
  { to: '/pos', icon: Store, title: 'POS', desc: 'Nueva venta', color: 'bg-green-50 text-green-700' },
  { to: '/cash', icon: Banknote, title: 'Caja', desc: 'Apertura y cierre', color: 'bg-amber-50 text-amber-700' },
  { to: '/movements', icon: FileText, title: 'Movimientos', desc: 'Historial de ventas', color: 'bg-slate-100 text-slate-700' },
  { to: '/reports', icon: BarChart3, title: 'Reportes', desc: 'Análisis y exportaciones', color: 'bg-indigo-50 text-indigo-700' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ todaySales: 0, todayCount: 0, lowStockCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true)
        const data = await fetchDashboardStats()
        setStats(data)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="pageHeader">
        <h1>Panel principal</h1>
        <p>Bienvenido, {user?.email}</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link to="/reports" className="card flex items-center gap-4 cardHover">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <DollarSign size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Ventas de hoy</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : formatMoney(stats.todaySales)}
            </p>
            <p className="text-xs text-slate-500">{stats.todayCount} ventas</p>
          </div>
        </Link>

        <Link to="/reports" className="card flex items-center gap-4 cardHover">
          <div className="rounded-xl bg-red-50 p-3 text-red-700">
            <AlertTriangle size={26} />
          </div>
          <div>
            <p className="text-sm text-slate-500">Bajo stock</p>
            <p className="text-2xl font-bold text-slate-900">
              {loading ? '...' : stats.lowStockCount}
            </p>
            <p className="text-xs text-slate-500">
              {stats.lowStockCount === 1 ? 'producto por reponer' : 'productos por reponer'}
            </p>
          </div>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.to}
              to={card.to}
              className="card flex items-center gap-4 transition-all cardHover"
            >
              <div className={`rounded-xl p-3 ${card.color}`}>
                <Icon size={26} />
              </div>
              <div>
                <h2 className="text-lg">{card.title}</h2>
                <p className="text-sm text-slate-500">{card.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
