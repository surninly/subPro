import test from 'node:test'
import assert from 'node:assert/strict'
import { addTask, initialTasks, MAX_TITLE_LENGTH, readTasks, runCommand, STORAGE_KEY } from '../src/todo.js'

const sample = () => [
  { id: 'a', title: '보고서 제출', completed: false },
  { id: 'b', title: 'React 공부', completed: true },
  { id: 'c', title: '운동하기', completed: false },
]

test('완료·미완료·전체 조회는 현재 목록을 정확히 반환한다', () => {
  for (const phrase of ['미완료 일정 알려줘', '아직 안 한 일정 보여줘', '남은 일정', '미완료']) {
    const tasks = sample()
    const reply = runCommand(phrase, tasks)
    assert.deepEqual(reply.items.map((item) => item.id), ['a', 'c'], phrase)
    assert.equal(reply.tasks, tasks)
  }
  assert.deepEqual(runCommand('완료한 일정 알려줘', sample()).items.map((item) => item.id), ['b'])
  assert.equal(runCommand('전체 일정 보여줘', sample()).items.length, 3)
})

test('다양한 공백·조사·따옴표가 있는 추가 명령을 처리한다', () => {
  for (const phrase of ['일정 장보기 추가해줘', '일정 장보기를 추가 해줘', '장보기 등록해주세요', '일정 “장보기” 추가해 주세요!', '  일정   장보기   추가해줘  ']) {
    const original = sample()
    const result = runCommand(phrase, original, 'new')
    assert.deepEqual(result.tasks[0], { id: 'new', title: '장보기', completed: false }, phrase)
    assert.equal(result.tasks.length, 4)
    assert.equal(original.length, 3)
  }
})

test('빈 이름, 너무 긴 이름, 중복 이름은 추가하지 않는다', () => {
  const tasks = sample()
  for (const title of ['', '  ', 'a'.repeat(MAX_TITLE_LENGTH + 1), '보고서   제출', 'react 공부']) {
    assert.equal(addTask(tasks, title).tasks, tasks)
  }
  assert.equal(runCommand('일정 추가해줘', tasks).tasks, tasks)
})

test('삭제는 공백과 조사를 처리하고 원본 배열을 변경하지 않는다', () => {
  for (const phrase of ['일정 보고서 제출 삭제해줘', '일정 보고서 제출을 삭제 해줘', '보고서 제출 지워줘', '일정 “보고서 제출” 삭제해주세요']) {
    const original = sample()
    const result = runCommand(phrase, original)
    assert.deepEqual(result.tasks.map((item) => item.id), ['b', 'c'], phrase)
    assert.equal(original.length, 3)
  }
})

test('정확한 이름이 있으면 우선하고, 부분 일치가 여러 개이면 삭제하지 않는다', () => {
  const tasks = [...sample(), { id: 'd', title: '보고서 제출 준비', completed: false }]
  assert.deepEqual(runCommand('일정 보고서 제출 삭제해줘', tasks).tasks.map((task) => task.id), ['b', 'c', 'd'])
  const ambiguous = runCommand('일정 보고서 삭제해줘', tasks)
  assert.equal(ambiguous.tasks, tasks)
  assert.equal(ambiguous.items.length, 2)
  assert.equal(runCommand('일정 없는 일정 삭제해줘', tasks).tasks, tasks)
  assert.equal(runCommand('일정 삭제해줘', tasks).tasks, tasks)
})

test('일정 추가 → 완료 → 조회 → 삭제가 같은 데이터에 반영된다', () => {
  const original = sample()
  let result = runCommand('일정 테스트 작성 추가해줘', original, 'test')
  result = runCommand('일정 테스트 작성 완료해줘', result.tasks)
  assert.equal(result.tasks.find((task) => task.id === 'test').completed, true)
  assert.equal(runCommand('완료한 일정 알려줘', result.tasks).items.length, 2)
  result = runCommand('일정 테스트 작성 삭제해줘', result.tasks)
  assert.deepEqual(result.tasks, original)
})

test('빈 목록, 도움말, 인사와 HTML 같은 문자열도 안전한 텍스트로 처리한다', () => {
  assert.match(runCommand('미완료 일정 알려줘', []).text, /없어요/)
  assert.match(runCommand('완료한 일정 알려줘', []).text, /없어요/)
  assert.match(runCommand('안녕', []).text, /안녕하세요/)
  assert.match(runCommand('도움말', []).text, /추가해줘/)
  assert.equal(runCommand('일정 <script>alert(1)</script> 추가해줘', [], 'safe').tasks[0].title, '<script>alert(1)</script>')
})

test('저장된 빈 배열과 완료 상태를 유지하며 잘못된 저장 데이터는 복구한다', () => {
  const storage = (value) => ({ getItem: (key) => { assert.equal(key, STORAGE_KEY); return value } })
  assert.deepEqual(readTasks(storage('[]')), [])
  assert.deepEqual(readTasks(storage(JSON.stringify(sample()))), sample())
  for (const invalid of [null, '{', '{}', '[null]', '[{"id":"x","title":"x"}]']) {
    assert.deepEqual(readTasks(storage(invalid)), initialTasks())
  }
  assert.deepEqual(readTasks({ getItem: () => { throw new Error('blocked') } }), initialTasks())
  assert.equal(readTasks(storage(JSON.stringify([sample()[0], sample()[0]]))).length, 1)
})
