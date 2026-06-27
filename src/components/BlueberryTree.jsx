/* Reusable sub-components for the hero tree */

function LeafCluster({ cx, cy, r1 = -40, r2 = -18, r3 = 10, delay = 0, sz = 1 }) {
  const rx = 14 * sz, ry = 7.5 * sz
  const d0 = delay, d1 = delay + 0.35, d2 = delay + 0.7
  const t0 = `${2.8 + delay * 0.4}s`, t1 = `${3.3 + delay * 0.3}s`, t2 = `${2.5 + delay * 0.5}s`
  return (
    <>
      {/* back leaf — darker */}
      <ellipse cx={cx + 2} cy={cy + 3} rx={rx * 0.88} ry={ry * 0.9} fill="#3D6B3D" opacity="0.65"
        transform={`rotate(${r3 + 8},${cx + 2},${cy + 3})`}
        className="svg-center" style={{ animation: `leafFlutter ${t2} ease-in-out infinite alternate`, animationDelay: `${d2}s` }} />
      {/* left leaf */}
      <ellipse cx={cx - 2} cy={cy} rx={rx} ry={ry} fill="#5A8A5A" opacity="0.9"
        transform={`rotate(${r1},${cx - 2},${cy})`}
        className="svg-center" style={{ animation: `leafFlutter ${t0} ease-in-out infinite alternate`, animationDelay: `${d0}s` }} />
      {/* right leaf */}
      <ellipse cx={cx + 3} cy={cy - 2} rx={rx * 0.92} ry={ry} fill="#6B9E5E" opacity="0.85"
        transform={`rotate(${r2},${cx + 3},${cy - 2})`}
        className="svg-center" style={{ animation: `leafFlutter ${t1} ease-in-out infinite alternate`, animationDelay: `${d1}s` }} />
      {/* midrib on front leaf */}
      <line x1={cx - 5} y1={cy + 2} x2={cx + 7} y2={cy - 5} stroke="#7AB87A" strokeWidth="0.9" opacity="0.5" />
    </>
  )
}

function Berry({ cx, cy, r = 8, delay = 0 }) {
  return (
    <>
      {/* ground shadow — static */}
      <ellipse cx={cx} cy={cy + r + 2} rx={r + 4} ry={r * 0.38} fill="#3D1F6E" opacity="0.13" />
      {/* stem — static */}
      <path d={`M ${cx} ${cy - r + 1} Q ${cx + 1} ${cy - 3} ${cx} ${cy - 1}`} stroke="#5C3317" strokeWidth="1.4" fill="none" />
      {/* berry layers bounce together */}
      <g style={{ animation: `berryBounce ${2 + delay * 0.28}s ease-in-out infinite alternate`, animationDelay: `${delay}s` }}>
        <circle cx={cx} cy={cy} r={r} fill="#2D1045" />
        <circle cx={cx + 0.7} cy={cy + 0.7} r={r * 0.82} fill="#6B3FA0" />
        <circle cx={cx - 1.5} cy={cy - 2} r={r * 0.44} fill="#9B6FD4" />
        <circle cx={cx - 2} cy={cy - 2.5} r={r * 0.22} fill="white" opacity="0.85" />
      </g>
    </>
  )
}

