import { Link } from 'react-router-dom'
import {
  FolderTree,
  Package,
  Store,
  Banknote,
  FileText,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const cards = [
  { to: '/categories', icon: FolderTree, title: 'Categorías', desc: 'Administrar categorías', color: 'bg-blue-50 text-blue-700' },
  { to: '/products', icon: Package, title: 'Productos', desc: 'Inventario y precios', color: 'bg-sky-50 text-sky-700' },
  { to: '/pos', icon: Store, title: 'POS', desc: 'Nueva venta', color: 'bg-green-50 text-green-700' },
  { to: '/cash', icon: Banknote, title: 'Caja', desc: 'Apertura y cierre', color: 'bg-amber-50 text-amber-700' },
  { to: '/movements', icon: FileText, title: 'Movimientos', desc: 'Historial de ventas', color: 'bg-slate-100 text-slate-700' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="pageHeader">
        <h1>Panel principal</h1>
        <p>Bienvenido, {user?.email}</p>
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
