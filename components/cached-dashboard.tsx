"use client"

import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import type { User } from "@supabase/supabase-js"

interface DashboardCacheData {
  userProfile: any
  recentRecipes: any[]
  isLoading: boolean
}

const DashboardCacheContext = createContext<DashboardCacheData | null>(null)

export function useDashboardCache() {
  const context = useContext(DashboardCacheContext)
  if (!context) {
    throw new Error('useDashboardCache must be used within CachedDashboard')
  }
  return context
}

interface CachedDashboardProps {
  user: User
  initialUserProfile: any
  initialRecentRecipes: any[]
  children: React.ReactNode
}

export function CachedDashboard({ 
  user, 
  initialUserProfile, 
  initialRecentRecipes, 
  children 
}: CachedDashboardProps) {
  // 사용자 프로필 쿼리 (긴 캐시)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getOrCreateUserProfile(user),
    initialData: initialUserProfile,
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false, // 탭 복귀 시 자동 갱신 비활성화
  })

  // 최근 본 레시피 쿼리 (짧은 캐시)
  const { data: recentlyViewedResult, isLoading, isFetching, isInitialLoading } = useQuery({
    queryKey: ['recently-viewed-recipes', user.id],
    queryFn: () => getRecentlyViewedRecipes(),
    initialData: { success: true, recipes: initialRecentRecipes },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    refetchOnWindowFocus: false, // 탭 복귀 시 자동 갱신 비활성화
  })

  const recentRecipes = recentlyViewedResult?.success ? recentlyViewedResult.recipes || [] : []

  const cacheData: DashboardCacheData = {
    userProfile: userProfile || initialUserProfile,
    recentRecipes,
    isLoading: isInitialLoading // 최초 로딩만 표시 (초기 데이터가 있으면 false)
  }

  return (
    <DashboardCacheContext.Provider value={cacheData}>
      {children}
    </DashboardCacheContext.Provider>
  )
}