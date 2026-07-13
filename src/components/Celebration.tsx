import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import styles from './Celebration.module.scss'

export type CelebrationMoment = {
  icon: string
  title: string
  detail: string
  level?: 'major' | 'minor'
}

type CelebrationContextValue = (moment: CelebrationMoment) => void

const CelebrationContext = createContext<CelebrationContextValue | null>(null)

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [moment, setMoment] = useState<CelebrationMoment | null>(null)
  const timeout = useRef<number | undefined>(undefined)

  const celebrate = useCallback((next: CelebrationMoment) => {
    window.clearTimeout(timeout.current)
    setMoment(next)
    timeout.current = window.setTimeout(() => setMoment(null), next.level === 'major' ? 3600 : 2400)
  }, [])

  useEffect(() => () => window.clearTimeout(timeout.current), [])

  return <CelebrationContext.Provider value={celebrate}>
    {children}
    {moment && <aside className={`${styles.celebration} ${styles[moment.level ?? 'minor']}`} role="status" aria-live="polite">
      <div className={styles.burst} aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index}>✦</i>)}</div>
      <span className={styles.icon} aria-hidden="true">{moment.icon}</span>
      <div><strong>{moment.title}</strong><p>{moment.detail}</p></div>
      <button onClick={() => setMoment(null)} aria-label="Dismiss celebration"><X /></button>
    </aside>}
  </CelebrationContext.Provider>
}

export function useCelebration() {
  const celebrate = useContext(CelebrationContext)
  if (!celebrate) throw new Error('useCelebration must be used inside CelebrationProvider')
  return celebrate
}
