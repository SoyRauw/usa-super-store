import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderTree,
  Package,
  Store,
  Banknote,
  FileText,
  BarChart3,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  X,
  ShoppingBag,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Layout.module.css'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/categories', icon: FolderTree, label: 'Categorías' },
  { to: '/products', icon: Package, label: 'Productos' },
  { to: '/inventory', icon: ClipboardList, label: 'Inventario' },
  { to: '/pos', icon: Store, label: 'POS' },
  { to: '/cash', icon: Banknote, label: 'Caja' },
  { to: '/movements', icon: FileText, label: 'Movimientos' },
  { to: '/reports', icon: BarChart3, label: 'Reportes' },
  { to: '/customers', icon: Users, label: 'Clientes' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      {/* Mobile header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogo}>
          <ShoppingBag size={22} />
          <span>USA Super Store</span>
        </div>
        <button
          className={styles.hamburger}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`}
      >
        <div className={styles.sidebarLogo}>
          <ShoppingBag size={22} />
          <span>USA Super Store</span>
        </div>

        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={`${styles.navItem} ${
                  isActive ? styles.navActive : ''
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div>
          <p className={styles.userEmail}>{user?.email}</p>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>{children}</main>
    </div>
  )
}
