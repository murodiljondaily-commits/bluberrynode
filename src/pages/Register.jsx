import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import BlueberryOrbs from '../components/BlueberryOrbs'

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    parentTelegram: '',
    parentEmail: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isMinor = form.age !== '' && parseInt(form.age) < 18

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.gender) { setError("Jinsingizni tanlang"); return }
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Email confirmation required — session won't exist yet
    if (!data.session) {
      setLoading(false)
      setError('Emailingizga tasdiqlash havolasi yuborildi. Iltimos tekshiring.')
      return
    }

    const userId = data.user?.id
    if (userId) {
      const profileData = {
        id: userId,
        full_name: form.fullName,
        age: parseInt(form.age),
        gender: form.gender,
        parent_telegram_id: isMinor ? form.parentTelegram : null,
        parent_email: isMinor ? form.parentEmail : null,
      }

      const { error: profileError } = await supabase.from('profiles').insert(profileData)
      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }
    }

    navigate('/onboarding')
  }

  const inputClass = "w-full rounded-2xl border-2 border-berry-light bg-berry-glow/30 px-4 py-3.5 text-berry-dark font-semibold placeholder-gray-400 focus:outline-none focus:border-berry-mid transition-colors duration-200"

  return (
    <div className="min-h-screen bg-cream relative flex items-center justify-center py-16 px-4">
      <BlueberryOrbs />

      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md p-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="relative w-8 h-8">
            <div className="absolute w-4 h-4 rounded-full bg-berry-deep top-0 left-1" />
            <div className="absolute w-3 h-3 rounded-full bg-berry-mid bottom-0 left-0" />
            <div className="absolute w-3 h-3 rounded-full bg-berry-mid bottom-0 right-0" />
          </div>
          <span className="font-bold text-xl text-berry-deep">Blueberry node</span>
        </div>

        <h1 className="font-black text-3xl text-berry-deep text-center mb-2">Ro'yxatdan o'ting</h1>
        <p className="text-gray-500 text-center mb-8 font-semibold">Oilangiz bilan birga o'rganishni boshlang 🫐</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">To'liq ism</label>
            <input
              name="fullName"
              type="text"
              placeholder="Ismingiz"
              required
              value={form.fullName}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              placeholder="email@example.com"
              required
              value={form.email}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">Parol</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Kamida 8 ta belgi"
                required
                minLength={8}
                value={form.password}
                onChange={handleChange}
                className={inputClass + ' pr-12'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-berry-mid hover:text-berry-deep transition-colors"
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">Yosh</label>
            <input
              name="age"
              type="number"
              placeholder="Yoshingiz"
              required
              min={5}
              max={100}
              value={form.age}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">Jinsi</label>
            <div className="flex gap-3">
              {[{ val: 'male', label: '👨 Erkak' }, { val: 'female', label: '👩 Ayol' }].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, gender: opt.val }))}
                  className={`flex-1 py-3 rounded-full font-bold text-sm transition-all duration-200 border-2 ${
                    form.gender === opt.val
                      ? 'bg-berry-deep text-white border-berry-deep'
                      : 'bg-berry-glow text-berry-deep border-berry-glow hover:border-berry-light'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parent fields — only for minors */}
          {isMinor && (
            <div className="flex flex-col gap-4 p-4 bg-berry-glow/40 rounded-2xl border-2 border-berry-light/50">
              <p className="text-xs text-berry-mid font-semibold">
                ℹ️ Dars bajarilmasa ota-onangizga xabar yuboriladi
              </p>
              <div>
                <label className="block text-berry-deep font-bold text-sm mb-1.5">Ota-ona Telegram ID</label>
                <input
                  name="parentTelegram"
                  type="text"
                  placeholder="@username yoki raqam"
                  value={form.parentTelegram}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-berry-deep font-bold text-sm mb-1.5">Ota-ona emaili</label>
                <input
                  name="parentEmail"
                  type="email"
                  placeholder="parent@example.com"
                  value={form.parentEmail}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 rounded-2xl px-5 py-3 text-sm font-semibold text-center border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-berry-deep text-white rounded-full py-4 text-lg font-bold shadow-lg hover:bg-berry-dark hover:scale-[1.02] transition-all duration-300 mt-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Yuklanmoqda...
              </>
            ) : (
              "Ro'yxatdan o'tish →"
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 font-semibold text-sm">
          Hisobingiz bormi?{' '}
          <Link to="/login" className="text-berry-mid hover:text-berry-deep font-bold transition-colors">
            Kirish →
          </Link>
        </p>
      </div>
    </div>
  )
}
