"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { CustomDialog } from "@/components/custom-dialog"
import { ClipboardToast } from "@/components/clipboard-toast"
import { checkDailyUsage, incrementDailyUsage } from "@/lib/actions/usage"
import { checkDuplicateRecipe, checkAndSaveRecipe } from "@/lib/actions/recipe"
import { SidebarNav } from "@/components/sidebar-nav"
import { dashboardSidebarNavItems } from "@/lib/navigation"
import { PopularKeywords } from '@/components/popular-keywords'
import { SearchGuide } from '@/components/search-guide'

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

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isUserLoading, setIsUserLoading] = useState(true)
  const [showClipboardToast, setShowClipboardToast] = useState(false)
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const [currentLoadingStep, setCurrentLoadingStep] = useState(1)
  const { toast } = useToast()
  const router = useRouter()

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null)
  const [showRecipeUnavailableModal, setShowRecipeUnavailableModal] = useState(false)
  const [recipeUnavailableMessage, setRecipeUnavailableMessage] = useState("")

  const [lastSearchQuery, setLastSearchQuery] = useState("")

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
          const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/\?v=)([a-zA-Z0-9_-]{11})/
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
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/\?v=)([a-zA-Z0-9_-]{11})/
    return youtubeRegex.test(text)
  }

  const handleRecipeExtraction = async (url: string) => {
    if (isUserLoading) {
      toast({
        title: "잠시만 기다려주세요",
        description: "사용자 정보를 확인 중입니다.",
        variant: "info",
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

    setIsProcessing(true)
    setShowLoadingOverlay(true)
    setCurrentLoadingStep(1)

    try {
      const usageCheckResult = await checkDailyUsage()
      if (!usageCheckResult.isAllowed) {
        setShowUsageLimitModal(true)
        return
      }
      await incrementDailyUsage()

      const metadataResponse = await fetch("/api/youtube/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        throw new Error(errorData.error || "유튜브 영상 정보를 불러오는 데 실패했습니다.")
      }

      const videoMetadata = await metadataResponse.json()

      const duplicateCheckResult = await checkDuplicateRecipe(videoMetadata.videoTitle, videoMetadata.channelName)
      if (duplicateCheckResult.isDuplicate && duplicateCheckResult.recipeId) {
        setDuplicateRecipeId(duplicateCheckResult.recipeId)
        setShowDuplicateModal(true)
        return
      }

      setCurrentLoadingStep(2)

      const videoResponse = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!videoResponse.ok) {
        const errorData = await videoResponse.json()
        throw new Error(errorData.error || "유튜브 자막을 불러오는 데 실패했습니다.")
      }

      const videoInfo = await videoResponse.json()

      if (!videoInfo.hasSubtitles || !videoInfo.transcriptText) {
        setRecipeUnavailableMessage("이 영상에는 추출 가능한 자막이 없습니다. 다른 영상을 시도해 주세요.")
        setShowRecipeUnavailableModal(true)
        return
      }

      setCurrentLoadingStep(3)

      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredTranscript: videoInfo.structuredTranscript,
          videoDescription: videoInfo.videoDescription,
        }),
      })

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text()
        if (errorText.includes("The model is overloaded")) {
          setErrorMessage("현재 AI 모델에 요청이 많아 레시피 추출이 어렵습니다. 잠시 후 다시 시도해 주세요.")
          setShowErrorModal(true)
          return
        } else {
          setErrorMessage(`AI 레시피 추출 중 오류가 발생했습니다: ${errorText}`)
          setShowErrorModal(true)
          return
        }
      }

      const geminiResponseText = await geminiResponse.text()
      let extractedRecipe
      try {
        let cleanedResponse = geminiResponseText
        if (cleanedResponse.startsWith("```json")) {
          cleanedResponse = cleanedResponse.substring("```json".length, cleanedResponse.lastIndexOf("```")).trim()
        }
        extractedRecipe = JSON.parse(cleanedResponse)
      } catch {
        setErrorMessage(`AI 응답이 올바른 JSON 형식이 아닙니다. 원시 응답: ${geminiResponseText.substring(0, 200)}...`)
        setShowErrorModal(true)
        return
      }

      if (
        !extractedRecipe ||
        !extractedRecipe.ingredients ||
        extractedRecipe.ingredients.length === 0 ||
        !extractedRecipe.steps ||
        extractedRecipe.steps.length === 0
      ) {
        setRecipeUnavailableMessage("제공된 영상에서 레시피 정보를 충분히 추출할 수 없습니다. 영상에 정확한 재료나 조리 단계가 명시되어 있지 않을 수 있습니다. 다른 영상을 시도해 주세요.")
        setShowRecipeUnavailableModal(true)
        return
      }

      setCurrentLoadingStep(4)

      const result = await checkAndSaveRecipe(url, videoInfo, extractedRecipe, false)

      if (result.success && result.recipeId) {
        toast({
          title: "저장 완료",
          description: "레시피가 성공적으로 저장되었습니다.",
        })
        router.push(`/recipe/${result.recipeId}`)
      } else {
        throw new Error(result.message || "레시피 저장에 실패했습니다.")
      }
    } catch (error: any) {
      console.error("Recipe extraction error:", error)
      setErrorMessage(error.message || "레시피 추출 중 오류가 발생했습니다.")
      setShowErrorModal(true)
    } finally {
      setIsProcessing(false)
      setShowLoadingOverlay(false)
      setCurrentLoadingStep(1)
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
        setSearchResults(data.results)
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
      await handleRecipeExtraction(searchQuery)
    } else {
      await handleYouTubeSearch(searchQuery)
    }
  }

  const handleVideoSelect = async (video: SearchResult) => {
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
            <div className="relative flex items-center w-full rounded-full shadow-lg border border-gray-200 bg-white overflow-hidden focus-within:border-gray-300 focus-within:shadow-xl transition-all">
            <Input
                type="text"
                placeholder="URL 또는 키워드 입력"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-14 pl-5 pr-20 text-base border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full rounded-r-none placeholder:text-gray-400"
                disabled={isSearching || isProcessing}
              />

              <Button
                type="submit"
                disabled={!searchQuery.trim() || isSearching || isProcessing}
                size="icon"
                className={`absolute right-0 h-full w-14 ${
                  !searchQuery.trim() || isSearching || isProcessing
                    ? "bg-gray-400"
                    : "bg-black hover:bg-gray-800"
                } text-white rounded-r-full rounded-l-none transition-colors duration-200`}
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </Button>
            </div>
          </form>

          {/* ✨ 새로 추가: 인기 키워드 */}
          <PopularKeywords 
            onKeywordClick={handleKeywordClick} 
            isSearching={isSearching || isProcessing} 
          />

          {searchResults.length > 0 && (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                검색 결과 <span className="text-gray-500 text-sm">({searchResults.length}개)</span>
                </h2>
                <div className="grid gap-4">
                {searchResults.map((video) => (
                    <div
                    key={video.videoId}
                    className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleVideoSelect(video)}
                    >
                    <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-32 h-24 object-cover rounded"
                        loading="lazy"
                        decoding="async"
                    />
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

                        {/* 영상 길이 */}
                        {video.duration && (
                            <span>
                            {formatDuration(video.duration)}
                            </span>
                        )}
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

      {/* 로딩 오버레이 */}
      <CustomDialog
        isOpen={showLoadingOverlay}
        onClose={() => {}}
        title="레시피 분석 중입니다"
        description=""
        disableClose={true}
        hideCloseButton={true}
        className="p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        overlayClassName="bg-black/60"
        >
        <div className="space-y-3 mb-4">
          {[
            { id: 1, text: "유튜브 영상 확인 중..." },
            { id: 2, text: "자막 및 음성 분석 중..." },
            { id: 3, text: "레시피 정보 추출 중..." },
            { id: 4, text: "레시피 구성 중..." }
          ].map((step) => {
            const isCompleted = step.id < currentLoadingStep;
            const isCurrent = step.id === currentLoadingStep;

            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`relative w-5 h-5 rounded-full transition-all duration-300 ease-out ${
                  isCompleted ? 'bg-gray-600' : isCurrent ? 'bg-gray-100 border-2 border-gray-600' : 'bg-gray-100 border-2 border-gray-200'
                }`}>
                  {isCompleted ? (
                    <div className="w-3 h-3 bg-white rounded-full absolute inset-0 m-auto" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-gray-600 rounded-full absolute inset-0 m-auto animate-pulse" />
                  ) : null}
                </div>
                <span className={`text-sm font-medium transition-all duration-300 ${
                  isCompleted ? 'text-gray-400' : isCurrent ? 'text-gray-900 animate-pulse' : 'text-gray-400'
                }`}>
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>
      </CustomDialog>

      {/* 사용량 제한 모달 */}
      <CustomDialog
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        title="일일 사용량 제한"
        description="하루에 최대 2회만 레시피 조회가 가능해요 🙏 서비스 개선이 될 때까지 잠시만 기다려주세요!"
        hideCloseButton={true}
        className="p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        footer={
          <Button
            onClick={() => setShowUsageLimitModal(false)}
            className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
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
          <Button onClick={() => setShowErrorModal(false)} className="w-full">
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
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)}>
              아니요, 다른 영상 입력할게요
            </Button>
            <Button onClick={() => {
              if (duplicateRecipeId) {
                router.push(`/recipe/${duplicateRecipeId}`)
                setShowDuplicateModal(false)
              }
            }}>
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
          <Button onClick={() => setShowRecipeUnavailableModal(false)} className="w-full">
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