import { useEffect, useState } from 'react'
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../lib/api'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [name, setName] = useState('')

  useEffect(() => {
    loadCategories()
  }, [])

  async function loadCategories() {
    setLoading(true)
    try {
      const data = await fetchCategories()
      setCategories(data)
    } catch (err) {
      setError(err.message)
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
      setError(err.message)
    }
  }

  function handleEdit(category) {
    setEditing(category)
    setName(category.name)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta categoría?')) return
    setError(null)
    try {
      await deleteCategory(id)
      await loadCategories()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Categorías</h1>
      {error && <p className="mb-3 text-red-600">{error}</p>}
      <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Nueva categoría"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded border px-3 py-2"
          required
        />
        <button
          type="submit"
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
        >
          {editing ? 'Actualizar' : 'Agregar'}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setName('')
            }}
            className="rounded bg-gray-300 px-4 py-2 hover:bg-gray-400"
          >
            Cancelar
          </button>
        )}
      </form>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border-b px-4 py-2">Nombre</th>
                <th className="border-b px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b">
                  <td className="px-4 py-2">{cat.name}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="mr-2 text-indigo-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
