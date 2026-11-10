export const STORAGE_KEY = 'daynote.todos.v1'
export const MAX_TITLE_LENGTH = 200

export function initialTasks() {
  return [
    { id: 'sample-1', title: '클라우드 컴퓨팅 과제 정리하기', completed: false },
    { id: 'sample-2', title: 'React 컴포넌트 복습하기', completed: false },
    { id: 'sample-3', title: '팀 프로젝트 회의 준비', completed: true },
    { id: 'sample-4', title: '가볍게 산책하기', completed: false },
  ]
}

const normalize = (text) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('ko-KR')

export function addTask(tasks, title, id = crypto.randomUUID()) {
  const cleaned = title.trim().replace(/\s+/g, ' ')
  if (!cleaned) return { tasks, text: '추가할 일정 이름을 입력해 주세요.' }
  if (cleaned.length > MAX_TITLE_LENGTH) {
    return { tasks, text: `일정 이름은 ${MAX_TITLE_LENGTH}자 이내로 입력해 주세요.` }
  }
  if (tasks.some((task) => normalize(task.title) === normalize(cleaned))) {
    return { tasks, text: `“${cleaned}” 일정이 이미 있어요.` }
  }
  return {
    tasks: [{ id, title: cleaned, completed: false }, ...tasks],
    text: `“${cleaned}” 일정을 추가했어요. 하나씩 함께 해봐요!`,
  }
}

function extractTitle(text) {
  let title = text.replace(/^(?:일정|할\s*일|todo)\s*[:：]?\s*/i, '').trim()
  title = title.replace(/(?:을|를)$/, '').trim()
  if (/^["'“‘「].*["'”’」]$/u.test(title)) title = title.slice(1, -1).trim()
  return title
}

function findTasks(tasks, title) {
  const query = normalize(title)
  if (!query) return []
  const exact = tasks.filter((task) => normalize(task.title) === query)
  return exact.length ? exact : tasks.filter((task) => normalize(task.title).includes(query))
}

function listReply(tasks, status) {
  const listed = status === 'all' ? tasks : tasks.filter((task) => task.completed === (status === 'done'))
  const label = status === 'done' ? '완료한 일정' : status === 'active' ? '미완료 일정' : '전체 일정'
  return {
    tasks,
    text: listed.length ? `${label}은 ${listed.length}개예요.` : `${label}이 없어요.`,
    items: listed.map(({ id, title, completed }) => ({ id, title, completed })),
  }
}

export function runCommand(input, tasks, id) {
  const text = input.trim().replace(/[.!?。！？]+$/, '').trim()
  const request = '(?:\\s*(?:해\\s*(?:줘|주세요|줄래(?:요)?)|해주세요|부탁해(?:요)?))?'
  const add = text.match(new RegExp(`^(.*?)\\s*(?:추가|등록)${request}$`, 'i'))
  if (add) return addTask(tasks, extractTitle(add[1]), id)

  const remove = text.match(new RegExp(`^(.*?)\\s*(?:삭제${request}|지워\\s*(?:줘|주세요)?)$`, 'i'))
  const complete = text === '미완료' ? null : text.match(new RegExp(`^(.*?)\\s*완료(?:\\s*처리)?${request}$`, 'i'))
  if (remove || complete) {
    const title = extractTitle((remove || complete)[1])
    if (!title) return { tasks, text: `어떤 일정을 ${remove ? '삭제' : '완료'}할까요? 일정 이름도 함께 적어 주세요.` }
    const matches = findTasks(tasks, title)
    if (!matches.length) return { tasks, text: `“${title}” 일정을 찾지 못했어요. 일정 이름을 확인해 주세요.` }
    if (matches.length > 1) {
      return { tasks, text: '이름이 비슷한 일정이 여러 개 있어요. 아래에서 정확한 이름을 골라 다시 입력해 주세요.', items: matches }
    }
    const target = matches[0]
    if (remove) {
      return { tasks: tasks.filter((task) => task.id !== target.id), text: `“${target.title}” 일정을 삭제했어요.` }
    }
    return {
      tasks: tasks.map((task) => task.id === target.id ? { ...task, completed: true } : task),
      text: target.completed ? `“${target.title}” 일정은 이미 완료했어요.` : `“${target.title}” 일정을 완료했어요. 수고하셨어요!`,
    }
  }

  if (/(미\s*완료|남은|남아|아직|안\s*한|안\s*끝|안\s*했|해야\s*할|하지\s*(?:않|못)|완료되지|끝나지)/.test(text)) {
    return listReply(tasks, 'active')
  }
  if (/(완료|끝낸|끝난|마친|다\s*한)/.test(text)) return listReply(tasks, 'done')
  if (/(전체|모든|목록|리스트|일정.*(?:알려|보여)|할\s*일.*(?:알려|보여))/.test(text)) {
    return listReply(tasks, 'all')
  }
  if (/^(?:안녕|안녕하세요|반가워|안녕하십니까)/.test(text)) {
    return { tasks, text: '안녕하세요! 오늘 할 일을 함께 정리해요. “미완료 일정 알려줘”라고 물어보세요.' }
  }
  return {
    tasks,
    text: '이렇게 말해 보세요.\n• 완료한 일정 알려줘\n• 미완료 일정 알려줘\n• 일정 보고서 제출 추가해줘\n• 일정 보고서 제출 삭제해줘\n• 일정 보고서 제출 완료해줘',
  }
}

export function readTasks(storage) {
  try {
    const saved = storage.getItem(STORAGE_KEY)
    if (saved === null) return initialTasks()
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every((task) => task && typeof task.id === 'string' && typeof task.title === 'string' && task.title.trim() && typeof task.completed === 'boolean')) {
      return initialTasks()
    }
    const ids = new Set()
    return parsed.filter((task) => {
      if (ids.has(task.id)) return false
      ids.add(task.id)
      return true
    })
  } catch {
    return initialTasks()
  }
}
