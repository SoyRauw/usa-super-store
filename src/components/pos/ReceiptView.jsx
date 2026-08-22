import { PAYMENT_METHODS, formatMoney } from '../../lib/api'

export default function ReceiptView({ movement, items, payments, subtotal, total, createdAt }) {
  const date = createdAt ? new Date(createdAt) : new Date()
  const totalPaid = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const change = Math.max(0, totalPaid - total)
  const invoiceId = movement?.id?.slice(0, 8) || '—'

  return (
    <div className="printReceipt rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm">
      <div className="mb-4 border-b border-dashed border-slate-300 pb-4 text-center">
        <div className="text-2xl font-bold uppercase tracking-wide text-blue-950">USA Super Store</div>
        <div className="text-slate-500">Recibo de venta</div>
      </div>

      <div className="mb-4 space-y-1 border-b border-dashed border-slate-300 pb-4">
        <div className="flex justify-between"><span className="text-slate-500">Recibo</span><strong>#{invoiceId}</strong></div>
        <div className="flex justify-between"><span className="text-slate-500">Fecha</span><strong>{date.toLocaleString()}</strong></div>
        {movement?.movement_type && <div className="flex justify-between"><span className="text-slate-500">Tipo</span><strong>{movement.movement_type.toUpperCase()}</strong></div>}
        {movement?.status && <div className="flex justify-between"><span className="text-slate-500">Estado</span><strong>{movement.status.toUpperCase()}</strong></div>}
      </div>

      <div className="mb-4 border-b border-dashed border-slate-300 pb-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Productos</div>
        {items?.map((item, i) => (
          <div key={i} className="mb-2">
            <div className="flex gap-2 font-medium">
              <span className="min-w-[24px]">{item.quantity}x</span>
              <span>{item.product?.name || item.products?.name}</span>
            </div>
            <div className="ml-7 flex justify-between text-xs text-slate-500">
              <span>{formatMoney(item.price || item.unit_price || 0)} c/u</span>
              <strong>{formatMoney((item.price || item.unit_price || 0) * item.quantity)}</strong>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 border-b border-dashed border-slate-300 pb-4">
        <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
        <div className="flex justify-between text-lg font-bold text-blue-950"><span>Total</span><span>{formatMoney(total)}</span></div>
      </div>

      {payments && payments.length > 0 && (
        <div className="mb-4 border-b border-dashed border-slate-300 pb-4">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Pagos</div>
          {payments.map((p, i) => (
            <div key={i} className="mb-1">
              <div className="flex justify-between"><span>{PAYMENT_METHODS[p.method] || p.method}</span><strong>{formatMoney(p.amount)}</strong></div>
              {p.reference && <div className="text-xs text-slate-500">Ref: {p.reference}</div>}
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2"><span>Total pagado</span><strong>{formatMoney(totalPaid)}</strong></div>
          {change > 0 && <div className="flex justify-between font-medium text-green-600"><span>Vuelto</span><strong>{formatMoney(change)}</strong></div>}
        </div>
      )}

      {movement?.notes && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase text-slate-400">Notas</div>
          <div className="text-xs text-slate-600">{movement.notes}</div>
        </div>
      )}

      <div className="text-center text-xs text-slate-500">¡Gracias por su compra!</div>
    </div>
  )
}

export function printReceipt(data) {
  const html = getReceiptHTML(data)
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

function getReceiptHTML({ movement, items, payments, subtotal, total, createdAt }) {
  const date = createdAt ? new Date(createdAt) : new Date()
  const invoiceId = movement?.id?.slice(0, 8) || '—'
  const totalPaid = (payments || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
  const change = Math.max(0, totalPaid - total)

  const productsHTML = (items || []).map(item => {
    const name = item.product?.name || item.products?.name || '—'
    const unitPrice = item.price || item.unit_price || 0
    const qty = item.quantity || 1
    return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #f0f0f0;"><div style="display:flex;gap:6px;font-weight:500;color:#1f2937;"><span style="font-weight:700;min-width:24px;">${qty}x</span><span>${name}</span></div><div style="display:flex;justify-content:space-between;margin-top:4px;margin-left:30px;font-size:13px;"><span>${formatMoney(unitPrice)} c/u</span><strong>${formatMoney(unitPrice * qty)}</strong></div></div>`
  }).join('')

  const paymentsHTML = (payments || []).length
    ? (payments || []).map(p => `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;"><span>${PAYMENT_METHODS[p.method] || p.method}</span><strong>${formatMoney(p.amount)}</strong></div>${p.reference ? `<div style="font-size:11px;color:#6b7280;margin-bottom:6px;">Ref: ${p.reference}</div>` : ''}`).join('') +
      `<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;font-size:13px;"><span>Total pagado</span><strong>${formatMoney(totalPaid)}</strong></div>${change > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:6px;color:#166534;font-size:13px;background:#dcfce7;padding:6px 8px;border-radius:6px;"><span>Vuelto</span><strong>${formatMoney(change)}</strong></div>` : ''}`
    : ''

  const notesHTML = movement?.notes ? `<div style="border-top:1px dashed #d1d5db;padding-top:12px;margin-top:12px;"><div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Notas</div><div style="font-size:12px;color:#6b7280;white-space:pre-wrap;">${movement.notes}</div></div>` : ''

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Recibo ${invoiceId}</title><style>@page { size: portrait; margin: 10mm; } @media print { body { margin: 0; padding: 0; } .receipt { border: none; border-radius: 0; padding: 0; max-width: none; width: 100%; } } body { margin: 0; padding: 0; font-family: ui-monospace, Consolas, monospace; font-size: 14px; color: #1f2937; background: white; } .receipt { width: 100%; max-width: 100%; padding: 16px; box-sizing: border-box; border: 1px dashed #d1d5db; border-radius: 8px; background: white; } .brand { text-align: center; border-bottom: 1px dashed #d1d5db; padding-bottom: 12px; margin-bottom: 14px; } .brand-name { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #172554; } .brand-sub { font-size: 12px; color: #6b7280; } .meta-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; } .meta-row span { color: #6b7280; } .section-title { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; } .total-box { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; border-top: 2px dashed #d1d5db; padding-top: 14px; margin-top: 14px; color: #172554; } .footer { text-align: center; margin-top: 18px; padding-top: 14px; border-top: 1px dashed #d1d5db; font-size: 12px; color: #6b7280; }</style></head><body><div class="receipt"><div class="brand"><div class="brand-name">USA Super Store</div><div class="brand-sub">Recibo de venta</div></div><div><div class="meta-row"><span>Recibo</span><strong>#${invoiceId}</strong></div><div class="meta-row"><span>Fecha</span><strong>${date.toLocaleString()}</strong></div>${movement?.movement_type ? `<div class="meta-row"><span>Tipo</span><strong>${movement.movement_type.toUpperCase()}</strong></div>` : ''}${movement?.status ? `<div class="meta-row"><span>Estado</span><strong>${movement.status.toUpperCase()}</strong></div>` : ''}</div><div style="border-top:1px dashed #d1d5db;padding-top:14px;margin-top:14px;"><div class="section-title">Productos</div>${productsHTML}</div><div><div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px;"><span>Subtotal</span><span>${formatMoney(subtotal || total)}</span></div><div class="total-box"><span>Total</span><span>${formatMoney(total)}</span></div></div>${paymentsHTML ? `<div style="border-top:1px dashed #d1d5db;padding-top:14px;margin-top:14px;"><div class="section-title">Pagos</div>${paymentsHTML}</div>` : ''}${notesHTML}<div class="footer">¡Gracias por su compra!</div></div></body></html>`
}
