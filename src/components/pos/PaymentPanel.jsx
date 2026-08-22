import { useMemo } from 'react'
import { Banknote, Smartphone, DollarSign, ArrowRightLeft, CreditCard } from 'lucide-react'
import { PAYMENT_METHODS } from '../../lib/api'
import styles from './PaymentPanel.module.css'

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
    <div className={styles.panel}>
      {Object.entries(PAYMENT_METHODS)
        .filter(([key]) => key !== 'multiple')
        .map(([method, label]) => {
          const payment = getPayment(method)
          const Icon = METHOD_CONFIG[method]?.icon || DollarSign
          return (
            <div key={method}>
              <div className={styles.paymentRow}>
                <span className={styles.methodLabel}>
                  <Icon size={14} /> {label}
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={payment.amount}
                  onChange={(e) => updatePayment(method, 'amount', e.target.value)}
                  className={styles.input}
                />
              </div>
              {parseFloat(payment.amount) > 0 && (
                <input
                  type="text"
                  placeholder={`Referencia ${label.toLowerCase()} (opcional)`}
                  value={payment.reference}
                  onChange={(e) => updatePayment(method, 'reference', e.target.value)}
                  className={styles.referenceInput}
                />
              )}
            </div>
          )
        })}

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Total a pagar</span>
          <span className={styles.summaryValue}>${totalAmount.toFixed(2)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>Total pagado</span>
          <span className={styles.summaryValue}>${totalPaid.toFixed(2)}</span>
        </div>
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{difference >= 0 ? 'Vuelto' : 'Faltante'}</span>
          <span
            className={`${styles.summaryValue} ${
              difference === 0
                ? styles.summaryValueSuccess
                : difference > 0
                ? styles.summaryValueWarning
                : styles.summaryValueDanger
            }`}
          >
            ${Math.abs(difference).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  )
}
