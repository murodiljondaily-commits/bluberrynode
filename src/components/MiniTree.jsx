function MLeaf({ cx, cy, r1 = -40, r2 = -15, delay = 0, sz = 1 }) {
  const rx = 10 * sz, ry = 5.5 * sz
  return (
    <>
      <ellipse cx={cx + 1} cy={cy + 2} rx={rx * 0.85} ry={ry * 0.9} fill="#3D6B3D" opacity="0.65"
        transform={`rotate(${r2 + 12},${cx + 1},${cy + 2})`}
        className="svg-center" style={{ animation: `leafFlutter ${2.7 + delay * 0.4}s ease-in-out infinite alternate`, animationDelay: `${delay + 0.5}s` }} />
      <ellipse cx={cx - 1} cy={cy} rx={rx} ry={ry} fill="#5A8A5A" opacity="0.9"
        transform={`rotate(${r1},${cx - 1},${cy})`}
        className="svg-center" style={{ animation: `leafFlutter ${3 + delay * 0.3}s ease-in-out infinite alternate`, animationDelay: `${delay}s` }} />
      <ellipse cx={cx + 2} cy={cy - 1} rx={rx * 0.9} ry={ry} fill="#6B9E5E" opacity="0.85"
        transform={`rotate(${r2},${cx + 2},${cy - 1})`}
        className="svg-center" style={{ animation: `leafFlutter ${2.4 + delay * 0.5}s ease-in-out infinite alternate`, animationDelay: `${delay + 0.3}s` }} />
    </>
  )
}

function MBerry({ cx, cy, r = 6, delay = 0 }) {
  return (
    <>
      <ellipse cx={cx} cy={cy + r + 1.5} rx={r + 2.5} ry={r * 0.35} fill="#3D1F6E" opacity="0.13" />
      <g style={{ animation: `berryBounce ${1.9 + delay * 0.3}s ease-in-out infinite alternate`, animationDelay: `${delay}s` }}>
        <circle cx={cx} cy={cy} r={r} fill="#2D1045" />
        <circle cx={cx + 0.5} cy={cy + 0.5} r={r * 0.82} fill="#6B3FA0" />
        <circle cx={cx - 1} cy={cy - 1.5} r={r * 0.42} fill="#9B6FD4" />
        <circle cx={cx - 1.5} cy={cy - 2} r={r * 0.2} fill="white" opacity="0.85" />
      </g>
    </>
  )
}

/* ── Sprout (streak 0-2) ── */
function Sprout() {
  return (
    <svg width="80" height="100" viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient id="spTrunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#5C3317" />
          <stop offset="50%"  stopColor="#7A4A2A" />
          <stop offset="100%" stopColor="#9B6B3F" />
        </linearGradient>
      </defs>

      <ellipse cx="40" cy="97" rx="20" ry="4" fill="#C9B8E8" opacity="0.2" />

      {/* Trunk */}
      <path d="M 37 97 C 36 82 37 68 38 52 L 42 52 C 42 68 43 82 43 97 Z" fill="url(#spTrunk)" />
      <path d="M 37 97 C 36 82 36 68 37 53 L 39 53 C 38 68 38 82 39 97 Z" fill="#5C3317" opacity="0.3" />
      <path d="M 41 96 C 42 82 42 68 41 53 L 42 53 C 43 68 43 82 42 96 Z" fill="#9B6B3F" opacity="0.4" />
      <path d="M 38 76 Q 43 73 41 71" stroke="#4A2810" strokeWidth="1.2" fill="none" opacity="0.35" />

      {/* Root flare */}
      <path d="M 30 100 Q 36 95 37 97" stroke="#5C3317" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 50 100 Q 44 95 43 97" stroke="#5C3317" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6" />

      {/* Left tiny branch */}
      <g style={{ transformOrigin: '38px 70px', animation: 'branchSway 5s ease-in-out infinite alternate' }}>
        <path d="M 38 70 Q 28 65 20 62" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <MLeaf cx={18} cy={60} r1={-55} r2={-28} delay={0} sz={0.85} />
      </g>

      {/* Right tiny branch */}
      <g style={{ transformOrigin: '42px 64px', animation: 'branchSway 5.5s ease-in-out infinite alternate-reverse' }}>
        <path d="M 42 64 Q 52 59 60 56" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <MLeaf cx={62} cy={54} r1={10} r2={38} delay={0.4} sz={0.85} />
      </g>

      {/* Top leaves (no branch) */}
      <MLeaf cx={40} cy={48} r1={-30} r2={5} delay={0.2} sz={0.9} />
    </svg>
  )
}

