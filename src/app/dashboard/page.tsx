'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import StatsCard from '@/components/StatsCard'
import RecentCampaigns from '@/components/RecentCampaigns'
import RecentLeads from '@/components/RecentLeads'
import GoogleAccountConnection from '@/components/GoogleAccountConnection'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalCampaigns: 0,
    activeCampaigns: 0,
    emailsSent: 0,
  })

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        fetchStats()
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchStats()
    }
  }, [user])

  const fetchStats = async () => {
    try {
      const [leadsRes, campaignsRes] = await Promise.all([
        fetch('/api/leads?limit=1'),
        fetch('/api/campaigns?limit=1'),
      ])

      const leadsData = await leadsRes.json()
      const campaignsData = await campaignsRes.json()

      setStats({
        totalLeads: leadsData.pagination?.total || 0,
        totalCampaigns: campaignsData.pagination?.total || 0,
        activeCampaigns: campaignsData.campaigns?.filter((c: any) => c.isActive).length || 0,
        emailsSent: 0, // TODO: Calculate from activities
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.name}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your campaigns today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Leads"
            value={stats.totalLeads}
            icon="👥"
            trend="+12%"
            trendUp
          />
          <StatsCard
            title="Total Campaigns"
            value={stats.totalCampaigns}
            icon="📧"
            trend="+5%"
            trendUp
          />
          <StatsCard
            title="Active Campaigns"
            value={stats.activeCampaigns}
            icon="🚀"
            trend="+2%"
            trendUp
          />
          <StatsCard
            title="Emails Sent"
            value={stats.emailsSent}
            icon="📤"
            trend="+18%"
            trendUp
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <RecentCampaigns />
          <RecentLeads />
        </div>

        <div className="mt-8">
          <GoogleAccountConnection />
        </div>
      </div>
    </DashboardLayout>
  )
}
