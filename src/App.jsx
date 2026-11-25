import { useCallback, useEffect, useMemo, useState } from 'react'
import { ageAtStoryDate, compareStoryDates, formatStoryDate, hasStoryDate, isAfterStoryDate } from './lib/dates.js'
import { isSupabaseConfigured, supabase } from './lib/supabase.js'

const RELATIONSHIP_TYPES = ['亲属', '朋友', '恋人', '师徒', '同事', '盟友', '对手', '其他']
const CHARACTER_COLORS = ['#b64e32', '#2875a5', '#936000', '#6953a6', '#18775b', '#a94170']
const DEFAULT_DATE_COLOR = '#92734f'
const DEFAULT_CUSTOM_ERAS = [{ id: 'default-era', name: '故事纪年', start_year: 1 }]

function suggestEraStartYear(eras, events, characters) {
  const eventYears = events.map(event => {
    const era = eras.find(item => item.id === event.event_era_id)
    const year = Number(event.event_year)
    return era && year > 0 ? (Number(era.start_year) || 1) + year - 1 : 0
  })
  const characterYears = characters.flatMap(character => ['birth', 'death'].map(prefix => {
    const era = eras.find(item => item.id === character[`${prefix}_era_id`])
    const year = Number(character[`${prefix}_year`])
    return era && year > 0 ? (Number(era.start_year) || 1) + year - 1 : 0
  }))
  return Math.max(1, ...eras.map(era => Number(era.start_year) || 1), ...eventYears, ...characterYears) + 1
}

function App() {
  const previewMode = new URLSearchParams(window.location.search).get('preview') === '1'
  const [session, setSession] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setSessionLoading(false)
      return undefined
    }

    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session)
    }).catch(() => {
      if (active) setSession(null)
    }).finally(() => {
      if (active) setSessionLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setSessionLoading(false)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (previewMode) return <DemoWorkspace />
  if (!isSupabaseConfigured) return <SetupScreen />
  if (sessionLoading) return <div className="full-screen-loading"><span className="spinner" />正在连接故事工作台…</div>
  if (!session) return <AuthScreen />
  return <Workspace session={session} />
}

function SetupScreen() {
  return (
    <main className="setup-screen">
      <div className="setup-card">
        <div className="brand-mark">叙</div>
        <p className="eyebrow">STORY ATLAS · 创作工作台</p>
        <h1>把故事的时间与人物，<br />放在一张桌上。</h1>
        <p className="setup-copy">云端数据库尚未连接。完成以下设置后，你就可以在电脑和手机上使用同一份故事资料。</p>
        <ol className="setup-steps">
          <li><span>01</span><div><strong>创建 Supabase 项目</strong><small>启用账号登录与云端数据库。</small></div></li>
          <li><span>02</span><div><strong>运行数据库迁移</strong><small>执行项目中的故事资料表结构。</small></div></li>
          <li><span>03</span><div><strong>填写连接配置</strong><small>把项目网址和 Publishable Key 放入 .env。</small></div></li>
        </ol>
        <p className="setup-footnote">密钥只需使用公开的 Publishable Key。数据库会通过行级安全策略保护每个账号的资料。</p>
        <a className="button button-secondary setup-preview-link" href="?preview=1">先浏览演示界面　→</a>
      </div>
    </main>
  )
}

function DemoWorkspace() {
  const user = { email: 'demo@storyatlas.local' }
  const [tab, setTab] = useState('timeline')
  const [search, setSearch] = useState('')
  const [characterFilter, setCharacterFilter] = useState('all')
  const [notice, setNotice] = useState(null)
  const story = { id: 'demo-story', title: '雾港来信', summary: '一封迟到多年的信，把三个人重新带回雾港。' }
  const characters = [
    { id: 'lin-wu', name: '林雾', role: '主角 · 旧书修复师', birth_date: '1999-06-12', death_date: null, color: '#bc725f', description: '习惯把别人的故事修好，却不太愿意谈自己的过去。' },
    { id: 'lu-wenzhou', name: '陆闻舟', role: '旧友 · 记者', birth_date: '1997-12-02', death_date: null, color: '#6489a1', description: '离开雾港多年后回来调查一场被遗忘的火灾。' },
    { id: 'chen-zhao', name: '陈照', role: '长辈 · 港口档案员', birth_date: '1968-03-19', death_date: null, color: '#ad8b52', description: '看守旧港档案，也守着一段不愿被提起的往事。' },
  ]
  const events = [
    { id: 'event-1', title: '港口档案室发生火灾', event_date: '1998-09-01', date_label: '1998年·初秋', date_color: '#ad8b52', order_index: 10, description: '一场夜间火灾烧毁了半数档案，事故原因始终没有定论。' },
    { id: 'event-2', title: '林雾第一次离开雾港', event_date: '2018-04-02', date_label: '2018年·春', date_color: '#bc725f', order_index: 20, description: '她带着母亲留下的旧信，前往外地学习修复。' },
    { id: 'event-3', title: '旧车站重逢', event_date: '2019-01-15', date_label: '2019年·冬', date_color: '#6489a1', order_index: 30, description: '一场暴雨让两人困在同一座车站，也让那封信重新出现。' },
    { id: 'event-4', title: '三人打开封存的档案箱', event_date: null, date_label: '王历纪年之外 · 数日后', date_color: '#92734f', order_index: 40, description: '陈照交出钥匙，林雾和陆闻舟终于看到火灾当晚的完整记录。' },
  ]
  const links = [
    { timeline_event_id: 'event-1', character_id: 'chen-zhao' },
    { timeline_event_id: 'event-2', character_id: 'lin-wu' },
    { timeline_event_id: 'event-3', character_id: 'lin-wu' },
    { timeline_event_id: 'event-3', character_id: 'lu-wenzhou' },
    { timeline_event_id: 'event-4', character_id: 'lin-wu' },
    { timeline_event_id: 'event-4', character_id: 'lu-wenzhou' },
    { timeline_event_id: 'event-4', character_id: 'chen-zhao' },
  ]
  const relationships = [
    { id: 'relation-1', source_character_id: 'lin-wu', target_character_id: 'lu-wenzhou', relationship_type: '旧识', start_label: '少年时期', end_label: '2010年', notes: '曾经形影不离，后来因为一场误会失去联系。' },
    { id: 'relation-2', source_character_id: 'lin-wu', target_character_id: 'chen-zhao', relationship_type: '信任的长辈', start_label: '童年', end_label: '', notes: '陈照是少数知道林雾母亲往事的人。' },
    { id: 'relation-3', source_character_id: 'lu-wenzhou', target_character_id: 'chen-zhao', relationship_type: '调查对象', start_label: '2019年', end_label: '', notes: '一开始互不信任，逐渐成为揭开旧案的同伴。' },
  ]
  const linksByEvent = useMemo(() => links.reduce((map, link) => {
    map[link.timeline_event_id] ||= []
    map[link.timeline_event_id].push(link.character_id)
    return map
  }, {}), [])
  const characterById = useMemo(() => Object.fromEntries(characters.map(character => [character.id, character])), [])
  const visibleEvents = events
    .filter(event => characterFilter === 'all' || (linksByEvent[event.id] || []).includes(characterFilter))
    .filter(event => !search || `${event.title} ${event.description} ${event.date_label}`.toLowerCase().includes(search.toLowerCase()))
  const demoAction = () => setNotice({ type: 'success', text: '这是只读演示。连接云端项目后即可保存真实资料。' })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand"><span className="brand-mark">叙</span><span>叙事图谱<small>STORY ATLAS</small></span></div>
        <div className="side-section-label">你的故事</div>
        <div className="story-switcher"><select aria-label="演示故事项目" value="demo-story" disabled><option value="demo-story">雾港来信</option></select><button className="icon-button add-story" aria-label="演示" onClick={demoAction}>＋</button></div>
        <p className="sidebar-summary">{story.summary}</p>
        <div className="side-section-label workspace-label">工作区</div>
        <nav className="primary-nav" aria-label="工作区导航">
          <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}><span className="nav-glyph">↗</span>时间线<span className="nav-count">04</span></button>
          <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}><span className="nav-glyph">◉</span>人物<span className="nav-count">03</span></button>
          <button className={tab === 'relationships' ? 'active' : ''} onClick={() => setTab('relationships')}><span className="nav-glyph">⌘</span>关系<span className="nav-count">03</span></button>
        </nav>
        <div className="sidebar-bottom"><div className="sync-indicator demo-sync"><span />演示资料 · 未连接云端</div><div className="account-row"><div className="avatar-circle">预</div><div className="account-copy"><strong>演示工作区</strong><small>示例资料，不会保存</small></div><a className="icon-button signout-button preview-exit" href="/" title="返回连接设置">↗</a></div></div>
      </aside>
      <main className="main-panel">
        <header className="topbar"><div className="breadcrumbs"><span>故事工作台</span><i>/</i><strong>{story.title}</strong></div><div className="topbar-right"><span className="cloud-label demo-cloud"><span /> 演示模式</span><a className="topbar-date back-link" href="/">连接云端　→</a></div></header>
        <div className="demo-banner"><span>演示预览</span>　以下为示例人物和事件，内容不会保存或同步。</div>
        <div className="content-wrap">
          <section className="page-heading"><div><p className="eyebrow">{tab === 'timeline' ? 'CHRONOLOGY · 故事进程' : tab === 'characters' ? 'CAST · 人物档案' : 'CONNECTIONS · 人物网络'}</p><h1>{tab === 'timeline' ? '时间线' : tab === 'characters' ? '人物' : '关系图谱'}</h1><p className="heading-description">{tab === 'timeline' ? '把每个重要时刻放回正确的位置。' : tab === 'characters' ? '整理人物信息，随时核对他们的年龄与经历。' : '记录人物之间的关系，以及它们如何变化。'}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={demoAction}>＋ 添加人物</button><button className="button button-primary" onClick={demoAction}>＋ {tab === 'timeline' ? '添加事件' : tab === 'characters' ? '添加人物' : '添加关系'}</button><button className="icon-button story-more" title="演示操作" onClick={demoAction}>•••</button></div></section>
          <section className="summary-strip" aria-label="故事概览"><div><span>人物</span><strong>03</strong></div><div><span>时间线事件</span><strong>04</strong></div><div><span>人物关系</span><strong>03</strong></div><div className="summary-note"><span className="summary-mark">✳</span><span>{story.summary}</span></div></section>
          {notice && <div className={`notice ${notice.type}`} role="status"><span>✓</span>{notice.text}<button aria-label="关闭提示" onClick={() => setNotice(null)}>×</button></div>}
          {tab === 'timeline' && <TimelineView events={visibleEvents} allEvents={events} characters={characters} characterById={characterById} linksByEvent={linksByEvent} search={search} setSearch={setSearch} characterFilter={characterFilter} setCharacterFilter={setCharacterFilter} onEdit={demoAction} onDelete={demoAction} onAdd={demoAction} onInsert={demoAction} />}
          {tab === 'characters' && <CharactersView characters={characters} events={events} linksByEvent={linksByEvent} onEdit={demoAction} onDelete={demoAction} onAdd={demoAction} />}
          {tab === 'relationships' && <RelationshipsView relationships={relationships} characterById={characterById} characters={characters} onEdit={demoAction} onDelete={demoAction} onAdd={demoAction} onAddCharacter={demoAction} />}
          <footer className="page-footer"><span>叙事图谱</span><span>示例内容 · 人物、时间与故事之间</span></footer>
        </div>
      </main>
    </div>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email, password })
        if (authError) throw authError
        if (!data.session) setMessage('账号已创建。请查看邮箱完成验证，再回来登录。')
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
      }
    } catch (authError) {
      setError(authError.message || '暂时无法登录，请稍后重试。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-aside">
        <div className="brand-lockup"><span className="brand-mark">叙</span><span>叙事图谱<small>STORY ATLAS</small></span></div>
        <div className="auth-quote">
          <span className="quote-rule" />
          <p>人物记得住，<br />故事才站得稳。</p>
          <small>给每条时间线一个位置。</small>
        </div>
        <div className="aside-index">01　人物　　02　时间　　03　关系</div>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <p className="eyebrow">欢迎回来</p>
          <h1>{mode === 'signin' ? '继续你的故事' : '建立你的创作空间'}</h1>
          <p className="auth-intro">登录后，资料会在你的设备间自动同步。</p>
          <div className="auth-tabs" role="tablist" aria-label="账号操作">
            <button className={mode === 'signin' ? 'active' : ''} onClick={() => { setMode('signin'); setMessage(''); setError('') }}>登录</button>
            <button className={mode === 'signup' ? 'active' : ''} onClick={() => { setMode('signup'); setMessage(''); setError('') }}>创建账号</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            <label>邮箱地址<input autoComplete="email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required /></label>
            <label>密码<input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="至少 6 位" minLength={6} required /></label>
            {error && <p className="form-message error">{error}</p>}
            {message && <p className="form-message success">{message}</p>}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? '请稍候…' : mode === 'signin' ? '登录工作台' : '创建账号'}</button>
          </form>
          <p className="auth-privacy">你的故事只对你的账号开放。</p>
        </div>
      </section>
    </main>
  )
}

