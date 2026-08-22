import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Panel principal</h1>
      <p className="text-gray-700">
        Bienvenido, <strong>{user?.email}</strong>.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="font-semibold text-indigo-600">Inventario</h2>
          <p className="text-sm text-gray-600">Productos y categorías</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="font-semibold text-indigo-600">POS</h2>
          <p className="text-sm text-gray-600">Punto de venta</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <h2 className="font-semibold text-indigo-600">Caja</h2>
          <p className="text-sm text-gray-600">Apertura y cierre</p>
        </div>
      </div>
    </div>
  )
}
