import { useEffect, useState } from 'react'
import ProductForm from '../components/ProductForm'
import {
  fetchProducts,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  isLowStock,
} from '../lib/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
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
      setError(err.message)
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
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este producto?')) return
    setError(null)
    try {
      await deleteProduct(id)
      await loadData()
    } catch (err) {
      setError(err.message)
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button
          onClick={handleNew}
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Nuevo producto
        </button>
      </div>

      {error && <p className="mb-3 text-red-600">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Buscar nombre, barcode o SKU..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="rounded border px-3 py-2"
        />
        <select
          value={filters.categoryId}
          onChange={(e) => updateFilter('categoryId', e.target.value)}
          className="rounded border px-3 py-2"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded border bg-white px-3 py-2">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(e) => updateFilter('lowStock', e.target.checked)}
          />
          Stock bajo (≤2)
        </label>
      </div>

      {showForm && (
        <div className="mb-6 rounded bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-semibold">
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
        <p>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border-b px-4 py-2">Nombre</th>
                <th className="border-b px-4 py-2">Categoría</th>
                <th className="border-b px-4 py-2">SKU</th>
                <th className="border-b px-4 py-2">Stock</th>
                <th className="border-b px-4 py-2">Precio</th>
                <th className="border-b px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.categories?.name}</td>
                  <td className="px-4 py-2">{p.sku}</td>
                  <td className="px-4 py-2">
                    {p.stock}
                    {isLowStock(p.stock) && (
                      <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        Bajo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    ${parseFloat(p.sale_price).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleEdit(p)}
                      className="mr-2 text-indigo-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-4 text-center text-gray-500">
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
