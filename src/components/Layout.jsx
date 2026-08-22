import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600">
            USA Super Store
          </Link>
          <nav className="flex flex-wrap items-center gap-4">
            <Link to="/" className="text-sm hover:text-indigo-600">
              Dashboard
            </Link>
            <Link to="/categories" className="text-sm hover:text-indigo-600">
              Categorías
            </Link>
            <Link to="/products" className="text-sm hover:text-indigo-600">
              Productos
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="rounded bg-gray-200 px-3 py-1.5 text-sm hover:bg-gray-300"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  )
}
