import { useState, useEffect, useLayoutEffect, useRef } from 'react'

const CURRENT_KEY = 'currentWorkout'
const STATUS = { PENDING: 'pending', DONE: 'done', SKIPPED: 'skipped' }

// ====== 从模板构建训练数据 ======
function buildExercises(template) {
  if (!template) return [{ name: '动作1', sets: [{ weight: '', reps: '', status: STATUS.PENDING }] }]
  return template.exercises.map(ex => ({
    name: ex.name,
    sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: String(ex.reps), status: STATUS.PENDING }))
  }))
}

// ====== 计数辅助 ======
function countByStatus(exercises, status) {
  let n = 0
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.status === status) n++
    }
  }
  return n
}

function findNextSkipped(exercises, fromEi, fromSi) {
  for (let i = fromEi; i < exercises.length; i++) {
    const startJ = i === fromEi ? fromSi + 1 : 0
    if (startJ >= exercises[i].sets.length) continue
    for (let j = startJ; j < exercises[i].sets.length; j++) {
      if (exercises[i].sets[j].status === STATUS.SKIPPED) return { exIdx: i, setIdx: j }
    }
  }
  return null
}

function findFirstSkipped(exercises) {
  return findNextSkipped(exercises, 0, -1)
}

export default function Workout({ template, onFinish }) {
  // ====== 状态 ======
  const [exercises, setExercises] = useState(() => buildExercises(template))
  const [exIdx, setExIdx] = useState(0)
  const [setIdx, setSetIdx] = useState(0)
  const [timer, setTimer] = useState(null)
  const [timerDuration, setTimerDuration] = useState(template?.exercises?.[0]?.restSeconds || 60)
  const [showTransition, setShowTransition] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [resumeData, setResumeData] = useState(null)
  const [showEndPage, setShowEndPage] = useState(false)
  const [makeupMode, setMakeupMode] = useState(false)
  const [editExIdx, setEditExIdx] = useState(null) // 进度条编辑面板

  // ====== Refs ======
  const intervalRef = useRef(null)
  const autoDismissRef = useRef(null)
  const scrollPos = useRef(0)
  const timerEl = useRef(null)
  const exRef = useRef({ exIdx, setIdx, exercises, makeupMode, template })

  useLayoutEffect(() => {
    exRef.current = { exIdx, setIdx, exercises, makeupMode, template }
  })

  // ====== 切换动作时同步休息时长 ======
  useEffect(() => {
    const t = template
    if (!t?.exercises?.[exIdx]?.restSeconds) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimerDuration(t.exercises[exIdx].restSeconds)
  }, [exIdx, template])

  // ====== 派生数据 ======
  const ex = exercises[exIdx] || { name: '', sets: [] }
  const currentSet = ex.sets[setIdx] || { weight: '', reps: '', status: STATUS.PENDING }
  const isFirstSetOfEx = setIdx === 0
  const isEmpty = !currentSet.weight || !currentSet.reps
  const buttonDisabled = isFirstSetOfEx && isEmpty
  const isLastSet = setIdx >= ex.sets.length - 1
  const isLastExercise = exIdx >= exercises.length - 1
  let globalSetIndex = 0
  for (let i = 0; i < exIdx; i++) globalSetIndex += exercises[i].sets.length
  globalSetIndex += setIdx + 1
  const skippedCount = countByStatus(exercises, STATUS.SKIPPED)
  const doneCount = countByStatus(exercises, STATUS.DONE)

  // ====== 清理 ======
  function clearAllTimers() {
    clearInterval(intervalRef.current)
    clearTimeout(autoDismissRef.current)
  }

  useEffect(() => () => clearAllTimers(), [])

  // ====== localStorage 断点保存 ======
  function saveCurrentWorkoutWith(exercisesSnapshot) {
    if (exRef.current.makeupMode) return // 补做模式不写断点
    try {
      const { exIdx: ei, setIdx: si } = exRef.current
      localStorage.setItem(CURRENT_KEY, JSON.stringify({ exercises: exercisesSnapshot, exIdx: ei, setIdx: si }))
    } catch { /* ignore */ }
  }

  // ====== 挂载时检查断点恢复 ======
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CURRENT_KEY)
      if (!raw) return
      const data = JSON.parse(raw)
      if (data?.exercises?.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setResumeData(data)
        setShowResume(true)
      }
    } catch { /* ignore */ }
  }, [])

  function discardResume() {
    localStorage.removeItem(CURRENT_KEY)
    setShowResume(false)
    setResumeData(null)
  }

  function applyResume() {
    const data = resumeData
    if (!data) return
    const { exercises: saved, exIdx: si, setIdx: sj } = data
    const savedSet = saved[si]?.sets[sj]
    // 兼容旧数据 done: true/false → status
    const isDone = savedSet?.status === STATUS.DONE || savedSet?.done === true

    if (isDone) {
      const isLastS = sj >= (saved[si]?.sets?.length || 1) - 1
      const isLastE = si >= saved.length - 1
      if (isLastS && isLastE) {
        // 迁移旧数据格式
        const migrated = migrateExercises(saved)
        const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
        workouts.push({
          id: Date.now(), date: new Date().toLocaleDateString('zh-CN'),
          templateName: template?.name || null, exercises: migrated,
        })
        localStorage.setItem('workouts', JSON.stringify(workouts))
        localStorage.removeItem(CURRENT_KEY)
        onFinish()
        return
      }
      let nextEi = si, nextSi = sj
      if (isLastS) { nextEi++; nextSi = 0 }
      else { nextSi++ }
      setExercises(migrateExercises(saved))
      setExIdx(nextEi)
      setSetIdx(nextSi)
    } else {
      setExercises(migrateExercises(saved))
      setExIdx(si)
      setSetIdx(sj)
    }
    setShowResume(false)
    setResumeData(null)
  }

  // ====== 旧数据迁移 done → status ======
  function migrateExercises(list) {
    return list.map(ex => ({
      ...ex,
      sets: (ex.sets || []).map(s => {
        if (s.status) return s
        return { weight: s.weight || '', reps: s.reps || '', status: s.done ? STATUS.DONE : STATUS.PENDING }
      })
    }))
  }

  // ====== 更新当前组数据 ======
  function updateCurrentSet(field, value) {
    setExercises(prev => prev.map((e, i) =>
      i !== exIdx ? e : {
        ...e, sets: e.sets.map((s, j) =>
          j !== setIdx ? s : { ...s, [field]: value }
        )
      }
    ))
  }

  function adjustWeight(delta) {
    const exes = exRef.current.exercises
    const current = parseFloat(exes[exIdx]?.sets[setIdx]?.weight) || 0
    const next = Math.max(0, +(current + delta).toFixed(1))
    updateCurrentSet('weight', String(next))
  }

  function adjustReps(delta) {
    const exes = exRef.current.exercises
    const current = parseInt(exes[exIdx]?.sets[setIdx]?.reps) || 0
    const next = Math.max(1, current + delta)
    updateCurrentSet('reps', String(next))
  }

  // ====== 纯函数：计算标记后的 exercises ======
  function getExercisesWithStatus(status) {
    return exRef.current.exercises.map((e, i) =>
      i !== exIdx ? e : {
        ...e, sets: e.sets.map((s, j) =>
          j !== setIdx ? s : { ...s, status }
        )
      }
    )
  }

  function getExercisesWithExerciseSkipped() {
    return exRef.current.exercises.map((e, i) =>
      i !== exIdx ? e : {
        ...e, sets: e.sets.map(s =>
          s.status === STATUS.PENDING ? { ...s, status: STATUS.SKIPPED } : s
        )
      }
    )
  }

  // ====== 前进逻辑 ======
  function advanceToNextSet() {
    const { exercises: es, exIdx: ei, setIdx: si } = exRef.current
    const curWeight = es[ei]?.sets[si]?.weight || ''
    setExercises(prev => prev.map((e, i) => {
      if (i !== ei) return e
      return { ...e, sets: e.sets.map((s, j) => j !== si + 1 ? s : { ...s, weight: curWeight }) }
    }))
    setSetIdx(prev => prev + 1)
  }

  function advanceToNextExercise() {
    setShowTransition(false)
    setExIdx(prev => prev + 1)
    setSetIdx(0)
  }

  // ====== 核心：完成当前组 ======
  function completeSet() {
    if (buttonDisabled) return
    clearAllTimers()
    const updated = getExercisesWithStatus(STATUS.DONE)
    setExercises(updated)
    saveCurrentWorkoutWith(updated)

    if (isLastSet && isLastExercise) {
      tryShowEndPage(updated)
    } else if (isLastSet) {
      setShowTransition(true)
    } else {
      startTimer()
    }
  }

  // ====== 跳过当前组 ======
  function skipCurrentSet() {
    clearAllTimers()
    const updated = getExercisesWithStatus(STATUS.SKIPPED)
    setExercises(updated)
    saveCurrentWorkoutWith(updated)

    if (isLastSet && isLastExercise) {
      tryShowEndPage(updated)
    } else if (isLastSet) {
      setShowTransition(true)
    } else {
      advanceToNextSet()
    }
  }

  // ====== 跳过当前动作 ======
  function skipCurrentExercise() {
    clearAllTimers()
    const updated = getExercisesWithExerciseSkipped()
    setExercises(updated)
    saveCurrentWorkoutWith(updated)

    if (isLastExercise) {
      tryShowEndPage(updated)
    } else {
      setShowTransition(true)
    }
  }

  // ====== 结束页逻辑 ======
  function tryShowEndPage(exercisesSnapshot) {
    const skipped = countByStatus(exercisesSnapshot || exercises, STATUS.SKIPPED)
    if (skipped > 0) {
      setShowEndPage(true)
    } else {
      saveAndExit(exercisesSnapshot || exercises)
    }
  }

  function saveAndExit(exercisesSnapshot) {
    const data = exercisesSnapshot || exercises
    const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
    workouts.push({
      id: Date.now(),
      date: new Date().toLocaleDateString('zh-CN'),
      templateName: template?.name || null,
      exercises: data,
    })
    localStorage.setItem('workouts', JSON.stringify(workouts))
    localStorage.removeItem(CURRENT_KEY)
    onFinish()
  }

  function finishTraining() {
    // 手动点击 "结束训练" 或 "结束并保存"
    if (!showEndPage) {
      // 从训练页点结束 — 先看有没有跳过的
      const skipped = countByStatus(exercises, STATUS.SKIPPED)
      if (skipped > 0) {
        setShowEndPage(true)
        return
      }
      if (!window.confirm('结束训练并保存？')) return
    }
    saveAndExit()
  }

  // ====== 补做模式 ======
  function enterMakeupMode() {
    const first = findFirstSkipped(exercises)
    if (!first) {
      // 没有 skipped 了，直接保存
      saveAndExit()
      return
    }
    setShowEndPage(false)
    setMakeupMode(true)
    setExIdx(first.exIdx)
    setSetIdx(first.setIdx)
  }

  function advanceMakeup() {
    const { exercises: es, exIdx: ei, setIdx: si } = exRef.current
    const next = findNextSkipped(es, ei, si)
    if (!next) {
      // 补做完成，回到结束页
      setMakeupMode(false)
      const remaining = countByStatus(es, STATUS.SKIPPED)
      if (remaining === 0) {
        saveAndExit(es)
      } else {
        setShowEndPage(true)
      }
      return
    }
    setExIdx(next.exIdx)
    setSetIdx(next.setIdx)
  }

  function completeMakeupSet() {
    if (buttonDisabled) return
    clearAllTimers()
    const updated = exRef.current.exercises.map((e, i) =>
      i !== exIdx ? e : {
        ...e, sets: e.sets.map((s, j) =>
          j !== setIdx ? s : { ...s, status: STATUS.DONE }
        )
      }
    )
    setExercises(updated)
    startTimer()
  }

  // ====== 计时器 ======
  function saveScroll() {
    const sc = document.getElementById('scroll-root')
    if (sc) scrollPos.current = sc.scrollTop
  }

  function restoreScroll() {
    const sc = document.getElementById('scroll-root')
    if (sc) requestAnimationFrame(() => { sc.scrollTop = scrollPos.current })
  }

  function startTimer(duration) {
    const d = duration || timerDuration
    clearAllTimers()
    saveScroll()
    setTimer(d)
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (navigator.vibrate) navigator.vibrate([300, 100, 300])
          autoDismissRef.current = setTimeout(() => {
            setTimer(null)
            restoreScroll()
          }, 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ====== 倒计时中操作 ======
  function skipRest() {
    clearAllTimers()
    setTimer(null)
    restoreScroll()
  }

  function undoSet() {
    clearAllTimers()
    setTimer(null)
    restoreScroll()
    const updated = exRef.current.exercises.map((e, i) =>
      i !== exIdx ? e : {
        ...e, sets: e.sets.map((s, j) =>
          j !== setIdx ? s : { ...s, status: STATUS.PENDING }
        )
      }
    )
    setExercises(updated)
    saveCurrentWorkoutWith(updated)
  }

  // ====== 计时器拖拽 ======
  const timerActive = timer !== null

  useEffect(() => {
    const el = timerEl.current
    if (!el || timer === null) return
    const state = { x: 0, y: 0, startX: 0, startY: 0, ox: 0, oy: 0, on: false }
    function apply() { el.style.transform = `translate(${state.x}px, ${state.y}px)` }
    function onStart(e) {
      if (e.target.tagName === 'BUTTON') return
      e.preventDefault()
      const p = e.touches ? e.touches[0] : e
      state.startX = p.clientX; state.startY = p.clientY
      state.ox = state.x; state.oy = state.y; state.on = true
    }
    function onMove(e) {
      if (!state.on) return
      const p = e.touches ? e.touches[0] : e
      state.x = state.ox + p.clientX - state.startX
      state.y = state.oy + p.clientY - state.startY
      apply()
    }
    function onEnd() { state.on = false }
    el.addEventListener('touchstart', onStart, { passive: false })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('mousedown', onStart)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('mousedown', onStart)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
    }
  }, [timerActive]) // eslint-disable-line react-hooks/exhaustive-deps

  // ====== 进度条编辑 ======
  function updateSetInEdit(ei, si, field, value) {
    setExercises(prev => prev.map((e, i) =>
      i !== ei ? e : { ...e, sets: e.sets.map((s, j) => j !== si ? s : { ...s, [field]: value }) }
    ))
  }

  // ====== 视觉常量 ======
  const timerColor = timer === 0 ? '#ef4444' : timer !== null && timer <= 10 ? '#f59e0b' : '#4ade80'
  const durations = [30, 60, 90, 120]
  const nextEx = exercises[exIdx + 1]

  // ====== 进度条方块颜色 ======
  function barStyle(s, isCurrent) {
    if (s.status === STATUS.DONE) return { background: '#4ade80' }
    if (s.status === STATUS.SKIPPED) return {
      background: '#1e1e1e',
      border: '1px solid #4ade8044',
      boxSizing: 'border-box',
    }
    if (isCurrent) return { background: '#4ade80', animation: 'fitman-pulse 2s ease-in-out infinite' }
    return { background: '#2a2a2a' }
  }

  // ====== 渲染 ======
  return (
    <>
      {/* ========== 断点恢复弹窗 ========== */}
      {showResume && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a1a', borderRadius: 18, padding: 28, margin: 20, maxWidth: 340, width: '100%', border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>检测到未完成的训练</div>
            <div style={{ color: '#777', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              上次训练在第 {globalSetIndex} 组前中断了，要继续吗？
            </div>
            <button onClick={applyResume} style={{ width: '100%', background: '#4ade80', borderRadius: 12, padding: 14, color: '#0f0f0f', fontWeight: 700, fontSize: 16, marginBottom: 10 }}>继续训练</button>
            <button onClick={discardResume} style={{ width: '100%', background: 'none', border: '1px solid #333', borderRadius: 12, padding: 12, color: '#666', fontSize: 14 }}>放弃，开始新训练</button>
          </div>
        </div>
      )}

      {/* ========== 结束页 ========== */}
      {showEndPage && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, gap: 20 }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>训练完成！</div>
          <div style={{ color: '#888', fontSize: 14 }}>
            {template?.name || '空白训练'}
          </div>

          {/* 统计 */}
          <div style={{ display: 'flex', gap: 32, marginTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#4ade80' }}>{doneCount}</div>
              <div style={{ color: '#666', fontSize: 13 }}>已完成</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: skippedCount > 0 ? '#f59e0b' : '#444' }}>{skippedCount}</div>
              <div style={{ color: '#666', fontSize: 13 }}>跳过</div>
            </div>
          </div>

          {/* 跳过的动作列表 */}
          {skippedCount > 0 && (
            <div style={{ width: '100%', maxWidth: 320, background: '#1a1a1a', borderRadius: 14, padding: 16, border: '1px solid #2a2a2a' }}>
              <div style={{ color: '#f59e0b', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>还有 {skippedCount} 组未做</div>
              {exercises.map((e, ei) => {
                const skippedSets = e.sets.filter(s => s.status === STATUS.SKIPPED)
                if (skippedSets.length === 0) return null
                return (
                  <div key={ei} style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>
                    {e.name} · {skippedSets.length} 组
                  </div>
                )
              })}
            </div>
          )}

          {/* 按钮 */}
          {skippedCount > 0 && (
            <button onClick={enterMakeupMode}
              style={{ width: '100%', maxWidth: 320, background: '#4ade8020', border: '1px solid #4ade80', borderRadius: 14, padding: 16, color: '#4ade80', fontWeight: 700, fontSize: 16 }}>
              补做 {skippedCount} 组
            </button>
          )}
          <button onClick={finishTraining}
            style={{ width: '100%', maxWidth: 320, background: skippedCount > 0 ? 'none' : '#4ade80', border: skippedCount > 0 ? '1px solid #333' : 'none', borderRadius: 14, padding: 16, color: skippedCount > 0 ? '#666' : '#0f0f0f', fontWeight: 700, fontSize: 16 }}>
            结束训练并保存
          </button>
        </div>
      )}

      {/* ========== 训练主体 ========== */}
      {!showEndPage && (
        <div style={{ padding: '12px 20px 20px', paddingBottom: 100, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

          {/* ---- 过渡页 ---- */}
          {showTransition && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
              <div style={{ fontSize: 60 }}>🎉</div>
              <div style={{ fontSize: 24, fontWeight: 800, textAlign: 'center' }}>{ex.name} 完成！</div>
              {nextEx ? (
                <button onClick={advanceToNextExercise} style={{ background: '#4ade80', borderRadius: 16, padding: '18px 40px', color: '#0f0f0f', fontWeight: 800, fontSize: 17, minWidth: 220, textAlign: 'center' }}>
                  下一个：{nextEx.name} →
                </button>
              ) : (
                <button onClick={() => tryShowEndPage()} style={{ background: '#4ade80', borderRadius: 16, padding: '18px 40px', color: '#0f0f0f', fontWeight: 800, fontSize: 17 }}>
                  查看总结
                </button>
              )}
            </div>
          )}

          {/* ---- 大卡片 ---- */}
          {!showTransition && (
            <>
              {/* ===== 顶部进度条 ===== */}
              <div style={{ display: 'flex', gap: 2, marginBottom: 32, alignItems: 'center', paddingTop: 4 }}>
                {exercises.map((e, ei) => (
                  <div key={ei} style={{ display: 'flex', gap: 2, flex: e.sets.length, alignItems: 'center' }}>
                    {ei > 0 && <div style={{ width: 2, minWidth: 2, height: 4, borderRadius: 1, background: '#333', margin: '0 1px' }} />}
                    {e.sets.map((s, si) => {
                      const isCurrent = ei === exIdx && si === setIdx && !makeupMode
                      return (
                        <div key={si} onClick={() => {
                          // 只有非当前动作且有已完成组的才能点
                          if (ei !== exIdx || makeupMode) setEditExIdx(ei)
                        }} style={{
                          flex: 1, height: 4, borderRadius: 2,
                          transition: 'background 0.3s',
                          cursor: (ei !== exIdx || makeupMode) ? 'pointer' : 'default',
                          ...barStyle(s, isCurrent),
                        }} />
                      )
                    })}
                  </div>
                ))}
              </div>

              {/* ===== 大卡片主体 ===== */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: -40 }}>
                {/* 补做模式标识 */}
                {makeupMode && (
                  <div style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, marginBottom: -8 }}>
                    补做模式
                  </div>
                )}

                {/* 动作名 */}
                <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                  {ex.name}
                </div>
                <button onClick={() => {
                  if (window.confirm(`跳过「${ex.name}」？剩余未完成的组将标记为跳过。`)) skipCurrentExercise()
                }} style={{ background: 'none', border: 'none', color: '#444', fontSize: 11, marginTop: -12, marginBottom: 8 }}>
                  跳过这个动作
                </button>

                {/* 重量 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => adjustWeight(-2.5)} style={{ width: 48, height: 48, borderRadius: 14, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f0f0f0', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input type="number" value={currentSet.weight} onChange={e => updateCurrentSet('weight', e.target.value)} placeholder="0" inputMode="decimal"
                      style={{ width: 100, background: 'none', border: 'none', borderBottom: '2px solid #333', color: '#f0f0f0', fontSize: 42, fontWeight: 800, textAlign: 'center', padding: '4px 0', borderRadius: 0 }} />
                    <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>kg</div>
                  </div>
                  <button onClick={() => adjustWeight(2.5)} style={{ width: 48, height: 48, borderRadius: 14, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f0f0f0', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>

                {/* 次数 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <button onClick={() => adjustReps(-1)} style={{ width: 48, height: 48, borderRadius: 14, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f0f0f0', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <input type="number" value={currentSet.reps} onChange={e => updateCurrentSet('reps', e.target.value)} placeholder="0" inputMode="numeric"
                      style={{ width: 100, background: 'none', border: 'none', borderBottom: '2px solid #333', color: '#f0f0f0', fontSize: 42, fontWeight: 800, textAlign: 'center', padding: '4px 0', borderRadius: 0 }} />
                    <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>次</div>
                  </div>
                  <button onClick={() => adjustReps(1)} style={{ width: 48, height: 48, borderRadius: 14, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f0f0f0', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>

                {/* 进度文字 */}
                <div style={{ color: '#555', fontSize: 14, marginTop: 8 }}>
                  第 {setIdx + 1} 组 / 共 {ex.sets.length} 组
                </div>

                {/* 完成按钮 */}
                <button disabled={buttonDisabled} onClick={makeupMode ? completeMakeupSet : completeSet}
                  style={{
                    width: '100%', maxWidth: 320, borderRadius: 18, padding: '20px 0',
                    background: buttonDisabled ? '#1e1e1e' : '#4ade80',
                    color: buttonDisabled ? '#444' : '#0f0f0f',
                    fontWeight: 800, fontSize: 20, marginTop: 20,
                    cursor: buttonDisabled ? 'default' : 'pointer',
                    transition: 'background 0.2s, color 0.2s',
                    border: buttonDisabled ? '2px solid #2a2a2a' : 'none',
                  }}>完 成</button>

                {/* 跳过这组 */}
                <button onClick={skipCurrentSet}
                  style={{ background: 'none', border: 'none', color: '#555', fontSize: 13, marginTop: -10 }}>
                  跳过这组
                </button>

                {/* 结束 / 回到总结 */}
                {makeupMode ? (
                  <button onClick={() => { setMakeupMode(false); setShowEndPage(true) }}
                    style={{ background: 'none', border: 'none', color: '#444', fontSize: 13, marginTop: 4 }}>
                    回到总结
                  </button>
                ) : (
                  <button onClick={() => finishTraining()}
                    style={{ background: 'none', border: 'none', color: '#444', fontSize: 13, marginTop: 4 }}>
                    结束训练
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== 进度条编辑面板 ========== */}
      {editExIdx !== null && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: '#000000aa', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setEditExIdx(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a1a1a', borderRadius: '18px 18px 0 0', padding: 24, width: '100%', maxWidth: 430,
            maxHeight: '70vh', overflowY: 'auto', border: '1px solid #2a2a2a',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{exercises[editExIdx].name}</div>
              <button onClick={() => setEditExIdx(null)} style={{ width: 36, height: 36, borderRadius: 10, background: '#2a2a2a', color: '#888', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 60px', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ color: '#777', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>组</div>
              <div style={{ color: '#777', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>重量</div>
              <div style={{ color: '#777', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>次数</div>
              <div style={{ color: '#777', fontSize: 12, fontWeight: 600, textAlign: 'center' }}>状态</div>
            </div>
            {exercises[editExIdx].sets.map((s, si) => (
              <div key={si} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr 60px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{ color: '#666', fontSize: 14, textAlign: 'center' }}>{si + 1}</div>
                <input type="number" value={s.weight} onChange={e => updateSetInEdit(editExIdx, si, 'weight', e.target.value)} placeholder="0" inputMode="decimal"
                  style={{ background: '#252525', border: '1px solid #333', borderRadius: 8, padding: '10px 6px', color: '#f0f0f0', fontSize: 14, textAlign: 'center', width: '100%' }} />
                <input type="number" value={s.reps} onChange={e => updateSetInEdit(editExIdx, si, 'reps', e.target.value)} placeholder="0" inputMode="numeric"
                  style={{ background: '#252525', border: '1px solid #333', borderRadius: 8, padding: '10px 6px', color: '#f0f0f0', fontSize: 14, textAlign: 'center', width: '100%' }} />
                <div style={{ textAlign: 'center', fontSize: 12, color: s.status === STATUS.DONE ? '#4ade80' : s.status === STATUS.SKIPPED ? '#f59e0b' : '#555' }}>
                  {s.status === STATUS.DONE ? '完成' : s.status === STATUS.SKIPPED ? '跳过' : '待做'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== 全屏倒计时浮窗 ========== */}
      {timerActive && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
          <div ref={timerEl} style={{
            position: 'absolute', inset: 0,
            background: timer === 0 ? '#1a0000' : '#0a0a0a',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.3s',
            cursor: navigator.maxTouchPoints > 0 ? undefined : 'grab',
            userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'none',
          }}>
            <div style={{ position: 'absolute', top: 60, color: '#444', fontSize: 12 }}>按住空白处拖动</div>
            <div style={{ fontSize: 140, fontWeight: 900, color: timerColor, letterSpacing: -4, lineHeight: 1, transition: 'color 0.3s' }}>
              {timer === 0 ? 'GO' : timer}
            </div>
            <div style={{ color: timer === 0 ? '#ef4444' : '#555', fontSize: 18, fontWeight: 600, marginTop: 16 }}>
              {timer === 0 ? '组间休息结束，继续训练' : '秒'}
            </div>
            {timer > 0 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
                {durations.map(d => (
                  <button key={d} onClick={() => { setTimerDuration(d); startTimer(d) }}
                    style={{ padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600, background: timerDuration === d ? '#222' : 'transparent', border: `1px solid ${timerDuration === d ? '#444' : '#2a2a2a'}`, color: timerDuration === d ? '#f0f0f0' : '#555' }}>{d}s</button>
                ))}
              </div>
            )}

            {/* ±15s 微调 */}
            {timer > 0 && (
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button onClick={() => { const n = Math.max(15, timer - 15); setTimerDuration(n); startTimer(n) }}
                  style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '4px 12px', color: '#666', fontSize: 12 }}>−15s</button>
                <button onClick={() => { const n = Math.min(300, timer + 15); setTimerDuration(n); startTimer(n) }}
                  style={{ background: 'none', border: '1px solid #333', borderRadius: 8, padding: '4px 12px', color: '#666', fontSize: 12 }}>+15s</button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16, marginTop: timer > 0 ? 24 : 40 }}>
              {timer > 0 && (
                <button onClick={() => { skipRest(); makeupMode ? advanceMakeup() : advanceToNextSet() }}
                  style={{ padding: '12px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: '#4ade8018', border: '1px solid #4ade8044', color: '#4ade80' }}>
                  跳过休息
                </button>
              )}
              <button onClick={undoSet}
                style={{ padding: '12px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: 'transparent', border: timer === 0 ? '1px solid #ef4444' : '1px solid #333', color: timer === 0 ? '#ef4444' : '#666' }}>
                {timer === 0 ? '返回训练' : '返回修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
