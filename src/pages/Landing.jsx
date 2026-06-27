import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import BlueberryOrbs from '../components/BlueberryOrbs'
import BlueberryTree from '../components/BlueberryTree'
import FeatureCard from '../components/FeatureCard'
import StepCard from '../components/StepCard'

function ProgressRing({ percent }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = (percent / 100) * circ
  return (
    <svg width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="#E8E0F5" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke="#7B5EA7" strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
      />
      <text x="55" y="55" textAnchor="middle" dominantBaseline="central" className="font-black" style={{ fontFamily: 'Nunito', fontWeight: 900, fontSize: 20, fill: '#3D1F6E' }}>
        {percent}%
      </text>
    </svg>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream font-sans">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-24 pb-16">
        <BlueberryOrbs />
        <BlueberryTree />
        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left: text */}
            <div className="flex flex-col gap-8">
              <div className="inline-flex">
                <span className="bg-berry-glow text-berry-deep rounded-full px-4 py-2 text-sm font-semibold">
                  🫐 AI Murabbiyingiz
                </span>
              </div>

              <div>
                <h1 className="font-black text-6xl md:text-7xl leading-tight text-berry-dark mb-2">
                  Hayotda ravon.
                </h1>
                <h1 className="font-black text-6xl md:text-7xl leading-tight">
                  <span className="text-berry-dark">AI bilan </span>
                  <span className="text-berry-mid italic">kuchli.</span>
                </h1>
              </div>

              <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
                Shaxsiy AI murabbiy — ingliz, rus tili va matematika bo'yicha.
                Oila a'zolari uchun mo'ljallangan.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="bg-berry-deep text-white rounded-full px-8 py-4 text-lg font-bold shadow-xl hover:bg-berry-dark hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  Bepul boshlash <span>→</span>
                </Link>
                <a
                  href="#how"
                  className="border-2 border-berry-mid text-berry-mid rounded-full px-8 py-4 text-lg font-semibold hover:bg-berry-glow transition-all duration-300 flex items-center gap-2"
                >
                  <span>▶</span> Qanday ishlaydi
                </a>
              </div>

              <div className="flex flex-wrap gap-3">
                {['🤖 AI Suhbatlar', '🗺️ Shaxsiy Yo\'l', '📈 Taraqqiyot'].map(pill => (
                  <span key={pill} className="bg-white rounded-full px-4 py-2 shadow-md text-berry-deep text-sm font-semibold">
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: dashboard mockup card */}
            <div className="relative flex justify-center">
              {/* Small floating orbs around card */}
              <div className="absolute -top-6 -left-4 w-10 h-10 rounded-full opacity-30" style={{ background: 'radial-gradient(circle at 30% 30%, #9B7ED4, #3D1F6E)', animation: 'float 5s ease-in-out infinite' }} />
              <div className="absolute -bottom-4 -right-6 w-14 h-14 rounded-full opacity-25" style={{ background: 'radial-gradient(circle at 30% 30%, #9B7ED4, #3D1F6E)', animation: 'float 7s ease-in-out infinite', animationDelay: '1s' }} />
              <div className="absolute top-1/2 -right-8 w-8 h-8 rounded-full opacity-20" style={{ background: 'radial-gradient(circle at 30% 30%, #9B7ED4, #3D1F6E)', animation: 'float 6s ease-in-out infinite', animationDelay: '2s' }} />
              <div className="absolute -top-2 right-16 w-6 h-6 rounded-full opacity-30" style={{ background: 'radial-gradient(circle at 30% 30%, #9B7ED4, #3D1F6E)', animation: 'float 8s ease-in-out infinite', animationDelay: '0.5s' }} />

              <div className="bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm -rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Lesson header */}
                <div className="mb-1">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Bugungi dars</p>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-bold text-berry-deep">Taom buyurtma qilish 🍕</h3>
                    <span className="bg-berry-glow text-berry-mid rounded-full px-2 py-0.5 text-xs font-bold">A2</span>
                  </div>
                  <p className="text-sm text-gray-400">Haqiqiy restoran suhbatini mashq qiling</p>
                </div>

                <Link to="/register" className="block mt-4 bg-berry-deep text-white rounded-full px-6 py-3 font-bold text-center hover:bg-berry-dark transition-colors duration-300">
                  Darsni boshlash →
                </Link>

                <div className="my-5 border-t border-gray-100" />

                {/* Progress */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-2">Taraqqiyotingiz</p>
                    <ProgressRing percent={72} />
                    <p className="text-xs font-bold mt-2" style={{ color: '#5A8A5A' }}>+12% o'tgan haftadan</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="bg-orange-50 text-orange-600 rounded-full px-4 py-2 font-bold text-sm text-center">
                      🔥 7 kunlik streak
                    </div>
                    <div className="bg-berry-glow text-berry-deep rounded-full px-4 py-2 font-bold text-sm text-center">
                      📚 Yangi so'zlar: 12
                    </div>
                    <div className="bg-leaf-light text-leaf rounded-full px-4 py-2 font-bold text-sm text-center">
                      ⭐ Talaffuz: 92%
                    </div>
                  </div>
                </div>

                {/* Daily goal */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                    <span>Kunlik maqsad</span>
                    <span>20 / 30 XP</span>
                  </div>
                  <div className="w-full bg-berry-glow rounded-full h-2.5">
                    <div className="bg-berry-mid h-2.5 rounded-full" style={{ width: '67%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-berry-deep text-white py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { num: '250,000+', label: "o'quvchilar" },
              { num: '1,200+',   label: 'maktablar' },
              { num: '4.9/5',    label: 'reyting ⭐' },
            ].map((stat, i) => (
              <div key={i} className={i < 2 ? 'border-r border-berry-mid/40 pr-4' : ''}>
                <div className="text-4xl font-black mb-1">{stat.num}</div>
                <div className="text-berry-light text-sm font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-cream">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-berry-deep text-center mb-4">
            Nima uchun Blueberry Node?
          </h2>
          <p className="text-center text-gray-500 mb-14 text-lg">
            O'rganishni zavqli va samarali qiladigan xususiyatlar
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="🎤"
              title="Jonli nutq amaliyoti"
              desc="AI murabbiy real vaqtda eshitadi, xatolaringizni tuzatadi va misollar keltiradi. Haqiqiy suhbat tajribasi."
            />
            <FeatureCard
              icon="🧠"
              title="Aqlli takrorlash tizimi"
              desc="Tizim siz unutgan so'zlarni biladi. Keyingi darsdan oldin ularni takrorlashni eslatadi."
            />
            <FeatureCard
              icon="🌱"
              title="O'suvchi ko'chatchangiz"
              desc="O'rganган sari ko'chatchangiz o'sib boradi. Darslarni o'tkazib yubormaslik uchun motivatsiya."
            />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #C9B8E8, #E8E0F5)' }} />
          <div className="absolute bottom-10 left-10 w-20 h-20 rounded-full" style={{ background: 'radial-gradient(circle at 30% 30%, #C9B8E8, #E8E0F5)' }} />
        </div>
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <h2 className="text-4xl font-bold text-berry-deep text-center mb-4">
            Qanday ishlaydi?
          </h2>
          <p className="text-center text-gray-500 mb-14 text-lg">
            To'rt qadam bilan boshlang
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StepCard number="1" title="Ro'yxatdan o'ting" desc="Tezda hisob yarating" />
            <StepCard number="2" title="AI darajangizni aniqlaydi" desc="5 ta savol bilan" />
            <StepCard number="3" title="Shaxsiy yo'l yaratiladi" desc="Sizga mos jadval" />
            <StepCard number="4" title="Har kuni o'sib boring" desc="Ko'chatchangiz bilan birga" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-berry-deep relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-8 left-12 w-24 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle at 30% 30%, #9B7ED4, #fff)' }} />
          <div className="absolute bottom-8 right-16 w-36 h-36 rounded-full opacity-10" style={{ background: 'radial-gradient(circle at 30% 30%, #9B7ED4, #fff)' }} />
        </div>
        <div className="max-w-2xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-black text-white mb-4">Bugun boshlang!</h2>
          <p className="text-berry-light text-lg mb-10">250,000+ o'quvchi bilan qo'shiling. Birinchi hafta bepul.</p>
          <Link
            to="/register"
            className="inline-block bg-white text-berry-deep font-black text-lg px-10 py-5 rounded-full shadow-2xl hover:scale-105 transition-transform duration-300"
          >
            Bepul boshlash →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-berry-dark text-white py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="relative w-8 h-8">
              <div className="absolute w-4 h-4 rounded-full bg-white opacity-90 top-0 left-1" />
              <div className="absolute w-3 h-3 rounded-full bg-white opacity-70 bottom-0 left-0" />
              <div className="absolute w-3 h-3 rounded-full bg-white opacity-70 bottom-0 right-0" />
            </div>
            <span className="font-bold text-xl">Blueberry node</span>
          </div>
          <p className="text-berry-light text-sm mb-4">
            © 2026 Blueberry Node. Barcha huquqlar himoyalangan.
          </p>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-berry-light hover:text-white text-sm transition-colors">Maxfiylik siyosati</a>
            <a href="#" className="text-berry-light hover:text-white text-sm transition-colors">Foydalanish shartlari</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
