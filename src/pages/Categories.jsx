import { useEffect, useState } from 'react'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import ConfirmModal from '../components/ConfirmModal'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')
  const [deleteId, setDeleteId] = useState(null)

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

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    try {
      if (editing) {
        await updateCategory(editing.id, name)
      } else {
        await createCategory(name)
      }
      setName('')
      setEditing(null)
      await loadCategories()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  function handleEdit(category) {
    setEditing(category)
    setName(category.name)
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
    <div className="mx-auto max-w-3xl">
      <div className="pageHeader">
        <h1>Categorías</h1>
        <p>Administra las categorías de productos</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Eliminar categoría"
        message="¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados ya no tendrán categoría."
        confirmText="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <div className="card mb-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-600">
              {editing ? 'Editar categoría' : 'Nueva categoría'}
            </label>
            <input
              type="text"
              placeholder="Nombre de la categoría"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>
          <button type="submit" className="btn btnPrimary">
            {editing ? 'Actualizar' : 'Agregar'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setName('') }}
              className="btn btnGhost"
            >
              Cancelar
            </button>
          )}
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
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td className="font-medium">{cat.name}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="link mr-3"
                    >
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
                  <td colSpan="2" className="py-6 text-center text-slate-500">
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
