'use client'

import { useState, useEffect } from 'react'
import { Play, Clock, User, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useExtraction } from '@/contexts/extraction-context'
import { FloatingVideoPlayer } from '@/components/floating-video-player'

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
  const [selectedVideo, setSelectedVideo] = useState<SearchResult | null>(null)
  const [isPlayerVisible, setIsPlayerVisible] = useState(false)
  const { toast } = useToast()
  const { startExtraction, isExtracting } = useExtraction()

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

  const handleVideoSelect = async (video: SearchResult) => {
    console.log('[SearchResults] handleVideoSelect 호출:', { 
      videoTitle: video.title, 
      isExtracting,
      youtubeUrl: video.youtubeUrl 
    });
    
    // ExtractionContext에서 중복 체크 및 토스트 표시를 처리하므로 여기서는 제거
    try {
      await startExtraction(video.youtubeUrl)
      console.log('[SearchResults] startExtraction 완료');
    } catch (error: any) {
      // ExtractionContext에서 이미 오류 처리를 하므로 여기서는 로그만 출력
      console.error("[SearchResults] Recipe extraction error:", error)
    }
  }

  const handleThumbnailClick = (video: SearchResult, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedVideo(video)
    setIsPlayerVisible(true)
  }

  const handleClosePlayer = () => {
    setIsPlayerVisible(false)
    setSelectedVideo(null)
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
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* 썸네일 */}
                <div className="w-full md:w-48 md:h-32 flex-shrink-0">
                  <div 
                    className="relative aspect-video cursor-pointer"
                    onClick={(e) => handleThumbnailClick(video, e)}
                  >
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-full w-full object-cover rounded-md"
                    />
                    <div className="absolute inset-0 bg-black/20 rounded-md hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="bg-red-600 rounded-full p-2 hover:bg-red-700 transition-colors">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
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
                      disabled={isExtracting}
                      className="bg-[#6BA368] hover:bg-[#5a8f57] text-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleVideoSelect(video)
                      }}
                    >
                      {isExtracting ? (
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

        {/* 플로팅 비디오 플레이어 */}
        <FloatingVideoPlayer
          isVisible={isPlayerVisible}
          video={selectedVideo}
          onClose={handleClosePlayer}
        />
      </div>
  )
}