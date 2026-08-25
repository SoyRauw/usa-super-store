import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Plus, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { getErrorMessage } from '../lib/errors'
import ConfirmModal from '../components/ConfirmModal'

const INTERNAL_EMAIL_DOMAIN = 'usa.local'

const createUserClient = () =>
  createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: false,
        storageKey: 'usa-create-user',
        autoRefreshToken: false,
      },
    }
  )

const ROLE_LABELS = {
  admin: 'Administrador',
  vendedor: 'Vendedor',
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', role: 'vendedor' })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, name, role, created_at')
      .order('created_at', { ascending: false })
    if (error) console.error('Error cargando usuarios:', error)
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const validationErrors = useMemo(() => {
    const errs = {}
    const username = form.username.trim()
    if (!username) errs.username = 'El usuario es obligatorio'
    else if (username.includes(' ')) errs.username = 'No puede tener espacios'
    else if (username.length < 3) errs.username = 'Mínimo 3 caracteres'
    else if (users.some((u) => u.username?.toLowerCase() === username.toLowerCase())) {
      errs.username = 'El usuario ya existe'
    }
    if (!form.password) errs.password = 'La contraseña es obligatoria'
    else if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres'
    if (!['admin', 'vendedor'].includes(form.role)) errs.role = 'Rol inválido'
    return errs
  }, [form, users])

  const hasErrors = Object.keys(validationErrors).length > 0

  function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (hasErrors) return
    setConfirmOpen(true)
  }

  async function executeSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)

    const username = form.username.trim().toLowerCase()
    const email = `${username}@${INTERNAL_EMAIL_DOMAIN}`

    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username)
        .limit(1)
      if (existing?.length) throw new Error('El nombre de usuario ya está en uso')

      const client = createUserClient()
      const { data, error: signUpError } = await client.auth.signUp({
        email,
        password: form.password,
        options: {
          data: { username, name: username, role: form.role },
        },
      })
      if (signUpError) throw signUpError
      if (!data?.user) throw new Error('No se pudo crear el usuario')

      setShowForm(false)
      setForm({ username: '', password: '', role: 'vendedor' })
      setSuccess(`Usuario "${username}" creado como ${ROLE_LABELS[form.role]}.`)
      loadUsers()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
      setConfirmOpen(false)
    }
  }

  async function handleRoleChange(userId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)
    if (error) {
      alert('No se pudo cambiar el rol')
    } else {
      loadUsers()
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="pageHeader mb-0">
          <h1>Usuarios</h1>
          <p>{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btnPrimary">
          <Plus size={18} /> Nuevo usuario
        </button>
      </div>

      {success && <p className="mb-4 rounded-md bg-green-50 p-3 text-green-700">{success}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <div className="card tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo interno</th>
                <th>Rol</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.username || '—'}</td>
                  <td className="font-mono text-xs text-slate-500">{u.email || '—'}</td>
                  <td>
                    <select
                      className="input py-1 text-sm"
                      value={u.role || 'vendedor'}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      <option value="admin">Administrador</option>
                      <option value="vendedor">Vendedor</option>
                    </select>
                  </td>
                  <td className="text-slate-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-slate-500">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Nuevo usuario</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Nombre de usuario</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={`input w-full ${validationErrors.username ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="vendedor1"
                  autoComplete="off"
                />
                {validationErrors.username && <p className="mt-1 text-xs text-red-600">{validationErrors.username}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium">Contraseña</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={`input w-full ${validationErrors.password ? 'border-red-500 bg-red-50' : ''}`}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
                {validationErrors.password && <p className="mt-1 text-xs text-red-600">{validationErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium">Rol</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input w-full"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btnOutline">
                  Cancelar
                </button>
                <button type="submit" className="btn btnPrimary" disabled={saving || hasErrors}>
                  {saving ? 'Guardando...' : <><Save size={16} /> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="¿Crear usuario?"
        message={`Se creará el usuario "${form.username.trim().toLowerCase()}" como ${ROLE_LABELS[form.role]}.`}
        confirmText="Confirmar"
        onConfirm={executeSave}
        onCancel={() => setConfirmOpen(false)}
        disabled={saving}
      />
    </div>
  )
}
