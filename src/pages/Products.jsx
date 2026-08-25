import { useEffect, useMemo, useState } from 'react'
import { Plus, Tag, Download, Search } from 'lucide-react'
import ProductFormModal from '../components/ProductFormModal'
import ConfirmModal from '../components/ConfirmModal'
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductStock,
  formatMoney,
} from '../lib/api'
import { exportProductLabels } from '../lib/labelExport'
import { getErrorMessage } from '../lib/errors'

export default function Products() {
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    status: '', // '', 'active', 'inactive'
    stock: '', // '', 'out', 'low', 'ok'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [prods, cats] = await Promise.all([fetchProducts({}), fetchCategories()])
      setAllProducts(prods)
      setCategories(cats)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const products = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return allProducts.filter((p) => {
      const variants = p.product_variants || []
      const totalStock = getProductStock(p)
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term) ||
        variants.some(
          (v) =>
            (v.sku || '').toLowerCase().includes(term) ||
            (v.barcode || '').toLowerCase().includes(term)
        )
      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId
      const matchesStatus =
        !filters.status || (filters.status === 'active' ? p.active : !p.active)
      const matchesStock =
        !filters.stock ||
        (filters.stock === 'out'
          ? totalStock === 0
          : filters.stock === 'low'
          ? totalStock > 0 && totalStock < 3
          : totalStock >= 3)
      return matchesSearch && matchesCategory && matchesStatus && matchesStock
    })
  }, [allProducts, filters])

  async function handleSave({ product, variants }) {
    setError(null)
    try {
      const saved = editing
        ? await updateProduct(editing.id, { product, variants })
        : await createProduct({ product, variants })
      await loadData()
      return saved
    } catch (err) {
      setError(getErrorMessage(err))
      throw err
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setError(null)
    try {
      await deleteProduct(deleteId)
      setDeleteId(null)
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function handleEdit(product) {
    setEditing(product)
    setShowForm(true)
  }

  function handleNew() {
    setEditing(null)
    setShowForm(true)
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="pageHeader mb-0">
          <h1>Productos</h1>
          <p>{products.length} de {allProducts.length} productos</p>
        </div>
        <button onClick={handleNew} className="btn btnPrimary">
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Eliminar producto"
        message="¿Eliminar este producto y todas sus variantes? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {showForm && (
        <ProductFormModal
          product={editing}
          categories={categories}
          allProducts={allProducts}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}

      <div className="card mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Buscar
          </label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Nombre, ID, SKU o barcode..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input w-full pl-9"
            />
          </div>
        </div>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Categoría
          </label>
          <select
            value={filters.categoryId}
            onChange={(e) => updateFilter('categoryId', e.target.value)}
            className="input"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado
          </label>
          <select
            value={filters.status}
            onChange={(e) => updateFilter('status', e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div className="min-w-[140px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock
          </label>
          <select
            value={filters.stock}
            onChange={(e) => updateFilter('stock', e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            <option value="out">Sin stock</option>
            <option value="low">Bajo</option>
            <option value="ok">OK</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="card tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Precio base</th>
                <th>Variantes</th>
                <th>Stock total</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const totalStock = getProductStock(p)
                const variants = p.product_variants || []
                return (
                  <tr key={p.id}>
                    <td className="font-medium">
                      <div>{p.name}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Tag size={10} /> {p.id}
                      </div>
                    </td>
                    <td className="text-slate-600">{p.categories?.name}</td>
                    <td className="font-semibold">{formatMoney(p.sale_price)}</td>
                    <td>{variants.length}</td>
                    <td>
                      {totalStock}
                      {variants.some((v) => v.stock <= 2) && (
                        <span className="badge badgeDanger ml-2">Bajo</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${p.active ? 'badgeSuccess' : 'badgeDanger'}`}>
                        {p.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button onClick={() => handleEdit(p)} className="link mr-3">
                        Editar
                      </button>
                      <button onClick={() => exportProductLabels(p)} className="link mr-3">
                        <Download size={14} /> Etiquetas
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="font-medium text-red-600 hover:text-red-800"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-500">
                    No hay productos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
