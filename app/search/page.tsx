"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, ArrowUpDown, ChevronDown, Clock, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { CustomDialog } from "@/components/custom-dialog"
import { ClipboardToast } from "@/components/clipboard-toast"
import { checkDailyUsage } from "@/lib/actions/usage"
import { SidebarNav } from "@/components/sidebar-nav"
import { dashboardSidebarNavItems } from "@/lib/navigation"
import { PopularKeywords } from '@/components/popular-keywords'
import { SearchGuide } from '@/components/search-guide'
import { useExtraction } from '@/contexts/extraction-context'

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

// === 조회수 포맷 함수 ===
function formatViewCount(count: number): string {
    if (count >= 100_000_000) {
      return `${(count / 100_000_000).toFixed(1).replace(/\.0$/, '')}억회`
    } else if (count >= 10_000) {
      return `${(count / 10_000).toFixed(1).replace(/\.0$/, '')}만회`
    } else if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}천회`
    } else {
      return `${count.toLocaleString()}회`
    }
  }

// === 날짜 포맷 함수 === (24.03.15 형식)
function formatPublishedDate(dateString: string): string {
  const date = new Date(dateString)
  const year = date.getFullYear().toString().slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}.${month}.${day}`
}

// === 영상 길이 포맷 함수 ===
function parseISO8601Duration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return "00:00"

  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)

  const totalMinutes = hours * 60 + minutes
  const pad = (num: number) => num.toString().padStart(2, "0")

  if (totalMinutes === 0) {
    return `00:${pad(seconds)}`
  }

  return `${totalMinutes}:${pad(seconds)}`
}

// === 영상 길이 포맷 함수 (검색 결과 표시용) ===
function formatDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return "00:00";
  
    const hours = parseInt(match[1] || "0");
    const minutes = parseInt(match[2] || "0");
    const seconds = parseInt(match[3] || "0");
  
    if (hours > 0) {
      // 시:분:초
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    } else {
      // 분:초
      return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
  }

