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
  children: React.ReactNode
}

export function CachedSettings({ 
  user, 
  children 
}: CachedSettingsProps) {
  // 사용자 프로필 쿼리 (긴 캐시 - 설정에서만 수정되므로)
  const { data: userProfile, isLoading, isInitialLoading } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getOrCreateUserProfile(user),
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  const cacheData: SettingsCacheData = {
    userProfile: userProfile,
    isLoading: isLoading || isInitialLoading || !userProfile // 실제 로딩 상태 반영
  }

  return (
    <SettingsCacheContext.Provider value={cacheData}>
      {children}
    </SettingsCacheContext.Provider>
  )
}