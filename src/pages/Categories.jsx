import { useEffect, useState } from 'react'
import { getCategoryPrefix } from '../lib/sku'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import ConfirmModal from '../components/ConfirmModal'

const DEFAULT_SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'UNI']

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    prefix: '',
    size_label: 'Talla',
    size_options: DEFAULT_SIZE_OPTIONS.join(', '),
  })

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({
      name: '',
      prefix: '',
      size_label: 'Talla',
      size_options: DEFAULT_SIZE_OPTIONS.join(', '),
    })
  }

  function handleEdit(category) {
    setEditing(category)
    setForm({
      name: category.name,
      prefix: category.prefix || '',
      size_label: category.size_label || 'Talla',
      size_options: (category.size_options || DEFAULT_SIZE_OPTIONS).join(', '),
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const payload = {
      name: form.name.trim(),
      prefix: form.prefix.trim().toUpperCase() || getCategoryPrefix(form.name.trim()),
      size_label: form.size_label.trim() || 'Talla',
      size_options: form.size_options
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }

    try {
      if (editing) {
        await updateCategory(editing.id, payload)
      } else {
        await createCategory(payload)
      }
      resetForm()
      setEditing(null)
      await loadCategories()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setError(null)
    try {
      await deleteCategory(deleteId)
      setDeleteId(null)
      await loadCategories()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="pageHeader">
        <h1>Categorías</h1>
        <p>Administra categorías, prefijos para SKU y medidas</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Eliminar categoría"
        message="¿Eliminar esta categoría? Los productos asociados se quedarán sin categoría."
        confirmText="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="card mb-6">
        <h2 className="mb-4 text-lg">{editing ? 'Editar categoría' : 'Nueva categoría'}</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Prefijo SKU</label>
            <input
              type="text"
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
              placeholder={getCategoryPrefix(form.name)}
              className="input"
            />
          </div>
          <div>
            <label className="label">Etiqueta de medida</label>
            <input
              type="text"
              value={form.size_label}
              onChange={(e) => setForm({ ...form, size_label: e.target.value })}
              className="input"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="label">Opciones de medida (separadas por coma)</label>
            <input
              type="text"
              value={form.size_options}
              onChange={(e) => setForm({ ...form, size_options: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn btnPrimary">
              {editing ? 'Actualizar' : 'Agregar'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  resetForm()
                }}
                className="btn btnGhost"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="card tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Prefijo</th>
                <th>Medida</th>
                <th>Opciones</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="font-medium">{cat.name}</td>
                  <td>
                    <span className="badge badgeWarning">{cat.prefix}</span>
                  </td>
                  <td>{cat.size_label}</td>
                  <td className="text-slate-600">{(cat.size_options || []).join(', ')}</td>
                  <td className="text-right">
                    <button onClick={() => handleEdit(cat)} className="link mr-3">
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteId(cat.id)}
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">
                    No hay categorías registradas.
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
