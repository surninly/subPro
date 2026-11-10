import { useEffect, useMemo, useRef, useState } from 'react'
import { addTask, MAX_TITLE_LENGTH, readTasks, runCommand, STORAGE_KEY } from './todo.js'

const icons = {
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  circle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  done: 'M21 11.1V12a9 9 0 1 1-5.3-8.2M21 4l-9 9-3-3',
  chat: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z',
  bot: 'M12 3v3M10 3h4M5 8h14v12H5zM2 12v4M22 12v4M9 12h.01M15 12h.01M9 16h6',
  arrow: 'M7 17 17 7M7 7h10v10',
  send: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13',
  trash: 'M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7',
  search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  calendar: 'M4 5h16v16H4zM16 3v4M8 3v4M4 11h16',
  spark: 'm12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6L12 3Z',
}

function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={icons[name]} /></svg>
}

const filters = [
  { id: 'all', label: '전체 일정', icon: 'list' },
  { id: 'active', label: '미완료 일정', icon: 'circle' },
  { id: 'done', label: '완료한 일정', icon: 'done' },
]

function Sidebar({ filter, setFilter, counts, storageError }) {
  return <aside className="sidebar">
    <a className="brand" href="#main" aria-label="데이노트 홈"><span className="brand-icon"><Icon name="check" size={24} /></span>daynote<span className="brand-dot">.</span></a>
    <div className="workspace-label">MY WORKSPACE</div>
    <nav className="sidebar-nav" aria-label="일정 필터">
      {filters.map((item) => <button key={item.id} className={`nav-item ${filter === item.id ? 'selected' : ''}`} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
        <Icon name={item.icon} /><span>{item.label}</span><span className="nav-count">{counts[item.id]}</span>
      </button>)}
    </nav>
    <div className="sidebar-tip"><span className="tip-icon"><Icon name="spark" /></span><h3>말 한마디로 간편하게</h3><p>오른쪽 챗봇에게<br />일정 관리를 맡겨보세요.</p><a href="#chat">챗봇과 대화하기 <Icon name="arrow" size={16} /></a></div>
    <div className="storage-note"><span className={storageError ? 'status-dot warning' : 'status-dot'} /><span>{storageError ? '현재 탭에서만 저장 중' : '이 브라우저에 자동 저장'}</span></div>
    <div className="sidebar-footer"><span className="avatar">ME</span><div><strong>나의 워크스페이스</strong><small>오늘도, 나의 속도로</small></div></div>
  </aside>
}

function StatCard({ label, value, icon, color, note }) {
  return <div className="stat-card"><div><span className="stat-label">{label}</span><div className="stat-number">{value}<span>개</span></div><span className="stat-note">{note}</span></div><span className={`stat-icon ${color}`}><Icon name={icon} size={24} /></span></div>
}

