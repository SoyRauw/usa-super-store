import { AlertTriangle, X } from 'lucide-react'
import styles from './ConfirmModal.module.css'

export default function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message,
  children,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  disabled = false,
}) {
  if (!isOpen) return null

  const confirmClass =
    confirmVariant === 'danger' ? 'btn btnSecondary' : 'btn btnPrimary'

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <AlertTriangle size={20} />
            {title}
          </h3>
          <button
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className={styles.body}>
          {message && <p>{message}</p>}
          {children}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className="btn btnGhost"
            onClick={onCancel}
            disabled={disabled}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={disabled}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
