"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
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
  // 최초 마운트 감지
  const [isFirstMount, setIsFirstMount] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => setIsFirstMount(false), 100)
    return () => clearTimeout(timer)
  }, [])
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

  // 실제 로딩 상태 계산 - 최초 마운트 시 짧은 로딩 표시
  const isActuallyLoading = isFirstMount || isLoading || isFetching

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