type SortType = 'uploadDate' | 'viewCount'

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isUserLoading, setIsUserLoading] = useState(true)
  const [showClipboardToast, setShowClipboardToast] = useState(false)
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [sortType, setSortType] = useState<SortType>('uploadDate')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { startExtraction, isExtracting } = useExtraction()
  const { toast } = useToast()
  const router = useRouter()

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null)
  const [showRecipeUnavailableModal, setShowRecipeUnavailableModal] = useState(false)
  const [recipeUnavailableMessage, setRecipeUnavailableMessage] = useState("")

  const [lastSearchQuery, setLastSearchQuery] = useState("")

  // 드롭다운 옵션 정의
  const sortOptions = [
    {
      value: 'uploadDate' as SortType,
      label: '업로드순',
      mobileLabel: '최신순',
      icon: Clock
    },
    {
      value: 'viewCount' as SortType,
      label: '조회순', 
      mobileLabel: '인기순',
      icon: Eye
    }
  ]

  // 현재 선택된 옵션 찾기
  const currentOption = sortOptions.find(option => option.value === sortType)

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-dropdown="sort"]')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  // 정렬 옵션 변경 핸들러
  const handleSortChange = (newSortType: SortType) => {
    console.log('정렬 변경:', newSortType) // 디버깅용
    setSortType(newSortType)
    setIsDropdownOpen(false)
    
    // 즉시 정렬 적용
    const sortedResults = sortSearchResults(searchResults, newSortType)
    console.log('정렬 전:', searchResults.slice(0, 3).map(r => ({title: r.title, views: r.viewCountFormatted})))
    console.log('정렬 후:', sortedResults.slice(0, 3).map(r => ({title: r.title, views: r.viewCountFormatted})))
    setSearchResults(sortedResults)
  }

  // 정렬 함수
  const sortSearchResults = (results: SearchResult[], sortBy: SortType): SearchResult[] => {
    return [...results].sort((a, b) => {
      if (sortBy === 'uploadDate') {
        // 업로드순 (최신순)
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      } else if (sortBy === 'viewCount') {
        // 조회순 (높은 순) - viewCountFormatted에서 숫자 추출
        const extractViewCount = (formatted?: string): number => {
          if (!formatted) return 0
          
          // "조회수 1.2만회" 형식에서 숫자 추출
          const match = formatted.match(/(\d+(?:\.\d+)?)(만|천|억)?/)
          if (!match) return 0
          
          const num = parseFloat(match[1])
          const unit = match[2]
          
          if (unit === '억') return num * 100000000
          if (unit === '만') return num * 10000
          if (unit === '천') return num * 1000
          return num
        }
        
        const aViewCount = extractViewCount(a.viewCountFormatted)
        const bViewCount = extractViewCount(b.viewCountFormatted)
        return bViewCount - aViewCount
      }
      return 0
    })
  }

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword)
    // 바로 검색 실행
    handleYouTubeSearch(keyword)
  }

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      setIsUserLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch {
        setUser(null)
      } finally {
        setIsUserLoading(false)
      }
    }
    getUser()
  }, [])

  // 클립보드에서 YouTube URL 자동 감지
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          const clipboardText = await navigator.clipboard.readText()
          const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
          if (youtubeRegex.test(clipboardText)) {
            setSearchQuery(clipboardText.trim())
            setShowClipboardToast(true)
          }
        }
      } catch {
        // 클립보드 접근 실패 시 무시
      }
    }
    checkClipboard()
  }, [])

  // 뒤로가기 시 검색 상태 복원
  useEffect(() => {
    const handlePopState = () => {
      if (lastSearchQuery) {
        setSearchQuery(lastSearchQuery)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [lastSearchQuery])

  const isYouTubeUrl = (text: string): boolean => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    return youtubeRegex.test(text)
  }

  const handleRecipeExtraction = async (url: string) => {
    if (isUserLoading) {
      toast({
        title: "잠시만 기다려주세요",
        description: "사용자 정보를 확인 중입니다.",
        variant: "default",
        duration: 1000,
      })
      return
    }

    if (!user) {
      toast({
        title: "로그인 필요",
        description: "레시피 추출을 위해 로그인해주세요.",
        variant: "destructive",
      })
      return
    }

    if (isExtracting) {
      toast({
        title: "알림",
        description: "이전 레시피 추출이 완료된 후 시작 가능합니다.",
        variant: "default",
      })
      return
    }

    try {
      const usageCheckResult = await checkDailyUsage()
      if (!usageCheckResult.isAllowed) {
        setShowUsageLimitModal(true)
        return
      }

      // Use floating extraction bar
      await startExtraction(url)
    } catch (error: any) {
      console.error("Recipe extraction error:", error)
      toast({
        title: "레시피 추출 실패",
        description: error.message || "레시피 추출 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleYouTubeSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const response = await fetch("/api/youtube/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, maxResults: 10 }),
      })

      if (!response.ok) {
        throw new Error("검색 요청이 실패했습니다.")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.results && data.results.length > 0) {
        const sortedResults = sortSearchResults(data.results, sortType)
        setSearchResults(sortedResults)
        setLastSearchQuery(query)
        toast({
          title: "검색 완료",
          description: `${data.results.length}개의 영상을 찾았습니다.`,
          duration: 1500,
        })
      } else {
        setSearchResults([])
        toast({
          title: "검색 결과가 없습니다",
          description: "다른 키워드로 다시 검색해보세요.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "검색 오류",
        description: error.message || "검색 중 문제가 발생했습니다.",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchQuery.trim()) {
      toast({
        title: "검색어를 입력해주세요",
        description: "YouTube URL이나 키워드를 입력해보세요.",
        variant: "destructive",
      })
      return
    }

    if (isYouTubeUrl(searchQuery)) {
      // YouTube URL인 경우에만 추출 중인지 확인
      if (isExtracting) {
        toast({
          title: "알림",
          description: "이전 레시피 추출이 완료된 후 시작 가능합니다.",
          variant: "default",
        })
        return
      }
      await handleRecipeExtraction(searchQuery)
    } else {
      // 키워드 검색은 추출 중이어도 가능
      await handleYouTubeSearch(searchQuery)
    }
  }

  const handleVideoSelect = async (video: SearchResult) => {
    if (isExtracting) {
      toast({
        title: "알림",
        description: "이전 레시피 추출이 완료된 후 시작 가능합니다.",
        variant: "default",
      })
      return
    }
    await handleRecipeExtraction(video.youtubeUrl)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row py-8 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full gap-8 pb-20 lg:pb-8">
        <aside className="hidden lg:block lg:w-1/5 lg:min-w-[200px] lg:border-r lg:pr-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">메뉴</h2>
          <SidebarNav items={dashboardSidebarNavItems} />
        </aside>

        <section className="flex-1 lg:w-4/5 space-y-8">
          <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
            <div className="relative flex items-center w-full rounded-full shadow-lg border border-green-200 bg-white overflow-hidden focus-within:border-[#6BA368] focus-within:shadow-xl focus-within:ring-2 focus-within:ring-[#6BA368]/20 transition-all">
            <Input
                type="text"
                placeholder="URL 또는 키워드 입력"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-12 md:h-14 pl-6 md:pl-8 pr-16 md:pr-20 text-base md:text-base border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full rounded-r-none placeholder:text-gray-400"
                disabled={isSearching}
              />

              <Button
                type="submit"
                disabled={!searchQuery.trim() || isSearching}
                size="icon"
                className={`absolute right-0 h-full w-12 md:w-14 ${
                  !searchQuery.trim() || isSearching
                    ? "bg-gray-400"
                    : "bg-[#6BA368] hover:bg-[#5a8f57]"
                } text-white rounded-r-full rounded-l-none transition-colors duration-200`}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </Button>
            </div>
          </form>

          {/* ✨ 새로 추가: 인기 키워드 */}
          <PopularKeywords 
            onKeywordClick={handleKeywordClick} 
            isSearching={isSearching} 
          />

          {searchResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  검색 결과 <span className="text-gray-500 text-sm">({searchResults.length}개)</span>
                </h2>
                
                {/* 커스텀 정렬 드롭다운 */}
                <div className="relative" data-dropdown="sort">
                  {/* 드롭다운 트리거 */}
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer group min-w-[100px] sm:min-w-[120px]"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      {currentOption && (
                        <>
                          <currentOption.icon className="w-4 h-4 text-gray-500" />
                          <span className="hidden sm:inline">{currentOption.label}</span>
                          <span className="sm:hidden">{currentOption.mobileLabel}</span>
                        </>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-all duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {/* 드롭다운 메뉴 */}
                  {isDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleSortChange(option.value)}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                            sortType === option.value ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          <option.icon className={`w-4 h-4 ${
                            sortType === option.value ? 'text-gray-600' : 'text-gray-400'
                          }`} />
                          <span className="hidden sm:inline">{option.label}</span>
                          <span className="sm:hidden">{option.mobileLabel}</span>
                          {sortType === option.value && (
                            <div className="ml-auto w-2 h-2 bg-gray-600 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
                <div className="grid gap-4">
                {searchResults.map((video) => (
                    <div
                    key={video.videoId}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleVideoSelect(video)}
                    >
                    <div className="relative w-32 h-24">
                      <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover rounded"
                          loading="lazy"
                          decoding="async"
                      />
                      {/* 재생시간 오버레이 */}
                      {video.duration && (
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-gray-900 line-clamp-2">{video.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{video.channelName}</p>

                        {/* 카테고리 표시 */}
                        {video.category && (
                        <p className="text-xs text-gray-500 mt-1">카테고리: {video.category}</p>
                        )}

                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        {/* 업로드일 */}
                        {video.publishedAt && (
                            <span>{new Date(video.publishedAt).toLocaleDateString("ko-KR").replace(/^(\d{4})\./, (match, p1) => `${p1.slice(2)}.`)}</span>
                        )}

                        {/* 조회수 */}
                        {video.viewCountFormatted && <span>조회수 {video.viewCountFormatted}</span>}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            </div>
            )}
        </section>
      </main>

      <BottomNavigation />


      {/* 사용량 제한 모달 */}
      <CustomDialog
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        title="일일 사용량 제한"
        description={
          <div className="text-center space-y-3">
            <div className="space-y-2">
              <p className="text-gray-700">현재 무료 서비스로 운영되고 있어서</p>
              <p className="text-gray-700">하루 5회로 제한하고 있어요</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">💡 <strong>팁:</strong> 레시피를 저장해두면 언제든 다시 볼 수 있어요!</p>
            </div>
          </div>
        }
        className="sm:max-w-[400px]"
        headerClassName="mb-3 text-center w-full"
        titleClassName="text-xl font-semibold text-gray-900"
        descriptionClassName="text-base leading-relaxed"
        footerClassName="flex justify-center mt-4 w-full"
        overlayClassName="bg-black/60"
        hideCloseButton={true}
        footer={
          <Button
            onClick={() => setShowUsageLimitModal(false)}
            className="px-6 py-2 text-sm font-medium bg-gray-900 hover:bg-black text-white rounded-lg transition-colors duration-200"
          >
            확인
          </Button>
        }
      />

      {/* 에러 모달 */}
      <CustomDialog
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title="레시피 추출 실패"
        description={errorMessage}
        footer={
          <Button onClick={() => setShowErrorModal(false)} className="w-full py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg">
            확인
          </Button>
        }
      />

      {/* 중복 레시피 모달 */}
      <CustomDialog
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="이전에 레시피를 조회했던 영상이에요."
        description="레시피 정보 화면으로 바로 이동할까요?"
        footer={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateModal(false)}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-all duration-300"
            >
              아니요, 다른 영상 입력할게요
            </Button>
            <Button 
              onClick={() => {
                if (duplicateRecipeId) {
                  router.push(`/recipe/${duplicateRecipeId}`)
                  setShowDuplicateModal(false)
                }
              }}
              className="flex-1 py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg"
            >
              예, 기존 레시피 보기
            </Button>
          </div>
        }
      />

      {/* 레시피 없음 모달 */}
      <CustomDialog
        isOpen={showRecipeUnavailableModal}
        onClose={() => setShowRecipeUnavailableModal(false)}
        title="레시피 조회 불가능"
        description={recipeUnavailableMessage}
        footer={
          <Button onClick={() => setShowRecipeUnavailableModal(false)} className="w-full py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg">
            확인
          </Button>
        }
      />

      {/* 클립보드 토스트 */}
      <ClipboardToast
        isVisible={showClipboardToast}
        onClose={() => setShowClipboardToast(false)}
        message="유튜브 링크를 자동으로 불러왔어요!"
      />
    </div>
  )
}