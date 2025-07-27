"use client"

import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/db/schema"

interface SettingsCacheData {
  userProfile: Profile
  isLoading: boolean
}

const SettingsCacheContext = createContext<SettingsCacheData | null>(null)

export function useSettingsCache() {
  const context = useContext(SettingsCacheContext)
  if (!context) {
    throw new Error('useSettingsCache must be used within CachedSettings')
  }
  return context
}

interface CachedSettingsProps {
  user: User
  initialUserProfile: Profile
  children: React.ReactNode
}

export function CachedSettings({ 
  user, 
  initialUserProfile,
  children 
}: CachedSettingsProps) {
  // 사용자 프로필 쿼리 (긴 캐시 - 설정에서만 수정되므로)
  const { data: userProfile, isLoading, isInitialLoading } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getOrCreateUserProfile(user),
    initialData: initialUserProfile,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false, // 탭 복귀 시 자동 갱신 비활성화
  })

  const cacheData: SettingsCacheData = {
    userProfile: userProfile || initialUserProfile,
    isLoading: isInitialLoading // 최초 로딩만 표시 (초기 데이터가 있으면 false)
  }

  return (
    <SettingsCacheContext.Provider value={cacheData}>
      {children}
    </SettingsCacheContext.Provider>
  )
}