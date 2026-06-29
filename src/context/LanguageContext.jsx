import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('uz')

  useEffect(() => {
    const saved = localStorage.getItem('ui_language') || 'uz'
    setLang(saved)
  }, [])

  const changeLang = (newLang) => {
    setLang(newLang)
    localStorage.setItem('ui_language', newLang)
  }

  return (
    <LanguageContext.Provider value={{ lang, changeLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext) || { lang: 'uz', changeLang: () => {} }
