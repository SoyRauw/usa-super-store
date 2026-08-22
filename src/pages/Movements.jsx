import { useEffect, useState } from 'react'
import { Printer, X, Calendar } from 'lucide-react'
import { fetchMovements, PAYMENT_METHODS, formatMoney } from '../lib/api'
import ReceiptView, { printReceipt } from '../components/pos/ReceiptView'

export default function Movements() {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    loadMovements()
  }, [startDate, endDate])

  async function loadMovements() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMovements({
        startDate: startDate || undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
      })
      setMovements(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-blue-950">
          Historial de ventas
        </h1>
        <p className="text-slate-500">Movimientos registrados en el sistema</p>
      </div>

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Desde
          </label>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Hasta
          </label>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
        </div>
        <button onClick={() => { setStartDate(''); setEndDate('') }} className="btn btn-outline">
          Limpiar
        </button>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}

      {loading ? (
        <p>Cargando...</p>
      ) : movements.length === 0 ? (
        <p className="text-slate-500">No hay ventas registradas.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-2">Recibo</th>
                <th className="py-2">Fecha</th>
                <th className="py-2">Total</th>
                <th className="py-2">Método</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="py-2 font-medium">#{m.id.slice(0, 8)}</td>
                  <td className="py-2">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 font-semibold">
                    {formatMoney(m.total_amount)}
                  </td>
                  <td className="py-2">
                    {PAYMENT_METHODS[m.payment_method] || m.payment_method}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => setSelected(m)}
                      className="text-blue-700 hover:underline"
                    >
                      Ver recibo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl">Recibo #{selected.id.slice(0, 8)}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <ReceiptView
              movement={selected}
              items={selected.movement_items}
              payments={selected.movement_payments}
              subtotal={selected.total_amount}
              total={selected.total_amount}
              createdAt={selected.created_at}
            />
            <button
              onClick={() =>
                printReceipt({
                  movement: selected,
                  items: selected.movement_items,
                  payments: selected.movement_payments,
                  subtotal: selected.total_amount,
                  total: selected.total_amount,
                  createdAt: selected.created_at,
                })
              }
              className="btn btnPrimary mt-4 w-full"
            >
              <Printer size={16} /> Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
