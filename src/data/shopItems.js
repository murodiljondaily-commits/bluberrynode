export const SHOP_ITEMS = [
  // ─── Garden ───────────────────────────────────────────────────────
  { id: 'flower_patch', name: "Gul bog'chasi",    emoji: '🌸', cost: 300,   category: 'garden',   requiresFarm: false },
  { id: 'new_tree',     name: 'Yangi daraxt',      emoji: '🌳', cost: 1000,  category: 'garden',   requiresFarm: false },
  { id: 'bench',        name: "Bog' o'rindig'i",   emoji: '🪑', cost: 500,   category: 'garden',   requiresFarm: false },
  { id: 'bird_bath',    name: 'Qushlar hovuzi',    emoji: '🐦', cost: 400,   category: 'garden',   requiresFarm: false },
  { id: 'beehive',      name: 'Asalari uyasi',     emoji: '🐝', cost: 600,   category: 'garden',   requiresFarm: false },
  // ─── Animals ──────────────────────────────────────────────────────
  { id: 'goat',  name: 'Echki',  emoji: '🐐', cost: 1800, category: 'animals', requiresFarm: false, isAnimal: true },
  { id: 'sheep', name: "Qo'y",   emoji: '🐑', cost: 2000, category: 'animals', requiresFarm: false, isAnimal: true },
  { id: 'cow',   name: 'Sigir',  emoji: '🐄', cost: 2300, category: 'animals', requiresFarm: false, isAnimal: true },
  { id: 'horse', name: 'Ot',     emoji: '🐴', cost: 3000, category: 'animals', requiresFarm: false, isAnimal: true },
  // ─── Farm (locked until 15000 XP spent or farm bought) ────────────
  { id: 'farm',    name: 'Ferma',    emoji: '🏡', cost: 15000, category: 'farm', requiresFarm: false, isFarm: true },
  { id: 'chicken', name: 'Tovuq',    emoji: '🐓', cost: 500,   category: 'farm', requiresFarm: true,  isAnimal: true },
  { id: 'duck',    name: "O'rdak",   emoji: '🦆', cost: 800,   category: 'farm', requiresFarm: true,  isAnimal: true },
  { id: 'cat',     name: 'Mushuk',   emoji: '🐈', cost: 900,   category: 'farm', requiresFarm: true,  isAnimal: true },
  { id: 'dog',     name: 'It',       emoji: '🐕', cost: 1200,  category: 'farm', requiresFarm: true,  isAnimal: true },
  { id: 'pig',     name: "Cho'chqa", emoji: '🐷', cost: 2500,  category: 'farm', requiresFarm: true,  isAnimal: true },
]

export const ANIMAL_NAMES = {
  goat:    ['Mirzabek', 'Qorabosh', 'Sulton', 'Sarvar', 'Botir'],
  sheep:   ['Oppoq', 'Yulduz', 'Momiq', 'Oqqor', 'Gulbahor'],
  cow:     ['Sariq', 'Maysalar', 'Semiz', 'Botirsoy', 'Qorachiq'],
  horse:   ['Shamol', 'Tez', 'Qoʻngʻir', 'Jahongir', 'Baxtiyor'],
  chicken: ['Qoʻzichoq', 'Chirchi', 'Qizil', 'Sarg\'ich', 'Oʻchqin'],
  duck:    ['Juldur', 'Patali', 'Moviy', 'Kichik', 'Baland'],
  cat:     ['Moshkara', 'Qoʻqon', 'Mishiq', 'Oqpati', 'Sariqcha'],
  dog:     ['Sadiq', 'Qorachiq', 'Zorli', 'Dovul', 'Bahodur'],
  pig:     ['Semiz', 'Qizg\'ish', 'Gulnor', 'Botirbek', 'Toʻlgʻin'],
}

export const ANIMAL_FACTS = {
  goat:    "Echkilar juda aqlli hayvonlar! Ular 300 metr balandlikdagi qoyalarda yura olishadi.",
  sheep:   "Qo'ylar 50 dan ortiq boshqa qo'yni taniydi va yuzlarini eslab qoladi!",
  cow:     "Sigirlar kuniga 8 soat uxlaydi va har kuni 200 litr suv ichadi.",
  horse:   "Otlar tik turgan holda ham uxlashadi! Ular daqiqada 30 km chopishi mumkin.",
  chicken: "Tovuqlar har kuni tuxum qo'yadi. Ular 100 ga yaqin tovuq do'stini taniydi!",
  duck:    "O'rdaklar suvda suzayotganda uxlay olishadi. Ular juda ziyrak hayvonlar!",
  cat:     "Mushuklarning qulog'i 180 darajaga burilishi mumkin. Ular juda yaxshi eshitishadi!",
  dog:     "Itlar insonning eng qadimgi do'sti. Ular 40 dan ortiq hid ajrata olishadi!",
  pig:     "Cho'chqalar aslida juda aqlli hayvonlar — otlardan ham aqlliroq deyishadi!",
}
