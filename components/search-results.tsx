'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Clock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import LoadingOverlay from '@/components/loading-overlay'

interface SearchResult {
  videoId: string
  title: string
  channelName: string
  thumbnail: string
  duration?: string
  publishedAt: string
  viewCount?: string
  youtubeUrl: string
}

interface SearchResultsProps {
  query: string
}

export default function SearchResults({ query }: SearchResultsProps) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (query) {
      searchVideos(query)
    }
  }, [query])

  const searchVideos = async (searchQuery: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          maxResults: 20
        })
      })

      if (!response.ok) {
        throw new Error('검색 요청이 실패했습니다.')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.results && data.results.length > 0) {
        setResults(data.results)
      } else {
        setResults([])
        setError('검색 결과가 없습니다. 다른 키워드로 시도해보세요.')
      }
    } catch (err: any) {
      console.error('YouTube search error:', err)
      setError(err.message || '검색 중 오류가 발생했습니다.')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const checkDailyUsage = async () => {
    try {
      const response = await fetch('/api/usage/check', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error('사용량 확인 실패')
      }
      
      const data = await response.json()
      return {
        isAllowed: data.isAllowed,
        currentCount: data.currentCount,
        isAdmin: data.isAdmin
      }
    } catch (error) {
      console.error('Usage check error:', error)
      return { isAllowed: true, currentCount: 0, isAdmin: false }
    }
  }

  const handleVideoSelect = async (video: SearchResult) => {
    setIsProcessing(true)
    setShowLoadingOverlay(true)

    try {
      // 사용량 제한 체크 (로그인한 사용자만)
      const usageCheckResult = await checkDailyUsage()
      
      if (!usageCheckResult.isAllowed) {
        toast({
          title: "일일 사용 제한",
          description: "오늘의 무료 사용 횟수를 모두 사용했습니다. 내일 다시 이용해주세요.",
          variant: "destructive"
        })
        setIsProcessing(false)
        setShowLoadingOverlay(false)
        return
      }

      // 레시피 추출 API 호출
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          youtubeUrl: video.youtubeUrl,
          forceReExtract: false
        })
      })

      if (!response.ok) {
        throw new Error('레시피 추출 요청이 실패했습니다.')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.recipeId) {
        // 레시피 상세 페이지로 이동
        router.push(`/recipe/${data.recipeId}`)
      } else if (data.tempId) {
        // 임시 미리보기 페이지로 이동
        router.push(`/temp-preview?id=${data.tempId}`)
      } else {
        throw new Error('레시피 추출에 실패했습니다.')
      }
    } catch (err: any) {
      console.error('Recipe extraction error:', err)
      toast({
        title: "오류",
        description: err.message || "레시피 추출 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
      setShowLoadingOverlay(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">검색 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">😔</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button 
          onClick={() => searchVideos(query)}
          variant="outline"
        >
          다시 시도
        </Button>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🤔</div>
        <p className="text-gray-600">검색 결과가 없습니다.</p>
        <p className="text-gray-500 text-sm mt-2">다른 키워드로 검색해보세요.</p>
      </div>
    )
  }

  return (
    <>
      {/* 로딩 오버레이 */}
      {showLoadingOverlay && (
        <LoadingOverlay
          isVisible={showLoadingOverlay}
          currentStep={1}
          steps={[
            "YouTube 영상 정보 가져오는 중...",
            "AI가 레시피를 추출하고 있습니다...",
            "레시피 저장 중..."
          ]}
        />
      )}

      <div className="space-y-6">
        {/* 검색 결과 헤더 */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            검색 결과 ({results.length}개)
          </h2>
          <p className="text-sm text-gray-500">
            "{query}" 검색 결과
          </p>
        </div>

        {/* 검색 결과 목록 */}
        <div className="space-y-4">
          {results.map((video) => (
            <div
              key={video.videoId}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => !isProcessing && handleVideoSelect(video)}
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* 썸네일 */}
                <div className="w-full md:w-48 md:h-32 flex-shrink-0">
                  <div className="relative aspect-video">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-full w-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-md group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <Play className="h-6 w-6 text-white opacity-80" />
                    </div>
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                    )}
                  </div>
                </div>

                {/* 정보 영역 */}
                <div className="flex-1 space-y-2">
                  <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-black line-clamp-2 text-left">
                    {video.title}
                  </h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-600 mb-2">
                    <User className="h-3 w-3" />
                    <span>{video.channelName}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {video.publishedAt && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(video.publishedAt).toLocaleDateString('ko-KR')}</span>
                      </div>
                    )}
                    {video.viewCount && (
                      <span>조회수 {video.viewCount}</span>
                    )}
                  </div>
                  
                  {/* 레시피 추출 버튼 */}
                  <div className="pt-2">
                    <Button
                      size="sm"
                      disabled={isProcessing}
                      className="bg-black hover:bg-gray-800 text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVideoSelect(video)
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          레시피 추출 중...
                        </>
                      ) : (
                        "레시피 추출하기"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}