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
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  const cacheData: SettingsCacheData = {
    userProfile: userProfile || initialUserProfile,
    isLoading: false // 항상 캐시된 데이터 즉시 표시 (검색 결과와 동일)
  }

  return (
    <SettingsCacheContext.Provider value={cacheData}>
      {children}
    </SettingsCacheContext.Provider>
  )
}