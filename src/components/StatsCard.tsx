interface StatsCardProps {
  title: string
  value: number
  icon: string
  trend?: string
  trendUp?: boolean
}

export default function StatsCard({ title, value, icon, trend, trendUp }: StatsCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {trend && (
            <p className={`text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend} from last month
            </p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  )
}
