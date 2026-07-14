import type { ReactNode } from 'react'

export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export function Badge({ children, tone }: { children: ReactNode; tone: BadgeTone }) {
  return <span className={`badge ${tone}`}>{children}</span>
}
