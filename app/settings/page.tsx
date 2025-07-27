"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { CachedSettings } from "@/components/cached-settings"
import { SettingsContent } from "@/components/settings-content"
import { useUser } from "@/contexts/user-context"

export default function SettingsPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  console.log('[SettingsPage] 렌더링:', {
    timestamp: new Date().toISOString(),
    hasUser: !!user,
    isLoading,
    userId: user?.id
  })

  useEffect(() => {
    console.log('[SettingsPage] useEffect 실행:', { hasUser: !!user, isLoading })
    if (!isLoading && !user) {
      console.log('[SettingsPage] 리다이렉트 실행')
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    console.log('[SettingsPage] UserProvider 로딩 중')
    return null // UserProvider가 로딩 중
  }

  if (!user) {
    console.log('[SettingsPage] 사용자 없음 - 리다이렉트 중')
    return null // 리다이렉트 중
  }

  console.log('[SettingsPage] CachedSettings 렌더링 시작')

  return (
    <CachedSettings user={user}>
      <SettingsContent user={user} />
    </CachedSettings>
  )
}