import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LanguageContext'
import { t } from '../lib/translations'
import { THEMES, getTheme } from '../lib/themes'
import { CURRICULUM } from '../data/curriculum'

const LEVEL_COLORS = {
  A0: '#6B7280', A1: '#3B82F6', A2: '#8B5CF6', B1: '#F59E0B', B2: '#EF4444',
}

function SpiderWebPath({ subject, progress, onSelectLesson }) {
  const nodes = CURRICULUM[subject] || CURRICULUM.english
  const completedIds = progress?.completed_lessons || []
  const currentId = progress?.current_lesson || 1
  const theme = getTheme(subject)

  return (
    <div className="relative w-full overflow-auto">
      <svg viewBox="-100 -320 1200 920" className="w-full" style={{ minHeight: '600px' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Connection lines (behind nodes) */}
        {nodes.map((node) =>
          node.connects.map((targetId) => {
            const target = nodes.find((n) => n.id === targetId)
            if (!target || targetId <= node.id) return null
            const isActive = completedIds.includes(node.id) && completedIds.includes(targetId)
            return (
              <line
                key={`${node.id}-${targetId}`}
                x1={node.x} y1={node.y}
                x2={target.x} y2={target.y}
                stroke={isActive ? theme.secondary : '#E5E7EB'}
                strokeWidth={isActive ? 2 : 1}
                strokeOpacity={isActive ? 0.8 : 0.3}
                strokeDasharray={isActive ? 'none' : '4 4'}
              />
            )
          })
        )}

        {/* Nodes */}
        {nodes.map((node) => {
          const isCompleted = completedIds.includes(node.id)
          const isCurrent = node.id === currentId
          const isLocked = !isCompleted && !isCurrent && node.id > currentId

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={() => !isLocked && onSelectLesson(node)}
              style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
            >
              {isCurrent && (
                <circle r={32} fill="none" stroke={theme.primary} strokeWidth={2} opacity={0.5}>
                  <animate attributeName="r" values="28;38;28" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              <circle
                r={isCompleted ? 26 : isCurrent ? 28 : 22}
                fill={isCompleted ? theme.primary : isCurrent ? theme.secondary : isLocked ? '#F3F4F6' : theme.light}
                stroke={isCompleted ? theme.dark : isCurrent ? theme.primary : '#D1D5DB'}
                strokeWidth={isCurrent ? 3 : 2}
                filter={isCompleted ? 'url(#glow)' : 'none'}
              />

              <text
                textAnchor="middle" dominantBaseline="middle"
                fontSize={isLocked ? 14 : 16}
                fill={isCompleted || isCurrent ? 'white' : isLocked ? '#9CA3AF' : theme.primary}
              >
                {isCompleted ? '✓' : isCurrent ? '▶' : isLocked ? '🔒' : node.id}
              </text>

              {/* Level badge */}
              <rect x={-15} y={-38} width={30} height={14} rx={7} fill={LEVEL_COLORS[node.level] || '#6B7280'} />
              <text y={-31} textAnchor="middle" fontSize={8} fill="white" fontWeight="bold">{node.level}</text>

              {/* Topic label */}
              <text
                y={42} textAnchor="middle" fontSize={11}
                fill={isLocked ? '#9CA3AF' : theme.dark}
                fontWeight={isCurrent ? 'bold' : 'normal'}
              >
                {node.uz}
              </text>

              {isCompleted && (
                <text y={54} textAnchor="middle" fontSize={8} fill={theme.secondary}>🔄 Takrorlash</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default function Roadmap() {
  const { lang } = useLang()
  const { theme, setSubject, subject } = useTheme()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [progress, setProgress] = useState({})
  const [selectedNode, setSelectedNode] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      if (prof?.subjects?.[0]) setSubject(prof.subjects[0])

      // student_progress is the source of truth once SQL migration is run; fall back to profile maps.
      const { data: prog } = await supabase
        .from('student_progress').select('*').eq('user_id', user.id)

      const progressMap = {}
      ;(prog || []).forEach((p) => { progressMap[p.subject] = p })
      setProgress(progressMap)
      setLoading(false)
    }
    loadData()
  }, [navigate, setSubject])

  // Merge student_progress with profile fallbacks so this works pre-migration too.
  const sp = progress[subject] || {}
  const completedIds = sp.completed_lessons || profile?.completed_lessons?.[subject] || []
  const currentId = sp.current_lesson || profile?.current_lesson?.[subject] || 1
  const currentLevel = sp.current_level || 'A0'
  const subjects = profile?.subjects || ['english']

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: theme.bg }}>
      {/* Subject tabs + progress summary */}
      <div className="sticky top-0 z-10 backdrop-blur-md border-b" style={{ borderColor: theme.light }}>
        <div className="flex items-center gap-3 px-4 pt-4">
          <button onClick={() => navigate('/dashboard')} className="text-sm font-bold" style={{ color: theme.secondary }}>
            ← {t('home', lang)}
          </button>
          <h1 className="text-lg font-black" style={{ color: theme.dark }}>🕸️ {t('roadmap', lang)}</h1>
        </div>

        <div className="flex gap-2 p-4 justify-center flex-wrap">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSubject(sub)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                subject === sub ? 'text-white shadow-lg scale-105' : 'bg-white text-gray-500'
              }`}
              style={subject === sub ? { background: getTheme(sub).primary } : {}}
            >
              {THEMES[sub]?.flag} {getTheme(sub).label[lang]}
            </button>
          ))}
        </div>

        <div className="flex justify-center gap-6 pb-3 text-sm flex-wrap">
          <span style={{ color: theme.primary }}>✅ {completedIds.length} dars</span>
          <span style={{ color: theme.secondary }}>📍 {currentId}-dars</span>
          <span style={{ color: theme.primary }}>{currentLevel} daraja</span>
        </div>
      </div>

      {/* Spider web */}
      <div className="p-4 overflow-auto">
        <SpiderWebPath
          subject={subject}
          progress={{ completed_lessons: completedIds, current_lesson: currentId }}
          onSelectLesson={setSelectedNode}
        />
      </div>

      {/* Selected node popup */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4" onClick={() => setSelectedNode(null)}>
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: theme.primary }}>
              {selectedNode.level}
            </span>
            <h2 className="text-2xl font-black mt-3" style={{ color: theme.dark }}>{selectedNode.uz}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {completedIds.includes(selectedNode.id)
                ? '✅ Bajarilgan'
                : selectedNode.id === currentId
                  ? '▶ Hozirgi dars'
                  : '🔒 Hali ochilmagan'}
            </p>

            <div className="flex gap-3 mt-4">
              {selectedNode.id === currentId && (
                <button
                  onClick={() => navigate(`/lesson/${subject}/${selectedNode.id}`, {
                    state: { isRevision: false, topic: selectedNode.topic, level: selectedNode.level },
                  })}
                  className="flex-1 py-3 rounded-full font-bold text-white"
                  style={{ background: theme.primary }}
                >
                  ▶ Boshlash
                </button>
              )}
              {completedIds.includes(selectedNode.id) && (
                <button
                  onClick={() => navigate(`/lesson/${subject}/${selectedNode.id}`, {
                    state: { isRevision: true, topic: selectedNode.topic, level: selectedNode.level },
                  })}
                  className="flex-1 py-3 rounded-full font-bold"
                  style={{ border: `2px solid ${theme.primary}`, color: theme.primary }}
                >
                  🔄 Takrorlash
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
