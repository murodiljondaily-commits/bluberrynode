// Spider-web knowledge-graph curriculum. Each node: { id, topic, level, connects[], uz, ru, x, y }
// x/y are SVG coordinates on a ~1000-wide canvas; the web grows outward as levels rise.

export const CURRICULUM = {
  english: [
    // A0 — Absolute Beginner (center cluster)
    { id: 1,  topic: 'Greetings',           level: 'A0', connects: [2, 3],        uz: 'Salomlashish',        ru: 'Приветствия',            x: 500, y: 500 },
    { id: 2,  topic: 'Numbers 1-20',        level: 'A0', connects: [1, 4, 5],     uz: 'Sonlar 1-20',         ru: 'Числа 1-20',             x: 380, y: 420 },
    { id: 3,  topic: 'Colors',              level: 'A0', connects: [1, 6],        uz: 'Ranglar',             ru: 'Цвета',                  x: 620, y: 420 },
    { id: 4,  topic: 'Family',              level: 'A0', connects: [2, 7],        uz: "Oila",                ru: 'Семья',                  x: 280, y: 340 },
    { id: 5,  topic: 'Body Parts',          level: 'A0', connects: [2, 8],        uz: "Tana a'zolari",       ru: 'Части тела',             x: 420, y: 300 },
    { id: 6,  topic: 'Food & Drinks',       level: 'A0', connects: [3, 9],        uz: 'Ovqat va ichimliklar',ru: 'Еда и напитки',          x: 700, y: 340 },
    // A1 — Elementary
    { id: 7,  topic: 'Present Simple',      level: 'A1', connects: [4, 5, 10, 11],uz: 'Present Simple',      ru: 'Настоящее простое',      x: 250, y: 220 },
    { id: 8,  topic: 'Daily Routines',      level: 'A1', connects: [5, 7, 12],    uz: 'Kundalik odatlar',    ru: 'Ежедневные дела',        x: 420, y: 180 },
    { id: 9,  topic: 'Animals',             level: 'A1', connects: [6, 13],       uz: 'Hayvonlar',           ru: 'Животные',               x: 760, y: 260 },
    { id: 10, topic: 'Present Continuous',  level: 'A1', connects: [7, 14],       uz: 'Present Continuous',  ru: 'Настоящее длительное',   x: 160, y: 140 },
    { id: 11, topic: 'Adjectives',          level: 'A1', connects: [7, 8, 15],    uz: 'Sifatlar',            ru: 'Прилагательные',         x: 300, y: 100 },
    { id: 12, topic: 'Time & Days',         level: 'A1', connects: [8, 11, 16],   uz: 'Vaqt va kunlar',      ru: 'Время и дни',            x: 500, y:  80 },
    { id: 13, topic: 'Places',              level: 'A1', connects: [9, 17],       uz: 'Joylar',              ru: 'Места',                  x: 820, y: 160 },
    // A2 — Pre-Intermediate
    { id: 14, topic: 'Past Simple',         level: 'A2', connects: [10, 11, 18],  uz: 'Past Simple',         ru: 'Прошедшее простое',      x:  80, y:  60 },
    { id: 15, topic: 'Comparatives',        level: 'A2', connects: [11, 12, 19],  uz: 'Taqqoslash',          ru: 'Сравнительная степень',  x: 260, y:  20 },
    { id: 16, topic: 'Future Simple',       level: 'A2', connects: [12, 20],      uz: 'Future Simple',       ru: 'Будущее простое',        x: 500, y:   0 },
    { id: 17, topic: 'Prepositions',        level: 'A2', connects: [13, 21],      uz: 'Predloglar',          ru: 'Предлоги',               x: 860, y:  60 },
    { id: 18, topic: 'Past Continuous',     level: 'A2', connects: [14, 15, 22],  uz: 'Past Continuous',     ru: 'Прошедшее длительное',   x:  60, y: -40 },
    { id: 19, topic: 'Modal Verbs',         level: 'A2', connects: [15, 16, 23],  uz: "Modal fe'llar",       ru: 'Модальные глаголы',      x: 340, y: -60 },
    { id: 20, topic: 'Future Plans',        level: 'A2', connects: [16, 19, 24],  uz: 'Kelajak rejalari',    ru: 'Планы на будущее',       x: 600, y: -60 },
    // B1+ (outer web)
    { id: 21, topic: 'Present Perfect',     level: 'B1', connects: [17, 18, 25],  uz: 'Present Perfect',     ru: 'Настоящее совершенное',  x: 900, y: -20 },
    { id: 22, topic: 'Conditionals 1',      level: 'B1', connects: [18, 19, 26],  uz: 'Shart gap 1',         ru: 'Условное 1',             x: 100, y:-140 },
    { id: 23, topic: 'Passive Voice',       level: 'B1', connects: [19, 20, 27],  uz: 'Passiv nisbat',       ru: 'Страдательный залог',    x: 420, y:-160 },
    { id: 24, topic: 'Reported Speech',     level: 'B1', connects: [20, 21, 28],  uz: 'Bilvosita nutq',      ru: 'Косвенная речь',         x: 700, y:-140 },
    { id: 25, topic: 'Phrasal Verbs',       level: 'B1', connects: [21],          uz: "Frazeologik fe'llar", ru: 'Фразовые глаголы',        x: 960, y:-120 },
    { id: 26, topic: 'Conditionals 2&3',    level: 'B2', connects: [22, 23],      uz: 'Shart gap 2&3',       ru: 'Условное 2 и 3',         x: 160, y:-240 },
    { id: 27, topic: 'Advanced Idioms',     level: 'B2', connects: [23, 24],      uz: 'Murakkab idiomalar',  ru: 'Продвинутые идиомы',      x: 500, y:-260 },
    { id: 28, topic: 'Academic Writing',    level: 'B2', connects: [24, 25],      uz: 'Akademik yozuv',      ru: 'Академическое письмо',    x: 800, y:-240 },
  ],
  russian: [
    { id: 1,  topic: 'Кириллица',           level: 'A0', connects: [2, 3],        uz: 'Kiril alifbosi',      ru: 'Кириллица',              x: 500, y: 500 },
    { id: 2,  topic: 'Приветствия',         level: 'A0', connects: [1, 4, 5],     uz: 'Salomlashish',        ru: 'Приветствия',            x: 380, y: 420 },
    { id: 3,  topic: 'Числа 1-20',          level: 'A0', connects: [1, 6],        uz: 'Sonlar',              ru: 'Числа 1-20',             x: 620, y: 420 },
    { id: 4,  topic: 'Семья',               level: 'A0', connects: [2, 7],        uz: 'Oila',                ru: 'Семья',                  x: 280, y: 340 },
    { id: 5,  topic: 'Цвета',               level: 'A0', connects: [2, 8],        uz: 'Ranglar',             ru: 'Цвета',                  x: 420, y: 300 },
    { id: 6,  topic: 'Еда',                 level: 'A0', connects: [3, 9],        uz: 'Ovqat',               ru: 'Еда',                    x: 700, y: 340 },
    { id: 7,  topic: 'Настоящее время',     level: 'A1', connects: [4, 5, 10],    uz: 'Hozirgi zamon',       ru: 'Настоящее время',        x: 250, y: 220 },
    { id: 8,  topic: 'Падежи (осн.)',       level: 'A1', connects: [5, 7, 11],    uz: 'Kelishiklar',         ru: 'Падежи (основные)',      x: 420, y: 180 },
    { id: 9,  topic: 'Глаголы движения',    level: 'A1', connects: [6, 12],       uz: "Harakat fe'llari",    ru: 'Глаголы движения',       x: 760, y: 260 },
    { id: 10, topic: 'Прошедшее время',     level: 'A1', connects: [7, 8, 13],    uz: "O'tgan zamon",        ru: 'Прошедшее время',        x: 160, y: 140 },
    { id: 11, topic: 'Прилагательные',      level: 'A1', connects: [8, 14],       uz: 'Sifatlar',            ru: 'Прилагательные',         x: 300, y: 100 },
    { id: 12, topic: 'Будущее время',       level: 'A1', connects: [9, 10, 15],   uz: 'Kelasi zamon',        ru: 'Будущее время',          x: 820, y: 160 },
    { id: 13, topic: 'Все падежи',          level: 'A2', connects: [10, 11],      uz: 'Barcha kelishiklar',  ru: 'Все падежи',             x:  80, y:  60 },
    { id: 14, topic: 'Виды глагола',        level: 'A2', connects: [11, 12],      uz: "Fe'l turlari",        ru: 'Виды глагола',           x: 260, y:  20 },
    { id: 15, topic: 'Условные пред.',      level: 'A2', connects: [12],          uz: 'Shart gaplar',        ru: 'Условные предложения',    x: 860, y:  60 },
  ],
  math: [
    { id: 1,  topic: 'Sonlar va hisoblash', level: 'A0', connects: [2, 3],        uz: 'Sonlar va hisoblash', ru: 'Числа и счёт',           x: 500, y: 500 },
    { id: 2,  topic: "Qo'shish va ayirish", level: 'A0', connects: [1, 4, 5],     uz: "Qo'shish va ayirish", ru: 'Сложение и вычитание',   x: 380, y: 420 },
    { id: 3,  topic: "Ko'paytirish jadvali",level: 'A0', connects: [1, 6],        uz: "Ko'paytirish jadvali",ru: 'Таблица умножения',      x: 620, y: 420 },
    { id: 4,  topic: "Bo'lish",             level: 'A0', connects: [2, 7],        uz: "Bo'lish",             ru: 'Деление',                x: 280, y: 340 },
    { id: 5,  topic: 'Juft va toq sonlar',  level: 'A0', connects: [2, 8],        uz: 'Juft va toq',         ru: 'Чётные и нечётные',      x: 420, y: 300 },
    { id: 6,  topic: 'Kasrlar',             level: 'A1', connects: [3, 9],        uz: 'Kasrlar',             ru: 'Дроби',                  x: 700, y: 340 },
    { id: 7,  topic: 'Foizlar',             level: 'A1', connects: [4, 6, 10],    uz: 'Foizlar',             ru: 'Проценты',               x: 250, y: 220 },
    { id: 8,  topic: "O'lchov birliklari",  level: 'A1', connects: [5, 7, 11],    uz: "O'lchov birliklari",  ru: 'Единицы измерения',      x: 420, y: 180 },
    { id: 9,  topic: 'Geometriya asoslari', level: 'A1', connects: [6, 12],       uz: 'Geometriya',          ru: 'Основы геометрии',       x: 760, y: 260 },
    { id: 10, topic: 'Oddiy tenglamalar',   level: 'A2', connects: [7, 8, 13],    uz: 'Tenglamalar',         ru: 'Простые уравнения',      x: 160, y: 140 },
    { id: 11, topic: 'Nisbatlar',           level: 'A2', connects: [8, 14],       uz: 'Nisbatlar',           ru: 'Соотношения',            x: 300, y: 100 },
    { id: 12, topic: 'Yuza va hajm',        level: 'A2', connects: [9, 10],       uz: 'Yuza va hajm',        ru: 'Площадь и объём',        x: 820, y: 160 },
  ],
}

export const getCurriculumNode = (subject, id) =>
  (CURRICULUM[subject] || CURRICULUM.english).find((n) => n.id === Number(id))
