import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Lock, LockOpen, CheckCircle, Printer, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCashSession } from '../hooks/useCashSession'
import {
  fetchVariantByCode,
  fetchCustomerByIdNumber,
  createCustomer,
  createMovement,
  createMovementItems,
  createMovementPayments,
  updateVariantStock,
  formatMoney,
  PAYMENT_METHODS,
} from '../lib/api'
import { getErrorMessage } from '../lib/errors'
import ConfirmModal from '../components/ConfirmModal'
import ProductSearch from '../components/pos/ProductSearch'
import Cart from '../components/pos/Cart'
import ReceiptView, { printReceipt } from '../components/pos/ReceiptView'
import styles from './POS.module.css'

export default function POS() {
  const { user } = useAuth()
  const { session, loading: sessionLoading } = useCashSession(user?.id)

  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
  const [customer, setCustomer] = useState({ id: '', id_number: '', name: '', phone: '' })
  const [barcodeBuffer, setBarcodeBuffer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [completedSale, setCompletedSale] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const barcodeInputRef = useRef(null)

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  )
  const total = subtotal
  const totalPaid = useMemo(
    () => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0),
    [payments]
  )
  const difference = totalPaid - total

  useEffect(() => {
    if (barcodeInputRef.current && session) {
      barcodeInputRef.current.focus()
    }
  }, [session])

  useEffect(() => {
    const id = customer.id_number?.trim()
    if (!id || id.length < 3) return

    const timeout = setTimeout(async () => {
      try {
        const found = await fetchCustomerByIdNumber(id)
        if (found.length === 1) {
          setCustomer((prev) => ({
            ...prev,
            id: found[0].id,
            name: found[0].name || '',
            phone: found[0].phone || '',
          }))
        }
      } catch (err) {
        console.error(err)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [customer.id_number])

  const addItem = useCallback((product, variant) => {
    const price = variant.price || product.sale_price
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.variant.id === variant.id)
      if (existingIndex >= 0) {
        const item = prev[existingIndex]
        if (item.quantity >= item.variant.stock) return prev
        return prev.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { product, variant, quantity: 1, price }]
    })
  }, [])

  const updateQuantity = useCallback((index, quantity) => {
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((_, i) => i !== index)
      const item = prev[index]
      if (quantity > item.variant.stock) return prev
      return prev.map((i, idx) =>
        idx === index ? { ...i, quantity } : i
      )
    })
  }, [])

  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setPayments([])
    setCustomer({ id: '', id_number: '', name: '', phone: '' })
    setError('')
  }, [])

  const handleBarcodeScan = async (code) => {
    if (!code || !session) return
    const cleanCode = code.trim().toUpperCase()
    if (!cleanCode) return

    setError('')
    try {
      const variant = await fetchVariantByCode(cleanCode)
      if (variant) {
        addItem(variant.products, variant)
      } else {
        setError(`No se encontró variante con código: ${cleanCode}`)
      }
    } catch (e) {
      console.error(e)
      setError('Error al buscar producto escaneado')
    }
  }

  const handlePay = () => {
    if (!session) {
      setError('No hay caja abierta. Abre una caja primero.')
      return
    }
    if (items.length === 0) {
      setError('Agrega al menos un producto al carrito')
      return
    }
    if (totalPaid < total) {
      setError(`Faltan ${formatMoney(total - totalPaid)} para completar el pago`)
      return
    }
    setError('')
    setConfirmOpen(true)
  }

  const executePay = async () => {
    setSubmitting(true)
    setError('')

    try {
      let customerId = customer?.id || null
      let customerName = customer?.name?.trim() || null
      let customerPhone = customer?.phone?.trim() || null
      const idNumber = customer?.id_number?.trim() || null

      if (customerName || idNumber) {
        if (idNumber && !customerId) {
          const found = await fetchCustomerByIdNumber(idNumber)
          if (found.length === 1) customerId = found[0].id
        }

        if (!customerId) {
          const newCustomer = await createCustomer({
            name: customerName || 'Cliente',
            id_number: idNumber,
            phone: customerPhone,
          })
          customerId = newCustomer.id
        }
      }

      const notes = payments
        .filter((p) => p.reference)
        .map((p) => `${PAYMENT_METHODS[p.method]}: ${p.reference}`)
        .join(' | ')

      const movement = await createMovement({
        movement_type: 'venta',
        status: 'pagado',
        user_id: user.id,
        cash_session_id: session.id,
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_method: payments.length === 1 ? payments[0].method : 'multiple',
        total_amount: total,
        notes: notes || null,
      })

      await createMovementItems(
        items.map((item) => ({
          movement_id: movement.id,
          product_id: item.product.id,
          variant_id: item.variant.id,
          quantity: item.quantity,
          unit_price: item.price,
        }))
      )

      const validPayments = payments
        .filter((p) => parseFloat(p.amount) > 0)
        .map((p) => ({
          movement_id: movement.id,
          method: p.method,
          amount: parseFloat(p.amount),
          reference: p.reference?.trim() || null,
        }))

      if (validPayments.length > 0) {
        await createMovementPayments(validPayments)
      }

      for (const item of items) {
        await updateVariantStock(
          item.variant.id,
          item.variant.stock - item.quantity
        )
      }

      setCompletedSale({
        movement,
        items,
        subtotal,
        total,
        payments: validPayments,
        createdAt: new Date().toISOString(),
      })
      clearCart()
    } catch (e) {
      console.error(e)
      setError(getErrorMessage(e))
    } finally {
      setSubmitting(false)
      setConfirmOpen(false)
    }
  }

  if (sessionLoading) {
    return (
      <div className={styles.page}>
        <div className="flex h-full items-center justify-center text-slate-500">
          Cargando caja...
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>Punto de Venta</h1>
          <p className={styles.pageSubtitle}>Escanea o busca productos para vender</p>
        </div>
        <div
          className={`${styles.sessionBadge} ${
            session ? styles.sessionOpen : styles.sessionClosed
          }`}
        >
          {session ? <LockOpen size={16} /> : <Lock size={16} />}
          {session ? 'Caja abierta' : 'Caja cerrada'}
        </div>
      </div>

      {!session ? (
        <div className={styles.noSession}>
          <Lock size={64} className={styles.noSessionIcon} />
          <h2 className={styles.noSessionTitle}>No hay caja abierta</h2>
          <p>Ve a <strong>Caja</strong> y abre un turno para poder vender.</p>
        </div>
      ) : (
        <>
          <div className={styles.barcodeRow}>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const code = barcodeBuffer.trim()
                setBarcodeBuffer('')
                if (code) handleBarcodeScan(code)
              }}
            >
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeBuffer}
                onChange={(e) => setBarcodeBuffer(e.target.value)}
                placeholder="Escanea el código de barras o SKU y presiona Enter..."
                className={styles.barcodeInput}
                disabled={submitting}
              />
            </form>
          </div>

          <div className={styles.layout}>
            <div className={styles.leftPanel}>
              <ProductSearch onAdd={addItem} />
            </div>
            <div className={styles.rightPanel}>
              <Cart
                items={items}
                subtotal={subtotal}
                total={total}
                payments={payments}
                onPaymentsChange={setPayments}
                customer={customer}
                onCustomerChange={setCustomer}
                onUpdateQty={updateQuantity}
                onRemove={removeItem}
                onClear={clearCart}
                onPay={handlePay}
                disabled={submitting}
                error={error}
              />
            </div>
          </div>
        </>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        title="¿Completar venta?"
        onConfirm={executePay}
        onCancel={() => setConfirmOpen(false)}
        confirmText={submitting ? 'Procesando...' : 'Confirmar venta'}
        disabled={submitting}
      >
        <ul className="space-y-1 text-sm text-slate-600">
          <li className="flex justify-between">
            <span>Productos</span>
            <span>{items.reduce((s, i) => s + i.quantity, 0)} uds</span>
          </li>
          <li className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </li>
          <li className="flex justify-between font-semibold text-blue-950">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </li>
          <li className="flex justify-between">
            <span>Recibido</span>
            <span>{formatMoney(totalPaid)}</span>
          </li>
          <li className="flex justify-between">
            <span>Cambio</span>
            <span>{formatMoney(Math.max(0, difference))}</span>
          </li>
        </ul>
      </ConfirmModal>

      {completedSale && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-xl text-green-700">
                <CheckCircle size={22} /> Venta completada
              </h2>
              <button
                onClick={() => setCompletedSale(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <ReceiptView
              movement={completedSale.movement}
              items={completedSale.items}
              payments={completedSale.payments}
              subtotal={completedSale.subtotal}
              total={completedSale.total}
              createdAt={completedSale.createdAt}
            />

            <button
              onClick={() => printReceipt(completedSale)}
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
