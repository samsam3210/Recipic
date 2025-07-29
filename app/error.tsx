'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Home, AlertCircle, ChefHat } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [retryCount, setRetryCount] = useState(0)
  const [errorLog, setErrorLog] = useState<any>({})

  useEffect(() => {
    // 에러 발생 원인 추적을 위한 상세 정보 수집
    const errorData = {
      // 에러 핵심 정보
      errorMessage: error.message,
      errorStack: error.stack,
      errorDigest: error.digest,
      
      // URL 및 네비게이션 정보
      currentUrl: window.location.href,
      previousUrl: document.referrer,
      
      // 디바이스 정보
      userAgent: navigator.userAgent,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      platform: navigator.platform,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      
      // 세션 및 스토리지 상태
      hasLocalStorage: !!window.localStorage,
      hasSessionStorage: !!window.sessionStorage,
      cookiesEnabled: navigator.cookieEnabled,
      cookieLength: document.cookie.length,
      
      // 타이밍 정보
      timestamp: new Date().toISOString(),
      retryCount: retryCount,
      
      // 메모리 정보 (Chrome only)
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null,
      
      // 네트워크 및 페이지 상태
      online: navigator.onLine,
      readyState: document.readyState,
      visibilityState: document.visibilityState,
      
      // React/Next.js 관련
      isHydrationError: error.message.includes('Hydration') || error.message.includes('hydrat'),
      isChunkError: error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk'),
    }

    setErrorLog(errorData)
    
    // Vercel 로그로 전송
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData),
    }).catch(err => {
      console.error('Failed to send error log:', err)
    })

    // 콘솔에도 출력
    console.error('=== CLIENT ERROR DETAILS ===')
    console.error(errorData)
    console.error('===========================')
  }, [error, retryCount])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    
    // 3번 이상 재시도한 경우 홈으로 리다이렉트
    if (retryCount >= 2) {
      window.location.href = '/'
    } else {
      reset()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-md w-full">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 text-center">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-orange-400 rounded-full blur-xl opacity-30"></div>
            <div className="relative bg-gradient-to-br from-red-100 to-orange-100 w-24 h-24 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            앗, 문제가 발생했어요!
          </h1>
          
          <p className="text-gray-600 mb-4 leading-relaxed">
            잠시 연결이 원활하지 않아요.<br />
            {retryCount > 0 && <span className="text-sm text-gray-500">(재시도: {retryCount}회)</span>}
          </p>

          {/* 디버그 정보 표시 (개발/디버깅용) */}
          <div className="mb-6 p-3 bg-gray-100 rounded-lg text-left text-xs overflow-auto max-h-32">
            <p><strong>URL:</strong> {errorLog.currentUrl}</p>
            <p><strong>이전 페이지:</strong> {errorLog.previousUrl || '없음'}</p>
            <p><strong>모바일:</strong> {errorLog.isMobile ? '예' : '아니오'}</p>
            <p><strong>온라인:</strong> {errorLog.online ? '예' : '아니오'}</p>
            <p><strong>에러:</strong> {error.message}</p>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-4 px-6 rounded-2xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              {retryCount >= 2 ? '홈으로 가기' : '다시 시도하기'}
            </button>

            <button 
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-100 text-gray-700 font-medium py-4 px-6 rounded-2xl hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              홈으로 돌아가기
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-gray-400">
            <ChefHat className="w-4 h-4" />
            <span className="text-sm">Recipick</span>
          </div>
        </div>
      </div>
    </div>
  )
}