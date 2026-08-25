import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Save, Package, Search, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  fetchProducts,
  fetchCategories,
  updateVariantStock,
  getProductStock,
  formatMoney,
} from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { formatVariantLabel, getVariantImage } from '../lib/sku'

const LOW_STOCK_THRESHOLD = 2

export default function Inventory() {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState({})
  const [lightboxImage, setLightboxImage] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    stockStatus: '', // '', 'out', 'low', 'ok'
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [data, cats] = await Promise.all([fetchProducts({}), fetchCategories()])
      setProducts(data)
      setCategories(cats)
      const init = {}
      data.forEach((p) => {
        p.product_variants?.forEach((v) => {
          init[v.id] = v.stock
        })
      })
      setDrafts(init)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function toggle(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function updateDraft(variantId, value) {
    setDrafts((prev) => ({ ...prev, [variantId]: Math.max(0, parseInt(value, 10) || 0) }))
  }

  async function saveVariant(variantId) {
    setSaving((prev) => ({ ...prev, [variantId]: true }))
    try {
      await updateVariantStock(variantId, drafts[variantId] || 0)
      await loadData()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving((prev) => ({ ...prev, [variantId]: false }))
    }
  }

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const filteredProducts = useMemo(() => {
    const term = filters.search.trim().toLowerCase()
    return products.filter((p) => {
      const variants = p.product_variants || []
      const total = getProductStock(p)
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
      const matchesStock =
        !filters.stockStatus ||
        (filters.stockStatus === 'out'
          ? total === 0
          : filters.stockStatus === 'low'
          ? total > 0 && total < LOW_STOCK_THRESHOLD
          : total >= LOW_STOCK_THRESHOLD)
      return matchesSearch && matchesCategory && matchesStock
    })
  }, [products, filters])

  function stockBadge(total) {
    if (total === 0) return <span className="badge badgeDanger">Sin stock</span>
    if (total < LOW_STOCK_THRESHOLD) return <span className="badge badgeWarning">Bajo</span>
    return <span className="badge badgeSuccess">OK</span>
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="pageHeader">
        <h1>Inventario</h1>
        <p>{filteredProducts.length} de {products.length} productos</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

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
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stock
          </label>
          <select
            value={filters.stockStatus}
            onChange={(e) => updateFilter('stockStatus', e.target.value)}
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
        <div className="space-y-3">
          {filteredProducts.map((p) => {
            const totalStock = getProductStock(p)
            const isOpen = !!expanded[p.id]
            return (
              <div key={p.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (p.images?.[0]) setLightboxImage(p.images[0])
                      }}
                      className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-100"
                      disabled={!p.images?.[0]}
                    >
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package size={20} className="m-auto text-slate-400" />
                      )}
                    </button>
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.id} · {p.categories?.name} · {formatMoney(p.sale_price)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right text-sm sm:block">
                      <p className="text-slate-500">
                        {p.product_variants?.length || 0} variantes · {totalStock} unidades
                      </p>
                      {stockBadge(totalStock)}
                    </div>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(p.product_variants || []).map((v) => {
                        const qty = drafts[v.id] ?? v.stock
                        const price = v.price || p.sale_price
                        return (
                          <div
                            key={v.id}
                            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-white">
                                {getVariantImage(p, v) ? (
                                  <img
                                    src={getVariantImage(p, v)}
                                    alt={formatVariantLabel(v, p.categories?.size_label)}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <Package size={16} className="m-auto text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-900">
                                  {formatVariantLabel(v, p.categories?.size_label)}
                                </p>
                                <p className="break-all font-mono text-[11px] text-slate-500">
                                  ID: {v.id}
                                </p>
                                <p className="font-mono text-xs text-slate-500">SKU: {v.sku}</p>
                                <div className="mt-2 flex items-center gap-3 text-sm text-slate-600">
                                  <span>
                                    Cantidad: <strong>{isAdmin ? qty : v.stock}</strong>
                                  </span>
                                  <span>
                                    Precio: <strong>{formatMoney(price)}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={qty}
                                  onChange={(e) => updateDraft(v.id, e.target.value)}
                                  className="input max-w-[100px]"
                                />
                                <button
                                  onClick={() => saveVariant(v.id)}
                                  disabled={saving[v.id]}
                                  className="btn btnOutline"
                                >
                                  <Save size={16} /> {saving[v.id] ? 'Guardando...' : 'Guardar'}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {filteredProducts.length === 0 && (
            <p className="text-center text-slate-500">No hay productos que coincidan con los filtros.</p>
          )}
        </div>
      )}

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/30"
          >
            <X size={24} />
          </button>
          <img
            src={lightboxImage}
            alt="Vista ampliada"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
