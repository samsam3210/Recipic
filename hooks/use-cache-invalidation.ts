"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

// 복잡한 액션별 캐시 무효화 매핑 (여러 캐시를 동시에 무효화해야 하는 경우)
const COMPLEX_INVALIDATION_MAP = {
  // 레시피 저장 시: 나의레시피 + 홈 사용량 갱신
  RECIPE_SAVED: ['recipes-folders', 'recently-viewed-recipes'],
  
  // 레시피 삭제 시: 나의레시피만 갱신
  RECIPE_DELETED: ['recipes-folders'],
  
  // 폴더 관련: 나의레시피만 갱신 (홈에는 영향 없음)
  FOLDER_OPERATIONS: ['recipes-folders'],
} as const

export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  // === 단순 케이스: 직접 무효화 (대부분 케이스) ===
  
  // 최근 본 레시피 무효화 (레시피 조회, 프리뷰 진입 시)
  const invalidateRecentlyViewed = useCallback((userId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['recently-viewed-recipes', userId]
    })
    console.log(`[Cache] Invalidated recently-viewed-recipes for user ${userId}`)
  }, [queryClient])

  // 사용자 프로필 무효화 (프로필 수정 시)
  const invalidateUserProfile = useCallback((userId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['user-profile', userId]
    })
    console.log(`[Cache] Invalidated user-profile for user ${userId}`)
  }, [queryClient])

  // 나의레시피 무효화 (폴더 생성/삭제, 레시피-폴더 관계 변경 시)
  const invalidateRecipesAndFolders = useCallback((userId: string) => {
    queryClient.invalidateQueries({
      queryKey: ['recipes-folders', userId]
    })
    console.log(`[Cache] Invalidated recipes-folders for user ${userId}`)
  }, [queryClient])

  // === 복잡한 케이스: 액션 기반 무효화 (여러 캐시 동시 무효화) ===
  
  const invalidateByAction = useCallback((actionType: keyof typeof COMPLEX_INVALIDATION_MAP, userId: string) => {
    const cachesToInvalidate = COMPLEX_INVALIDATION_MAP[actionType]
    
    cachesToInvalidate.forEach(cacheType => {
      queryClient.invalidateQueries({
        queryKey: [cacheType, userId]
      })
    })
    
    console.log(`[Cache] Invalidated caches for ${actionType}:`, cachesToInvalidate)
  }, [queryClient])

  // 전체 캐시 무효화 (로그아웃 시)
  const invalidateAll = useCallback(() => {
    queryClient.clear()
    console.log(`[Cache] Cleared all caches`)
  }, [queryClient])

  return {
    // 단순 케이스 (80% 사용)
    invalidateRecentlyViewed,
    invalidateUserProfile, 
    invalidateRecipesAndFolders,
    
    // 복잡한 케이스 (20% 사용)
    invalidateByAction,
    
    // 유틸리티
    invalidateAll
  }
}