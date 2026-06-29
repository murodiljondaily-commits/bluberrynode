export const THEMES = {
  english: {
    name: 'english',
    bg: '#F5F0E8',
    primary: '#3D1F6E',
    secondary: '#7B5EA7',
    light: '#C9B8E8',
    glow: '#E8E0F5',
    dark: '#1A0A3D',
    blobColors: [
      'radial-gradient(circle at 35% 35%, #6B3FA0, #3D1F6E)',
      'radial-gradient(circle at 30% 30%, #9B6FD4, #5B3090)',
      'radial-gradient(circle at 40% 25%, #C9B8E8, #7B5EA7)',
    ],
    flag: '🇬🇧',
    label: { uz: 'Ingliz tili', ru: 'Английский' },
  },
  russian: {
    name: 'russian',
    bg: '#F0F5FF',
    primary: '#1E3A8A',
    secondary: '#2563EB',
    light: '#BFDBFE',
    glow: '#EFF6FF',
    dark: '#1E3A8A',
    blobColors: [
      'radial-gradient(circle at 35% 35%, #1D4ED8, #1E3A8A)',
      'radial-gradient(circle at 30% 30%, #3B82F6, #2563EB)',
      'radial-gradient(circle at 40% 25%, #BFDBFE, #60A5FA)',
    ],
    flag: '🇷🇺',
    label: { uz: 'Rus tili', ru: 'Русский язык' },
  },
  math: {
    name: 'math',
    bg: '#FFF7ED',
    primary: '#166534',
    secondary: '#EA580C',
    light: '#FED7AA',
    glow: '#FFF3E0',
    dark: '#14532D',
    blobColors: [
      'radial-gradient(circle at 35% 35%, #EA580C, #9A3412)',
      'radial-gradient(circle at 30% 30%, #16A34A, #166534)',
      'radial-gradient(circle at 40% 25%, #FED7AA, #FB923C)',
    ],
    flag: '🔢',
    label: { uz: 'Matematika', ru: 'Математика' },
  },
}

export const getTheme = (subject) => THEMES[subject] || THEMES.english
