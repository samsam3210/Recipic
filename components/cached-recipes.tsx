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
  
  // 캐시 확인
  const foldersCache = queryClient.getQueryData(['recipes-folders', user.id])
  const profileCache = queryClient.getQueryData(['user-profile', user.id])
  
  console.log('[CachedRecipes] 초기 상태:', {
    timestamp: new Date().toISOString(),
    userId: user.id,
    hasFoldersCache: !!foldersCache,
    hasProfileCache: !!profileCache,
    initialFoldersLength: initialFolders?.length || 0,
    hasInitialProfile: !!initialUserProfile
  })
  
  // 실제 캐시가 없으면 로딩 표시
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(!foldersCache)
  
  console.log('[CachedRecipes] shouldShowSkeleton 초기값:', !foldersCache)
  
  useEffect(() => {
    console.log('[CachedRecipes] useEffect 실행:', {
      hasFoldersCache: !!foldersCache,
      shouldShowSkeleton
    })
    
    if (!foldersCache) {
      console.log('[CachedRecipes] 캐시 없음 - 200ms 스켈레톤 표시 시작')
      const timer = setTimeout(() => {
        console.log('[CachedRecipes] 200ms 후 스켈레톤 숨김')
        setShouldShowSkeleton(false)
      }, 200)
      return () => clearTimeout(timer)
    } else {
      console.log('[CachedRecipes] 캐시 있음 - 즉시 스켈레톤 숨김')
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

  // 폴더 목록 쿼리 (중간 캐시)
  const { data: foldersResult, isLoading, isInitialLoading, isFetching } = useQuery({
    queryKey: ['recipes-folders', user.id],
    queryFn: () => fetchRecipesAndFolders(user.id, null),
    initialData: { folders: initialFolders, error: null },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 20 * 60 * 1000, // 20분
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  const folders = foldersResult?.folders || initialFolders
  const userProfile = profileResult?.profile || initialUserProfile

  // 실제 로딩 상태 계산 - 캐시가 없거나 데이터 fetching 중일 때 로딩 표시
  const isActuallyLoading = shouldShowSkeleton || isLoading || isFetching

  console.log('[CachedRecipes] 최종 로딩 상태:', {
    shouldShowSkeleton,
    isLoading,
    isFetching,
    isActuallyLoading,
    foldersLength: folders?.length || 0,
    hasUserProfile: !!userProfile
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