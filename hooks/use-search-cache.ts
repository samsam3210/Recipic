"use client"

import { useCallback } from "react"

// 검색 결과 타입 (search/page.tsx와 동일)
interface SearchResult {
  videoId: string
  title: string
  channelName: string
  thumbnail: string
  duration?: string
  publishedAt: string
  viewCount?: string
  viewCountFormatted?: string
  youtubeUrl: string
}

// 검색 캐시 타입
interface SearchCache {
  keyword: string
  results: SearchResult[]
  totalCount: number
  scrollPosition: number
  timestamp: number
  filters: {
    sortType: 'uploadDate' | 'viewCount'
    page?: number
  }
}

// 검색 조건 타입
interface SearchParams {
  keyword: string
  sortType: 'uploadDate' | 'viewCount'
  page?: number
}

export function useSearchCache(userId?: string) {
  // 사용자별 캐시 키 (보안 중요!)
  const CACHE_KEY = userId ? `recipick_search_cache_${userId}` : 'recipick_search_cache_guest'
  const CACHE_DURATION = 2 * 60 * 60 * 1000 // 2시간 (탭 간 이동 시 연속성 확보)

  // 캐시 저장
  const saveCache = useCallback((
    keyword: string,
    results: SearchResult[],
    sortType: 'uploadDate' | 'viewCount',
    page: number = 1
  ) => {
    try {
      const cacheData: SearchCache = {
        keyword,
        results,
        totalCount: results.length,
        scrollPosition: 0, // 나중에 업데이트됨
        timestamp: Date.now(),
        filters: {
          sortType,
          page
        }
      }
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      console.log('[SearchCache] 검색 결과 캐시 저장:', keyword, results.length + '개')
    } catch (error) {
      console.warn('[SearchCache] 캐시 저장 실패:', error)
    }
  }, [])

  // 캐시 조회
  const getCache = useCallback((params: SearchParams): SearchCache | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (!cached) {
        console.log('[SearchCache] 캐시 없음')
        return null
      }
      
      const data: SearchCache = JSON.parse(cached)
      
      // 키워드가 다르면 캐시 무효
      if (data.keyword !== params.keyword) {
        console.log('[SearchCache] 키워드 불일치로 캐시 무효')
        return null
      }
      
      // 정렬 조건이 다르면 캐시 무효
      if (data.filters.sortType !== params.sortType) {
        console.log('[SearchCache] 정렬 조건 불일치로 캐시 무효')
        return null
      }
      
      // 캐시 만료 확인
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        console.log('[SearchCache] 캐시 만료')
        clearCache()
        return null
      }
      
      console.log('[SearchCache] 캐시 적중:', data.keyword, data.results.length + '개')
      return data
    } catch (error) {
      console.warn('[SearchCache] 캐시 조회 실패:', error)
      return null
    }
  }, [])

  // 스크롤 위치 저장
  const saveScrollPosition = useCallback(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const data: SearchCache = JSON.parse(cached)
        data.scrollPosition = window.scrollY
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
        console.log('[SearchCache] 스크롤 위치 저장:', window.scrollY)
      }
    } catch (error) {
      console.warn('[SearchCache] 스크롤 위치 저장 실패:', error)
    }
  }, [])

  // 스크롤 위치 복원 (레시피 상세/프리뷰에서 돌아올 때만)
  const restoreScrollPosition = useCallback(() => {
    try {
      // 이전 페이지 URL 확인
      const referrer = document.referrer
      const isFromRecipePage = referrer.includes('/recipe/') || referrer.includes('/temp-preview')
      
      if (!isFromRecipePage) {
        console.log('[SearchCache] 레시피 페이지에서 오지 않았으므로 스크롤 복원 안함')
        return
      }
      
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (cached) {
        const data: SearchCache = JSON.parse(cached)
        if (data.scrollPosition > 0) {
          // 페이지 로드 후 스크롤 복원
          setTimeout(() => {
            window.scrollTo(0, data.scrollPosition)
            console.log('[SearchCache] 스크롤 위치 복원:', data.scrollPosition)
          }, 100)
        }
      }
    } catch (error) {
      console.warn('[SearchCache] 스크롤 위치 복원 실패:', error)
    }
  }, [])

  // 캐시 삭제
  const clearCache = useCallback(() => {
    try {
      sessionStorage.removeItem(CACHE_KEY)
      console.log('[SearchCache] 캐시 삭제')
    } catch (error) {
      console.warn('[SearchCache] 캐시 삭제 실패:', error)
    }
  }, [CACHE_KEY])

  // 모든 사용자 캐시 삭제 (로그아웃 시)
  const clearAllUserCaches = useCallback(() => {
    try {
      // recipick_search_cache로 시작하는 모든 키 삭제
      const keysToRemove: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('recipick_search_cache')) {
          keysToRemove.push(key)
        }
      }
      
      keysToRemove.forEach(key => sessionStorage.removeItem(key))
      console.log('[SearchCache] 모든 사용자 캐시 삭제:', keysToRemove.length + '개')
    } catch (error) {
      console.warn('[SearchCache] 모든 캐시 삭제 실패:', error)
    }
  }, [])

  // 캐시 유효성 확인
  const isCacheValid = useCallback((params: SearchParams): boolean => {
    return getCache(params) !== null
  }, [getCache])

  // 최근 검색 결과 가져오기 (검색 조건 무관)
  const getRecentCache = useCallback((): SearchCache | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY)
      if (!cached) {
        console.log('[SearchCache] 최근 캐시 없음')
        return null
      }
      
      const data: SearchCache = JSON.parse(cached)
      
      // 캐시 만료 확인만 (검색 조건은 무시)
      if (Date.now() - data.timestamp > CACHE_DURATION) {
        console.log('[SearchCache] 최근 캐시 만료')
        clearCache()
        return null
      }
      
      console.log('[SearchCache] 최근 캐시 적중:', data.keyword, data.results.length + '개')
      return data
    } catch (error) {
      console.warn('[SearchCache] 최근 캐시 조회 실패:', error)
      return null
    }
  }, [clearCache])

  return {
    saveCache,
    getCache,
    getRecentCache,
    saveScrollPosition,
    restoreScrollPosition,
    clearCache,
    clearAllUserCaches,
    isCacheValid
  }
}