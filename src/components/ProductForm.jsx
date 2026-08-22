import { useEffect, useState } from 'react'
import { fetchCategories, calculateSalePrice } from '../lib/api'
import { generateSku } from '../lib/sku'

const emptyProduct = {
  name: '',
  category_id: '',
  barcode: '',
  sku: '',
  cost: '',
  tax: '',
  shipping_cost: 2.63,
  profit_margin: 50,
  sale_price: '',
  stock: '',
  image: '',
  active: true,
}

export default function ProductForm({
  product,
  existingProducts,
  onSave,
  onCancel,
}) {
  const [form, setForm] = useState(emptyProduct)
  const [categories, setCategories] = useState([])
  const [loadingCategories, setLoadingCategories] = useState(true)

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .finally(() => setLoadingCategories(false))
  }, [])

  useEffect(() => {
    if (product) {
      setForm({
        ...emptyProduct,
        ...product,
      })
    } else {
      setForm(emptyProduct)
    }
  }, [product])

  useEffect(() => {
    const calculated = calculateSalePrice({
      cost: form.cost,
      tax: form.tax,
      shipping_cost: form.shipping_cost,
      profit_margin: form.profit_margin,
    })
    setForm((prev) => ({ ...prev, sale_price: calculated.toFixed(2) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.cost, form.tax, form.shipping_cost, form.profit_margin])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleGenerateSku() {
    const category = categories.find((c) => c.id === form.category_id)
    if (!category || !form.name.trim()) return
    const sku = generateSku(category.name, form.name, existingProducts)
    setForm((prev) => ({ ...prev, sku }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave({
      ...form,
      cost: parseFloat(form.cost) || 0,
      tax: parseFloat(form.tax) || 0,
      shipping_cost: parseFloat(form.shipping_cost) || 0,
      profit_margin: parseFloat(form.profit_margin) || 0,
      sale_price: parseFloat(form.sale_price) || 0,
      stock: parseInt(form.stock, 10) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Nombre</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Categoría</label>
          <select
            name="category_id"
            value={form.category_id}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">
              {loadingCategories ? 'Cargando...' : 'Seleccionar'}
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Barcode</label>
          <input
            name="barcode"
            value={form.barcode}
            onChange={handleChange}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium">SKU</label>
            <input
              name="sku"
              value={form.sku}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </div>
          <button
            type="button"
            onClick={handleGenerateSku}
            className="self-end rounded bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300"
          >
            Generar
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium">Costo</label>
          <input
            name="cost"
            type="number"
            step="0.01"
            min="0"
            value={form.cost}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tax</label>
          <input
            name="tax"
            type="number"
            step="0.01"
            min="0"
            value={form.tax}
            onChange={handleChange}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Costo de envío</label>
          <input
            name="shipping_cost"
            type="number"
            step="0.01"
            min="0"
            value={form.shipping_cost}
            onChange={handleChange}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Margen de ganancia (%)
          </label>
          <input
            name="profit_margin"
            type="number"
            step="0.01"
            min="0"
            value={form.profit_margin}
            onChange={handleChange}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Precio de venta</label>
          <input
            name="sale_price"
            type="number"
            step="0.01"
            min="0"
            value={form.sale_price}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Stock</label>
          <input
            name="stock"
            type="number"
            min="0"
            value={form.stock}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">URL de imagen</label>
          <input
            name="image"
            type="url"
            value={form.image}
            onChange={handleChange}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            name="active"
            type="checkbox"
            checked={form.active}
            onChange={handleChange}
            id="active"
          />
          <label htmlFor="active" className="text-sm font-medium">
            Activo
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          Guardar
        </button>
      </div>
    </form>
  )
}
