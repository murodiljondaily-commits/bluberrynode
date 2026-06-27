export default function StepCard({ number, title, desc }) {
  return (
    <div className="flex flex-col items-center text-center gap-4 p-6">
      <div className="w-14 h-14 rounded-full bg-berry-deep flex items-center justify-center text-white text-2xl font-black flex-shrink-0 shadow-lg">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-bold text-berry-deep mb-1">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}
