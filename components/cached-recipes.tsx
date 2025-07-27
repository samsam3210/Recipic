"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { fetchRecipesAndFolders } from "@/lib/actions/recipe-fetch"
import { getUserProfile } from "@/lib/actions/user"
import type { User } from "@supabase/supabase-js"
import type { folders as foldersSchema } from "@/lib/db/schema"
import type { Profile } from "@/lib/db/schema"

interface RecipesCacheData {
  folders: (typeof foldersSchema.$inferSelect)[]
  userProfile: Profile | null
  isLoading: boolean
}

const RecipesCacheContext = createContext<RecipesCacheData | null>(null)

export function useRecipesCache() {
  const context = useContext(RecipesCacheContext)
  if (!context) {
    throw new Error('useRecipesCache must be used within CachedRecipes')
  }
  return context
}

interface CachedRecipesProps {
  user: User
  selectedFolderId: string | null
  initialFolders: (typeof foldersSchema.$inferSelect)[]
  initialUserProfile: Profile | null
  children: React.ReactNode
}

export function CachedRecipes({ 
  user, 
  selectedFolderId,
  initialFolders,
  initialUserProfile,
  children 
}: CachedRecipesProps) {
  const queryClient = useQueryClient()
  
  // 캐시 확인 - 리액트 쿼리 캐시 상태로 판단
  const foldersCache = queryClient.getQueryData(['recipes-folders', user.id])
  const profileCache = queryClient.getQueryData(['user-profile', user.id])
  
  console.log('[CachedRecipes] 초기 상태:', {
    timestamp: new Date().toISOString(),
    userId: user.id,
    hasFoldersCache: !!foldersCache,
    hasProfileCache: !!profileCache,
    hasInitialData: initialFolders && initialFolders.length > 0,
    initialFoldersLength: initialFolders?.length || 0,
    hasInitialProfile: !!initialUserProfile
  })
  
  // 캐시가 있으면 스켈레톤 표시하지 않음
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(() => {
    const hasCachedData = !!foldersCache
    return !hasCachedData
  })
  
  console.log('[CachedRecipes] shouldShowSkeleton 초기값:', !foldersCache)
  
  useEffect(() => {
    // 캐시가 없을 때만 스켈레톤 표시
    if (!foldersCache) {
      console.log('[CachedRecipes] 캐시 없음 - 스켈레톤 표시')
      setShouldShowSkeleton(true)
    } else {
      // 캐시가 있으면 즉시 false로 설정
      console.log('[CachedRecipes] 캐시 있음 - 스켈레톤 표시하지 않음')
      setShouldShowSkeleton(false)
    }
  }, [foldersCache])
  // 사용자 프로필 쿼리 (긴 캐시)
  const { data: profileResult } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getUserProfile(user.id),
    initialData: { profile: initialUserProfile },
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  console.log('[CachedRecipes] 쿼리 설정 전 상태:', {
    userId: user.id,
    hasInitialFolders: !!initialFolders,
    initialFoldersLength: initialFolders?.length || 0
  })

  // 폴더 목록 쿼리 (중간 캐시)
  const { data: foldersResult, isLoading, isInitialLoading, isFetching, status, fetchStatus } = useQuery({
    queryKey: ['recipes-folders', user.id],
    queryFn: () => {
      console.log('[CachedRecipes] 폴더 쿼리 실행 중...')
      return fetchRecipesAndFolders(user.id, null)
    },
    // initialData 제거 - 서버에서 실제 데이터를 가져오도록 함
    staleTime: 10 * 60 * 1000, // 10분 - 원래대로 복구
    gcTime: 20 * 60 * 1000, // 20분
    refetchOnWindowFocus: false,
    refetchOnMount: true, // 마운트 시 쿼리 실행 허용
    refetchOnReconnect: false,
    refetchInterval: false,
    enabled: true, // 명시적으로 활성화
  })

  console.log('[CachedRecipes] 쿼리 상태 상세:', {
    status,
    fetchStatus,
    isLoading,
    isFetching,
    isInitialLoading,
    hasData: !!foldersResult,
    dataFoldersLength: foldersResult?.folders?.length || 0
  })

  const folders = foldersResult?.folders || initialFolders
  const userProfile = profileResult?.profile || initialUserProfile

  // 실제 로딩 상태 계산 - 캐시가 없을 때만 로딩 표시 (백그라운드 fetching은 무시)
  const isActuallyLoading = shouldShowSkeleton || isLoading

  console.log('[CachedRecipes] 최종 로딩 상태:', {
    shouldShowSkeleton,
    isLoading,
    isFetching,
    isInitialLoading,
    isActuallyLoading,
    foldersLength: folders?.length || 0,
    hasUserProfile: !!userProfile,
    foldersResultData: foldersResult,
    foldersError: foldersResult?.error
  })
  
  console.log('[CachedRecipes] 폴더 데이터 상세:', {
    folders: folders?.map(f => ({ id: f.id, name: f.name, recipeCount: f.recipeCount })),
    foldersSource: foldersResult ? 'query' : 'initial'
  })

  const cacheData: RecipesCacheData = {
    folders,
    userProfile,
    isLoading: isActuallyLoading
  }

  return (
    <RecipesCacheContext.Provider value={cacheData}>
      {children}
    </RecipesCacheContext.Provider>
  )
}