import { useMemo } from 'react'
import {
  Banknote,
  Smartphone,
  DollarSign,
  ArrowRightLeft,
  CreditCard,
} from 'lucide-react'
import { PAYMENT_METHODS, formatMoney } from '../../lib/api'

const METHOD_CONFIG = {
  efectivo: { icon: Banknote },
  pago_movil: { icon: Smartphone },
  zelle: { icon: DollarSign },
  transferencia: { icon: ArrowRightLeft },
  punto: { icon: CreditCard },
}

export default function PaymentPanel({ totalAmount, payments, onChange }) {
  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  }, [payments])

  const difference = totalPaid - totalAmount

  function updatePayment(method, field, value) {
    const existingIndex = payments.findIndex((p) => p.method === method)
    let updated = [...payments]

    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], [field]: value }
    } else {
      updated.push({ method, amount: '', reference: '', [field]: value })
    }

    updated = updated.filter(
      (p) => parseFloat(p.amount) > 0 || p.reference.trim()
    )
    onChange(updated)
  }

  function getPayment(method) {
    return (
      payments.find((p) => p.method === method) || {
        method,
        amount: '',
        reference: '',
      }
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Métodos de pago</p>

      {Object.entries(PAYMENT_METHODS)
        .filter(([key]) => key !== 'multiple')
        .map(([method, label]) => {
          const payment = getPayment(method)
          const Icon = METHOD_CONFIG[method]?.icon || DollarSign
          return (
            <div key={method}>
              <div className="flex items-center gap-2">
                <span className="flex w-32 items-center gap-1.5 text-sm text-slate-600">
                  <Icon size={14} />
                  {label}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={payment.amount}
                  onChange={(e) =>
                    updatePayment(method, 'amount', e.target.value)
                  }
                  className="input max-w-[140px]"
                />
              </div>
              {parseFloat(payment.amount) > 0 && (
                <input
                  type="text"
                  placeholder={`Referencia ${label.toLowerCase()} (opcional)`}
                  value={payment.reference}
                  onChange={(e) =>
                    updatePayment(method, 'reference', e.target.value)
                  }
                  className="input mt-1.5 text-xs"
                />
              )}
            </div>
          )
        })}

      <div className="mt-4 rounded-lg bg-slate-50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total a pagar</span>
          <span className="font-semibold">{formatMoney(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Total pagado</span>
          <span className="font-semibold">{formatMoney(totalPaid)}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
          <span className="font-medium">
            {difference >= 0 ? 'Vuelto' : 'Faltante'}
          </span>
          <span
            className={`font-bold ${
              difference === 0
                ? 'text-green-600'
                : difference > 0
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {formatMoney(Math.abs(difference))}
          </span>
        </div>
      </div>
    </div>
  )
}
