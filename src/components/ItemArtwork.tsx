import type { Item } from '../types'
import styles from './ItemArtwork.module.scss'

export function ItemArtwork({ item, className = '' }: { item: Item; className?: string }) {
  return <span className={`${styles.artwork} ${className}`} aria-hidden="true">
    {item.artPath ? <img src={item.artPath} alt="" draggable={false} /> : <span>{item.icon}</span>}
  </span>
}
