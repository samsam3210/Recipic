"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CachedDashboard } from "@/components/cached-dashboard"
import { DashboardContent } from "@/components/dashboard-content"
import { useUser } from "@/contexts/user-context"

export default function DashboardPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  console.log('[DashboardPage] 렌더링:', {
    timestamp: new Date().toISOString(),
    hasUser: !!user,
    isLoading,
    userId: user?.id
  })

  useEffect(() => {
    console.log('[DashboardPage] useEffect 실행:', { hasUser: !!user, isLoading })
    if (!isLoading && !user) {
      console.log('[DashboardPage] 리다이렉트 실행')
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    console.log('[DashboardPage] UserProvider 로딩 중')
    return null // UserProvider가 로딩 중
  }

  if (!user) {
    console.log('[DashboardPage] 사용자 없음 - 리다이렉트 중')
    return null // 리다이렉트 중
  }

  console.log('[DashboardPage] CachedDashboard 렌더링 시작')

  return (
    <CachedDashboard user={user}>
      <DashboardContent user={user} />
    </CachedDashboard>
  )
}