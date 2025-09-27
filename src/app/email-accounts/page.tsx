'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import GoogleAccountConnection from '@/components/GoogleAccountConnection'
import EmailAccountSettingsModal from '@/components/EmailAccountSettingsModal'

interface EmailAccount {
  id: string
  email: string
  name: string | null
  dailyLimit: number
  isActive: boolean
  connectedAt: string
}

export default function EmailAccountsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        fetchEmailAccounts()
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

  const fetchEmailAccounts = async () => {
    try {
      const response = await fetch('/api/email-accounts')
      if (response.ok) {
        const data = await response.json()
        setEmailAccounts(data.emailAccounts || [])
      }
    } catch (error) {
      console.error('Failed to fetch email accounts:', error)
    }
  }

  const handleEditSettings = (account: EmailAccount) => {
    setSelectedAccount(account)
    setShowSettingsModal(true)
  }

  const handleSettingsSuccess = () => {
    fetchEmailAccounts()
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
            Email Accounts
          </h1>
          <p className="text-gray-600 mt-2">
            Manage your connected email accounts for sending campaigns.
          </p>
        </div>

        <GoogleAccountConnection onEditSettings={handleEditSettings} />
      </div>

      {/* Email Account Settings Modal */}
      <EmailAccountSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSuccess={handleSettingsSuccess}
        account={selectedAccount}
      />
    </DashboardLayout>
  )
}
