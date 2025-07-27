"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 기본 설정
            staleTime: 5 * 60 * 1000, // 5분 - 이 시간동안은 fresh로 취급
            gcTime: 30 * 60 * 1000, // 30분 - 캐시 보관 시간 (구 cacheTime)
            refetchOnWindowFocus: false, // 탭 복귀시 자동 갱신 비활성화 (검색 결과처럼 캐시 우선)
            refetchOnReconnect: true, // 네트워크 재연결시 자동 갱신
            retry: 1, // 실패시 1번 재시도
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 지수적 백오프
          },
          mutations: {
            retry: 1, // 뮤테이션 실패시 1번 재시도
            retryDelay: 1000, // 1초 후 재시도
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 개발 환경에서만 DevTools 표시 */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}