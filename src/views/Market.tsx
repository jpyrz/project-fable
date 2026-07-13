import { Heart, PackagePlus, Search, ShoppingBag, Store } from 'lucide-react'
import { useMemo, useState } from 'react'
import { featuredShopItems, items } from '../data'
import { useGame } from '../state/GameContext'
import styles from './Market.module.scss'

export function Market() {
  const { state, buyShopItem, buyListing, createListing, toggleWishlist } = useGame()
  const [tab, setTab] = useState<'market' | 'shop' | 'sell'>('market')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const listings = useMemo(() => state.listings.filter((listing) => items.find((item) => item.id === listing.itemId)?.name.toLowerCase().includes(search.toLowerCase())), [state.listings, search])
  const purchase = async (operation: boolean | Promise<boolean>) => { const success = await operation; setToast(success ? 'Tucked safely into your bag!' : 'That purchase could not be completed.'); window.setTimeout(() => setToast(''), 2200) }
  return <div className={styles.page}>
    {toast && <div className={styles.toast}>{toast}</div>}
    <header className="pageHeader"><div><span>MERRY MARKET</span><h1>Find a little treasure</h1><p>Browse Keeper listings or today’s friendly shop rotation.</p></div><div className={styles.tabs}><button className={tab === 'market' ? styles.active : ''} onClick={() => setTab('market')}><ShoppingBag /> Market</button><button className={tab === 'shop' ? styles.active : ''} onClick={() => setTab('shop')}><Store /> Store</button><button className={tab === 'sell' ? styles.active : ''} onClick={() => setTab('sell')}><PackagePlus /> Sell</button></div></header>
    {tab !== 'sell' && <><label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search treasures…" /></label><div className={styles.meta}><strong>{tab === 'market' ? listings.length : featuredShopItems.length} treasures</strong><span>Fixed prices • Safe checkout</span></div></>}
    {tab === 'sell' && <SellPanel state={state} onCreate={async (itemId,quantity,price)=>{const success=await createListing(itemId,quantity,price);setToast(success?'Your listing is live!':'That listing could not be created.');return success}} />}
    {tab !== 'sell' && <section className={styles.grid}>
      {tab === 'market' ? listings.map((listing) => { const item = items.find((entry) => entry.id === listing.itemId)!; return <ItemCard key={listing.id} item={item} price={listing.price} sub={`Sold by ${listing.seller}`} wished={state.wishlist.includes(item.id)} onWish={() => void toggleWishlist(item.id)} onBuy={() => void purchase(buyListing(listing.id))} /> }) : featuredShopItems.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => <ItemCard key={item.id} item={item} price={item.price} sub="Bramblewick General" wished={state.wishlist.includes(item.id)} onWish={() => void toggleWishlist(item.id)} onBuy={() => void purchase(buyShopItem(item.id))} />)}
    </section>}
  </div>
}

function SellPanel({ state, onCreate }: { state: ReturnType<typeof useGame>['state']; onCreate:(itemId:string,quantity:number,price:number)=>Promise<boolean> }) {
  const sellable=items.filter((item)=>(state.inventory[item.id]??0)>0)
  const [itemId,setItemId]=useState(sellable[0]?.id??''); const [quantity,setQuantity]=useState(1); const [price,setPrice]=useState(50)
  const [submitting,setSubmitting]=useState(false)
  const item=items.find((entry)=>entry.id===itemId)
  const submit=async()=>{if(submitting)return;setSubmitting(true);try{if(await onCreate(itemId,quantity,price))setQuantity(1)}finally{setSubmitting(false)}}
  return <section className={styles.sellPanel}><div className={styles.sellArt}>{item?.icon??'📦'}</div><div><span>OPEN A MARKET STALL</span><h2>List something from your bag</h2><p>A 5% market fee is taken when it sells. Listed items stay safely in escrow.</p><label>Treasure<select value={itemId} disabled={submitting} onChange={(event)=>setItemId(event.target.value)}>{sellable.map((entry)=><option key={entry.id} value={entry.id}>{entry.name} (×{state.inventory[entry.id]})</option>)}</select></label><div className={styles.sellFields}><label>Quantity<input type="number" min="1" max={state.inventory[itemId]??1} value={quantity} disabled={submitting} onChange={(event)=>setQuantity(Number(event.target.value))}/></label><label>Price each<input type="number" min="1" value={price} disabled={submitting} onChange={(event)=>setPrice(Number(event.target.value))}/></label></div><button disabled={submitting||!itemId||quantity<1||quantity>(state.inventory[itemId]??0)||price<1} onClick={()=>void submit()}>{submitting?'Opening your stall…':`List for ${quantity*price} ✦`}</button></div></section>
}

function ItemCard({ item, price, sub, wished, onWish, onBuy }: { item: (typeof items)[number]; price: number; sub: string; wished: boolean; onWish: () => void; onBuy: () => void }) {
  return <article className={styles.card}><button className={`${styles.wish} ${wished ? styles.wished : ''}`} aria-label="Toggle wishlist" onClick={onWish}><Heart fill={wished ? 'currentColor' : 'none'} /></button><div className={styles.icon}>{item.icon}</div><span className={styles.rarity}>{item.rarity}</span><h2>{item.name}</h2><p>{sub}</p><button className={styles.buy} onClick={onBuy}><span>Buy now</span><b>✦ {price}</b></button></article>
}
