import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getErrorMessage } from '../lib/errors'

const INTERNAL_EMAIL_DOMAIN = 'usa.local'

function toEmail(value) {
  const trimmed = value.trim()
  if (trimmed.includes('@')) return trimmed
  return `${trimmed}@${INTERNAL_EMAIL_DOMAIN}`
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const { user } = await signIn(toEmail(email), password)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      navigate(profile?.role === 'admin' ? '/' : '/pos')
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
        <h1 className="mb-4 text-center text-2xl font-bold">USA Super Store</h1>
        <h2 className="mb-4 text-center text-lg">Iniciar sesión</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Usuario o correo</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="admin o admin@correo.com"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded bg-blue-900 py-2 text-white hover:bg-blue-950"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}
