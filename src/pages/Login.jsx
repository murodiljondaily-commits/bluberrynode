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

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    navigate('/dashboard')
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

        <h1 className="font-black text-3xl text-berry-deep text-center mb-2">Xush kelibsiz! 👋</h1>
        <p className="text-gray-500 text-center mb-8 font-semibold">Hisobingizga kiring</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              required
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-berry-deep font-bold text-sm mb-1.5">Parol</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Parolingiz"
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
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

          {error && (
            <div className="bg-red-50 text-red-600 rounded-full px-5 py-3 text-sm font-semibold text-center border border-red-200">
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
              'Kirish →'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 font-semibold text-sm">
          Hisobingiz yo'qmi?{' '}
          <Link to="/register" className="text-berry-mid hover:text-berry-deep font-bold transition-colors">
            Ro'yxatdan o'ting →
          </Link>
        </p>
      </div>
    </div>
  )
}
