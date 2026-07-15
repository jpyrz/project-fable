import { Hammer, LockKeyhole } from 'lucide-react'
import { items, recipes } from '../data'
import { useGame } from '../state/GameContext'
import { useCelebration } from '../components/Celebration'
import { ItemArtwork } from '../components/ItemArtwork'
import styles from './Workshop.module.scss'

export function Workshop() {
  const { state, craft } = useGame()
  const celebrate = useCelebration()
  const makeItem = async (recipeId: string, output: (typeof items)[number]) => {
    if (await craft(recipeId)) celebrate({ level: 'major', icon: output.icon, title: 'Made something marvelous!', detail: `${output.name} is now tucked safely in your bag.` })
  }
  return <div className={styles.page}><header className="pageHeader"><div><span>TINKER WORKSHOP</span><h1>Make something marvelous</h1><p>Turn gathered materials into keepsakes and dress-up treasures.</p></div><div className={styles.hammer}><Hammer /></div></header>
    <section className={styles.materials}><h2>Your materials</h2><div>{items.filter((item) => item.category === 'material' && (state.inventory[item.id] ?? 0) > 0).map((item) => <span key={item.id}><b><ItemArtwork item={item} /></b>{item.name}<i>×{state.inventory[item.id]}</i></span>)}</div></section>
    <section className={styles.recipes}>{recipes.map((recipe, index) => { const output = items.find((item) => item.id === recipe.output)!; const unlocked = state.reputation >= recipe.level; const ready = unlocked && recipe.needs.every((need) => (state.inventory[need.id] ?? 0) >= need.count); return <article key={recipe.id}><div className={styles.output}><ItemArtwork item={output} /></div><div className={styles.info}><span>RECIPE {index + 1} · LEVEL {recipe.level}</span><h2>{output.name}</h2><p>{output.description}</p><div className={styles.needs}>{recipe.needs.map((need) => { const item = items.find((entry) => entry.id === need.id)!; return <span key={need.id} className={(state.inventory[need.id] ?? 0) >= need.count ? styles.have : ''}><ItemArtwork item={item} /> {state.inventory[need.id] ?? 0}/{need.count}</span> })}</div></div><button disabled={!ready} onClick={() => void makeItem(recipe.id, output)}>{!unlocked ? <><LockKeyhole /> Level {recipe.level} recipe</> : ready ? <><Hammer /> Craft</> : <><LockKeyhole /> Need materials</>}</button></article> })}</section>
  </div>
}
