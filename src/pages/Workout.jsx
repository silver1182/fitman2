import { useState, useEffect, useRef } from 'react'

function buildExercises(template) {
  if (!template) return [{ name: '动作1', sets: [{ weight: '', reps: '', done: false }] }]
  return template.exercises.map(ex => ({
    name: ex.name,
    sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: String(ex.reps), done: false }))
  }))
}

export default function Workout({ template, onFinish }) {
  const [exercises, setExercises] = useState(() => buildExercises(template))
  const [timer, setTimer] = useState(null)
  const [timerDuration, setTimerDuration] = useState(60)
  const [timerFlash, setTimerFlash] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => clearInterval(intervalRef.current)
  }, [])

  function startTimer(duration) {
    const d = duration || timerDuration
    clearInterval(intervalRef.current)
    setTimer(d)
    setTimerFlash(false)
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current)
          if (navigator.vibrate) navigator.vibrate([300, 100, 300])
          setTimerFlash(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function stopTimer() {
    clearInterval(intervalRef.current)
    setTimer(null)
    setTimerFlash(false)
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

  const timerColor = timer === 0 ? '#ef4444' : timer !== null && timer <= 10 ? '#f59e0b' : '#4ade80'
  const durations = [60, 90, 120]

  return (
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

      {/* 计时器浮窗 */}
      <div style={{
        position: 'fixed', right: 16, bottom: 80,
        background: '#1e1e1e',
        border: `2px solid ${timer !== null ? timerColor : '#2a2a2a'}`,
        borderRadius: 18, padding: '12px 14px',
        minWidth: 130,
        boxShadow: timer !== null ? `0 0 16px ${timerColor}33` : '0 4px 20px #00000066',
        transition: 'border-color 0.3s, box-shadow 0.3s',
        zIndex: 200,
      }}>
        <div style={{ color: '#777', fontSize: 11, marginBottom: 4 }}>组间休息</div>

        {/* 时长选择按钮 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {durations.map(d => (
            <button
              key={d}
              onClick={() => { setTimerDuration(d); if (timer !== null) startTimer(d) }}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: timerDuration === d ? '#333' : 'none',
                border: `1px solid ${timerDuration === d ? '#555' : '#2a2a2a'}`,
                color: timerDuration === d ? '#f0f0f0' : '#555',
              }}
            >{d}s</button>
          ))}
        </div>

        {/* 倒计时显示 */}
        <div style={{
          fontSize: 32, fontWeight: 800, textAlign: 'center',
          color: timer !== null ? timerColor : '#444',
          letterSpacing: 1, marginBottom: 10,
          animation: timerFlash ? 'none' : undefined,
        }}>
          {timer !== null ? `${timer}s` : `${timerDuration}s`}
        </div>

        {/* 开始/停止 */}
        {timer !== null
          ? <button onClick={stopTimer} style={{
              width: '100%', background: '#ef444422', border: '1px solid #ef4444',
              borderRadius: 10, padding: '8px 0', color: '#ef4444', fontWeight: 700, fontSize: 14,
            }}>停止</button>
          : <button onClick={() => startTimer()} style={{
              width: '100%', background: '#4ade8022', border: '1px solid #4ade80',
              borderRadius: 10, padding: '8px 0', color: '#4ade80', fontWeight: 700, fontSize: 14,
            }}>开始</button>
        }
      </div>
    </div>
  )
}