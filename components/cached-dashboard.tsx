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
  children: React.ReactNode
}

export function CachedDashboard({ 
  user, 
  children 
}: CachedDashboardProps) {
  // 사용자 프로필 쿼리 (긴 캐시)
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getOrCreateUserProfile(user),
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  // 최근 본 레시피 쿼리 (짧은 캐시)
  const { data: recentlyViewedResult, isLoading, isFetching, isInitialLoading } = useQuery({
    queryKey: ['recently-viewed-recipes', user.id],
    queryFn: () => getRecentlyViewedRecipes(),
    staleTime: 10 * 60 * 1000, // 10분으로 연장
    gcTime: 20 * 60 * 1000, // 20분으로 연장
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  // 사용량 데이터 쿼리 (중간 캐시)
  const { data: usageResult } = useQuery({
    queryKey: ['daily-usage', user.id],
    queryFn: () => checkDailyUsage(),
    staleTime: 10 * 60 * 1000, // 10분으로 연장
    gcTime: 20 * 60 * 1000, // 20분으로 연장
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  const recentRecipes = recentlyViewedResult?.success ? recentlyViewedResult.recipes || [] : []
  const usageData = usageResult?.success ? {
    currentCount: usageResult.currentCount || 0,
    isAdmin: usageResult.isAdmin || false
  } : null

  console.log('[CachedDashboard] 상태:', {
    timestamp: new Date().toISOString(),
    hasUserProfile: !!userProfile,
    userProfileNickname: userProfile?.nickname,
    recentRecipesCount: recentRecipes.length,
    hasUsageData: !!usageData,
    usageCurrentCount: usageData?.currentCount,
    isLoadingRecentRecipes: isLoading,
    isFetchingRecentRecipes: isFetching,
    isInitialLoadingRecentRecipes: isInitialLoading,
    userId: user.id
  });

  // 실제 로딩 상태 계산 - 핵심 데이터가 없으면 로딩 중
  const isActuallyLoading = !userProfile || isLoading || isInitialLoading

  const cacheData: DashboardCacheData = {
    userProfile,
    recentRecipes,
    usageData,
    isLoading: isActuallyLoading // 실제 로딩 상태 반영
  }

  return (
    <DashboardCacheContext.Provider value={cacheData}>
      {children}
    </DashboardCacheContext.Provider>
  )
}