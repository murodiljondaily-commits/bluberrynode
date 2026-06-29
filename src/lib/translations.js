export const T = {
  // Navigation
  home: { uz: 'Bosh sahifa', ru: 'Главная' },
  lessons: { uz: 'Darslar', ru: 'Уроки' },
  vocabulary: { uz: "So'zlar", ru: 'Слова' },
  garden: { uz: "Bog'im", ru: 'Мой сад' },
  roadmap: { uz: "Yo'l xarita", ru: 'Путь' },
  statistics: { uz: 'Statistika', ru: 'Статистика' },
  settings: { uz: 'Sozlamalar', ru: 'Настройки' },
  logout: { uz: 'Chiqish', ru: 'Выйти' },

  // Subjects
  english: { uz: 'Ingliz tili', ru: 'Английский' },
  russian: { uz: 'Rus tili', ru: 'Русский язык' },
  math: { uz: 'Matematika', ru: 'Математика' },

  // Lesson
  startLesson: { uz: 'Darsni boshlash', ru: 'Начать урок' },
  nextLesson: { uz: 'Keyingi dars', ru: 'Следующий урок' },
  prevLesson: { uz: 'Oldingi dars', ru: 'Предыдущий урок' },
  skip: { uz: "O'tkazib yuborish", ru: 'Пропустить' },
  correct: { uz: "To'g'ri!", ru: 'Правильно!' },
  wrong: { uz: 'Xato.', ru: 'Неверно.' },
  understood: { uz: 'Tushundim!', ru: 'Понял!' },
  tryAgain: { uz: 'Qayta urinish', ru: 'Попробовать снова' },

  // Exercises
  fillBlank: { uz: "Bo'shliqni to'ldiring", ru: 'Заполните пропуск' },
  translate: { uz: 'Tarjima qiling', ru: 'Переведите' },
  listen: { uz: 'Eshiting va javob bering', ru: 'Слушайте и отвечайте' },
  speak: { uz: 'Gapiring', ru: 'Говорите' },

  // Progress
  lessonComplete: { uz: 'Dars tugadi!', ru: 'Урок завершён!' },
  berries: { uz: 'Rezavor', ru: 'Ягода' },
  streak: { uz: 'kunlik streak', ru: 'дней подряд' },
  xpEarned: { uz: 'Rezavor topildi', ru: 'Ягод получено' },

  // Garden
  myGarden: { uz: "Mening bog'im", ru: 'Мой сад' },
  buyItem: { uz: 'Sotib olish', ru: 'Купить' },
  notEnough: { uz: "Yetarli rezavor yo'q", ru: 'Недостаточно ягод' },

  // Settings
  addSubject: { uz: "Yangi fan qo'shish", ru: 'Добавить предмет' },
  startRussian: { uz: 'Rus tilini boshlash', ru: 'Начать русский' },
  startMath: { uz: 'Matematikani boshlash', ru: 'Начать математику' },
  startEnglish: { uz: 'Ingliz tilini boshlash', ru: 'Начать английский' },

  // Onboarding
  chooseLanguage: { uz: 'UI tilini tanlang', ru: 'Выберите язык интерфейса' },
  skipTest: { uz: "Testni o'tkazib yuborish", ru: 'Пропустить тест' },
  startFromZero: { uz: 'Noldan boshlash', ru: 'Начать с нуля' },
  checkLevel: { uz: 'Darajamni aniqlash', ru: 'Определить уровень' },

  // Voices
  repeatAfterMe: { uz: 'Men bilan qaytaring:', ru: 'Повторяйте за мной:' },
  sayThisSentence: { uz: "Quyidagi gapni aytib ko'ring:", ru: 'Произнесите это предложение:' },
  wellDone: { uz: "Zo'r! Juda yaxshi!", ru: 'Отлично! Очень хорошо!' },
  tryAgainVoice: { uz: "Qayta urinib ko'ring", ru: 'Попробуйте ещё раз' },
}

export const t = (key, lang = 'uz') => {
  if (!T[key]) return key
  return T[key][lang] || T[key].uz
}