function TodoPanel({ tasks, setTasks, filter, setFilter, counts, notify }) {
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const filtered = tasks.filter((task) => (filter === 'all' || task.completed === (filter === 'done')) && task.title.toLocaleLowerCase('ko-KR').includes(search.toLocaleLowerCase('ko-KR').trim()))

  function submit(event) {
    event.preventDefault()
    const result = addTask(tasks, title)
    setTasks(result.tasks)
    notify(result.text)
    if (result.tasks !== tasks) { setTitle(''); setFilter('all'); setSearch('') }
  }

  return <section className="todo-panel panel" aria-labelledby="todo-heading">
    <div className="panel-heading"><div><span className="eyebrow">ONE STEP AT A TIME</span><h2 id="todo-heading">나의 할 일 <span className="heading-count">{counts.all}</span></h2></div><span className="heading-icon"><Icon name="list" /></span></div>
    <form className="add-form" onSubmit={submit}>
      <Icon name="plus" /><input aria-label="새 일정" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={preventComposingSubmit} maxLength={MAX_TITLE_LENGTH} placeholder="어떤 일을 계획하고 있나요?" required /><button type="submit" className="add-button">추가</button>
    </form>
    <div className="todo-toolbar"><div className="filter-tabs" aria-label="목록 필터">{filters.map((item) => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.id === 'all' ? '전체' : item.id === 'active' ? '미완료' : '완료'} <span>{counts[item.id]}</span></button>)}</div><span className="result-count">{filtered.length}개의 일정</span></div>
    <div className="search-box"><Icon name="search" size={17} /><input aria-label="일정 검색" placeholder="일정 검색" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <ul className="task-list">
      {filtered.map((task) => <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
        <label className="task-label"><input type="checkbox" checked={task.completed} onChange={() => setTasks(tasks.map((item) => item.id === task.id ? { ...item, completed: !item.completed } : item))} /><span className="custom-check"><Icon name="check" size={14} /></span><span className="task-title">{task.title}</span></label>
        <span className={`task-badge ${task.completed ? 'badge-done' : ''}`}>{task.completed ? '완료' : '진행 전'}</span><button className="delete-button" aria-label={`${task.title} 삭제`} onClick={() => { setTasks(tasks.filter((item) => item.id !== task.id)); notify(`“${task.title}” 일정을 삭제했어요.`) }}><Icon name="trash" size={17} /></button>
      </li>)}
    </ul>
    {!filtered.length && <div className="empty-state"><span><Icon name={filter === 'done' ? 'done' : 'list'} size={28} /></span><h3>{search ? '검색 결과가 없어요' : filter === 'done' ? '완료한 일정이 아직 없어요' : filter === 'active' ? '모든 일정을 마쳤어요!' : '새로운 하루를 계획해 볼까요?'}</h3><p>{search ? '다른 단어로 검색해 보세요.' : '위 입력창이나 챗봇으로 일정을 추가할 수 있어요.'}</p></div>}
    <div className="todo-bottom"><Icon name="check" size={16} /><span>작은 완료가 모여, 멋진 하루가 돼요.</span></div>
  </section>
}

function preventComposingSubmit(event) {
  if (event.key === 'Enter' && event.nativeEvent.isComposing) event.preventDefault()
}

function ChatPanel({ tasks, setTasks, notify }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'bot', text: '안녕하세요! 나만의 일정 도우미예요. 👋\n일정을 추가하거나 삭제하고, 완료한 일과 남은 일을 물어보세요.' }])
  const log = useRef(null)
  useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight }, [messages])

  function send(text) {
    const cleaned = text.trim()
    if (!cleaned) return
    const result = runCommand(cleaned, tasks)
    setTasks(result.tasks)
    setMessages((previous) => [...previous.slice(-78), { id: crypto.randomUUID(), role: 'user', text: cleaned }, { id: crypto.randomUUID(), role: 'bot', text: result.text, items: result.items }])
    if (result.tasks !== tasks) notify(result.text)
    setInput('')
  }

  return <section id="chat" className="chat-panel panel" aria-labelledby="chat-heading">
    <div className="chat-heading"><span className="bot-avatar"><Icon name="bot" size={24} /></span><div><h2 id="chat-heading">나의 일정 도우미</h2><span className="bot-status"><i />언제든 이야기해 주세요</span></div><span className="chat-label">챗봇</span></div>
    <div className="chat-log" ref={log} role="log" aria-label="챗봇 대화" aria-live="polite" aria-relevant="additions">
      <div className="chat-date">오늘의 대화</div>
      {messages.map((message) => <div className={`message-row ${message.role}`} key={message.id}>
        {message.role === 'bot' && <span className="message-avatar"><Icon name="spark" size={15} /></span>}
        <div className="message-content">{message.role === 'bot' && <span className="message-name">데이노트</span>}<div className="message-bubble"><p>{message.text}</p>{message.items?.length > 0 && <ul className="chat-task-list">{message.items.map((item) => <li key={item.id}><span className={item.completed ? 'mini-check done' : 'mini-check'}>{item.completed ? '✓' : '○'}</span><span>{item.title}</span></li>)}</ul>}</div></div>
      </div>)}
    </div>
    <div className="chat-compose"><div className="quick-actions"><button onClick={() => send('완료한 일정 알려줘')}><Icon name="done" size={14} />완료한 일정</button><button onClick={() => send('미완료 일정 알려줘')}><Icon name="circle" size={14} />미완료 일정</button><button onClick={() => send('전체 일정 알려줘')}>전체 보기</button></div>
      <form className="chat-form" onSubmit={(event) => { event.preventDefault(); send(input) }}><input aria-label="챗봇 메시지" placeholder="일정 도우미에게 말해보세요" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={preventComposingSubmit} maxLength={500} required /><button type="submit" aria-label="메시지 보내기" disabled={!input.trim()}><Icon name="send" size={18} /></button></form><p className="chat-caption">Enter 키로 전송 · API 키 없이 바로 사용</p>
    </div>
  </section>
}

