import { useEffect, useState } from 'react'
import { Search, Package } from 'lucide-react'
import { fetchVariantsForPos, formatMoney } from '../../lib/api'
import { formatVariantLabel } from '../../lib/sku'

export default function ProductSearch({ onAdd }) {
  const [search, setSearch] = useState('')
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => loadVariants(search), 250)
    return () => clearTimeout(timeout)
  }, [search])

  async function loadVariants(term) {
    setLoading(true)
    try {
      const data = await fetchVariantsForPos(term)
      setVariants(data)
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
          placeholder="Buscar por nombre, SKU o barcode..."
          className="input pl-10"
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-slate-500">Buscando...</p>
        ) : variants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Package size={44} />
            <p className="mt-3 text-sm">No se encontraron variantes</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {variants.map((v) => {
              const product = v.products
              const label = formatVariantLabel(v, product?.categories?.size_label)
              const price = v.price || product?.sale_price || 0
              return (
                <button
                  key={v.id}
                  onClick={() => onAdd(product, v)}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-left transition-all hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm"
                >
                  <div>
                    <p className="font-medium text-slate-800">{product?.name}</p>
                    <p className="text-xs text-slate-500">
                      {label} · {v.sku} · Stock: {v.stock}
                    </p>
                  </div>
                  <p className="font-semibold text-blue-900">{formatMoney(price)}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
