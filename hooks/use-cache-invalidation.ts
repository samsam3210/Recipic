"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  // 레시피 관련 캐시 무효화
  const invalidateRecipes = useCallback((userId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['recently-viewed-recipes', userId]
    })
    queryClient.invalidateQueries({
      queryKey: ['recipes-folders', userId]
    })
  }, [queryClient])

  // 사용자 프로필 캐시 무효화 (설정 변경 시)
  const invalidateUserProfile = useCallback((userId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['user-profile', userId]
    })
  }, [queryClient])

  // 특정 폴더의 레시피 캐시 무효화
  const invalidateFolderRecipes = useCallback((userId: string, folderId?: string) => {
    if (folderId) {
      queryClient.invalidateQueries({
        queryKey: ['folder-recipes', userId, folderId]
      })
    }
    // 전체 폴더 목록도 갱신
    queryClient.invalidateQueries({
      queryKey: ['recipes-folders', userId]
    })
  }, [queryClient])

  // 전체 캐시 무효화 (로그아웃 시 등)
  const invalidateAll = useCallback(() => {
    queryClient.clear()
  }, [queryClient])

  return {
    invalidateRecipes,
    invalidateUserProfile,
    invalidateFolderRecipes,
    invalidateAll
  }
}