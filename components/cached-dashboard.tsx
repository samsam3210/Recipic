"use client"

import { createContext, useContext } from "react"
import { useQuery } from "@tanstack/react-query"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { checkDailyUsage } from "@/lib/actions/usage"
import type { User } from "@supabase/supabase-js"

interface DashboardCacheData {
  userProfile: any
  recentRecipes: any[]
  usageData: {
    currentCount: number
    isAdmin: boolean
  } | null
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
  initialUsageData?: { currentCount: number; isAdmin: boolean } | null
  children: React.ReactNode
}

export function CachedDashboard({ 
  user, 
  initialUserProfile, 
  initialRecentRecipes, 
  initialUsageData = null,
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

  // 사용량 데이터 쿼리 (중간 캐시)
  const { data: usageResult } = useQuery({
    queryKey: ['daily-usage', user.id],
    queryFn: () => checkDailyUsage(),
    initialData: initialUsageData ? { success: true, currentCount: initialUsageData.currentCount, isAdmin: initialUsageData.isAdmin } : null,
    staleTime: 2 * 60 * 1000, // 2분 (사용량은 자주 변경될 수 있음)
    gcTime: 5 * 60 * 1000, // 5분
    refetchOnWindowFocus: false,
  })

  const recentRecipes = recentlyViewedResult?.success ? recentlyViewedResult.recipes || [] : []
  const usageData = usageResult?.success ? {
    currentCount: usageResult.currentCount || 0,
    isAdmin: usageResult.isAdmin || false
  } : initialUsageData

  console.log('[CachedDashboard] 상태:', {
    hasUserProfile: !!(userProfile || initialUserProfile),
    recentRecipesCount: recentRecipes.length,
    hasUsageData: !!usageData,
    isLoadingRecentRecipes: isLoading,
    isFetchingRecentRecipes: isFetching,
    isInitialLoadingRecentRecipes: isInitialLoading
  });

  const cacheData: DashboardCacheData = {
    userProfile: userProfile || initialUserProfile,
    recentRecipes,
    usageData,
    isLoading: false // 항상 캐시된 데이터 즉시 표시 (검색 결과와 동일)
  }

  return (
    <DashboardCacheContext.Provider value={cacheData}>
      {children}
    </DashboardCacheContext.Provider>
  )
}