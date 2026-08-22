import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Lock, LockOpen, CheckCircle, Printer, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCashSession } from '../hooks/useCashSession'
import {
  fetchVariantByCode,
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
import PaymentPanel from '../components/pos/PaymentPanel'
import ReceiptView, { printReceipt } from '../components/pos/ReceiptView'

export default function POS() {
  const { user } = useAuth()
  const { session, loading: sessionLoading } = useCashSession(user?.id)

  const [items, setItems] = useState([])
  const [payments, setPayments] = useState([])
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
      const notes = payments
        .filter((p) => p.reference)
        .map((p) => `${PAYMENT_METHODS[p.method]}: ${p.reference}`)
        .join(' | ')

      const movement = await createMovement({
        movement_type: 'venta',
        status: 'pagado',
        user_id: user.id,
        cash_session_id: session.id,
        customer_name: null,
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
      <div className="flex h-64 items-center justify-center">
        Cargando caja...
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-blue-950">Punto de Venta</h1>
          <p className="text-slate-500">Escanea o busca productos para vender</p>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            session
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {session ? <LockOpen size={16} /> : <Lock size={16} />}
          {session ? 'Caja abierta' : 'Caja cerrada'}
        </div>
      </div>

      {!session ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Lock size={64} className="mb-4 text-slate-300" />
          <h2 className="mb-2 text-2xl text-blue-950">No hay caja abierta</h2>
          <p className="text-slate-500">
            Ve a <strong>Caja</strong> y abre un turno para poder vender.
          </p>
        </div>
      ) : (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const code = barcodeBuffer.trim()
              setBarcodeBuffer('')
              if (code) handleBarcodeScan(code)
            }}
            className="mb-4"
          >
            <input
              ref={barcodeInputRef}
              type="text"
              value={barcodeBuffer}
              onChange={(e) => setBarcodeBuffer(e.target.value)}
              placeholder="Escanea el código de barras o SKU y presiona Enter..."
              className="input"
              disabled={submitting}
            />
          </form>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card h-[calc(100vh-280px)] min-h-[400px]">
              <ProductSearch onAdd={addItem} />
            </div>
            <div className="h-[calc(100vh-280px)] min-h-[400px]">
              <Cart
                items={items}
                subtotal={subtotal}
                total={total}
                payments={payments}
                onUpdateQty={updateQuantity}
                onRemove={removeItem}
                onClear={clearCart}
                onPay={handlePay}
                disabled={submitting}
                error={error}
              />
            </div>
          </div>

          <div className="card mt-4">
            <PaymentPanel
              totalAmount={total}
              payments={payments}
              onChange={setPayments}
            />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
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
