import { useEffect, useMemo, useState } from 'react'
import { X, Plus, Trash2, Copy, Tag } from 'lucide-react'
import {
  calculateSalePrice,
  generateProductCode,
  generateVariantCode,
  formatVariantLabel,
} from '../lib/sku'

function emptyVariant() {
  return {
    id: `temp-${Math.random().toString(36).slice(2)}`,
    sku: '',
    barcode: '',
    color: '',
    variant_name: '',
    size: '',
    stock: 0,
    price: '',
    isNew: true,
    isDeleted: false,
  }
}

const emptyForm = {
  id: '',
  name: '',
  description: '',
  category_id: '',
  cost: '',
  tax: '',
  shipping_cost: '',
  profit_margin: 50,
  sale_price: '',
  image: '',
  active: true,
}

export default function ProductFormModal({ product, categories, allProducts, onSave, onClose }) {
  const isEditing = !!product
  const [form, setForm] = useState(emptyForm)
  const [variants, setVariants] = useState([emptyVariant()])
  const [priceTouched, setPriceTouched] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setForm({ ...emptyForm, ...product, category_id: product.category_id || '' })
      setVariants(
        product.product_variants?.length
          ? product.product_variants.map((v) => ({ ...v, isNew: false, isDeleted: false }))
          : [emptyVariant()]
      )
      setPriceTouched(true)
    } else {
      setForm(emptyForm)
      setVariants([emptyVariant()])
      setPriceTouched(false)
    }
    setError('')
  }, [product])

  const category = useMemo(
    () => categories.find((c) => c.id === form.category_id),
    [categories, form.category_id]
  )

  const recommendedPrice = useMemo(() => {
    return calculateSalePrice({
      cost: form.cost,
      tax: form.tax,
      shipping_cost: form.shipping_cost,
      profit_margin: form.profit_margin,
    })
  }, [form.cost, form.tax, form.shipping_cost, form.profit_margin])

  useEffect(() => {
    if (priceTouched || !recommendedPrice) return
    setForm((f) => ({ ...f, sale_price: recommendedPrice.toFixed(2) }))
  }, [recommendedPrice, priceTouched])

  const existingIds = useMemo(
    () => allProducts.filter((p) => p.id !== product?.id).map((p) => p.id),
    [allProducts, product]
  )

  const existingVariantSkus = useMemo(() => {
    const skus = []
    allProducts.forEach((p) => {
      if (p.id === product?.id) return
      p.product_variants?.forEach((v) => {
        if (v.sku) skus.push(v.sku)
      })
    })
    return skus
  }, [allProducts, product])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
    if (name === 'sale_price') setPriceTouched(true)
  }

  function generateId() {
    if (!category || !form.name.trim()) {
      setError('Selecciona categoría y nombre para generar el ID')
      return
    }
    setForm((f) => ({ ...f, id: generateProductCode(category.prefix, existingIds) }))
  }

  function generateVariantSkus() {
    if (!form.id) {
      setError('Genera primero el ID del producto')
      return
    }
    setVariants((prev) => {
      const used = [...existingVariantSkus]
      return prev.map((v) => {
        if (v.isDeleted) return v
        if (v.sku) {
          used.push(v.sku)
          return v
        }
        const sku = generateVariantCode(form.id, used)
        used.push(sku)
        return { ...v, sku, barcode: sku }
      })
    })
  }

  function addVariant(copyLast = false) {
    const visible = variants.filter((v) => !v.isDeleted)
    const last = visible[visible.length - 1]
    const base = copyLast && last ? { ...emptyVariant(), ...last } : emptyVariant()
    const copy = {
      ...base,
      id: `temp-${Math.random().toString(36).slice(2)}`,
      sku: '',
      barcode: '',
      isNew: true,
      isDeleted: false,
    }
    setVariants((prev) => [...prev, copy])
  }

  function removeVariant(id) {
    setVariants((prev) => prev.map((v) => (v.id === id ? { ...v, isDeleted: true } : v)))
  }

  function updateVariant(id, field, value) {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v
        const updated = { ...v, [field]: value }
        if (field === 'sku') updated.barcode = value
        return updated
      })
    )
  }

  function validate() {
    if (!form.id.trim()) return 'El ID del producto es obligatorio'
    if (!form.name.trim()) return 'El nombre es obligatorio'
    if (!form.category_id) return 'La categoría es obligatoria'
    if (!isEditing && existingIds.includes(form.id.trim())) return 'Ese ID ya existe'

    const visible = variants.filter((v) => !v.isDeleted)
    if (visible.length === 0) return 'Debe tener al menos una variante'

    const usedSkus = new Set()
    for (const v of visible) {
      if (!v.sku.trim()) return 'Todas las variantes deben tener SKU'
      if (existingVariantSkus.includes(v.sku.trim())) return `SKU ${v.sku} ya existe`
      if (usedSkus.has(v.sku.trim())) return `SKU ${v.sku} está repetido`
      usedSkus.add(v.sku.trim())
    }
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }
    setError('')
    setSaving(true)

    try {
      const productPayload = {
        id: form.id.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        category_id: form.category_id,
        cost: parseFloat(form.cost) || 0,
        tax: parseFloat(form.tax) || 0,
        shipping_cost: parseFloat(form.shipping_cost) || 0,
        profit_margin: parseFloat(form.profit_margin) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        image: form.image.trim(),
        active: form.active,
      }

      const variantRows = variants
        .filter((v) => !v.isDeleted)
        .map((v) => ({
          ...v,
          product_id: productPayload.id,
          sku: v.sku.trim(),
          barcode: v.barcode.trim() || v.sku.trim(),
          stock: parseInt(v.stock, 10) || 0,
          price: v.price ? parseFloat(v.price) : null,
          active: true,
        }))

      await onSave({ product: productPayload, variants: variantRows })
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const sizeOptions = category?.size_options || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-blue-950">
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={22} />
          </button>
        </div>

        {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="label">Nombre del producto</label>
              <input name="name" value={form.name} onChange={handleChange} className="input" required />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select name="category_id" value={form.category_id} onChange={handleChange} className="input" required>
                <option value="">Seleccionar</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Descripción</label>
              <textarea name="description" value={form.description} onChange={handleChange} className="input" rows="2" />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <div className="flex-1">
                <label className="label">ID / Código de producto</label>
                <input name="id" value={form.id} onChange={handleChange} className="input" placeholder="FOO-001" required />
              </div>
              <button type="button" onClick={generateId} className="btn btnOutline">
                <Tag size={16} /> Generar
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="active" checked={form.active} onChange={handleChange} id="active" />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">Activo</label>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Precios</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="label">Costo</label>
                <input name="cost" type="number" step="0.01" min="0" value={form.cost} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Impuesto</label>
                <input name="tax" type="number" step="0.01" min="0" value={form.tax} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Envío</label>
                <input name="shipping_cost" type="number" step="0.01" min="0" value={form.shipping_cost} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Margen %</label>
                <input name="profit_margin" type="number" step="0.01" min="0" value={form.profit_margin} onChange={handleChange} className="input" />
              </div>
              <div>
                <label className="label">Precio venta</label>
                <input name="sale_price" type="number" step="0.01" min="0" value={form.sale_price} onChange={handleChange} className="input" required />
              </div>
            </div>
            {!priceTouched && recommendedPrice > 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Precio recomendado: <strong>${recommendedPrice.toFixed(2)}</strong>
              </p>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">Variantes</h3>
              <div className="flex gap-2">
                <button type="button" onClick={() => addVariant(false)} className="btn btnOutline">
                  <Plus size={16} /> Variante
                </button>
                <button type="button" onClick={() => addVariant(true)} className="btn btnOutline">
                  <Copy size={16} /> Duplicar
                </button>
                <button type="button" onClick={generateVariantSkus} className="btn btnOutline">
                  <Tag size={16} /> Generar SKUs
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {variants.filter((v) => !v.isDeleted).length === 0 && (
                <p className="text-sm text-slate-500">Agrega al menos una variante.</p>
              )}
              {variants.map((v) =>
                v.isDeleted ? null : (
                  <div key={v.id} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-7">
                    <input
                      placeholder="SKU"
                      value={v.sku}
                      onChange={(e) => updateVariant(v.id, 'sku', e.target.value.toUpperCase())}
                      className="input sm:col-span-1"
                    />
                    <input
                      placeholder="Color"
                      value={v.color}
                      onChange={(e) => updateVariant(v.id, 'color', e.target.value)}
                      className="input sm:col-span-1"
                    />
                    <input
                      placeholder="Sabor / Modelo"
                      value={v.variant_name}
                      onChange={(e) => updateVariant(v.id, 'variant_name', e.target.value)}
                      className="input sm:col-span-1"
                    />
                    {sizeOptions.length > 0 ? (
                      <select
                        value={v.size}
                        onChange={(e) => updateVariant(v.id, 'size', e.target.value)}
                        className="input sm:col-span-1"
                      >
                        <option value="">{category?.size_label || 'Talla'}</option>
                        {sizeOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        placeholder="Tamaño"
                        value={v.size}
                        onChange={(e) => updateVariant(v.id, 'size', e.target.value)}
                        className="input sm:col-span-1"
                      />
                    )}
                    <input
                      placeholder="Precio"
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.price}
                      onChange={(e) => updateVariant(v.id, 'price', e.target.value)}
                      className="input sm:col-span-1"
                    />
                    <input
                      placeholder="Stock"
                      type="number"
                      min="0"
                      value={v.stock}
                      onChange={(e) => updateVariant(v.id, 'stock', e.target.value)}
                      className="input sm:col-span-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(v.id)}
                      className="btn btnSecondary"
                      title="Eliminar variante"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="text-xs text-slate-500 sm:col-span-7">
                      {formatVariantLabel(v, category?.size_label)}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="btn btnGhost" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btnPrimary" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Actualizar producto' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
