"use client"

import { createContext, useContext } from "react"
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
  // 사용자 프로필 쿼리 (긴 캐시)
  const { data: profileResult } = useQuery({
    queryKey: ['user-profile', user.id],
    queryFn: () => getUserProfile(user.id),
    initialData: { profile: initialUserProfile },
    staleTime: 30 * 60 * 1000, // 30분
    gcTime: 60 * 60 * 1000, // 1시간
    refetchOnWindowFocus: false, // 탭 복귀 시 자동 갱신 비활성화
  })

  // 폴더 목록 쿼리 (중간 캐시)
  const { data: foldersResult, isLoading, isInitialLoading } = useQuery({
    queryKey: ['recipes-folders', user.id],
    queryFn: () => fetchRecipesAndFolders(user.id, null),
    initialData: { folders: initialFolders, error: null },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 20 * 60 * 1000, // 20분
    refetchOnWindowFocus: false, // 탭 복귀 시 자동 갱신 비활성화
  })

  const folders = foldersResult?.folders || initialFolders
  const userProfile = profileResult?.profile || initialUserProfile

  const cacheData: RecipesCacheData = {
    folders,
    userProfile,
    isLoading: isInitialLoading // 최초 로딩만 표시 (초기 데이터가 있으면 false)
  }

  return (
    <RecipesCacheContext.Provider value={cacheData}>
      {children}
    </RecipesCacheContext.Provider>
  )
}