import { useMemo } from 'react'
import { Banknote, Smartphone, DollarSign, ArrowRightLeft, CreditCard } from 'lucide-react'
import { PAYMENT_METHODS, formatMoney } from '../../lib/api'

const METHOD_CONFIG = {
  efectivo: { icon: Banknote },
  pago_movil: { icon: Smartphone },
  zelle: { icon: DollarSign },
  transferencia: { icon: ArrowRightLeft },
  punto: { icon: CreditCard },
}

export default function PaymentPanel({ totalAmount, payments, onChange }) {
  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0), [payments])
  const difference = totalPaid - totalAmount

  function updatePayment(method, field, value) {
    const existingIndex = payments.findIndex((p) => p.method === method)
    let updated = [...payments]

    if (existingIndex >= 0) {
      updated[existingIndex] = { ...updated[existingIndex], [field]: value }
    } else {
      updated.push({ method, amount: '', reference: '', [field]: value })
    }

    updated = updated.filter((p) => parseFloat(p.amount) > 0 || p.reference.trim())
    onChange(updated)
  }

  function getPayment(method) {
    return payments.find((p) => p.method === method) || { method, amount: '', reference: '' }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Object.entries(PAYMENT_METHODS)
        .filter(([key]) => key !== 'multiple')
        .map(([method, label]) => {
          const payment = getPayment(method)
          const Icon = METHOD_CONFIG[method]?.icon || DollarSign
          return (
            <div key={method} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Icon size={16} className="text-blue-700" />
                {label}
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                placeholder="0.00"
                value={payment.amount}
                onChange={(e) => updatePayment(method, 'amount', e.target.value)}
                className="input"
              />
              {parseFloat(payment.amount) > 0 && (
                <input
                  type="text"
                  placeholder={`Referencia ${label.toLowerCase()}`}
                  value={payment.reference}
                  onChange={(e) => updatePayment(method, 'reference', e.target.value)}
                  className="input mt-2 text-xs"
                />
              )}
            </div>
          )
        })}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:col-span-2 lg:col-span-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total a pagar</span>
          <span className="font-semibold">{formatMoney(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Total pagado</span>
          <span className="font-semibold">{formatMoney(totalPaid)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-blue-200 pt-2 text-base font-bold">
          <span className={difference >= 0 ? 'text-green-700' : 'text-red-700'}>
            {difference >= 0 ? 'Vuelto' : 'Faltante'}
          </span>
          <span className={difference >= 0 ? 'text-green-700' : 'text-red-700'}>
            {formatMoney(Math.abs(difference))}
          </span>
        </div>
      </div>
    </div>
  )
}
