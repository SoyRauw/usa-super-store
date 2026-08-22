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
  { to: '/categories', icon: FolderTree, title: 'Categorías', desc: 'Gestionar categorías' },
  { to: '/products', icon: Package, title: 'Productos', desc: 'Inventario y precios' },
  { to: '/pos', icon: Store, title: 'POS', desc: 'Punto de venta' },
  { to: '/cash', icon: Banknote, title: 'Caja', desc: 'Apertura y cierre' },
  { to: '/movements', icon: FileText, title: 'Movimientos', desc: 'Historial de ventas' },
]

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-blue-950">Panel principal</h1>
        <p className="text-slate-500">Bienvenido, {user?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.to}
              to={card.to}
              className="card flex items-start gap-4 transition-shadow hover:shadow-md"
            >
              <div className="rounded-lg bg-blue-100 p-3 text-blue-700">
                <Icon size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-blue-950">
                  {card.title}
                </h2>
                <p className="text-sm text-slate-500">{card.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
