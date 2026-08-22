import { useEffect, useState } from 'react'
import { Search, Package } from 'lucide-react'
import { fetchProductsForPos, formatMoney } from '../../lib/api'

export default function ProductSearch({ onAdd }) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => loadProducts(search), 250)
    return () => clearTimeout(timeout)
  }, [search])

  async function loadProducts(term) {
    setLoading(true)
    try {
      const data = await fetchProductsForPos(term)
      setProducts(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto por nombre, SKU o barcode..."
          className="input pl-10"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-slate-500">Buscando...</p>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Package size={44} />
            <p className="mt-3 text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => onAdd(p)}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-500">{p.sku} · Stock: {p.stock}</p>
                </div>
                <p className="font-semibold text-blue-900">{formatMoney(p.sale_price)}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
