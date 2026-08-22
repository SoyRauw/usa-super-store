import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Categories from './pages/Categories'
import Products from './pages/Products'
import POS from './pages/POS'
import Cash from './pages/Cash'
import Movements from './pages/Movements'
import Reports from './pages/Reports'
import Inventory from './pages/Inventory'
import Customers from './pages/Customers'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/usa-super-store">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout>
                  <Dashboard />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/categories"
            element={
              <RequireAuth>
                <Layout>
                  <Categories />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/products"
            element={
              <RequireAuth>
                <Layout>
                  <Products />
                </Layout>
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
                <Layout>
                  <Reports />
                </Layout>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
