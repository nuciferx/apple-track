export default function StatCard({
  label, value, sub
}: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-white/50 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-white/40 text-xs">{sub}</p>}
    </div>
  )
}