export function App() {
  const [tasks, updateTasks] = useState(() => { try { return readTasks(localStorage) } catch { return readTasks({ getItem: () => null }) } })
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [storageError, setStorageError] = useState(false)
  function setTasks(nextTasks) {
    updateTasks(nextTasks)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTasks)); setStorageError(false) } catch { setStorageError(true) }
  }
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(timer) }, [notice])
  const counts = useMemo(() => ({ all: tasks.length, done: tasks.filter((task) => task.completed).length, active: tasks.filter((task) => !task.completed).length }), [tasks])
  const percent = counts.all ? Math.round(counts.done / counts.all * 100) : 0
  const [date] = useState(() => new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()))

  return <div className="app-shell">
    <a className="skip-link" href="#main">본문으로 이동</a>
    <Sidebar filter={filter} setFilter={setFilter} counts={counts} storageError={storageError} />
    <main id="main" className="main-content"><header className="page-top"><span className="breadcrumb">나의 워크스페이스 <span>/</span> 대시보드</span><span className="date-pill"><Icon name="calendar" size={15} />{date}</span></header>
      <section className="welcome"><div><span className="welcome-tag"><span />A LITTLE MORE ORGANIZED</span><h1>오늘의 할 일,<br className="mobile-break" /> 가볍게 시작해요<span>.</span></h1><p>하나씩 체크하고, 챗봇과 함께 하루를 정리해 보세요.</p></div><div className="progress-ring" style={{ '--progress': `${percent * 3.6}deg` }} aria-label={`전체 일정의 ${percent}% 완료`}><div><strong>{percent}<small>%</small></strong><span>오늘의 달성률</span></div></div></section>
      <div className="stats-grid"><StatCard label="전체 일정" value={counts.all} icon="list" color="purple" note="차근차근, 하나씩" /><StatCard label="미완료 일정" value={counts.active} icon="circle" color="orange" note="아직 할 일이 남아 있어요" /><StatCard label="완료한 일정" value={counts.done} icon="done" color="green" note="잘하고 있어요!" /></div>
      <div className="workspace-grid"><TodoPanel tasks={tasks} setTasks={setTasks} filter={filter} setFilter={setFilter} counts={counts} notify={setNotice} /><ChatPanel tasks={tasks} setTasks={setTasks} notify={setNotice} /></div>
      <div className="command-guide"><span className="guide-icon"><Icon name="chat" /></span><div><strong>이렇게 말하면 돼요</strong><p><span>“일정 보고서 제출 추가해줘”</span><i /> <span>“일정 보고서 제출 삭제해줘”</span></p></div><span className="guide-end">말로 더 간편하게 <Icon name="spark" size={16} /></span></div>
      <footer className="page-footer"><span>3-2 클라우드 컴퓨팅 · 챗봇 기능이 있는 TODO 리스트</span><span>Made for your everyday.</span></footer>
    </main>
    <div className={`toast ${notice ? 'visible' : ''}`} role="status">{notice && <><Icon name="check" size={18} /><span>{notice}</span></>}</div>
    {storageError && <div className="storage-warning" role="alert">브라우저 저장소를 사용할 수 없어요. 창을 닫으면 일정이 사라질 수 있어요.</div>}
  </div>
}