export default function BlueberryTree() {
  return (
    <div
      className="hidden md:block pointer-events-none absolute"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, opacity: 0.85, width: 220, height: 300 }}
    >
      <svg width="220" height="300" viewBox="0 0 220 300" xmlns="http://www.w3.org/2000/svg" overflow="visible">
        <defs>
          <linearGradient id="htTrunk" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#5C3317" />
            <stop offset="32%"  stopColor="#7A4A2A" />
            <stop offset="72%"  stopColor="#7A4A2A" />
            <stop offset="100%" stopColor="#9B6B3F" />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="110" cy="297" rx="44" ry="8" fill="#C9B8E8" opacity="0.2" />

        {/* ── TRUNK ── */}
        {/* main shape */}
        <path d="M 96 297 C 93 268 100 245 104 220 C 107 196 108 174 108 158 L 112 158 C 112 174 113 196 116 220 C 120 245 127 268 124 297 Z"
          fill="url(#htTrunk)" />
        {/* shadow overlay on left third */}
        <path d="M 96 297 C 93 268 100 245 104 220 C 107 196 107 174 107 160 L 109 160 C 109 174 108 196 109 220 C 112 245 118 268 117 297 Z"
          fill="#5C3317" opacity="0.32" />
        {/* highlight strip on right */}
        <path d="M 120 294 C 124 268 122 245 119 220 C 117 200 115 180 114 162 L 112 162 C 113 180 115 200 116 220 C 119 245 123 268 122 295 Z"
          fill="#9B6B3F" opacity="0.45" />
        {/* bark knots */}
        <path d="M 107 245 Q 115 241 111 238" stroke="#4A2810" strokeWidth="1.5" fill="none" opacity="0.38" />
        <path d="M 106 212 Q 114 208 110 205" stroke="#4A2810" strokeWidth="1.5" fill="none" opacity="0.38" />
        <path d="M 108 182 Q 113 178 111 176" stroke="#4A2810" strokeWidth="1.4" fill="none" opacity="0.3" />
        {/* root flare */}
        <path d="M 85 300 Q 95 290 97 297" stroke="#5C3317" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.65" />
        <path d="M 135 300 Q 125 290 123 297" stroke="#5C3317" strokeWidth="4.5" fill="none" strokeLinecap="round" opacity="0.65" />

        {/* ── GRASS ── */}
        {/* ground mound */}
        <ellipse cx="110" cy="300" rx="58" ry="10" fill="#7AAA6A" opacity="0.22" />
        {/* grass blades — mix of heights and lean directions */}
        <path d="M 72  299 Q 70  289 71  281" stroke="#4A7A4A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M 78  300 Q 79  288 82  279" stroke="#5A8A5A" strokeWidth="2.0" fill="none" strokeLinecap="round" />
        <path d="M 84  299 Q 86  286 85  277" stroke="#6B9E5E" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <path d="M 90  299 Q 88  285 90  276" stroke="#4A7A4A" strokeWidth="1.9" fill="none" strokeLinecap="round" />
        <path d="M 96  299 Q 97  287 100 279" stroke="#5A8A5A" strokeWidth="2.0" fill="none" strokeLinecap="round" />
        <path d="M 103 299 Q 102 284 103 275" stroke="#3D6B3D" strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <path d="M 117 299 Q 118 285 117 276" stroke="#3D6B3D" strokeWidth="2.1" fill="none" strokeLinecap="round" />
        <path d="M 124 299 Q 126 287 124 279" stroke="#5A8A5A" strokeWidth="2.0" fill="none" strokeLinecap="round" />
        <path d="M 130 299 Q 132 285 130 276" stroke="#4A7A4A" strokeWidth="1.9" fill="none" strokeLinecap="round" />
        <path d="M 136 299 Q 134 286 136 277" stroke="#6B9E5E" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <path d="M 142 300 Q 144 288 141 279" stroke="#5A8A5A" strokeWidth="2.0" fill="none" strokeLinecap="round" />
        <path d="M 148 299 Q 150 289 148 281" stroke="#4A7A4A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* shorter front blades for layered depth */}
        <path d="M 76  300 Q 75  294 76  288" stroke="#6B9E5E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 92  300 Q 93  294 91  288" stroke="#5A8A5A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M 109 300 Q 108 294 109 288" stroke="#4A7A4A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M 128 300 Q 129 294 128 288" stroke="#6B9E5E" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M 145 300 Q 147 294 145 288" stroke="#5A8A5A" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* ── LOWER-LEFT BRANCH (sway from base) ── */}
        <g style={{ transformOrigin: '104px 228px', animation: 'branchSway 6s ease-in-out infinite alternate' }}>
          <path d="M 104 228 Q 82 218 60 210" stroke="#7A4A2A" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 60 210 Q 46 205 33 202" stroke="#7A4A2A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          {/* sub-branch */}
          <path d="M 57 212 Q 50 200 45 190" stroke="#7A4A2A" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* leaves at main tip */}
          <LeafCluster cx={30} cy={200} r1={-55} r2={-28} r3={-5} delay={0} />
          {/* leaves at sub-branch tip */}
          <LeafCluster cx={43} cy={187} r1={-65} r2={-42} r3={-18} delay={0.5} sz={0.85} />

          {/* berries at main tip */}
          <Berry cx={32} cy={198} r={8} delay={0} />
          <Berry cx={22} cy={196} r={6.5} delay={0.4} />
          {/* berry at sub tip */}
          <Berry cx={44} cy={185} r={6} delay={0.8} />
        </g>

        {/* ── LOWER-RIGHT BRANCH (sway opposite) ── */}
        <g style={{ transformOrigin: '116px 222px', animation: 'branchSway 5.5s ease-in-out infinite alternate-reverse' }}>
          <path d="M 116 222 Q 140 212 162 206" stroke="#7A4A2A" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 162 206 Q 176 202 188 200" stroke="#7A4A2A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          {/* sub-branch */}
          <path d="M 160 208 Q 168 196 174 186" stroke="#7A4A2A" strokeWidth="3" fill="none" strokeLinecap="round" />

          <LeafCluster cx={190} cy={198} r1={10} r2={34} r3={58} delay={0.3} />
          <LeafCluster cx={176} cy={184} r1={18} r2={44} r3={65} delay={0.6} sz={0.85} />

          <Berry cx={188} cy={196} r={8} delay={0.2} />
          <Berry cx={198} cy={194} r={6.5} delay={0.6} />
          <Berry cx={175} cy={182} r={6} delay={1} />
        </g>

        {/* ── MID-LEFT BRANCH ── */}
        <g style={{ transformOrigin: '106px 196px', animation: 'branchSway 7s ease-in-out infinite alternate', animationDelay: '0.8s' }}>
          <path d="M 106 196 Q 78 184 52 172" stroke="#7A4A2A" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          <path d="M 52 172 Q 38 166 24 162" stroke="#7A4A2A" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* sub-branch */}
          <path d="M 48 174 Q 40 162 34 152" stroke="#7A4A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          <LeafCluster cx={21} cy={160} r1={-50} r2={-25} r3={2} delay={0.2} />
          <LeafCluster cx={32} cy={150} r1={-60} r2={-38} r3={-15} delay={0.7} sz={0.82} />

          <Berry cx={22} cy={157} r={7.5} delay={0.3} />
          <Berry cx={13} cy={156} r={6} delay={0.9} />
        </g>

        {/* ── MID-RIGHT BRANCH ── */}
        <g style={{ transformOrigin: '114px 192px', animation: 'branchSway 6.5s ease-in-out infinite alternate-reverse', animationDelay: '0.5s' }}>
          <path d="M 114 192 Q 142 180 168 170" stroke="#7A4A2A" strokeWidth="6.5" fill="none" strokeLinecap="round" />
          <path d="M 168 170 Q 182 165 196 162" stroke="#7A4A2A" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* sub-branch */}
          <path d="M 166 172 Q 174 160 180 150" stroke="#7A4A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          <LeafCluster cx={198} cy={160} r1={5} r2={28} r3={52} delay={0.4} />
          <LeafCluster cx={180} cy={148} r1={15} r2={38} r3={60} delay={0.9} sz={0.82} />

          <Berry cx={198} cy={157} r={7.5} delay={0.5} />
          <Berry cx={207} cy={156} r={6} delay={1.1} />
        </g>

        {/* ── UPPER-LEFT BRANCH ── */}
        <g style={{ transformOrigin: '107px 168px', animation: 'branchSway 5s ease-in-out infinite alternate', animationDelay: '0.3s' }}>
          <path d="M 107 168 Q 88 152 70 140" stroke="#7A4A2A" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M 70 140 Q 58 132 48 124" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 67 142 Q 58 128 52 118" stroke="#7A4A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          <LeafCluster cx={44} cy={122} r1={-58} r2={-32} r3={-8} delay={0.1} />
          <LeafCluster cx={50} cy={115} r1={-68} r2={-44} r3={-22} delay={0.5} sz={0.85} />

          <Berry cx={45} cy={119} r={7} delay={0.2} />
          <Berry cx={36} cy={118} r={5.5} delay={0.7} />
          <Berry cx={50} cy={112} r={5.5} delay={1.2} />
        </g>

        {/* ── UPPER-RIGHT BRANCH ── */}
        <g style={{ transformOrigin: '113px 168px', animation: 'branchSway 5.5s ease-in-out infinite alternate-reverse', animationDelay: '0.6s' }}>
          <path d="M 113 168 Q 132 152 150 140" stroke="#7A4A2A" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M 150 140 Q 162 132 172 124" stroke="#7A4A2A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M 152 141 Q 162 127 168 117" stroke="#7A4A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          <LeafCluster cx={174} cy={122} r1={8} r2={33} r3={58} delay={0.35} />
          <LeafCluster cx={168} cy={114} r1={18} r2={44} r3={66} delay={0.8} sz={0.85} />

          <Berry cx={174} cy={119} r={7} delay={0.4} />
          <Berry cx={183} cy={118} r={5.5} delay={0.9} />
          <Berry cx={168} cy={111} r={5.5} delay={1.4} />
        </g>

        {/* ── TOP BRANCH ── */}
        <g style={{ transformOrigin: '110px 158px', animation: 'branchSway 4.5s ease-in-out infinite alternate', animationDelay: '0.2s' }}>
          {/* center spine — connects crown cluster straight to trunk top */}
          <path d="M 110 158 Q 110 143 110 124" stroke="#7A4A2A" strokeWidth="3.8" fill="none" strokeLinecap="round" />
          {/* top-left */}
          <path d="M 110 158 Q 96 143 83 130" stroke="#7A4A2A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M 83 130 Q 74 121 68 112" stroke="#7A4A2A" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          {/* top-right */}
          <path d="M 110 158 Q 124 143 137 130" stroke="#7A4A2A" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M 137 130 Q 146 121 152 112" stroke="#7A4A2A" strokeWidth="2.8" fill="none" strokeLinecap="round" />

          {/* left tip cluster */}
          <LeafCluster cx={65} cy={109} r1={-62} r2={-38} r3={-14} delay={0} sz={0.9} />
          {/* right tip cluster */}
          <LeafCluster cx={153} cy={109} r1={14} r2={38} r3={62} delay={0.45} sz={0.9} />
          {/* crown center — now attached to spine tip at y≈120 */}
          <LeafCluster cx={110} cy={118} r1={-28} r2={0} r3={28} delay={0.25} sz={0.92} />

          {/* left tip berries */}
          <Berry cx={64} cy={106} r={7}   delay={0.1} />
          <Berry cx={56} cy={105} r={5.5} delay={0.6} />
          {/* right tip berries */}
          <Berry cx={154} cy={106} r={7}   delay={0.35} />
          <Berry cx={162} cy={105} r={5.5} delay={0.85} />
          {/* crown center berries — at spine tip */}
          <Berry cx={110} cy={112} r={8}   delay={0.55} />
          <Berry cx={103} cy={113} r={5.5} delay={1.1} />
          <Berry cx={117} cy={113} r={5.5} delay={1.4} />
        </g>
      </svg>
    </div>
  )
}
