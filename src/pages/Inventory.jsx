import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Save, Package } from 'lucide-react'
import { fetchProducts, updateVariantStock, getProductStock, formatMoney } from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import { formatVariantLabel } from '../lib/sku'

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProducts({})
      setProducts(data)
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

  return (
    <div className="mx-auto max-w-5xl">
      <div className="pageHeader">
        <h1>Inventario</h1>
        <p>Ajusta el stock por variante</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const totalStock = getProductStock(p)
            const isOpen = !!expanded[p.id]
            return (
              <div key={p.id} className="card p-0 overflow-hidden">
                <button
                  onClick={() => toggle(p.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Package size={20} className="text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.id} · {p.categories?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-500">
                      {p.product_variants?.length || 0} variantes · {totalStock} unidades
                    </span>
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-4">
                    <div className="tableWrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Variante</th>
                            <th>SKU</th>
                            <th>Stock</th>
                            <th>Precio</th>
                            <th className="text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(p.product_variants || []).map((v) => (
                            <tr key={v.id}>
                              <td>{formatVariantLabel(v, p.categories?.size_label)}</td>
                              <td className="font-mono text-xs text-slate-500">{v.sku}</td>
                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={drafts[v.id] ?? v.stock}
                                  onChange={(e) => updateDraft(v.id, e.target.value)}
                                  className="input max-w-[100px]"
                                />
                                {v.stock <= 2 && <span className="badge badgeDanger ml-2">Bajo</span>}
                              </td>
                              <td>{formatMoney(v.price || p.sale_price)}</td>
                              <td className="text-right">
                                <button
                                  onClick={() => saveVariant(v.id)}
                                  disabled={saving[v.id]}
                                  className="btn btnOutline"
                                >
                                  <Save size={16} /> {saving[v.id] ? 'Guardando...' : 'Guardar'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {products.length === 0 && (
            <p className="text-center text-slate-500">No hay productos registrados.</p>
          )}
        </div>
      )}
    </div>
  )
}
