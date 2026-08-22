import { useEffect, useState } from 'react'
import { Search, Package } from 'lucide-react'
import { fetchVariantsForPos, formatMoney } from '../../lib/api'
import { formatVariantLabel } from '../../lib/sku'
import styles from './ProductSearch.module.css'

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
    <div className={styles.container}>
      <div className={styles.searchWrap}>
        <Search size={20} className={styles.searchIcon} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, SKU o escanear código..."
          className={styles.searchInput}
          autoFocus
        />
      </div>

      <div className={styles.results}>
        {loading ? (
          <p className={styles.emptyText}>Buscando...</p>
        ) : variants.length === 0 ? (
          <div className={styles.emptyState}>
            <Package size={44} />
            <p>No se encontraron variantes</p>
          </div>
        ) : (
          <div className={styles.list}>
            {variants.map((v) => {
              const product = v.products
              const label = formatVariantLabel(v, product?.categories?.size_label)
              const price = v.price || product?.sale_price || 0
              return (
                <button
                  key={v.id}
                  onClick={() => onAdd(product, v)}
                  className={styles.productCard}
                >
                  <div className={styles.productInfo}>
                    <p className={styles.productName}>{product?.name}</p>
                    <p className={styles.productMeta}>
                      {label} · {v.sku} · Stock: {v.stock}
                    </p>
                  </div>
                  <p className={styles.productPrice}>{formatMoney(price)}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
