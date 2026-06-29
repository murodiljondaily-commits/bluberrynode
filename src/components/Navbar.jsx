import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLang } from '../context/LanguageContext'

function LangToggle() {
  const { lang, changeLang } = useLang()
  return (
    <div className="flex gap-1">
      <button
        onClick={() => changeLang('uz')}
        className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
          lang === 'uz' ? 'bg-berry-deep text-white' : 'bg-transparent text-gray-400'
        }`}
      >
        🇺🇿 O'zbek
      </button>
      <button
        onClick={() => changeLang('ru')}
        className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
          lang === 'ru' ? 'bg-berry-deep text-white' : 'bg-transparent text-gray-400'
        }`}
      >
        🇷🇺 Русский
      </button>
    </div>
  )
}

function BerryLogo({ white }) {
  const color = white ? '#fff' : '#3D1F6E'
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-8 h-8 flex-shrink-0">
        <div style={{ background: color, opacity: white ? 0.9 : 1 }} className="absolute w-4 h-4 rounded-full top-0 left-1" />
        <div style={{ background: color, opacity: white ? 0.7 : 0.8 }} className="absolute w-3 h-3 rounded-full bottom-0 left-0" />
        <div style={{ background: color, opacity: white ? 0.7 : 0.8 }} className="absolute w-3 h-3 rounded-full bottom-0 right-0" />
      </div>
      <span style={{ color }} className="font-bold text-xl tracking-tight">Blueberry node</span>
    </div>
  )
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Mahsulot', href: '#features' },
    { label: 'Qanday ishlaydi', href: '#how' },
    { label: 'Narxlar', href: '#pricing' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-cream/80 border-b border-berry-light/30">
      <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/">
          <BerryLogo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-berry-deep font-semibold hover:text-berry-mid transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <LangToggle />
          <Link
            to="/login"
            className="text-berry-deep font-semibold px-5 py-2 rounded-full border-2 border-berry-light hover:border-berry-mid hover:bg-berry-glow transition-all duration-300"
          >
            Kirish
          </Link>
          <Link
            to="/register"
            className="bg-berry-deep text-white font-bold px-6 py-2.5 rounded-full shadow-lg hover:bg-berry-dark hover:scale-105 transition-all duration-300 flex items-center gap-1"
          >
            Boshlash <span>→</span>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-berry-glow transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <div className="w-6 flex flex-col gap-1.5">
            <span className={`block h-0.5 bg-berry-deep rounded transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block h-0.5 bg-berry-deep rounded transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-0.5 bg-berry-deep rounded transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-cream/95 backdrop-blur-md border-t border-berry-light/30 px-6 py-6 flex flex-col gap-4">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-berry-deep font-semibold text-lg py-2"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="text-center text-berry-deep font-semibold py-3 rounded-full border-2 border-berry-mid"
            onClick={() => setMenuOpen(false)}
          >
            Kirish
          </Link>
          <Link
            to="/register"
            className="text-center bg-berry-deep text-white font-bold py-3 rounded-full shadow-lg"
            onClick={() => setMenuOpen(false)}
          >
            Boshlash →
          </Link>
        </div>
      )}
    </header>
  )
}

export { BerryLogo }