/* ── Sapling (streak 3-6) ── */
function Sapling() {
  return (
    <svg width="100" height="140" viewBox="0 0 100 140" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient id="saTrunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#5C3317" />
          <stop offset="50%"  stopColor="#7A4A2A" />
          <stop offset="100%" stopColor="#9B6B3F" />
        </linearGradient>
      </defs>

      <ellipse cx="50" cy="138" rx="26" ry="5.5" fill="#C9B8E8" opacity="0.2" />

      {/* Trunk */}
      <path d="M 47 138 C 45 116 47 96 48 76 C 49 60 49 50 49 40 L 51 40 C 51 50 51 60 52 76 C 53 96 55 116 53 138 Z"
        fill="url(#saTrunk)" />
      <path d="M 47 138 C 45 116 46 96 47 77 L 49 77 C 48 96 48 116 49 138 Z" fill="#5C3317" opacity="0.3" />
      <path d="M 52 137 C 53 116 53 96 52 77 L 53 77 C 54 96 54 116 53 137 Z" fill="#9B6B3F" opacity="0.4" />
      <path d="M 48 108 Q 53 105 51 103" stroke="#4A2810" strokeWidth="1.2" fill="none" opacity="0.35" />
      <path d="M 48 82 Q 52 79 50 77"  stroke="#4A2810" strokeWidth="1.2" fill="none" opacity="0.32" />

      <path d="M 38 141 Q 46 135 47 138" stroke="#5C3317" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.62" />
      <path d="M 62 141 Q 54 135 53 138" stroke="#5C3317" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.62" />

      {/* Left branch */}
      <g style={{ transformOrigin: '48px 108px', animation: 'branchSway 5.5s ease-in-out infinite alternate' }}>
        <path d="M 48 108 Q 36 102 24 97" stroke="#7A4A2A" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 24 97 Q 16 93 10 91" stroke="#7A4A2A" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <MLeaf cx={8} cy={89} r1={-52} r2={-26} delay={0} />
        <MBerry cx={9} cy={86} r={6} delay={0} />
        <MBerry cx={2} cy={85} r={5} delay={0.5} />
      </g>

      {/* Right branch */}
      <g style={{ transformOrigin: '52px 102px', animation: 'branchSway 5s ease-in-out infinite alternate-reverse' }}>
        <path d="M 52 102 Q 64 96 76 91" stroke="#7A4A2A" strokeWidth="5" fill="none" strokeLinecap="round" />
        <path d="M 76 91 Q 84 87 90 85" stroke="#7A4A2A" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <MLeaf cx={92} cy={83} r1={12} r2={38} delay={0.3} />
        <MBerry cx={91} cy={80} r={6} delay={0.2} />
        <MBerry cx={98} cy={79} r={5} delay={0.7} />
      </g>

      {/* Upper-left branch */}
      <g style={{ transformOrigin: '49px 78px', animation: 'branchSway 6s ease-in-out infinite alternate', animationDelay: '0.4s' }}>
        <path d="M 49 78 Q 37 70 27 64" stroke="#7A4A2A" strokeWidth="3.8" fill="none" strokeLinecap="round" />
        <MLeaf cx={24} cy={62} r1={-55} r2={-28} delay={0.2} sz={0.88} />
        <MBerry cx={24} cy={58} r={5.5} delay={0.4} />
      </g>

      {/* Upper-right branch */}
      <g style={{ transformOrigin: '51px 74px', animation: 'branchSway 5.8s ease-in-out infinite alternate-reverse', animationDelay: '0.2s' }}>
        <path d="M 51 74 Q 63 66 73 60" stroke="#7A4A2A" strokeWidth="3.8" fill="none" strokeLinecap="round" />
        <MLeaf cx={75} cy={58} r1={14} r2={40} delay={0.4} sz={0.88} />
        <MBerry cx={75} cy={54} r={5.5} delay={0.6} />
      </g>

      {/* Crown */}
      <MLeaf cx={50} cy={36} r1={-28} r2={8} delay={0.15} sz={0.92} />
    </svg>
  )
}

