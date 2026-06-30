import { useState, useEffect, useRef, useCallback } from 'react'

function buildExercises(template) {
  if (!template) return [{ name: '动作1', sets: [{ weight: '', reps: '', done: false }] }]
  return template.exercises.map(ex => ({
    name: ex.name,
    sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: String(ex.reps), done: false }))
  }))
}

export default function Workout({ template, onFinish }) {
  const [exercises, setExercises] = useState(() => buildExercises(template))
  const [timer, setTimer] = useState(null)           // null=不显示, 数字=剩余秒数, 0=刚结束
  const [timerDuration, setTimerDuration] = useState(60)
  const intervalRef = useRef(null)
  const autoDismissRef = useRef(null)

  // 拖动相关
  const [drag, setDrag] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ startX: 0, startY: 0, offsetX: 0, offsetY: 0, dragging: false })

  // 清理所有定时器
  const clearAllTimers = useCallback(() => {
    clearInterval(intervalRef.current)
    clearTimeout(autoDismissRef.current)
  }, [])

  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

  function startTimer(duration) {
    const d = duration || timerDuration
    clearAllTimers()
    setTimer(d)
    setDrag({ x: 0, y: 0 })  // 新倒计时重置位置
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (navigator.vibrate) navigator.vibrate([300, 100, 300])
          autoDismissRef.current = setTimeout(() => {
            setTimer(null)
            setDrag({ x: 0, y: 0 })
          }, 2000)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopTimer() {
    clearAllTimers()
    setTimer(null)
    setDrag({ x: 0, y: 0 })
  }

  function updateSet(ei, si, field, value) {
    setExercises(prev => prev.map((ex, i) =>
      i !== ei ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j !== si ? s : { ...s, [field]: value })
      }
    ))
  }

  function toggleDone(ei, si) {
    setExercises(prev => prev.map((ex, i) =>
      i !== ei ? ex : {
        ...ex,
        sets: ex.sets.map((s, j) => j !== si ? s : { ...s, done: !s.done })
      }
    ))
    startTimer()
  }

  function addSet(ei) {
    setExercises(prev => prev.map((ex, i) =>
      i !== ei ? ex : { ...ex, sets: [...ex.sets, { weight: '', reps: '', done: false }] }
    ))
  }

  function removeSet(ei, si) {
    setExercises(prev => prev.map((ex, i) =>
      i !== ei ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== si) }
    ))
  }

  function addExercise() {
    setExercises(prev => [...prev, { name: '', sets: [{ weight: '', reps: '', done: false }] }])
  }

  function updateExerciseName(ei, value) {
    setExercises(prev => prev.map((ex, i) => i !== ei ? ex : { ...ex, name: value }))
  }

  function finish() {
    if (!window.confirm('结束训练并保存？')) return
    const workouts = JSON.parse(localStorage.getItem('workouts') || '[]')
    workouts.push({
      id: Date.now(),
      date: new Date().toLocaleDateString('zh-CN'),
      templateName: template?.name || null,
      exercises,
    })
    localStorage.setItem('workouts', JSON.stringify(workouts))
    onFinish()
  }

  // 拖动开始（跳过按钮元素，防止拖动时误触）
  function handleDragStart(e) {
    if (e.target.tagName === 'BUTTON') return
    const touch = e.touches ? e.touches[0] : e
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: drag.x,
      offsetY: drag.y,
      dragging: true,
    }
  }

  // 拖动中
  function handleDragMove(e) {
    if (!dragRef.current.dragging) return
    const touch = e.touches ? e.touches[0] : e
    setDrag({
      x: dragRef.current.offsetX + touch.clientX - dragRef.current.startX,
      y: dragRef.current.offsetY + touch.clientY - dragRef.current.startY,
    })
  }

  // 拖动结束
  function handleDragEnd() {
    dragRef.current.dragging = false
  }

  // 全屏计时器颜色
  const timerColor = timer === 0 ? '#ef4444' : timer !== null && timer <= 10 ? '#f59e0b' : '#4ade80'
  const durations = [30, 60, 90, 120]

  // ====== 计时器浮窗（不再 early return，训练页始终保留） ======
  const timerOverlay = timer !== null && (
    <div
      style={{
        position: 'fixed', inset: 0,
        zIndex: 9999,
        touchAction: 'none',
      }}
    >
      <div
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onMouseDown={handleDragStart}
        onMouseMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate(${drag.x}px, ${drag.y}px)`,
          background: timer === 0 ? '#1a0000' : '#0a0a0a',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.3s',
          cursor: 'grab',
        }}
      >
        {/* 拖动提示 */}
        <div style={{
          position: 'absolute', top: 60,
          color: '#444', fontSize: 12,
          userSelect: 'none',
        }}>
          可拖动
        </div>

        {/* 倒计时数字 */}
        <div style={{
          fontSize: 140, fontWeight: 900,
          color: timerColor,
          letterSpacing: -4,
          lineHeight: 1,
          transition: 'color 0.3s',
          userSelect: 'none',
        }}>
          {timer === 0 ? 'GO' : timer}
        </div>

        {/* 提示文字 */}
        <div style={{
          color: timer === 0 ? '#ef4444' : '#555',
          fontSize: 18, fontWeight: 600, marginTop: 16,
        }}>
          {timer === 0 ? '组间休息结束，继续训练' : '秒'}
        </div>

        {/* 时长选择按钮 */}
        {timer > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 40 }}>
            {durations.map(d => (
              <button
                key={d}
                onClick={(e) => { e.stopPropagation(); setTimerDuration(d); startTimer(d) }}
                style={{
                  padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                  background: timerDuration === d ? '#222' : 'transparent',
                  border: `1px solid ${timerDuration === d ? '#444' : '#2a2a2a'}`,
                  color: timerDuration === d ? '#f0f0f0' : '#555',
                }}
              >{d}s</button>
            ))}
          </div>
        )}

        {/* 停止按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); stopTimer() }}
          style={{
            marginTop: 36, padding: '12px 40px',
            borderRadius: 14, fontSize: 16, fontWeight: 700,
            background: 'transparent',
            border: timer === 0 ? '1px solid #ef4444' : '1px solid #333',
            color: timer === 0 ? '#ef4444' : '#666',
          }}
        >
          {timer === 0 ? '返回训练' : '提前结束'}
        </button>
      </div>
    </div>
  )

  // ====== 训练页正常视图 ======
  return (
    <>
      {/* 训练页始终渲染，不倒计时不卸载，保留滚动位置 */}
      <div style={{ padding: 20, paddingBottom: 100 }}>
        {/* 顶部标题 */}
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
          {template?.name || '空白训练'}
        </div>

        {/* 动作列表 */}
        {exercises.map((ex, ei) => (
          <div key={ei} style={{
            background: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 16,
          }}>
            <input
              value={ex.name}
              onChange={e => updateExerciseName(ei, e.target.value)}
              placeholder="动作名称"
              style={{
                width: '100%', background: 'none', border: 'none',
                color: '#f0f0f0', fontSize: 17, fontWeight: 700, marginBottom: 14,
                borderBottom: '1px solid #2a2a2a', paddingBottom: 10,
              }}
            />

            {/* 表头 */}
            <div style={{
              display: 'grid', gridTemplateColumns: '28px 1fr 1fr 44px 28px',
              gap: 8, marginBottom: 8, alignItems: 'center',
            }}>
              <div style={{ color: '#777', fontSize: 13, fontWeight: 600 }}>组</div>
              <div style={{ color: '#aaa', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>重量(kg)</div>
              <div style={{ color: '#aaa', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>次数</div>
              <div style={{ color: '#aaa', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>完成</div>
              <div />
            </div>

            {/* 组行 */}
            {ex.sets.map((s, si) => (
              <div key={si} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 1fr 44px 28px',
                gap: 8, alignItems: 'center', marginBottom: 8,
                opacity: s.done ? 0.45 : 1,
              }}>
                <div style={{ color: '#666', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>{si + 1}</div>
                <input
                  type="number" value={s.weight}
                  onChange={e => updateSet(ei, si, 'weight', e.target.value)}
                  placeholder="0"
                  style={{
                    background: '#252525', border: '1px solid #333',
                    borderRadius: 8, padding: '10px 6px', color: '#f0f0f0',
                    fontSize: 15, textAlign: 'center', width: '100%',
                  }}
                />
                <input
                  type="number" value={s.reps}
                  onChange={e => updateSet(ei, si, 'reps', e.target.value)}
                  placeholder="0"
                  style={{
                    background: '#252525', border: '1px solid #333',
                    borderRadius: 8, padding: '10px 6px', color: '#f0f0f0',
                    fontSize: 15, textAlign: 'center', width: '100%',
                  }}
                />
                <button
                  onClick={() => toggleDone(ei, si)}
                  style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: s.done ? '#4ade80' : '#2a2a2a',
                    color: s.done ? '#0f0f0f' : '#555',
                    fontSize: 18, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >✓</button>
                <button
                  onClick={() => removeSet(ei, si)}
                  style={{
                    width: 28, height: 44, background: 'none',
                    color: '#444', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            ))}

            <button onClick={() => addSet(ei)} style={{
              background: 'none', border: '1px dashed #2a2a2a',
              borderRadius: 8, padding: '10px 0', width: '100%',
              color: '#555', fontSize: 14, marginTop: 4,
            }}>+ 加一组</button>
          </div>
        ))}

        <button onClick={addExercise} style={{
          width: '100%', background: 'none', border: '1px dashed #333',
          borderRadius: 12, padding: 14, color: '#555', fontSize: 14, marginBottom: 16,
        }}>+ 添加动作</button>

        {/* 完成按钮 */}
        <button onClick={finish} style={{
          width: '100%', background: '#4ade80', borderRadius: 14,
          padding: 16, color: '#0f0f0f', fontWeight: 800, fontSize: 17,
        }}>完成训练</button>

        {/* 计时器触发按钮（右下角浮窗，倒计时中隐藏） */}
        {timer === null && (
          <div style={{
            position: 'fixed', right: 16, bottom: 80,
            background: '#1e1e1e',
            border: '2px solid #2a2a2a',
            borderRadius: 18, padding: '12px 14px',
            minWidth: 130,
            boxShadow: '0 4px 20px #00000066',
            zIndex: 200,
          }}>
            <div style={{ color: '#777', fontSize: 11, marginBottom: 4 }}>组间休息</div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {durations.map(d => (
                <button
                  key={d}
                  onClick={() => setTimerDuration(d)}
                  style={{
                    flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: timerDuration === d ? '#333' : 'none',
                    border: `1px solid ${timerDuration === d ? '#555' : '#2a2a2a'}`,
                    color: timerDuration === d ? '#f0f0f0' : '#555',
                  }}
                >{d}s</button>
              ))}
            </div>

            <div style={{
              fontSize: 32, fontWeight: 800, textAlign: 'center',
              color: '#444', letterSpacing: 1, marginBottom: 10,
            }}>
              {timerDuration}s
            </div>

            <button onClick={() => startTimer()} style={{
              width: '100%', background: '#4ade8022', border: '1px solid #4ade80',
              borderRadius: 10, padding: '8px 0', color: '#4ade80', fontWeight: 700, fontSize: 14,
            }}>开始</button>
          </div>
        )}
      </div>

      {/* 计时器浮窗始终在训练页之上 */}
      {timerOverlay}
    </>
  )
}
