"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"

// 복잡한 액션별 캐시 무효화 매핑 (여러 캐시를 동시에 무효화해야 하는 경우)
const COMPLEX_INVALIDATION_MAP = {
  // 레시피 저장 시: 나의레시피 + 홈 사용량 갱신 + 페이지네이션 캐시
  RECIPE_SAVED: ['recipes-folders', 'recently-viewed-recipes', 'paginated-recipes'],
  
  // 레시피 삭제 시: 나의레시피만 갱신
  RECIPE_DELETED: ['recipes-folders'],
  
  // 폴더 관련: 나의레시피만 갱신 (홈에는 영향 없음)
  FOLDER_OPERATIONS: ['recipes-folders'],
} as const

export function useCacheInvalidation() {
  const queryClient = useQueryClient()

  // === 단순 케이스: 직접 무효화 (대부분 케이스) ===
  
  // 최근 본 레시피 무효화 후 새 데이터 prefetch (레시피 조회, 프리뷰 진입 시)
  const invalidateRecentlyViewed = useCallback(async (userId: string) => {
    // 1. 기존 캐시 무효화
    queryClient.invalidateQueries({
      queryKey: ['recently-viewed-recipes', userId]
    })
    console.log(`[Cache] Invalidated recently-viewed-recipes for user ${userId}`)
    
    // 2. 즉시 새 데이터 prefetch하여 캐시에 저장
    try {
      await queryClient.prefetchQuery({
        queryKey: ['recently-viewed-recipes', userId],
        queryFn: () => getRecentlyViewedRecipes(),
        staleTime: 10 * 60 * 1000, // 10분
        gcTime: 20 * 60 * 1000, // 20분
      })
      console.log(`[Cache] Prefetched new recently-viewed-recipes for user ${userId}`)
    } catch (error) {
      console.warn(`[Cache] Failed to prefetch recently-viewed-recipes for user ${userId}:`, error)
    }
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
  
  const invalidateByAction = useCallback(async (actionType: keyof typeof COMPLEX_INVALIDATION_MAP, userId: string) => {
    const cachesToInvalidate = COMPLEX_INVALIDATION_MAP[actionType]
    
    console.log(`[Cache] 캐시 무효화 시작 - ${actionType}:`, {
      userId,
      cachesToInvalidate,
      timestamp: new Date().toISOString()
    })
    
    // 무효화할 캐시들을 Promise 배열로 만들어 병렬 처리
    const invalidationPromises = cachesToInvalidate.map(async (cacheType) => {
      const beforeInvalidation = queryClient.getQueryData([cacheType, userId])
      console.log(`[Cache] ${cacheType} 무효화 전 데이터:`, beforeInvalidation)
      
      if (cacheType === 'paginated-recipes') {
        // 페이지네이션된 레시피 캐시는 모든 페이지와 폴더 조합을 무효화
        await queryClient.invalidateQueries({
          queryKey: [cacheType, userId],
          exact: false // 부분 매칭으로 모든 페이지네이션 캐시 무효화
        })
      } else {
        // 나머지 캐시들은 정확히 매칭되는 것만 무효화
        await queryClient.invalidateQueries({
          queryKey: [cacheType, userId]
        })
      }
      
      console.log(`[Cache] ${cacheType} 무효화 완료`)
      
      // recipes-folders 캐시를 무효화한 경우, 즉시 리페치 트리거
      if (cacheType === 'recipes-folders' && actionType === 'RECIPE_SAVED') {
        console.log(`[Cache] ${cacheType} 리페치 트리거`)
        await queryClient.refetchQueries({
          queryKey: [cacheType, userId],
          exact: true
        })
        console.log(`[Cache] ${cacheType} 리페치 완료`)
      }
    })
    
    // 모든 무효화 작업이 완료될 때까지 대기
    await Promise.all(invalidationPromises)
    
    console.log(`[Cache] 전체 캐시 무효화 완료 - ${actionType}`)
  }, [queryClient])

  // 전체 캐시 무효화 (로그아웃 시)
  const invalidateAll = useCallback(() => {
    queryClient.clear()
    
    // 검색 캐시도 모두 삭제
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('recipick_search_cache')) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
      console.log(`[Cache] Cleared all caches and ${keysToRemove.length} search caches`)
    } catch (error) {
      console.warn('[Cache] Failed to clear search caches:', error)
    }
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