/* ── Full Tree (streak 7+) ── */
function FullTree() {
  return (
    <svg width="130" height="180" viewBox="0 0 130 180" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <linearGradient id="ftTrunk" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#5C3317" />
          <stop offset="50%"  stopColor="#7A4A2A" />
          <stop offset="100%" stopColor="#9B6B3F" />
        </linearGradient>
      </defs>

      <ellipse cx="65" cy="178" rx="34" ry="7" fill="#C9B8E8" opacity="0.2" />

      {/* Trunk */}
      <path d="M 61 178 C 59 152 62 128 63 105 C 64 84 64 70 64 58 L 66 58 C 66 70 66 84 67 105 C 68 128 71 152 69 178 Z"
        fill="url(#ftTrunk)" />
      <path d="M 61 178 C 59 152 61 128 62 106 L 64 106 C 63 128 62 152 63 178 Z" fill="#5C3317" opacity="0.3" />
      <path d="M 67 177 C 69 152 68 128 67 106 L 68 106 C 69 128 70 152 69 177 Z" fill="#9B6B3F" opacity="0.4" />
      <path d="M 63 144 Q 68 141 66 139" stroke="#4A2810" strokeWidth="1.3" fill="none" opacity="0.35" />
      <path d="M 63 116 Q 67 113 65 111" stroke="#4A2810" strokeWidth="1.3" fill="none" opacity="0.32" />
      <path d="M 64 90 Q 67 87 65 85"   stroke="#4A2810" strokeWidth="1.2" fill="none" opacity="0.28" />

      <path d="M 50 181 Q 60 173 61 178" stroke="#5C3317" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.62" />
      <path d="M 80 181 Q 70 173 69 178" stroke="#5C3317" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.62" />

      {/* Lower-left */}
      <g style={{ transformOrigin: '63px 142px', animation: 'branchSway 6s ease-in-out infinite alternate' }}>
        <path d="M 63 142 Q 48 134 33 127" stroke="#7A4A2A" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 33 127 Q 22 122 13 119" stroke="#7A4A2A" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 30 128 Q 22 118 17 110" stroke="#7A4A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <MLeaf cx={10} cy={117} r1={-55} r2={-28} delay={0} />
        <MLeaf cx={16} cy={108} r1={-65} r2={-38} delay={0.5} sz={0.85} />
        <MBerry cx={11} cy={114} r={6.5} delay={0} />
        <MBerry cx={4}  cy={113} r={5} delay={0.5} />
        <MBerry cx={16} cy={105} r={5} delay={1} />
      </g>

      {/* Lower-right */}
      <g style={{ transformOrigin: '67px 136px', animation: 'branchSway 5.5s ease-in-out infinite alternate-reverse' }}>
        <path d="M 67 136 Q 82 128 97 121" stroke="#7A4A2A" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M 97 121 Q 108 116 117 113" stroke="#7A4A2A" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 100 122 Q 108 112 113 104" stroke="#7A4A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <MLeaf cx={120} cy={111} r1={12} r2={40} delay={0.3} />
        <MLeaf cx={114} cy={102} r1={20} r2={48} delay={0.8} sz={0.85} />
        <MBerry cx={119} cy={108} r={6.5} delay={0.2} />
        <MBerry cx={126} cy={107} r={5} delay={0.7} />
        <MBerry cx={114} cy={99} r={5} delay={1.2} />
      </g>

      {/* Mid-left */}
      <g style={{ transformOrigin: '64px 112px', animation: 'branchSway 7s ease-in-out infinite alternate', animationDelay: '0.5s' }}>
        <path d="M 64 112 Q 48 103 33 95" stroke="#7A4A2A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M 33 95 Q 22 89 14 84" stroke="#7A4A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <MLeaf cx={11} cy={82} r1={-52} r2={-25} delay={0.2} sz={0.9} />
        <MBerry cx={11} cy={79} r={6} delay={0.3} />
        <MBerry cx={4}  cy={78} r={4.5} delay={0.8} />
      </g>

      {/* Mid-right */}
      <g style={{ transformOrigin: '66px 107px', animation: 'branchSway 6.5s ease-in-out infinite alternate-reverse', animationDelay: '0.3s' }}>
        <path d="M 66 107 Q 82 98 97 90" stroke="#7A4A2A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        <path d="M 97 90 Q 108 84 116 79" stroke="#7A4A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <MLeaf cx={119} cy={77} r1={15} r2={42} delay={0.4} sz={0.9} />
        <MBerry cx={119} cy={74} r={6} delay={0.5} />
        <MBerry cx={126} cy={73} r={4.5} delay={1} />
      </g>

      {/* Upper-left */}
      <g style={{ transformOrigin: '64px 86px', animation: 'branchSway 5s ease-in-out infinite alternate', animationDelay: '0.2s' }}>
        <path d="M 64 86 Q 50 74 38 65" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M 38 65 Q 28 58 21 51" stroke="#7A4A2A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <MLeaf cx={18} cy={49} r1={-60} r2={-32} delay={0} sz={0.88} />
        <MBerry cx={19} cy={46} r={5.5} delay={0.1} />
        <MBerry cx={12} cy={45} r={4.5} delay={0.6} />
      </g>

      {/* Upper-right */}
      <g style={{ transformOrigin: '66px 82px', animation: 'branchSway 5.5s ease-in-out infinite alternate-reverse', animationDelay: '0.6s' }}>
        <path d="M 66 82 Q 80 70 92 61" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M 92 61 Q 102 54 109 47" stroke="#7A4A2A" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <MLeaf cx={112} cy={45} r1={18} r2={46} delay={0.3} sz={0.88} />
        <MBerry cx={112} cy={42} r={5.5} delay={0.4} />
        <MBerry cx={119} cy={41} r={4.5} delay={0.9} />
      </g>

      {/* Crown */}
      <g style={{ transformOrigin: '65px 58px', animation: 'branchSway 4.5s ease-in-out infinite alternate', animationDelay: '0.1s' }}>
        <path d="M 65 58 Q 55 46 46 36" stroke="#7A4A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M 65 58 Q 75 46 84 36" stroke="#7A4A2A" strokeWidth="3" fill="none" strokeLinecap="round" />
        <MLeaf cx={44} cy={33} r1={-62} r2={-36} delay={0.1} sz={0.85} />
        <MLeaf cx={85} cy={33} r1={20} r2={48} delay={0.45} sz={0.85} />
        <MLeaf cx={65} cy={28} r1={-22} r2={6} delay={0.25} sz={0.9} />
        <MBerry cx={44} cy={30} r={5} delay={0.2} />
        <MBerry cx={85} cy={30} r={5} delay={0.5} />
        <MBerry cx={65} cy={24} r={6} delay={0.8} />
        <MBerry cx={57} cy={23} r={4.5} delay={1.2} />
        <MBerry cx={73} cy={23} r={4.5} delay={1.5} />
      </g>
    </svg>
  )
}

export default function MiniTree({ streak = 0 }) {
  if (streak <= 2) return <Sprout />
  if (streak <= 6) return <Sapling />
  return <FullTree />
}
