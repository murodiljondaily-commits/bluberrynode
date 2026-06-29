import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import SubtleOrbs from '../components/SubtleOrbs'
import { useLang } from '../context/LanguageContext'
import { t } from '../lib/translations'
import { getTheme } from '../lib/themes'

const ALL_SUBJECTS = ['english', 'russian', 'math']

const DAILY_GOALS = [15, 30, 60, 90]
const SUBJECTS_LIST = [
  { id: 'english', label: 'Ingliz tili', flag: '🇬🇧' },
  { id: 'russian', label: 'Rus tili',    flag: '🇷🇺' },
  { id: 'math',    label: 'Matematika',  flag: '🔢' },
]

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-3xl shadow-sm p-5 mb-4">
      <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { lang, changeLang } = useLang()
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Form state
  const [fullName, setFullName] = useState('')
  const [dailyMinutes, setDailyMinutes] = useState(30)
  const [subjects, setSubjects] = useState([])
  const [telegramId, setTelegramId] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentTelegram, setParentTelegram] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/login'); return }
      setUserId(session.user.id)
      const { data } = await supabase.from('profiles')
        .select('*')
        .eq('id', session.user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setDailyMinutes(data.daily_minutes || 30)
        setSubjects(data.subjects || [])
        setTelegramId(data.telegram_id || '')
        setParentEmail(data.parent_email || '')
        setParentTelegram(data.parent_telegram_id || '')
      }
      setLoading(false)
    }
    load()
  }, [navigate])

  async function handleSave() {
    if (!userId) return
    setSaving(true)
    setSaveError('')
    // Use ONLY columns that exist on profiles (parent_telegram_id, not parent_telegram).
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      daily_minutes: dailyMinutes,
      subjects,
      telegram_id: telegramId || null,
      parent_email: parentEmail || null,
      parent_telegram_id: parentTelegram || null,
      preferred_language: lang,
    }).eq('id', userId)

    setSaving(false)
    if (error) {
      console.error('Settings save failed:', error)
      setSaveError(error.message || 'Saqlashda xatolik')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  async function handleChangePassword() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.auth.resetPasswordForEmail(session.user.email)
    alert("Parolni o'zgartirish havolasi emailga yuborildi!")
  }

  async function handleDeleteAccount() {
    if (!deleteConfirm) { setDeleteConfirm(true); return }
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.signOut()
    navigate('/')
  }

  // Only allow REMOVING an active subject here. Adding a new subject must go through
  // the level-check flow (never by just ticking a box).
  function removeSubject(id) {
    setSubjects(prev => prev.filter(s => s !== id))
  }

  // Add a new subject -> always via the onboarding level-check (test or start-from-A0).
  // Nothing is persisted until the student completes that flow.
  function addSubject(sub) {
    navigate('/onboarding', { state: { addSubject: sub } })
  }

  if (loading) return (
    <div className="min-h-screen bg-cream flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-berry-deep border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const initials = fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <SubtleOrbs />
      <div className="relative z-[1] max-w-2xl mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="text-berry-mid font-bold text-sm hover:text-berry-deep">← Orqaga</button>
            <h1 className="text-2xl font-black text-berry-deep">Sozlamalar ⚙️</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2 rounded-full font-black text-sm transition-all ${
              saved ? 'bg-green-500 text-white' : 'bg-berry-deep text-white hover:bg-berry-dark'
            }`}
          >
            {saving ? '...' : saved ? 'Saqlandi ✓' : 'Saqlash'}
          </button>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4 text-sm text-red-700 font-semibold">
            ❌ {saveError}
          </div>
        )}

        {/* Profile */}
        <Section title="Profil">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-berry-deep text-white font-black text-xl flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="text-sm text-gray-400 font-semibold">Avatar avtomatik tarzda ismingiz bo'yicha yaratiladi</div>
          </div>
          <label className="block text-xs font-bold text-gray-500 mb-1">To'liq ism</label>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="w-full border border-gray-200 rounded-2xl px-4 py-3 font-semibold text-berry-deep focus:outline-none focus:border-berry-mid"
            placeholder="Ismingizni kiriting"
          />
        </Section>

        {/* Learning preferences */}
        <Section title="O'rganish sozlamalari">
          <p className="text-sm font-bold text-gray-600 mb-2">Kunlik maqsad</p>
          <div className="flex gap-2 mb-5 flex-wrap">
            {DAILY_GOALS.map(min => (
              <button key={min} onClick={() => setDailyMinutes(min)}
                className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                  dailyMinutes === min
                    ? 'bg-berry-deep text-white shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-berry-glow hover:text-berry-deep'
                }`}>
                {min} daq
              </button>
            ))}
          </div>

          <p className="text-sm font-bold text-gray-600 mb-2">Faol fanlar</p>
          <div className="flex flex-col gap-2">
            {SUBJECTS_LIST.filter(s => subjects.includes(s.id)).map(({ id, label, flag }) => (
              <div key={id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold border bg-berry-glow border-berry-mid text-berry-deep">
                <span className="text-xl">{flag}</span>
                <span>{label}</span>
                <button onClick={() => removeSubject(id)}
                  className="ml-auto text-xs font-bold text-red-400 hover:text-red-600">✕ olib tashlash</button>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-xs text-gray-400">Hali fan yo'q. Pastdan level-check orqali qo'shing.</p>
            )}
          </div>
        </Section>

        {/* Add subject (one-tap) */}
        {ALL_SUBJECTS.filter(s => !subjects.includes(s)).length > 0 && (
          <Section title={t('addSubject', lang)}>
            <div className="flex flex-col gap-2">
              {ALL_SUBJECTS.filter(s => !subjects.includes(s)).map(sub => {
                const th = getTheme(sub)
                const key = `start${sub.charAt(0).toUpperCase() + sub.slice(1)}`
                return (
                  <button key={sub} onClick={() => addSubject(sub)}
                    className="w-full py-3 px-4 rounded-2xl font-semibold text-left transition-all"
                    style={{ background: th.glow, color: th.primary, border: `2px solid ${th.light}` }}>
                    {th.flag} {t(key, lang)}
                    <span className="float-right text-sm opacity-60">{t('checkLevel', lang)} →</span>
                  </button>
                )
              })}
            </div>
          </Section>
        )}

        {/* UI language */}
        <Section title={t('chooseLanguage', lang)}>
          <div className="flex gap-2">
            <button onClick={() => changeLang('uz')}
              className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                lang === 'uz' ? 'bg-berry-deep text-white' : 'bg-gray-100 text-gray-500'
              }`}>
              🇺🇿 O'zbek
            </button>
            <button onClick={() => changeLang('ru')}
              className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                lang === 'ru' ? 'bg-berry-deep text-white' : 'bg-gray-100 text-gray-500'
              }`}>
              🇷🇺 Русский
            </button>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Bildirishnomalar">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Telegram ID (@username yoki raqam)</label>
              <input value={telegramId} onChange={e => setTelegramId(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 font-semibold text-berry-deep focus:outline-none focus:border-berry-mid"
                placeholder="@username yoki +998..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Ota-ona emaili</label>
              <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 font-semibold text-berry-deep focus:outline-none focus:border-berry-mid"
                placeholder="otaona@email.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Ota-ona Telegram</label>
              <input value={parentTelegram} onChange={e => setParentTelegram(e.target.value)}
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 font-semibold text-berry-deep focus:outline-none focus:border-berry-mid"
                placeholder="@username" />
            </div>
          </div>
        </Section>

        {/* Account */}
        <Section title="Hisob">
          <button onClick={handleChangePassword}
            className="w-full mb-3 py-3 rounded-2xl border border-berry-mid text-berry-deep font-bold hover:bg-berry-glow transition-all">
            Parolni o'zgartirish 🔑
          </button>
          <button onClick={handleDeleteAccount}
            className={`w-full py-3 rounded-2xl font-bold transition-all ${
              deleteConfirm
                ? 'bg-red-500 text-white'
                : 'border border-red-300 text-red-400 hover:bg-red-50'
            }`}>
            {deleteConfirm ? 'Tasdiqlang — hamma narsa o\'chadi!' : 'Hisobni o\'chirish 🗑️'}
          </button>
          {deleteConfirm && (
            <button onClick={() => setDeleteConfirm(false)}
              className="w-full mt-2 py-2 text-sm text-gray-400 font-semibold hover:text-gray-600">
              Bekor qilish
            </button>
          )}
        </Section>
      </div>
    </div>
  )
}
