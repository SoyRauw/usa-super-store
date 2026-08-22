import { useEffect, useMemo, useState } from 'react'
import { Lock, Unlock, AlertCircle, Loader2, DollarSign } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  useCashSession,
  getExpectedCashAmount,
  getSessionTotalsByMethod,
} from '../hooks/useCashSession'
import { PAYMENT_METHODS, formatMoney } from '../lib/api'
import { supabase } from '../lib/supabaseClient'

export default function Cash() {
  const { user } = useAuth()
  const { session, loading, error, refresh, openSession, closeSession } =
    useCashSession(user?.id)

  const [history, setHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [openAmount, setOpenAmount] = useState('')
  const [closeAmount, setCloseAmount] = useState('')
  const [expectedCash, setExpectedCash] = useState(0)
  const [byMethod, setByMethod] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmType, setConfirmType] = useState(null)

  useEffect(() => {
    async function fetchHistory() {
      setHistoryLoading(true)
      const { data } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(20)
      setHistory(data || [])
      setHistoryLoading(false)
    }
    fetchHistory()
  }, [session])

  useEffect(() => {
    if (!session) return
    async function loadTotals() {
      const [expected, methods] = await Promise.all([
        getExpectedCashAmount(session.id),
        getSessionTotalsByMethod(session.id),
      ])
      setExpectedCash(expected)
      setByMethod(methods)
    }
    loadTotals()
  }, [session])

  const openErrors = useMemo(() => {
    const v = parseFloat(openAmount)
    return openAmount !== '' && (isNaN(v) || v < 0)
      ? 'Monto inválido'
      : ''
  }, [openAmount])

  const closeErrors = useMemo(() => {
    const v = parseFloat(closeAmount)
    return closeAmount !== '' && (isNaN(v) || v < 0)
      ? 'Monto inválido'
      : ''
  }, [closeAmount])

  const expectedInBox = (session?.opening_amount || 0) + expectedCash
  const cashDifference = (parseFloat(closeAmount) || 0) - expectedInBox

  function handleOpen(e) {
    e.preventDefault()
    setFormError('')
    if (openErrors || openAmount === '') return
    setConfirmType('open')
    setConfirmOpen(true)
  }

  async function executeOpen() {
    setSubmitting(true)
    try {
      await openSession(openAmount)
      setOpenAmount('')
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
      setConfirmType(null)
    }
  }

  function handleClose(e) {
    e.preventDefault()
    setFormError('')
    if (closeErrors || closeAmount === '') return
    setConfirmType('close')
    setConfirmOpen(true)
  }

  async function executeClose() {
    setSubmitting(true)
    try {
      await closeSession(closeAmount)
      setCloseAmount('')
    } catch (e) {
      setFormError(e.message)
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
      setConfirmType(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="mr-2 animate-spin" /> Cargando caja...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-blue-950">Control de Caja</h1>
        <p className="text-slate-500">Gestiona apertura y cierre de turno</p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 p-3 text-red-700">
          <AlertCircle size={18} />
          {error}
          <button
            onClick={refresh}
            className="ml-auto text-sm font-medium underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {formError && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-red-700">
          {formError}
        </div>
      )}

      {!session ? (
        <div className="card">
          <div className="mb-4 flex items-center gap-2 rounded-md bg-red-100 p-3 text-red-800">
            <Lock size={20} />
            <span className="font-medium">Caja cerrada</span>
          </div>
          <h2 className="mb-4 text-xl">Abrir caja</h2>
          <form onSubmit={handleOpen} className="max-w-sm space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Monto inicial en caja
              </label>
              <div className="flex items-center gap-2">
                <DollarSign size={18} className="text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={openAmount}
                  onChange={(e) => setOpenAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className={`input ${openErrors ? 'border-red-500' : ''}`}
                />
              </div>
              {openErrors && (
                <p className="mt-1 text-xs text-red-600">{openErrors}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting || !!openErrors || openAmount === ''}
              className="btn btn-primary"
            >
              {submitting ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <div className="mb-4 flex items-center gap-2 rounded-md bg-green-100 p-3 text-green-800">
              <Unlock size={20} />
              <span className="font-medium">
                Caja abierta desde {new Date(session.opened_at).toLocaleString()}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Monto inicial</p>
                <p className="text-2xl font-semibold text-blue-950">
                  {formatMoney(session.opening_amount)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Efectivo recibido</p>
                <p className="text-2xl font-semibold text-blue-950">
                  {formatMoney(expectedCash)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Efectivo esperado</p>
                <p className="text-2xl font-semibold text-blue-950">
                  {formatMoney(expectedInBox)}
                </p>
              </div>
            </div>

            {Object.keys(byMethod).length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-lg">Ventas por método de pago</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(byMethod).map(([method, amount]) => (
                    <div key={method} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">
                        {PAYMENT_METHODS[method] || method}
                      </p>
                      <p className="text-xl font-semibold text-blue-950">
                        {formatMoney(amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h3 className="mb-4 text-xl">Cerrar caja</h3>
            <form onSubmit={handleClose} className="max-w-sm space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Efectivo real contado en caja
                </label>
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closeAmount}
                    onChange={(e) => setCloseAmount(e.target.value)}
                    placeholder={`Esperado: ${formatMoney(expectedInBox)}`}
                    className={`input ${closeErrors ? 'border-red-500' : ''}`}
                  />
                </div>
                {closeErrors && (
                  <p className="mt-1 text-xs text-red-600">{closeErrors}</p>
                )}
              </div>

              {closeAmount !== '' && (
                <div
                  className={`rounded-lg p-4 ${
                    cashDifference === 0
                      ? 'bg-green-50 text-green-800'
                      : cashDifference > 0
                        ? 'bg-yellow-50 text-yellow-800'
                        : 'bg-red-50 text-red-800'
                  }`}
                >
                  <p className="text-sm font-medium">Diferencia de efectivo</p>
                  <p className="text-xl font-semibold">
                    {cashDifference === 0
                      ? 'Cuadrado'
                      : cashDifference > 0
                        ? `Sobrante ${formatMoney(cashDifference)}`
                        : `Faltante ${formatMoney(Math.abs(cashDifference))}`}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !!closeErrors || closeAmount === ''}
                className="btn btn-secondary"
              >
                {submitting ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card mt-6">
        <h3 className="mb-4 text-xl">Historial de cierres</h3>
        {historyLoading ? (
          <Loader2 className="animate-spin" />
        ) : history.length === 0 ? (
          <p className="text-slate-500">No hay cierres registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2">Fecha cierre</th>
                  <th className="py-2">Apertura</th>
                  <th className="py-2">Efectivo esperado</th>
                  <th className="py-2">Efectivo contado</th>
                  <th className="py-2">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => {
                  const sales = h.expected_amount || 0
                  const diff =
                    (h.closing_amount || 0) - (h.opening_amount || 0) - sales
                  return (
                    <tr key={h.id} className="border-b">
                      <td className="py-2">
                        {h.closed_at
                          ? new Date(h.closed_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="py-2">{formatMoney(h.opening_amount)}</td>
                      <td className="py-2">{formatMoney(sales)}</td>
                      <td className="py-2">{formatMoney(h.closing_amount)}</td>
                      <td
                        className={`py-2 font-semibold ${
                          diff === 0
                            ? 'text-green-600'
                            : diff > 0
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {diff === 0
                          ? 'Cuadrado'
                          : diff > 0
                            ? `+${formatMoney(diff)}`
                            : formatMoney(diff)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-xl">
              {confirmType === 'open' ? '¿Abrir caja?' : '¿Cerrar caja?'}
            </h3>
            <p className="mb-4 text-slate-600">
              {confirmType === 'open'
                ? `Se abrirá la caja con ${formatMoney(openAmount)}.`
                : `Se cerrará la caja. La diferencia es ${
                    cashDifference === 0
                      ? 'cuadrada'
                      : cashDifference > 0
                        ? `sobrante de ${formatMoney(cashDifference)}`
                        : `faltante de ${formatMoney(Math.abs(cashDifference))}`
                  }.`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn btn-ghost"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={confirmType === 'open' ? executeOpen : executeClose}
                disabled={submitting}
                className={
                  confirmType === 'open' ? 'btn btn-primary' : 'btn btn-secondary'
                }
              >
                {submitting ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
