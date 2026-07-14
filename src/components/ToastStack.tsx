import { AlertCircle, Bell, CheckCircle2 } from 'lucide-react'
import type { ToastRecord } from '../types'

export function ToastStack({ toasts }: { toasts: ToastRecord[] }) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div className={`app-toast ${toast.tone}`} key={toast.id}>
          {toast.tone === 'success' ? (
            <CheckCircle2 size={17} aria-hidden="true" />
          ) : toast.tone === 'error' ? (
            <AlertCircle size={17} aria-hidden="true" />
          ) : (
            <Bell size={17} aria-hidden="true" />
          )}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  )
}
