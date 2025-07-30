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
  
  // 리프레시 토큰 에러 감지
  const isRefreshTokenError = 
    error.message?.includes('refresh_token_not_found') || 
    error.message?.includes('Invalid Refresh Token') ||
    error.message?.includes('Refresh Token Not Found')

  useEffect(() => {
    // 리프레시 토큰 에러인 경우 로컬 스토리지 정리
    if (isRefreshTokenError) {
      console.log('Refresh token error detected, clearing local storage')
      
      // Supabase 관련 스토리지 모두 제거
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // 세션 스토리지도 클리어
      sessionStorage.clear()
      
      // 쿠키도 클리어 (가능한 범위에서)
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
    }
  }, [isRefreshTokenError])

  const handleRetry = () => {
    if (isRefreshTokenError) {
      // 리프레시 토큰 에러는 홈으로 강제 이동
      window.location.href = '/'
      return
    }
    
    // 다른 에러는 재시도
    setRetryCount(prev => prev + 1)
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
            {isRefreshTokenError ? '다시 로그인이 필요해요' : '앗, 문제가 발생했어요!'}
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            {isRefreshTokenError 
              ? '세션이 만료되었습니다. 다시 로그인해주세요.'
              : '잠시 연결이 원활하지 않아요.\n네트워크 연결을 확인하고 다시 시도해주세요.'
            }
          </p>

          {/* Safari/PWA 안내 (리프레시 토큰 에러인 경우만) */}
          {isRefreshTokenError && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
              <p className="text-sm text-blue-800 font-medium mb-1">💡 알고 계셨나요?</p>
              <p className="text-sm text-blue-700">
                Safari 브라우저와 홈 화면에 추가한 앱은 별도로 로그인이 필요해요. 
                한 곳에서만 사용하시는 것을 권장합니다.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button 
              onClick={handleRetry}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-4 px-6 rounded-2xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isRefreshTokenError ? (
                <>
                  <Home className="w-5 h-5" />
                  로그인 화면으로
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  다시 시도하기
                </>
              )}
            </button>

            {!isRefreshTokenError && (
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 text-gray-700 font-medium py-4 px-6 rounded-2xl hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                홈으로 돌아가기
              </button>
            )}
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