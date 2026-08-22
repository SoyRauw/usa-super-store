import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, X, User, Phone, Mail, MapPin, Cake, CreditCard } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import { fetchCustomers, createCustomer, updateCustomer, deleteCustomer } from '../lib/api'
import { getErrorMessage } from '../lib/errors'

const emptyForm = {
  name: '',
  id_number: '',
  phone: '',
  email: '',
  address: '',
  birthday: '',
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomers(search)
      setCustomers(data)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timeout = setTimeout(() => loadCustomers(), 300)
    return () => clearTimeout(timeout)
  }, [loadCustomers])

  function handleNew() {
    setEditing(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  function handleEdit(customer) {
    setEditing(customer)
    setForm({
      name: customer.name || '',
      id_number: customer.id_number || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      birthday: customer.birthday || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      id_number: form.id_number.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      birthday: form.birthday || null,
    }

    try {
      if (editing) {
        await updateCustomer(editing.id, payload)
      } else {
        await createCustomer(payload)
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      await loadCustomers()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setError(null)
    try {
      await deleteCustomer(deleteId)
      setDeleteId(null)
      await loadCustomers()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    (c.id_number && c.id_number.includes(search)) ||
    (c.phone && c.phone.includes(search))
  )

  return (
    <div className="mx-auto max-w-5xl">
      <div className="pageHeader">
        <h1>Clientes</h1>
        <p>Gestiona clientes y sus datos de contacto</p>
      </div>

      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      <ConfirmModal
        isOpen={!!deleteId}
        title="Eliminar cliente"
        message="¿Eliminar este cliente? Se conservarán sus ventas anteriores."
        confirmText="Eliminar"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-blue-950">
                {editing ? 'Editar cliente' : 'Nuevo cliente'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Nombre completo</label>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-400" />
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Cédula / RIF</label>
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-slate-400" />
                  <input
                    value={form.id_number}
                    onChange={(e) => setForm({ ...form, id_number: e.target.value })}
                    className="input"
                    placeholder="V-12345678"
                  />
                </div>
              </div>
              <div>
                <label className="label">Teléfono</label>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-slate-400" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input"
                    placeholder="0414-0000000"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Correo</label>
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input"
                    placeholder="cliente@email.com"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Dirección</label>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Cumpleaños</label>
                <div className="flex items-center gap-2">
                  <Cake size={16} className="text-slate-400" />
                  <input
                    type="date"
                    value={form.birthday}
                    onChange={(e) => setForm({ ...form, birthday: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btnGhost"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btnPrimary" disabled={saving}>
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, cédula o teléfono..."
            className="input pl-10"
          />
        </div>
        <button onClick={handleNew} className="btn btnPrimary">
          <Plus size={18} /> Nuevo cliente
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="card tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cédula / RIF</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-slate-600">{c.id_number || '—'}</td>
                  <td className="text-slate-600">{c.phone || '—'}</td>
                  <td className="text-slate-600">{c.email || '—'}</td>
                  <td className="text-right">
                    <button onClick={() => handleEdit(c)} className="link mr-3">Editar</button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="font-medium text-red-600 hover:text-red-800"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-500">
                    No se encontraron clientes.
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
