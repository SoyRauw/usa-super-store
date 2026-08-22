import { ShoppingBag, Trash2, Minus, Plus, User, CreditCard, Phone } from 'lucide-react'
import { formatMoney } from '../../lib/api'
import { formatVariantLabel } from '../../lib/sku'

export default function Cart({
  items,
  subtotal,
  total,
  payments,
  customer,
  onCustomerChange,
  onUpdateQty,
  onRemove,
  onClear,
  onPay,
  disabled,
  error,
}) {
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const difference = totalPaid - total
  const isComplete = totalPaid >= total && items.length > 0
  const isMissing = totalPaid < total && items.length > 0
  const customerDraft = customer || { id: '', id_number: '', name: '', phone: '' }

  return (
    <div className="card flex h-full flex-col !p-0">
      <div className="border-b border-slate-100 p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
          <ShoppingBag size={20} className="text-blue-700" />
          Venta actual
        </h3>
      </div>

      <div className="border-b border-slate-100 bg-slate-50 p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
          <User size={16} /> Cliente
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Cédula / RIF</label>
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-slate-400" />
              <input
                value={customerDraft.id_number || ''}
                onChange={(e) => onCustomerChange({ ...customerDraft, id_number: e.target.value })}
                placeholder="V-12345678"
                className="input"
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Teléfono</label>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-slate-400" />
              <input
                value={customerDraft.phone || ''}
                onChange={(e) => onCustomerChange({ ...customerDraft, phone: e.target.value })}
                placeholder="0414-0000000"
                className="input"
                disabled={disabled}
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Nombre</label>
            <input
              value={customerDraft.name || ''}
              onChange={(e) => onCustomerChange({ ...customerDraft, name: e.target.value })}
              placeholder="Nombre del cliente"
              className="input"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-slate-400">
            <ShoppingBag size={36} />
            <p className="mt-2 text-sm">El carrito está vacío</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const variantLabel = formatVariantLabel(item.variant, item.product?.categories?.size_label)
              return (
                <div key={`${item.variant.id}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{item.product.name}</p>
                    <p className="text-xs text-slate-500">{variantLabel}</p>
                    <p className="text-xs text-slate-500">{formatMoney(item.price)} c/u</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => onUpdateQty(index, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="rounded bg-white p-1.5 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQty(index, item.quantity + 1)}
                        disabled={item.quantity >= item.variant.stock}
                        className="rounded bg-white p-1.5 shadow-sm transition-colors hover:bg-slate-100 disabled:opacity-40"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-blue-900">{formatMoney(item.price * item.quantity)}</p>
                    <button onClick={() => onRemove(index)} className="mt-1 text-red-600 hover:text-red-800">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900">
            <span>Total</span>
            <span>{formatMoney(total)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Pagado</span>
            <span>{formatMoney(totalPaid)}</span>
          </div>
          {difference > 0 && (
            <div className="flex justify-between font-semibold text-green-600">
              <span>Vuelto</span>
              <span>{formatMoney(difference)}</span>
            </div>
          )}
          {isMissing && (
            <div className="flex justify-between font-semibold text-red-600">
              <span>Faltante</span>
              <span>{formatMoney(total - totalPaid)}</span>
            </div>
          )}
        </div>

        {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex gap-2">
          <button onClick={onPay} disabled={disabled || !isComplete} className="btn btnPrimary flex-1">
            {disabled ? 'Procesando...' : isComplete ? 'Finalizar venta' : `Faltan ${formatMoney(Math.max(0, total - totalPaid))}`}
          </button>
          {items.length > 0 && (
            <button onClick={onClear} className="btn btnOutline">Vaciar</button>
          )}
        </div>
      </div>
    </div>
  )
}