function Workspace({ session }) {
  const user = session.user
  const [stories, setStories] = useState([])
  const [selectedStoryId, setSelectedStoryId] = useState(null)
  const [characters, setCharacters] = useState([])
  const [events, setEvents] = useState([])
  const [relationships, setRelationships] = useState([])
  const [eventCharacterLinks, setEventCharacterLinks] = useState([])
  const [tab, setTab] = useState('timeline')
  const [storyLoading, setStoryLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [syncStatus, setSyncStatus] = useState('connecting')
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState(null)
  const [search, setSearch] = useState('')
  const [characterFilter, setCharacterFilter] = useState('all')

  const refreshStories = useCallback(async () => {
    const { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: true })
    if (error) throw error
    setStories(data || [])
    setSelectedStoryId(current => current && data?.some(story => story.id === current) ? current : data?.[0]?.id || null)
  }, [])

  useEffect(() => {
    let active = true
    async function loadStories() {
      setStoryLoading(true)
      try {
        const { data, error } = await supabase.from('stories').select('*').order('created_at', { ascending: true })
        if (error) throw error
        if (active) {
          setStories(data || [])
          setSelectedStoryId(current => current && data?.some(story => story.id === current) ? current : data?.[0]?.id || null)
        }
      } catch (loadError) {
        if (active) setNotice({ type: 'error', text: loadError.message || '故事列表加载失败。' })
      } finally {
        if (active) setStoryLoading(false)
      }
    }
    loadStories()
    return () => { active = false }
  }, [user.id])

  useEffect(() => {
    if (!selectedStoryId) {
      setCharacters([])
      setEvents([])
      setRelationships([])
      setEventCharacterLinks([])
      return undefined
    }
    let active = true
    async function loadStoryData() {
      setDataLoading(true)
      const [characterResult, eventResult, relationshipResult, linkResult] = await Promise.all([
        supabase.from('characters').select('*').eq('story_id', selectedStoryId).order('created_at', { ascending: true }),
        supabase.from('timeline_events').select('*').eq('story_id', selectedStoryId).order('order_index', { ascending: true }),
        supabase.from('relationships').select('*').eq('story_id', selectedStoryId).order('created_at', { ascending: true }),
        supabase.from('event_characters').select('timeline_event_id, character_id').eq('story_id', selectedStoryId),
      ])
      const failed = [characterResult, eventResult, relationshipResult, linkResult].find(result => result.error)
      if (active) {
        if (failed) setNotice({ type: 'error', text: failed.error.message || '故事资料加载失败。' })
        else {
          setCharacters(characterResult.data || [])
          setEvents(eventResult.data || [])
          setRelationships(relationshipResult.data || [])
          setEventCharacterLinks(linkResult.data || [])
        }
        setDataLoading(false)
      }
    }
    loadStoryData().catch(loadError => {
      if (active) {
        setNotice({ type: 'error', text: loadError.message || '故事资料加载失败。' })
        setDataLoading(false)
      }
    })
    return () => { active = false }
  }, [selectedStoryId, reloadKey])

  useEffect(() => {
    const refreshVisibleData = () => {
      if (document.visibilityState === 'hidden') return
      setReloadKey(value => value + 1)
      refreshStories().catch(loadError => setNotice({ type: 'error', text: loadError.message || '同步故事列表失败。' }))
    }
    window.addEventListener('focus', refreshVisibleData)
    document.addEventListener('visibilitychange', refreshVisibleData)
    if (!selectedStoryId) {
      setSyncStatus('connected')
      return () => {
        window.removeEventListener('focus', refreshVisibleData)
        document.removeEventListener('visibilitychange', refreshVisibleData)
      }
    }
    let channel = supabase.channel(`story-sync-${user.id}-${selectedStoryId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `user_id=eq.${user.id}` }, refreshVisibleData)
    for (const table of ['characters', 'timeline_events', 'event_characters', 'relationships']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `story_id=eq.${selectedStoryId}` }, refreshVisibleData)
    }
    channel.subscribe(status => {
      setSyncStatus(status === 'SUBSCRIBED' ? 'connected' : status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' ? 'error' : 'connecting')
    })
    return () => {
      window.removeEventListener('focus', refreshVisibleData)
      document.removeEventListener('visibilitychange', refreshVisibleData)
      supabase.removeChannel(channel)
    }
  }, [selectedStoryId, user.id, refreshStories])

  const selectedStory = stories.find(story => story.id === selectedStoryId)
  const calendarMode = selectedStory?.calendar_mode || 'gregorian'
  const customEras = Array.isArray(selectedStory?.custom_eras) && selectedStory.custom_eras.length ? selectedStory.custom_eras : DEFAULT_CUSTOM_ERAS
  const linksByEvent = useMemo(() => eventCharacterLinks.reduce((map, link) => {
    map[link.timeline_event_id] ||= []
    map[link.timeline_event_id].push(link.character_id)
    return map
  }, {}), [eventCharacterLinks])
  const characterById = useMemo(() => Object.fromEntries(characters.map(character => [character.id, character])), [characters])
  const visibleEvents = useMemo(() => events
    .filter(event => characterFilter === 'all' || (linksByEvent[event.id] || []).includes(characterFilter))
    .filter(event => !search || `${event.title} ${event.description} ${event.date_label} ${formatStoryDate(event, 'event', calendarMode, customEras)}`.toLowerCase().includes(search.toLowerCase())),
  [events, linksByEvent, characterFilter, search, calendarMode, customEras])

  function beginCreate(kind, preset = null) {
    setEditor({ kind, record: preset })
  }

  function addEventAtEnd(direction = 'asc') {
    const orderValues = events.map(event => Number(event.order_index)).filter(Number.isFinite)
    const orderIndex = orderValues.length
      ? direction === 'desc' ? Math.min(...orderValues) - 10 : Math.max(...orderValues) + 10
      : 10
    beginCreate('event', { order_index: orderIndex })
  }

  function beginEdit(kind, record, options = {}) {
    const editRecord = kind === 'event'
      ? { ...record, characterIds: linksByEvent[record.id] || [] }
      : record
    setEditor({ kind, record: editRecord, openQuickAdd: Boolean(options.openQuickAdd) })
  }

  async function saveRecord(kind, values, options = {}) {
    if (kind === 'story') {
      const eras = Array.isArray(values.custom_eras) && values.custom_eras.length
        ? values.custom_eras.map((era, index) => ({ id: era.id || `era-${index + 1}`, name: era.name.trim(), start_year: Number(era.start_year) || 1 }))
        : DEFAULT_CUSTOM_ERAS
      const storyRow = { title: values.title.trim(), summary: values.summary.trim(), calendar_mode: values.calendar_mode || 'gregorian', custom_eras: eras, user_id: user.id }
      let result
      if (values.id) result = await supabase.from('stories').update(storyRow).eq('id', values.id).eq('updated_at', values.updated_at).select().maybeSingle()
      else result = await supabase.from('stories').insert(storyRow).select().single()
      if (result.error) throw result.error
      if (!result.data) throw new Error('这条故事信息已在另一台设备上更新，请重新打开后再编辑。')
      await refreshStories()
      setSelectedStoryId(result.data.id)
      setNotice({ type: 'success', text: values.id ? '故事信息已更新。' : '新故事已创建。' })
      return
    }
    if (!selectedStoryId) throw new Error('请先选择一个故事项目。')

    if (calendarMode === 'custom' && (kind === 'event' || kind === 'character')) {
      const prefixes = kind === 'event' ? ['event'] : ['birth', 'death']
      const updatedEras = [...customEras]
      let erasChanged = false
      for (const prefix of prefixes) {
        const eraName = String(values[`${prefix}_era_name`] || '').trim()
        const hasParts = Boolean(values[`${prefix}_year`] || values[`${prefix}_month`] || values[`${prefix}_day`])
        if (!eraName && !hasParts) {
          values[`${prefix}_era_id`] = null
          delete values[`${prefix}_era_name`]
          continue
        }
        const requestedName = eraName || updatedEras[0]?.name || '故事纪年'
        let era = updatedEras.find(item => item.name.trim().toLocaleLowerCase() === requestedName.toLocaleLowerCase())
        if (!era) {
          era = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `era-${Date.now()}-${prefix}`,
            name: requestedName,
            start_year: suggestEraStartYear(updatedEras, events, characters),
          }
          updatedEras.push(era)
          erasChanged = true
        }
        values[`${prefix}_era_id`] = era.id
        delete values[`${prefix}_era_name`]
      }
      if (erasChanged) {
        const { data, error } = await supabase.from('stories').update({ custom_eras: updatedEras })
          .eq('id', selectedStoryId).eq('updated_at', selectedStory.updated_at).select().maybeSingle()
        if (error) throw error
        if (!data) throw new Error('故事时代列表已在另一台设备上更新，请重新打开后再保存。')
        setStories(current => current.map(story => story.id === data.id ? data : story))
      }
    }

    const customDatePrefixes = kind === 'character' ? ['birth', 'death'] : kind === 'event' ? ['event'] : []
    for (const prefix of customDatePrefixes) {
      const eraKey = `${prefix}_era_id`
      if (values[eraKey] === '') values[eraKey] = null
      for (const part of ['year', 'month', 'day']) {
        const key = `${prefix}_${part}`
        if (values[key] === '') values[key] = null
        else if (values[key] !== undefined && values[key] !== null) values[key] = Number(values[key])
      }
    }

    const table = kind === 'character' ? 'characters' : kind === 'event' ? 'timeline_events' : 'relationships'
    const { id, characterIds, updated_at: version, ...fields } = values
    delete fields.created_at
    delete fields.story_id
    delete fields.user_id
    if (kind === 'event') fields.event_date ||= null
    const row = { ...fields, story_id: selectedStoryId, user_id: user.id }
    let result
    if (id) result = await supabase.from(table).update(row).eq('id', id).eq('story_id', selectedStoryId).eq('updated_at', version).select().maybeSingle()
    else result = await supabase.from(table).insert(row).select().single()
    if (result.error) throw result.error
    if (!result.data) throw new Error('这条资料已在另一台设备上更新，请重新打开后再编辑。')

    if (kind === 'event') {
      const eventId = result.data.id
      if (id) {
        const { error } = await supabase.from('event_characters').delete().eq('timeline_event_id', eventId).eq('story_id', selectedStoryId)
        if (error) throw error
      }
      if (characterIds?.length) {
        const { error } = await supabase.from('event_characters').insert(characterIds.map(characterId => ({
          story_id: selectedStoryId,
          user_id: user.id,
          timeline_event_id: eventId,
          character_id: characterId,
        })))
        if (error) throw error
      }
    }
    setReloadKey(value => value + 1)
    if (!options.quiet) setNotice({ type: 'success', text: kind === 'character' ? '人物资料已保存。' : kind === 'event' ? '时间线事件已保存。' : '人物关系已保存。' })
    return result.data
  }

  async function deleteRecord(kind, record) {
    const labels = { story: '故事项目', character: '人物', event: '事件', relationship: '关系' }
    if (!window.confirm(`确定删除${labels[kind]}“${record.title || record.name || `${characterById[record.source_character_id]?.name || '人物'}与${characterById[record.target_character_id]?.name || '人物'}`}”吗？`)) return
    const table = kind === 'story' ? 'stories' : kind === 'character' ? 'characters' : kind === 'event' ? 'timeline_events' : 'relationships'
    const { error } = await supabase.from(table).delete().eq('id', record.id)
    if (error) {
      setNotice({ type: 'error', text: error.message || '删除失败，请重试。' })
      return
    }
    if (kind === 'story') {
      await refreshStories()
      setNotice({ type: 'success', text: '故事项目已删除。' })
    } else {
      setReloadKey(value => value + 1)
      setNotice({ type: 'success', text: `${labels[kind]}已删除。` })
    }
  }

  async function updateStoryCalendarMode(nextMode) {
    if (!selectedStory || selectedStory.calendar_mode === nextMode) return
    const { data, error } = await supabase.from('stories').update({ calendar_mode: nextMode })
      .eq('id', selectedStory.id).eq('updated_at', selectedStory.updated_at).select().maybeSingle()
    if (error) throw error
    if (!data) throw new Error('故事信息已在另一台设备上更新，请重新打开后再切换时间方式。')
    setStories(current => current.map(story => story.id === data.id ? data : story))
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setNotice({ type: 'error', text: error.message || '退出登录失败。' })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup sidebar-brand"><span className="brand-mark">叙</span><span>叙事图谱<small>STORY ATLAS</small></span></div>
        <div className="side-section-label">你的故事</div>
        <div className="story-switcher">
          <select aria-label="切换故事项目" value={selectedStoryId || ''} onChange={event => setSelectedStoryId(event.target.value || null)}>
            <option value="">选择故事</option>
            {stories.map(story => <option key={story.id} value={story.id}>{story.title}</option>)}
          </select>
          <button className="icon-button add-story" aria-label="新建故事" title="新建故事" onClick={() => beginCreate('story')}>＋</button>
        </div>
        {selectedStory && <p className="sidebar-summary">{selectedStory.summary || '为这个故事写一句简介。'}</p>}

        <div className="side-section-label workspace-label">工作区</div>
        <nav className="primary-nav" aria-label="工作区导航">
          <button className={tab === 'timeline' ? 'active' : ''} onClick={() => setTab('timeline')}><span className="nav-glyph">↗</span>时间线<span className="nav-count">{events.length}</span></button>
          <button className={tab === 'characters' ? 'active' : ''} onClick={() => setTab('characters')}><span className="nav-glyph">◉</span>人物<span className="nav-count">{characters.length}</span></button>
          <button className={tab === 'relationships' ? 'active' : ''} onClick={() => setTab('relationships')}><span className="nav-glyph">⌘</span>关系<span className="nav-count">{relationships.length}</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="sync-indicator"><span className={syncStatus === 'error' ? 'sync-error' : ''} />{syncStatus === 'connected' ? '云端实时同步已连接' : syncStatus === 'error' ? '实时连接中断' : '正在连接云端'}</div>
          <div className="account-row"><div className="avatar-circle">{user.email?.slice(0, 1).toUpperCase() || '我'}</div><div className="account-copy"><strong>{user.email}</strong><small>个人创作空间</small></div><button className="icon-button signout-button" title="退出登录" onClick={signOut}>↗</button></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumbs"><span>故事工作台</span><i>/</i><strong>{selectedStory?.title || '新建你的第一个故事'}</strong></div>
          <div className="topbar-right"><span className="cloud-label"><span className={syncStatus === 'error' ? 'sync-error' : ''} /> {syncStatus === 'connected' ? '云端已连接' : syncStatus === 'error' ? '连接中断' : '正在同步'}</span><span className="topbar-date">创作空间</span></div>
        </header>
        {notice && !selectedStory && <div className={`notice ${notice.type} outside-notice`} role="status"><span>{notice.type === 'error' ? '!' : '✓'}</span>{notice.text}<button aria-label="关闭提示" onClick={() => setNotice(null)}>×</button></div>}

        {!selectedStory && !storyLoading ? (
          <section className="welcome-empty">
            <div className="empty-orbit"><span>叙</span><i /><b /></div>
            <p className="eyebrow">从一个故事开始</p>
            <h1>让人物与时间，<br />彼此找到位置。</h1>
            <p>创建故事项目，然后逐步添加人物、事件和他们之间的关系。</p>
            <button className="button button-primary" onClick={() => beginCreate('story')}>＋　新建故事项目</button>
          </section>
        ) : (
          <div className="content-wrap">
            <section className="page-heading">
              <div>
                <p className="eyebrow">{tab === 'timeline' ? 'CHRONOLOGY · 故事进程' : tab === 'characters' ? 'CAST · 人物档案' : 'CONNECTIONS · 人物网络'}</p>
                <h1>{tab === 'timeline' ? '时间线' : tab === 'characters' ? '人物' : '关系图谱'}</h1>
                <p className="heading-description">{tab === 'timeline' ? '把每个重要时刻放回正确的位置。' : tab === 'characters' ? '整理人物信息，随时核对他们的年龄与经历。' : '记录人物之间的关系，以及它们如何变化。'}</p>
              </div>
              <div className="heading-actions">
                {tab === 'timeline' && <button className="button button-secondary" onClick={() => beginCreate('character')}>＋ 添加人物</button>}
                <button className="button button-primary" onClick={() => beginCreate(tab === 'timeline' ? 'event' : tab === 'characters' || characters.length < 2 ? 'character' : 'relationship')}>
                  ＋ {tab === 'timeline' ? '添加事件' : tab === 'characters' || characters.length < 2 ? '添加人物' : '添加关系'}
                </button>
                <button className="icon-button story-more" title="编辑故事信息" onClick={() => beginEdit('story', selectedStory)}>•••</button>
              </div>
            </section>

            <section className="summary-strip" aria-label="故事概览">
              <div><span>人物</span><strong>{characters.length.toString().padStart(2, '0')}</strong></div>
              <div><span>时间线事件</span><strong>{events.length.toString().padStart(2, '0')}</strong></div>
              <div><span>人物关系</span><strong>{relationships.length.toString().padStart(2, '0')}</strong></div>
              <div className="summary-note"><span className="summary-mark">✳</span><span>{selectedStory?.summary || '故事的细节，正从这里长出来。'}</span></div>
            </section>

            {notice && <div className={`notice ${notice.type}`} role="status"><span>{notice.type === 'error' ? '!' : '✓'}</span>{notice.text}<button aria-label="关闭提示" onClick={() => setNotice(null)}>×</button></div>}
            {dataLoading || storyLoading ? <div className="loading-line"><span className="spinner" />正在整理故事资料…</div> : (
              <>
                {tab === 'timeline' && <TimelineView events={visibleEvents} allEvents={events} characters={characters} characterById={characterById} linksByEvent={linksByEvent} search={search} setSearch={setSearch} characterFilter={characterFilter} setCharacterFilter={setCharacterFilter} calendarMode={calendarMode} eras={customEras} onEdit={(record, options) => beginEdit('event', record, options)} onDelete={record => deleteRecord('event', record)} onAdd={addEventAtEnd} onInsert={preset => beginCreate('event', preset)} />}
                {tab === 'characters' && <CharactersView characters={characters} events={events} linksByEvent={linksByEvent} calendarMode={calendarMode} eras={customEras} onEdit={record => beginEdit('character', record)} onDelete={record => deleteRecord('character', record)} onAdd={() => beginCreate('character')} />}
                {tab === 'relationships' && <RelationshipsView relationships={relationships} characterById={characterById} characters={characters} onEdit={record => beginEdit('relationship', record)} onDelete={record => deleteRecord('relationship', record)} onAdd={() => beginCreate('relationship')} onAddCharacter={() => beginCreate('character')} />}
              </>
            )}
            <footer className="page-footer"><span>叙事图谱</span><span>人物、时间与故事之间</span></footer>
          </div>
        )}
      </main>

      {editor && <EditorDialog key={`${editor.kind}-${editor.record?.id || 'new'}`} kind={editor.kind} record={editor.record} characters={characters} events={events} calendarMode={calendarMode} eras={customEras} openQuickAdd={editor.openQuickAdd} onChangeCalendarMode={updateStoryCalendarMode} onAddCharacter={values => saveRecord('character', values, { quiet: true })} onClose={() => setEditor(null)} onSave={async values => { await saveRecord(editor.kind, values); setEditor(null) }} />}
      {!notice && <div className="sr-only" aria-live="polite">{dataLoading ? '正在同步' : '已同步'}</div>}
    </div>
  )
}

function TimelineView({ events, allEvents, characters, characterById, linksByEvent, search, setSearch, characterFilter, setCharacterFilter, calendarMode = 'gregorian', eras = [], onEdit, onDelete, onAdd, onInsert }) {
  const [sortDirection, setSortDirection] = useState('asc')
  const displayedEvents = [...events].sort((a, b) => {
    const aHasDate = hasStoryDate(a, 'event', calendarMode, eras)
    const bHasDate = hasStoryDate(b, 'event', calendarMode, eras)
    if (aHasDate !== bHasDate) return aHasDate ? -1 : 1
    const dateOrder = compareStoryDates(a, 'event', b, 'event', calendarMode, eras) || 0
    const order = dateOrder || (Number(a.order_index) || 0) - (Number(b.order_index) || 0)
      || (a.created_at || '').localeCompare(b.created_at || '')
    return sortDirection === 'asc' ? order : -order
  })
  const focusedCharacter = characterById[characterFilter]
  const counts = Object.fromEntries(characters.map(character => [
    character.id,
    allEvents.filter(event => (linksByEvent[event.id] || []).includes(character.id)).length,
  ]))
  function orderIndexBetween(first, second) {
    const firstIndex = Number(first.order_index) || 0
    const secondIndex = Number(second.order_index) || 0
    const lower = Math.min(firstIndex, secondIndex)
    const upper = Math.max(firstIndex, secondIndex)
    const occupied = new Set(allEvents.map(event => Number(event.order_index)).filter(Number.isFinite))
    let candidate = lower + (upper - lower) / 2
    while (candidate > lower && candidate < upper && occupied.has(candidate)) candidate = lower + (candidate - lower) / 2
    return candidate
  }
  return (
    <section className="timeline-section">
      <div className="list-toolbar">
        <div className="timeline-intro"><span className="timeline-intro-mark">01</span><span><strong>事件编年</strong><small>按日期自动排列 · 支持人物专属视角</small></span></div>
        <div className="toolbar-filters"><button className="sort-toggle" aria-pressed={sortDirection === 'asc'} onClick={() => setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc')}>{sortDirection === 'asc' ? '↑ 正序' : '↓ 倒序'}</button><label className="search-field"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索事件" /></label></div>
      </div>
      <div className="perspective-bar">
        <div className="perspective-heading"><strong>人物视角</strong><small>聚焦某个人物，只看与 TA 相关的事件</small></div>
        <div className="perspective-pills">
          <button className={`perspective-pill all-perspective ${characterFilter === 'all' ? 'active' : ''}`} onClick={() => setCharacterFilter('all')}><span className="all-perspective-mark">✳</span>全景<small>{allEvents.length}</small></button>
          {characters.map((character, index) => {
            const color = character.color || CHARACTER_COLORS[index % CHARACTER_COLORS.length]
            return <button key={character.id} className={`perspective-pill ${characterFilter === character.id ? 'active' : ''}`} style={{ '--person-color': color }} onClick={() => setCharacterFilter(character.id)}><i />{character.name}<small>{counts[character.id]}</small></button>
          })}
        </div>
      </div>
      {focusedCharacter && <div className="perspective-status"><span style={{ '--person-color': focusedCharacter.color || CHARACTER_COLORS[characters.indexOf(focusedCharacter) % CHARACTER_COLORS.length] }} />当前聚焦 <strong>{focusedCharacter.name}</strong> 的时间线 · 显示 {events.length} 条关联事件<button onClick={() => setCharacterFilter('all')}>返回全景</button></div>}
      {displayedEvents.length === 0 ? <EmptyState title={focusedCharacter ? `${focusedCharacter.name}还没有关联事件` : '时间线还没有事件'} copy={focusedCharacter ? '为 TA 关联已有事件，或创建一个新的故事时刻。' : '从转折、相遇或一个关键决定开始记录。'} action="添加事件" onAction={() => onAdd(sortDirection)} /> : (
        <div className="timeline-list">
          {focusedCharacter && <div className="age-axis-heading"><div><strong>人物年龄轴</strong><small>{focusedCharacter.name} · 事件发生时</small></div></div>}
          {displayedEvents.map((event, index) => {
            const nextEvent = displayedEvents[index + 1]
            const participantIds = linksByEvent[event.id] || []
            const firstParticipant = characterById[participantIds[0]]
            const accentCharacter = focusedCharacter || firstParticipant
            const accent = accentCharacter?.color || CHARACTER_COLORS[Math.max(0, characters.indexOf(accentCharacter)) % CHARACTER_COLORS.length]
            const eventDate = formatStoryDate(event, 'event', calendarMode, eras)
            const displayEventDate = calendarMode === 'custom' ? eventDate || event.date_label : event.date_label || eventDate
            const secondaryEventDate = calendarMode === 'custom' ? (eventDate && event.date_label ? event.date_label : '') : (event.event_date && event.date_label ? eventDate : '')
            const eventAge = focusedCharacter ? ageAtStoryDate(focusedCharacter, event, calendarMode, eras) : null
            const afterDeath = focusedCharacter && hasStoryDate(focusedCharacter, 'death', calendarMode, eras)
              && isAfterStoryDate(event, 'event', focusedCharacter, 'death', calendarMode, eras)
            const hasEventDate = hasStoryDate(event, 'event', calendarMode, eras)
            const hasBirthDate = focusedCharacter && hasStoryDate(focusedCharacter, 'birth', calendarMode, eras)
            const ageLabel = !hasBirthDate ? '生日待填' : !hasEventDate ? '日期待定' : afterDeath ? '逝世后' : eventAge || '年龄待定'
            return (
              <article className={`timeline-row ${focusedCharacter ? 'with-age-axis' : ''}`} key={event.id} style={{ '--event-accent': accent, '--date-color': event.date_color || DEFAULT_DATE_COLOR, '--person-color': focusedCharacter?.color || accent }}>
                <div className="timeline-marker-column"><span className="timeline-node">{String(index + 1).padStart(2, '0')}</span><span className="timeline-stem" /></div>
                <div className="timeline-date-column"><span className="date-chip">{displayEventDate || '时间待定'}</span>{secondaryEventDate && <small>{secondaryEventDate}</small>}</div>
                <div className="event-card">
                  <div className="event-card-top"><span className="event-kicker">STORY BEAT　/　{String(index + 1).padStart(2, '0')}</span><div className="record-actions"><button onClick={() => onEdit(event)}>编辑</button><button className="danger-text" onClick={() => onDelete(event)}>删除</button></div></div>
                  <h2>{event.title}</h2>
                  {event.description && <p className="event-description">{event.description}</p>}
                  <div className="event-bottom">
                    <div className="participant-list">
                      {participantIds.length ? participantIds.map(id => {
                        const character = characterById[id]
                        if (!character) return null
                        const color = character.color || CHARACTER_COLORS[Math.max(0, characters.indexOf(character)) % CHARACTER_COLORS.length]
                        const age = ageAtStoryDate(character, event, calendarMode, eras)
                        const afterDeath = hasStoryDate(character, 'death', calendarMode, eras)
                          && isAfterStoryDate(event, 'event', character, 'death', calendarMode, eras)
                        return <span className={`person-tag ${afterDeath || age === '出生前' ? 'muted' : ''}`} key={id} style={{ '--person-color': color }}><i>{character.name.slice(0, 1)}</i>{character.name}{age && <small>{age}</small>}{afterDeath && <small>逝世后</small>}</span>
                      }) : <span className="no-participants">尚未关联人物</span>}
                    </div>
                  <button type="button" className="add-participant-button" onClick={() => onEdit(event, { openQuickAdd: true })}>＋ 添加人物</button>
                  {participantIds.some(id => hasStoryDate(characterById[id], 'birth', calendarMode, eras) && !hasEventDate) && <span className="age-hint">补充事件日期后可核对年龄</span>}
                  </div>
                  {nextEvent && <button className="insert-between-event" title={`在「${event.title}」和「${nextEvent.title}」之间插入事件`} aria-label={`在「${event.title}」和「${nextEvent.title}」之间插入事件`} onClick={() => onInsert({ order_index: orderIndexBetween(event, nextEvent) })}>＋ 在两件事之间插入事件</button>}
                </div>
                {focusedCharacter && <div className={`age-axis-column ${ageLabel === '生日待填' || ageLabel === '日期待定' || ageLabel === '年龄待定' ? 'unknown' : ''}`} title={`${focusedCharacter.name}：${ageLabel}`}><span className="age-axis-point" /><strong>{ageLabel}</strong></div>}
              </article>
            )
          })}
          <button className="add-event-row" onClick={() => onAdd(sortDirection)}><span>＋</span>把下一个时刻加入时间线</button>
        </div>
      )}
    </section>
  )
}

function CharactersView({ characters, events, linksByEvent, calendarMode = 'gregorian', eras = [], onEdit, onDelete, onAdd }) {
  if (!characters.length) return <EmptyState title="还没有人物档案" copy="先添加主角，再慢慢补上生日、经历和故事中的位置。" action="添加第一个人物" onAction={onAdd} />
  return (
    <section className="character-grid">
      {characters.map((character, index) => {
        const appearances = events.filter(event => (linksByEvent[event.id] || []).includes(character.id)).length
        const color = character.color || CHARACTER_COLORS[index % CHARACTER_COLORS.length]
        return (
          <article className="character-card" key={character.id} style={{ '--person-color': color }}>
            <div className="character-card-head"><span className="character-emblem" style={{ '--person-color': color }}>{character.name.slice(0, 1)}</span><div className="record-actions"><button onClick={() => onEdit(character)}>编辑</button><button className="danger-text" onClick={() => onDelete(character)}>删除</button></div></div>
            <p className="character-role">{character.role || '故事人物'}</p>
            <h2>{character.name}</h2>
            <p className="character-description">{character.description || '还没有人物简介。为 TA 记下性格、目标或背景。'}</p>
            <div className="character-facts">
               <span><small>出生</small>{formatStoryDate(character, 'birth', calendarMode, eras) || '未填写'}</span>
              <span><small>登场事件</small>{appearances} 个</span>
            </div>
          </article>
        )
      })}
      <button className="new-character-card" onClick={onAdd}><span>＋</span><strong>添加新人物</strong><small>为故事建立一张新档案</small></button>
    </section>
  )
}

function RelationshipsView({ relationships, characterById, characters, onEdit, onDelete, onAdd, onAddCharacter }) {
  const [view, setView] = useState('network')
  if (characters.length < 2) return <EmptyState title="先认识几位人物" copy="至少添加两个人物，才能记录他们之间的关系。" action="添加人物" onAction={onAddCharacter} />
  return (
    <section className="relationship-board">
      <div className="relationship-board-heading"><span className="relationship-board-symbol">⌘</span><div className="relationship-heading-copy"><strong>人物关系</strong><small>沿着人物之间的连线，查看故事中的关系网络。</small></div><div className="relationship-view-toggle" role="group" aria-label="关系显示方式"><button className={view === 'network' ? 'active' : ''} onClick={() => setView('network')}>关系网</button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>明细列表</button></div></div>
      {view === 'network' ? (
        <RelationshipNetwork characters={characters} relationships={relationships} />
      ) : relationships.length ? (
        <div className="relationship-list">
          {relationships.map((relationship, index) => {
            const source = characterById[relationship.source_character_id]
            const target = characterById[relationship.target_character_id]
            if (!source || !target) return null
            return (
              <article className="relationship-row" key={relationship.id}>
                <span className="relationship-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="relationship-person source-person" style={{ '--person-color': source.color || CHARACTER_COLORS[0] }}><i>{source.name.slice(0, 1)}</i><strong>{source.name}</strong></div>
                <div className="relationship-line"><span>{relationship.relationship_type}</span><i /><small>{relationship.start_label || relationship.end_label ? `${relationship.start_label || '起始时间未定'} — ${relationship.end_label || '现在'}` : '时间段未填写'}</small></div>
                <div className="relationship-person target-person" style={{ '--person-color': target.color || CHARACTER_COLORS[1] }}><i>{target.name.slice(0, 1)}</i><strong>{target.name}</strong></div>
                <div className="record-actions"><button onClick={() => onEdit(relationship)}>编辑</button><button className="danger-text" onClick={() => onDelete(relationship)}>删除</button></div>
                {relationship.notes && <p className="relationship-note">{relationship.notes}</p>}
              </article>
            )
          })}
        </div>
      ) : <EmptyState title="人物之间还没有连线" copy="添加关系后，人物网络会在这里呈现。" action="添加第一条关系" onAction={onAdd} />}
      <button className="add-relationship-row" onClick={onAdd}>＋　添加另一条关系</button>
    </section>
  )
}

function RelationshipNetwork({ characters, relationships }) {
  const width = 860
  const height = 480
  const centerX = width / 2
  const centerY = 220
  const radiusX = characters.length === 2 ? 205 : 300
  const radiusY = characters.length === 2 ? 0 : 155
  const positions = Object.fromEntries(characters.map((character, index) => {
    const angle = characters.length === 2 ? Math.PI * index : -Math.PI / 2 + (2 * Math.PI * index) / characters.length
    return [character.id, { x: centerX + radiusX * Math.cos(angle), y: centerY + radiusY * Math.sin(angle) }]
  }))

  return (
    <div className="network-wrap">
      <div className="network-canvas">
        {!relationships.length && <p className="network-empty-note">添加关系后，人物之间会出现连线</p>}
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="人物关系网络图">
          <g className="network-edges">
            {relationships.map(relationship => {
              const source = positions[relationship.source_character_id]
              const target = positions[relationship.target_character_id]
              const sourceCharacter = characters.find(character => character.id === relationship.source_character_id)
              if (!source || !target) return null
              const middleX = (source.x + target.x) / 2
              const middleY = (source.y + target.y) / 2
              return <g key={relationship.id}><line x1={source.x} y1={source.y} x2={target.x} y2={target.y} style={{ stroke: sourceCharacter?.color || '#88988d' }} /><rect x={middleX - 47} y={middleY - 12} width="94" height="24" rx="12" /><text x={middleX} y={middleY + 4} textAnchor="middle">{relationship.relationship_type}</text></g>
            })}
          </g>
          <g className="network-nodes">
            {characters.map((character, index) => {
              const position = positions[character.id]
              const color = character.color || CHARACTER_COLORS[index % CHARACTER_COLORS.length]
              return <g key={character.id} transform={`translate(${position.x} ${position.y})`} style={{ '--person-color': color }}><circle className="network-node-halo" r="38" /><circle className="network-node-core" r="20" /><text className="network-node-initial" y="5" textAnchor="middle">{character.name.slice(0, 1)}</text><text className="network-node-name" y="58" textAnchor="middle">{character.name}</text></g>
            })}
          </g>
        </svg>
      </div>
      <div className="network-legend">{characters.map((character, index) => <span key={character.id}><i style={{ background: character.color || CHARACTER_COLORS[index % CHARACTER_COLORS.length] }} />{character.name}</span>)}<small>{relationships.length} 条关系</small></div>
    </div>
  )
}

function EmptyState({ title, copy, action, onAction }) {
  return <div className="empty-state"><span className="empty-state-orbit">✳</span><p className="eyebrow">留白也是开始</p><h2>{title}</h2><p>{copy}</p><button className="button button-secondary" onClick={onAction}>＋　{action}</button></div>
}

function EditorDialog({ kind, record, characters, events, calendarMode = 'gregorian', eras = DEFAULT_CUSTOM_ERAS, openQuickAdd = false, onChangeCalendarMode, onAddCharacter, onClose, onSave }) {
  const isEditing = Boolean(record?.id)
  const defaults = {
    story: { title: '', summary: '', calendar_mode: 'gregorian', custom_eras: DEFAULT_CUSTOM_ERAS },
    character: { name: '', role: '', birth_date: '', death_date: '', birth_era_id: '', birth_year: '', birth_month: '', birth_day: '', death_era_id: '', death_year: '', death_month: '', death_day: '', color: CHARACTER_COLORS[characters.length % CHARACTER_COLORS.length], description: '' },
    event: { title: '', event_date: '', event_era_id: '', event_year: '', event_month: '', event_day: '', date_label: '', date_color: DEFAULT_DATE_COLOR, order_index: String(Math.max(0, ...events.map(event => Number(event.order_index) || 0)) + 10), description: '', characterIds: [] },
    relationship: { source_character_id: characters[0]?.id || '', target_character_id: characters[1]?.id || '', relationship_type: '朋友', start_label: '', end_label: '', notes: '' },
  }
  const [form, setForm] = useState({ ...defaults[kind], ...(record || {}) })
  const [busy, setBusy] = useState(false)
  const [modeBusy, setModeBusy] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(openQuickAdd)
  const [quickCharacterBusy, setQuickCharacterBusy] = useState(false)
  const [inlineCharacters, setInlineCharacters] = useState([])
  const [error, setError] = useState('')
  const [quickCharacter, setQuickCharacter] = useState({
    name: '', role: '', color: CHARACTER_COLORS[characters.length % CHARACTER_COLORS.length],
    birth_date: '', death_date: '', birth_era_id: '', birth_year: '', birth_month: '', birth_day: '',
    death_era_id: '', death_year: '', death_month: '', death_day: '', description: '',
  })
  const availableCharacters = [...characters, ...inlineCharacters.filter(person => !characters.some(item => item.id === person.id))]
  const config = {
    story: { title: isEditing ? '编辑故事信息' : '新建故事项目', button: isEditing ? '保存故事' : '创建故事' },
    character: { title: isEditing ? '编辑人物档案' : '添加人物', button: '保存人物' },
    event: { title: isEditing ? '编辑时间线事件' : '添加时间线事件', button: '保存事件' },
    relationship: { title: isEditing ? '编辑人物关系' : '添加人物关系', button: '保存关系' },
  }[kind]

  function update(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function changeCalendarMode(nextMode) {
    if (nextMode === calendarMode || modeBusy) return
    setModeBusy(true)
    setError('')
    try {
      await onChangeCalendarMode(nextMode)
    } catch (modeError) {
      setError(modeError.message || '切换时间方式失败，请重试。')
    } finally {
      setModeBusy(false)
    }
  }

  function toggleCharacter(characterId) {
    const current = form.characterIds || []
    update('characterIds', current.includes(characterId) ? current.filter(id => id !== characterId) : [...current, characterId])
  }

  async function addCharacterToEvent() {
    if (!quickCharacter.name.trim() || quickCharacterBusy) return
    setQuickCharacterBusy(true)
    setError('')
    try {
      const person = await onAddCharacter({ ...quickCharacter, name: quickCharacter.name.trim() })
      if (!person?.id) throw new Error('人物没有成功保存，请重试。')
      setInlineCharacters(current => [...current, person])
      update('characterIds', [...new Set([...(form.characterIds || []), person.id])])
      setQuickCharacter({
        name: '', role: '', color: CHARACTER_COLORS[(characters.length + inlineCharacters.length + 1) % CHARACTER_COLORS.length],
        birth_date: '', death_date: '', birth_era_id: '', birth_year: '', birth_month: '', birth_day: '',
        death_era_id: '', death_year: '', death_month: '', death_day: '', description: '',
      })
      setQuickAddOpen(false)
    } catch (addError) {
      setError(addError.message || '添加人物失败，请重试。')
    } finally {
      setQuickCharacterBusy(false)
    }
  }

  function updateEra(index, changes) {
    const current = Array.isArray(form.custom_eras) && form.custom_eras.length ? form.custom_eras : DEFAULT_CUSTOM_ERAS
    update('custom_eras', current.map((era, eraIndex) => eraIndex === index ? { ...era, ...changes } : era))
  }

  function addEra() {
    const current = Array.isArray(form.custom_eras) && form.custom_eras.length ? form.custom_eras : DEFAULT_CUSTOM_ERAS
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `era-${Date.now()}`
    const dateYears = [
      ...events.map(event => {
        const era = current.find(item => item.id === event.event_era_id)
        return era && Number(event.event_year) > 0 ? (Number(era.start_year) || 1) + Number(event.event_year) - 1 : 0
      }),
      ...characters.flatMap(character => ['birth', 'death'].map(prefix => {
        const era = current.find(item => item.id === character[`${prefix}_era_id`])
        const year = Number(character[`${prefix}_year`])
        return era && year > 0 ? (Number(era.start_year) || 1) + year - 1 : 0
      })),
    ]
    const nextStartYear = Math.max(1, ...current.map(era => Number(era.start_year) || 1), ...dateYears) + 1
    update('custom_eras', [...current, { id, name: '新纪元', start_year: nextStartYear }])
  }

  function moveEra(index, direction) {
    const current = Array.isArray(form.custom_eras) && form.custom_eras.length ? form.custom_eras : DEFAULT_CUSTOM_ERAS
    const target = index + direction
    if (target < 0 || target >= current.length) return
    const reordered = [...current]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    update('custom_eras', reordered)
  }

  function removeEra(id) {
    const current = Array.isArray(form.custom_eras) ? form.custom_eras : DEFAULT_CUSTOM_ERAS
    update('custom_eras', current.filter(era => era.id !== id))
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const values = { ...form }
      if (kind === 'story') {
        const eraList = (Array.isArray(values.custom_eras) && values.custom_eras.length ? values.custom_eras : DEFAULT_CUSTOM_ERAS)
          .map((era, index) => ({ id: era.id || `era-${index + 1}`, name: String(era.name || '').trim(), start_year: Number(era.start_year) }))
        if (values.calendar_mode === 'custom' && !eraList.length) throw new Error('自定义纪年至少需要一个时代。')
        if (eraList.some(era => !era.name || !Number.isInteger(era.start_year) || era.start_year < 1)) throw new Error('请填写每个时代的名称和有效的元年起始年份。')
        if (new Set(eraList.map(era => era.name.toLocaleLowerCase())).size !== eraList.length) throw new Error('时代名称不能重复。')
        values.custom_eras = eraList
      }
      if (kind === 'event') values.order_index = Number(values.order_index) || 0
      if (kind === 'character') {
        values.birth_date ||= null
        values.death_date ||= null
      }
      if (kind === 'event' || kind === 'character') {
        const prefixes = kind === 'event' ? ['event'] : ['birth', 'death']
        for (const prefix of prefixes) {
          const eraId = values[`${prefix}_era_id`]
          const eraName = String(values[`${prefix}_era_name`] || eras.find(era => era.id === eraId)?.name || '').trim()
          const year = values[`${prefix}_year`]
          const month = values[`${prefix}_month`]
          const day = values[`${prefix}_day`]
          if ((month || day) && !year) throw new Error('填写月份或日期时，请同时填写年份。')
          if (year && (!Number.isInteger(Number(year)) || Number(year) < 1)) throw new Error('年份必须是大于或等于 1 的整数。')
          if (month && (!Number.isInteger(Number(month)) || Number(month) < 1 || Number(month) > 12)) throw new Error('月份范围是 1 到 12 的整数。')
          if (day && (!Number.isInteger(Number(day)) || Number(day) < 1 || Number(day) > 31)) throw new Error('日期范围是 1 到 31 的整数。')
          values[`${prefix}_year`] = year ? Number(year) : null
          values[`${prefix}_month`] = month ? Number(month) : null
          values[`${prefix}_day`] = day ? Number(day) : null
          values[`${prefix}_era_name`] = eraName
          values[`${prefix}_era_id`] = eraId || null
        }
      }
      await onSave(values)
    } catch (saveError) {
      setError(saveError.message || '保存失败，请重试。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="dialog-heading"><div><p className="eyebrow">故事工作台　/　资料编辑</p><h2 id="editor-title">{config.title}</h2></div><button className="icon-button dialog-close" aria-label="关闭" onClick={onClose}>×</button></div>
        <form onSubmit={submit}>
          {kind === 'story' && <>
            <Field label="故事名称"><input autoFocus maxLength={120} value={form.title} onChange={event => update('title', event.target.value)} placeholder="例如：雾港来信" required /></Field>
            <Field label="一句话简介" hint="可以之后再补充"><textarea rows="3" maxLength={500} value={form.summary} onChange={event => update('summary', event.target.value)} placeholder="这个故事正在讲述什么？" /></Field>
            <Field label="时间方式" hint="为整个故事选择一种纪年"><select value={form.calendar_mode || 'gregorian'} onChange={event => update('calendar_mode', event.target.value)}><option value="gregorian">现实公历</option><option value="custom">自定义时代与年月日</option></select></Field>
            {form.calendar_mode === 'custom' && <section className="era-settings"><div className="era-settings-heading"><strong>故事时代</strong><button type="button" className="text-button" onClick={addEra}>＋ 添加时代</button></div>
              {(Array.isArray(form.custom_eras) && form.custom_eras.length ? form.custom_eras : DEFAULT_CUSTOM_ERAS).map((era, index) => {
                const uses = events.filter(event => event.event_era_id === era.id).length
                  + characters.filter(character => [character.birth_era_id, character.death_era_id].includes(era.id)).length
                return <div className="era-editor-row" key={era.id}>
                  <Field label={`时代 ${index + 1}`}><input maxLength={60} value={era.name || ''} onChange={event => updateEra(index, { name: event.target.value })} placeholder="例如：星历时代" /></Field>
                  <Field label="元年对应的故事年份" hint="跨时代计算年龄时使用"><input type="number" min="1" step="1" value={era.start_year || ''} onChange={event => updateEra(index, { start_year: event.target.value })} /></Field>
                  <div className="era-order-buttons"><button type="button" disabled={index === 0} title="移到更早的时代" aria-label={`将${era.name}移到更早的时代`} onClick={() => moveEra(index, -1)}>↑</button><button type="button" disabled={index === (form.custom_eras || []).length - 1} title="移到更晚的时代" aria-label={`将${era.name}移到更晚的时代`} onClick={() => moveEra(index, 1)}>↓</button><button type="button" className="remove-era-button" disabled={uses > 0 || (form.custom_eras || []).length <= 1} title={uses ? `有 ${uses} 个日期正在使用此时代` : '删除时代'} onClick={() => removeEra(era.id)}>移除</button></div>
                </div>
              })}
              <p className="field-hint">时代按列表顺序排序（从早到晚），同一时代内再按年、月、日排序。元年对应的故事年份用于跨时代计算人物年龄；新增时代会自动建议起始年份，也可以调整。</p>
              <p className="field-hint">原有公历日期会保留；尚未补录自定义日期的资料会标注“公历”，暂不参与自定义年龄计算。</p>
            </section>}
          </>}
          {kind === 'character' && <>
            <div className="form-grid"><Field label="人物姓名"><input autoFocus maxLength={100} value={form.name} onChange={event => update('name', event.target.value)} placeholder="输入姓名" required /></Field><Field label="身份 / 角色"><input maxLength={100} value={form.role} onChange={event => update('role', event.target.value)} placeholder="主角、导师、叙述者…" /></Field></div>
            <Field label="人物专属颜色" hint="用于人物标签和专属时间线"><div className="color-field"><input type="color" value={form.color || CHARACTER_COLORS[0]} onChange={event => update('color', event.target.value)} /><code>{form.color || CHARACTER_COLORS[0]}</code><span>在时间线中快速识别 TA</span></div></Field>
            {calendarMode === 'custom' ? <><CustomDateFields record={form} prefix="birth" label="出生时间" eras={eras} update={update} /><CustomDateFields record={form} prefix="death" label="去世时间" eras={eras} update={update} /></> : <div className="form-grid"><Field label="出生日期" hint="用于计算事件发生时的年龄"><input type="date" value={form.birth_date || ''} onChange={event => update('birth_date', event.target.value)} /></Field><Field label="去世日期"><input type="date" value={form.death_date || ''} onChange={event => update('death_date', event.target.value)} /></Field></div>}
            <Field label="人物档案" hint="性格、目标、背景或其他创作备注"><textarea rows="4" maxLength={3000} value={form.description} onChange={event => update('description', event.target.value)} placeholder="写下你希望在创作中记住的事…" /></Field>
          </>}
          {kind === 'event' && <>
            <Field label="时间方式（整个故事）" hint="会立即影响全故事的事件排序和人物年龄轴，并自动保存。两种日期分别保留；切换后需补录对应日期，才能按新历法排序和计算年龄。"><div className="calendar-mode-switch" role="group" aria-label="切换本故事的时间方式"><button type="button" className={calendarMode === 'gregorian' ? 'active' : ''} disabled={modeBusy || busy} onClick={() => changeCalendarMode('gregorian')}>现实公历</button><button type="button" className={calendarMode === 'custom' ? 'active' : ''} disabled={modeBusy || busy} onClick={() => changeCalendarMode('custom')}>{modeBusy ? '切换中…' : '自定义纪年'}</button></div></Field>
            <Field label="事件名称"><input autoFocus maxLength={160} value={form.title} onChange={event => update('title', event.target.value)} placeholder="例如：两人在旧车站重逢" required /></Field>
            {calendarMode === 'custom' ? <><CustomDateFields record={form} prefix="event" label="事件时间" eras={eras} update={update} /><Field label="补充时间" hint="可写季节、节气或模糊时间"><input maxLength={100} value={form.date_label || ''} onChange={event => update('date_label', event.target.value)} placeholder="例如：初秋、庆典后数日" /></Field></> : <div className="form-grid"><Field label="精确日期" hint="已知具体日期时填写，可计算人物年龄"><input type="date" value={form.event_date || ''} onChange={event => update('event_date', event.target.value)} /></Field><Field label="故事内日期" hint="可填写纪年、季节或模糊时间"><input maxLength={100} value={form.date_label || ''} onChange={event => update('date_label', event.target.value)} placeholder="例如：王历十二年·初秋" /></Field></div>}
            <Field label="时间文字颜色" hint="只改变这条事件的日期标签颜色"><div className="color-field"><input type="color" value={form.date_color || DEFAULT_DATE_COLOR} onChange={event => update('date_color', event.target.value)} /><code>{form.date_color || DEFAULT_DATE_COLOR}</code><span>用于时间线左侧的日期</span></div></Field>
            <Field label="事件内容"><textarea rows="3" maxLength={3000} value={form.description || ''} onChange={event => update('description', event.target.value)} placeholder="补充事件经过、转折或前因后果…" /></Field>
            <fieldset className="people-picker"><legend className="sr-only">关联人物</legend><div className="people-picker-heading"><span className="people-picker-title">关联人物 <small>可多选</small></span><button type="button" className="text-button" onClick={() => setQuickAddOpen(open => !open)}>＋ 添加人物</button></div>{availableCharacters.length ? <div className="people-options">{availableCharacters.map(character => <label key={character.id} className={(form.characterIds || []).includes(character.id) ? 'selected' : ''}><input type="checkbox" checked={(form.characterIds || []).includes(character.id)} onChange={() => toggleCharacter(character.id)} /><span className="checkbox-mark">✓</span>{character.name}</label>)}</div> : <p className="field-hint">还没有人物，可直接在这里添加。</p>}{quickAddOpen && <div className="quick-character-form"><p className="field-hint">新人物会立即保存到故事；保存事件后完成关联，其他档案可之后补充。</p><div className="form-grid"><Field label="人物姓名"><input autoFocus maxLength={100} value={quickCharacter.name} onChange={event => setQuickCharacter(current => ({ ...current, name: event.target.value }))} placeholder="输入姓名" /></Field><Field label="身份 / 角色"><input maxLength={100} value={quickCharacter.role} onChange={event => setQuickCharacter(current => ({ ...current, role: event.target.value }))} placeholder="主角、导师…（可选）" /></Field></div><Field label="人物专属颜色"><div className="color-field"><input type="color" value={quickCharacter.color} onChange={event => setQuickCharacter(current => ({ ...current, color: event.target.value }))} /><code>{quickCharacter.color}</code><span>用于人物标签和时间线</span></div></Field><div className="quick-character-actions"><button type="button" className="button button-quiet" disabled={quickCharacterBusy} onClick={() => setQuickAddOpen(false)}>取消</button><button type="button" className="button button-secondary" disabled={quickCharacterBusy || !quickCharacter.name.trim()} onClick={addCharacterToEvent}>{quickCharacterBusy ? '添加中…' : '添加并关联'}</button></div></div>}</fieldset>
          </>}
          {kind === 'relationship' && <>
            <div className="form-grid"><Field label="人物 A"><select value={form.source_character_id} onChange={event => update('source_character_id', event.target.value)} required><option value="" disabled>选择人物</option>{characters.map(character => <option key={character.id} value={character.id} disabled={character.id === form.target_character_id}>{character.name}</option>)}</select></Field><Field label="人物 B"><select value={form.target_character_id} onChange={event => update('target_character_id', event.target.value)} required><option value="" disabled>选择人物</option>{characters.map(character => <option key={character.id} value={character.id} disabled={character.id === form.source_character_id}>{character.name}</option>)}</select></Field></div>
            <div className="form-grid"><Field label="关系类型"><select value={form.relationship_type} onChange={event => update('relationship_type', event.target.value)}>{RELATIONSHIP_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field><div className="field-spacer" /></div>
            <div className="form-grid"><Field label="开始时间" hint="可使用故事内纪年"><input value={form.start_label || ''} onChange={event => update('start_label', event.target.value)} placeholder="例如：第一次合作" /></Field><Field label="结束时间"><input value={form.end_label || ''} onChange={event => update('end_label', event.target.value)} placeholder="留空表示仍在持续" /></Field></div>
            <Field label="关系备注"><textarea rows="3" maxLength={2000} value={form.notes || ''} onChange={event => update('notes', event.target.value)} placeholder="这段关系如何开始？是否发生过变化？" /></Field>
          </>}
          {error && <p className="form-message error">{error}</p>}
          <div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose}>取消</button><button type="submit" className="button button-primary" disabled={busy || modeBusy}>{busy ? '保存中…' : config.button}</button></div>
        </form>
      </section>
    </div>
  )
}

function CustomDateFields({ record, prefix, label, eras, update }) {
  const eraName = record[`${prefix}_era_name`] ?? eras.find(era => era.id === record[`${prefix}_era_id`])?.name ?? ''
  return <div className="custom-date-group">
    <strong className="custom-date-group-label">{label}</strong>
    <div className="form-grid custom-date-fields">
      <Field label="时代" hint="可直接输入；新名称会自动加入时代列表"><input maxLength={60} value={eraName} onChange={event => {
        const value = event.target.value
        const match = eras.find(era => era.name.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase())
        update(`${prefix}_era_name`, value)
        update(`${prefix}_era_id`, match?.id || '')
      }} placeholder="例如：王历" /></Field>
      <Field label="年" hint="可留空"><input type="number" min="1" step="1" value={record[`${prefix}_year`] ?? ''} onChange={event => update(`${prefix}_year`, event.target.value)} placeholder="例如：12" /></Field>
      <Field label="月" hint="可留空"><input type="number" min="1" max="12" step="1" value={record[`${prefix}_month`] ?? ''} onChange={event => update(`${prefix}_month`, event.target.value)} placeholder="1–12" /></Field>
      <Field label="日" hint="可留空"><input type="number" min="1" max="31" step="1" value={record[`${prefix}_day`] ?? ''} onChange={event => update(`${prefix}_day`, event.target.value)} placeholder="1–31" /></Field>
    </div>
  </div>
}

function Field({ label, hint, children }) {
  return <label className="form-field"><span>{label}{hint && <small>{hint}</small>}</span>{children}</label>
}

export default App
