export default function HomeStats({
  streak,
  daysCompleted,
  daysRemaining,
}: {
  streak: number
  daysCompleted: number
  daysRemaining: number
}) {
  return (
    <div className="grid w-full max-w-md grid-cols-1 gap-3 min-[360px]:grid-cols-3">
      <StatCard value={streak} label="Current Streak" unit="days" />
      <StatCard value={daysCompleted} label="Days Completed" />
      <StatCard value={daysRemaining} label="Days Remaining" />
    </div>
  )
}

function StatCard({
  value,
  label,
  unit,
}: {
  value: number
  label: string
  unit?: string
}) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-neutral-900 px-3 py-4 text-center">
      <span className="text-3xl font-bold tabular-nums text-[#c9a84c]">{value}</span>
      {unit && (
        <span className="text-[10px] uppercase tracking-wider text-neutral-500">{unit}</span>
      )}
      <span className="mt-1 text-xs text-neutral-400">{label}</span>
    </div>
  )
}
