import { Flag, HeartHandshake, MoreHorizontal, Send, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { channels } from '../data'
import { useGame } from '../state/GameContext'
import styles from './Plaza.module.scss'

export function Plaza() {
  const { state, addMessage, reportMessage } = useGame()
  const [searchParams] = useSearchParams()
  const [channel, setChannel] = useState('Lobby')
  const [text, setText] = useState('')
  const [reportNote, setReportNote] = useState('')
  const visible = useMemo(() => state.messages.filter((message) => message.channel === channel), [state.messages, channel])
  useEffect(() => {
    const requestedFriend = searchParams.get('dm')
    if (requestedFriend && state.friends.some((friend) => friend.name === requestedFriend)) setChannel(`DM:${requestedFriend}`)
  }, [searchParams, state.friends])
  const submit = (event: FormEvent) => { event.preventDefault(); const body = text; setText(''); void Promise.resolve(addMessage(channel, body)).catch((messageError) => { setReportNote(messageError instanceof Error ? messageError.message : 'Message could not be sent.'); window.setTimeout(() => setReportNote(''), 2200) }) }
  return <div className={styles.page}>
    {reportNote && <div className={styles.reportToast}>{reportNote}</div>}
    <header className="pageHeader"><div><span>FRIENDSHIP PLAZA</span><h1>Bramblewick is better together</h1><p>Be kind, stay curious, and never share personal information.</p></div><ShieldCheck /></header>
    <div className={styles.chatShell}>
      <aside className={styles.channels}><h2><Users /> Public channels</h2>{channels.map((name) => <button key={name} className={channel === name ? styles.active : ''} onClick={() => setChannel(name)}><span>#</span>{name}<i>{state.messages.filter((message) => message.channel === name).length}</i></button>)}<div className={styles.friends}><h2><HeartHandshake /> Friends</h2><Link className={styles.manageFriends} to="/friends"><UserPlus /> Friends list</Link>{state.friends.length ? state.friends.map((friend) => <button key={friend.id} className={channel === `DM:${friend.name}` ? styles.activeFriend : ''} onClick={() => setChannel(`DM:${friend.name}`)}><i className={friend.online ? styles.online : ''} /><span><b>{friend.name}</b><small>{friend.online ? `With ${friend.pet}` : 'Away'}</small></span></button>) : <p>No friends yet — say hello in Lobby!</p>}</div></aside>
      <section className={styles.room}><header><div><b>{channel.startsWith('DM:') ? '♡ ' : '# '}{channel.replace('DM:', '')}</b><span>{channel.startsWith('DM:') ? 'Private conversation • friends only' : channel === 'Trading' ? 'Share wishlists and market finds' : 'A cozy place for all Keepers'}</span></div><button aria-label="Channel options"><MoreHorizontal /></button></header><div className={styles.messages} aria-live="polite">{visible.map((message) => <article key={message.id} className={message.own ? styles.own : ''}><Link className={styles.messageAvatar} to={`/keeper/${encodeURIComponent(message.author)}`} aria-label={`View ${message.author}'s profile`}>{message.author.slice(0, 1)}</Link><div><p><Link to={`/keeper/${encodeURIComponent(message.author)}`}>{message.author}</Link><time>{message.time}</time></p><span>{message.body}</span></div>{!message.own && <button title="Report message" aria-label={`Report message from ${message.author}`} onClick={() => { void Promise.resolve(reportMessage(message.id, 'Reported from chat')).then(() => { setReportNote('Report saved for moderator review.'); window.setTimeout(() => setReportNote(''), 2200) }).catch(() => setReportNote('Report could not be saved.')) }}><Flag /></button>}</article>)}</div><form onSubmit={submit}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={280} placeholder={channel.startsWith('DM:') ? `Message ${channel.replace('DM:', '')}` : `Message #${channel}`} aria-label={`Message ${channel}`} /><span>{text.length}/280</span><button aria-label="Send message" disabled={!text.trim()}><Send /></button></form></section>
    </div>
  </div>
}
