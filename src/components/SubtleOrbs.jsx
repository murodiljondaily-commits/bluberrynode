const COLORS = [
  'radial-gradient(circle at 35% 35%, #5B2D8A, #2D1054)',
  'radial-gradient(circle at 30% 30%, #8B5FD4, #4A2080)',
  'radial-gradient(circle at 40% 25%, #B8A0E8, #6B4AAF)',
]

const ANIMS = ['float', 'floatDiag1', 'floatDiag2', 'floatRotate']

const blobs = [
  { size: 70, top: '4%',  left: '2%',   delay: '0s',   dur: '8s',   opacity: 0.28, c: 0, a: 0, br: '60% 40% 55% 45% / 45% 55% 40% 60%' },
  { size: 45, top: '18%', right: '4%',  delay: '1.5s', dur: '9s',   opacity: 0.20, c: 1, a: 1, br: '40% 60% 45% 55% / 55% 45% 60% 40%' },
  { size: 80, top: '48%', left: '1%',   delay: '2s',   dur: '7s',   opacity: 0.25, c: 0, a: 2, br: '50% 50% 30% 70% / 40% 60% 50% 50%' },
  { size: 40, top: '72%', right: '3%',  delay: '0.8s', dur: '10s',  opacity: 0.18, c: 2, a: 0, br: '70% 30% 60% 40% / 30% 70% 40% 60%' },
  { size: 55, top: '85%', left: '14%',  delay: '3s',   dur: '8.5s', opacity: 0.22, c: 1, a: 3, br: '45% 55% 70% 30% / 60% 40% 35% 65%' },
  { size: 35, top: '33%', right: '10%', delay: '1s',   dur: '6.5s', opacity: 0.30, c: 0, a: 1, br: '55% 45% 35% 65% / 35% 65% 55% 45%' },
  { size: 50, top: '8%',  left: '44%',  delay: '2.5s', dur: '9.5s', opacity: 0.17, c: 2, a: 2, br: '65% 35% 50% 50% / 50% 50% 35% 65%' },
  { size: 38, top: '58%', left: '28%',  delay: '1.8s', dur: '7.5s', opacity: 0.23, c: 1, a: 0, br: '38% 62% 48% 52% / 62% 38% 52% 48%' },
]

export default function SubtleOrbs() {
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
