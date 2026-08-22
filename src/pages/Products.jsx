import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import ProductForm from '../components/ProductForm'
import ConfirmModal from '../components/ConfirmModal'
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  isLowStock,
  formatMoney,
} from '../lib/api'
import { getErrorMessage } from '../lib/errors'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    lowStock: false,
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts(filters),
        fetchCategories(),
      ])
      setProducts(prods)
      setCategories(cats)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(product) {
    setError(null)
    try {
      if (editing) {
        await updateProduct(editing.id, product)
      } else {
        await createProduct(product)
      }
      setShowForm(false)
      setEditing(null)
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err))
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
          <p>Inventario, precios y stock</p>
        </div>
        <button onClick={handleNew} className="btn btnPrimary">
          <Plus size={18} /> Nuevo producto
        </button>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Eliminar producto"
        message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="card mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Buscar
          </label>
          <input
            placeholder="Nombre, barcode o SKU..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="input"
          />
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
        <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) => updateFilter('lowStock', e.target.checked)}
          />
          Stock bajo (≤2)
        </label>
      </div>

      {showForm && (
        <div className="card mb-5">
          <h2 className="mb-4 text-lg">
            {editing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <ProductForm
            product={editing}
            existingProducts={products}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false)
              setEditing(null)
            }}
          />
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="card tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Precio</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.name}</td>
                  <td className="text-slate-600">{p.categories?.name}</td>
                  <td className="font-mono text-xs text-slate-500">{p.sku}</td>
                  <td>
                    {p.stock}
                    {isLowStock(p.stock) && (
                      <span className="badge badgeDanger ml-2">Bajo</span>
                    )}
                  </td>
                  <td className="font-semibold">{formatMoney(p.sale_price)}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleEdit(p)}
                      className="link mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    No hay productos que coincidan.
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
