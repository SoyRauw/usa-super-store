import { ShoppingBag, Trash2, Minus, Plus, User } from 'lucide-react'
import { formatMoney } from '../../lib/api'
import { formatVariantLabel } from '../../lib/sku'
import PaymentPanel from './PaymentPanel'
import styles from './Cart.module.css'

export default function Cart({
  items,
  subtotal,
  total,
  payments,
  onPaymentsChange,
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
    <div className={styles.cart}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <ShoppingBag size={18} /> Venta actual
        </h3>
      </div>

      <div className={styles.body}>
        {/* Columna izquierda: Cliente + Pagos */}
        <div className={styles.leftCol}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <User size={12} /> Cliente
            </div>
            <div className={styles.row}>
              <div className={styles.field}>
                <label>Cédula / RIF</label>
                <input
                  className={styles.input}
                  value={customerDraft.id_number || ''}
                  onChange={(e) =>
                    onCustomerChange({ ...customerDraft, id_number: e.target.value })
                  }
                  placeholder="V-12345678"
                  disabled={disabled}
                />
              </div>
              <div className={styles.field}>
                <label>Teléfono</label>
                <input
                  className={styles.input}
                  value={customerDraft.phone || ''}
                  onChange={(e) =>
                    onCustomerChange({ ...customerDraft, phone: e.target.value })
                  }
                  placeholder="0414-0000000"
                  disabled={disabled}
                />
              </div>
            </div>
            <div className={styles.field} style={{ marginTop: '0.5rem' }}>
              <label>Nombre</label>
              <input
                className={styles.input}
                value={customerDraft.name || ''}
                onChange={(e) =>
                  onCustomerChange({ ...customerDraft, name: e.target.value })
                }
                placeholder="Nombre del cliente"
                disabled={disabled}
              />
            </div>
          </div>

          <div className={`${styles.section} ${styles.paymentsSection}`}>
            <div className={styles.sectionTitle}>Pagos</div>
            <PaymentPanel totalAmount={total} payments={payments} onChange={onPaymentsChange} />
          </div>
        </div>

        {/* Columna derecha: Productos agregados + Resumen */}
        <div className={styles.rightCol}>
          <div className={`${styles.section} ${styles.itemsSection}`}>
            <div className={styles.sectionTitle}>Productos agregados</div>
            <div className={styles.itemsList}>
              {items.length === 0 ? (
                <div className={styles.emptySmall}>
                  <ShoppingBag size={28} />
                  <p>El carrito está vacío</p>
                </div>
              ) : (
                items.map((item, index) => (
                  <div key={`${item.variant.id}-${index}`} className={styles.item}>
                    <div className={styles.itemInfo}>
                      <p className={styles.itemName}>{item.product.name}</p>
                      <p className={styles.itemVariant}>
                        {formatVariantLabel(item.variant, item.product?.categories?.size_label)}
                      </p>
                      <p className={styles.itemPrice}>{formatMoney(item.price)} c/u</p>
                      <div className={styles.qtyRow}>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => onUpdateQty(index, item.quantity - 1)}
                          disabled={item.quantity <= 1 || disabled}
                        >
                          <Minus size={12} />
                        </button>
                        <span className={styles.qtyValue}>{item.quantity}</span>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => onUpdateQty(index, item.quantity + 1)}
                          disabled={item.quantity >= item.variant.stock || disabled}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className={styles.itemActions}>
                      <p className={styles.itemTotal}>{formatMoney(item.price * item.quantity)}</p>
                      <button
                        className={styles.removeBtn}
                        onClick={() => onRemove(index)}
                        aria-label="Eliminar"
                        disabled={disabled}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`${styles.section} ${styles.summarySection}`}>
            <div className={styles.sectionTitle}>Resumen</div>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <strong>{formatMoney(subtotal)}</strong>
            </div>
            <div className={styles.totalBox}>
              <span className={styles.totalLabel}>Total a pagar</span>
              <strong className={styles.totalValue}>{formatMoney(total)}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Total pagado</span>
              <strong>{formatMoney(totalPaid)}</strong>
            </div>
            {difference > 0 && (
              <div className={styles.summaryHighlight} style={{ background: '#dcfce7', color: '#166534' }}>
                <span>Vuelto</span>
                <strong>{formatMoney(difference)}</strong>
              </div>
            )}
            {isMissing && (
              <div className={styles.summaryHighlight} style={{ background: '#fee2e2', color: '#991b1b' }}>
                <span>Faltante</span>
                <strong>{formatMoney(total - totalPaid)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actionsRow}>
          <button
            onClick={onPay}
            disabled={disabled || !isComplete}
            className={`btn btnPrimary ${styles.payBtn}`}
          >
            {disabled ? 'Procesando...' : isComplete ? 'Finalizar venta' : `Faltan ${formatMoney(Math.max(0, total - totalPaid))}`}
          </button>
          {items.length > 0 && (
            <button onClick={onClear} className={styles.clearBtn} disabled={disabled}>
              Vaciar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
