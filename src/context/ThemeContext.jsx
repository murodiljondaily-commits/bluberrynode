import { createContext, useContext, useState } from 'react'
import { getTheme } from '../lib/themes'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [subject, setSubject] = useState('english')
  const theme = getTheme(subject)

  return (
    <ThemeContext.Provider value={{ theme, subject, setSubject }}>
      <div
        style={{
          '--color-bg': theme.bg,
          '--color-primary': theme.primary,
          '--color-secondary': theme.secondary,
          '--color-light': theme.light,
          '--color-glow': theme.glow,
          '--color-dark': theme.dark,
          minHeight: '100vh',
          transition: 'background-color 0.5s ease',
        }}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext) || {
  theme: getTheme('english'),
  subject: 'english',
  setSubject: () => {},
}
