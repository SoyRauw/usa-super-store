import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Categories from './pages/Categories'
import Products from './pages/Products'
import POS from './pages/POS'
import Cash from './pages/Cash'
import Movements from './pages/Movements'
import Reports from './pages/Reports'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'
import Users from './pages/Users'

const ADMIN_ROUTES = ['/categories', '/products', '/reports', '/users']

function RoleGuard({ children }) {
  const { role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="p-8 text-center">Cargando...</div>
  if (role === 'vendedor' && ADMIN_ROUTES.some((r) => location.pathname.startsWith(r))) {
    return <Navigate to="/pos" replace />
  }
  return children
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/usa-super-store">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <RoleGuard>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </RoleGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/categories"
            element={
              <RequireAuth>
                <RoleGuard>
                  <Layout>
                    <Categories />
                  </Layout>
                </RoleGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/products"
            element={
              <RequireAuth>
                <RoleGuard>
                  <Layout>
                    <Products />
                  </Layout>
                </RoleGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/pos"
            element={
              <RequireAuth>
                <Layout>
                  <POS />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/cash"
            element={
              <RequireAuth>
                <Layout>
                  <Cash />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/movements"
            element={
              <RequireAuth>
                <Layout>
                  <Movements />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <RoleGuard>
                  <Layout>
                    <Reports />
                  </Layout>
                </RoleGuard>
              </RequireAuth>
            }
          />
          <Route
            path="/inventory"
            element={
              <RequireAuth>
                <Layout>
                  <Inventory />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <Layout>
                  <Customers />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAuth>
                <RoleGuard>
                  <Layout>
                    <Users />
                  </Layout>
                </RoleGuard>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
