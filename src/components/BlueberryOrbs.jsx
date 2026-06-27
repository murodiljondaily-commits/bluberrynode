const COLORS = [
  'radial-gradient(circle at 35% 35%, #5B2D8A, #2D1054)', // deep
  'radial-gradient(circle at 30% 30%, #8B5FD4, #4A2080)', // mid
  'radial-gradient(circle at 40% 25%, #B8A0E8, #6B4AAF)', // light
]

const ANIMS = ['float', 'floatDiag1', 'floatDiag2', 'floatRotate']

const blobs = [
  { size: 120, top: '5%',  left: '2%',   delay: '0s',    dur: '7s',   opacity: 0.65, c: 0, a: 0, br: '60% 40% 55% 45% / 45% 55% 40% 60%' },
  { size: 80,  top: '15%', right: '5%',  delay: '1.5s',  dur: '9s',   opacity: 0.48, c: 1, a: 1, br: '40% 60% 45% 55% / 55% 45% 60% 40%' },
  { size: 60,  top: '55%', left: '1%',   delay: '2s',    dur: '6s',   opacity: 0.62, c: 0, a: 2, br: '50% 50% 30% 70% / 40% 60% 50% 50%' },
  { size: 100, top: '70%', right: '3%',  delay: '0.8s',  dur: '10s',  opacity: 0.52, c: 1, a: 0, br: '70% 30% 60% 40% / 30% 70% 40% 60%' },
  { size: 50,  top: '35%', left: '8%',   delay: '3s',    dur: '8s',   opacity: 0.68, c: 0, a: 3, br: '45% 55% 70% 30% / 60% 40% 35% 65%' },
  { size: 70,  top: '80%', left: '15%',  delay: '1s',    dur: '11s',  opacity: 0.42, c: 2, a: 1, br: '35% 65% 40% 60% / 65% 35% 55% 45%' },
  { size: 88,  top: '10%', left: '42%',  delay: '2.5s',  dur: '7.5s', opacity: 0.30, c: 2, a: 0, br: '65% 35% 50% 50% / 35% 65% 45% 55%' },
  { size: 45,  top: '60%', right: '12%', delay: '0.5s',  dur: '8.5s', opacity: 0.60, c: 0, a: 2, br: '55% 45% 65% 35% / 50% 50% 60% 40%' },
  { size: 65,  top: '88%', right: '20%', delay: '3.5s',  dur: '9.5s', opacity: 0.45, c: 1, a: 3, br: '30% 70% 55% 45% / 45% 55% 30% 70%' },
  { size: 55,  top: '25%', right: '18%', delay: '1.8s',  dur: '12s',  opacity: 0.32, c: 2, a: 0, br: '75% 25% 45% 55% / 25% 75% 55% 45%' },
  { size: 140, top: '45%', right: '1%',  delay: '4s',    dur: '10s',  opacity: 0.58, c: 0, a: 1, br: '42% 58% 38% 62% / 58% 42% 62% 38%' },
  { size: 38,  top: '90%', left: '5%',   delay: '0.3s',  dur: '6.5s', opacity: 0.66, c: 0, a: 2, br: '68% 32% 52% 48% / 32% 68% 48% 52%' },
  { size: 75,  top: '3%',  right: '25%', delay: '2.2s',  dur: '8s',   opacity: 0.28, c: 2, a: 3, br: '38% 62% 72% 28% / 62% 38% 28% 72%' },
  { size: 30,  top: '50%', left: '20%',  delay: '1.2s',  dur: '5s',   opacity: 0.70, c: 0, a: 0, br: '58% 42% 25% 75% / 42% 58% 75% 25%' },
  { size: 85,  top: '30%', left: '3%',   delay: '3.8s',  dur: '11s',  opacity: 0.43, c: 1, a: 1, br: '48% 52% 62% 38% / 52% 48% 38% 62%' },
  { size: 48,  top: '75%', left: '35%',  delay: '0.7s',  dur: '7s',   opacity: 0.57, c: 0, a: 2, br: '72% 28% 48% 52% / 28% 72% 52% 48%' },
  { size: 110, top: '20%', left: '12%',  delay: '2.8s',  dur: '9s',   opacity: 0.33, c: 2, a: 3, br: '33% 67% 58% 42% / 67% 33% 42% 58%' },
  { size: 62,  top: '65%', right: '8%',  delay: '1.3s',  dur: '8s',   opacity: 0.50, c: 1, a: 0, br: '62% 38% 33% 67% / 38% 62% 67% 33%' },
]

export default function BlueberryOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            right: b.right,
            opacity: b.opacity,
            position: 'absolute',
            borderRadius: b.br,
            background: COLORS[b.c],
            animation: `${ANIMS[b.a]} ${b.dur} ease-in-out infinite`,
            animationDirection: 'alternate',
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  )
}
