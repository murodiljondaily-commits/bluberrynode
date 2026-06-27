export default function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-white rounded-3xl shadow-lg p-8 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col gap-5">
      <div className="w-16 h-16 rounded-full bg-berry-glow flex items-center justify-center text-3xl flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-bold text-berry-deep mb-2">{title}</h3>
        <p className="text-gray-500 text-base leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
