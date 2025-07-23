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
import { checkDailyUsage } from "@/lib/actions/usage"
import { checkDuplicateRecipe, checkAndSaveRecipe } from "@/lib/actions/recipe"
import { incrementDailyUsage } from "@/lib/actions/usage"

interface SearchResult {
  videoId: string
  title: string
  channelName: string
  thumbnail: string
  youtubeUrl: string
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [user, setUser] = useState<any>(null)
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

  // 사용자 정보 가져오기
  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // 클립보드에서 YouTube URL 자동 감지 및 입력
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
      } catch (error) {
        // 클립보드 접근 실패시 무시
      }
    }

    checkClipboard()
  }, [])

  // YouTube URL 검증 함수
  const isYouTubeUrl = (text: string): boolean => {
    const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|m\.youtube\.com\/watch\?v=|youtube\.com\/\?v=)([a-zA-Z0-9_-]{11})/
    return youtubeRegex.test(text)
  }

  // 레시피 추출 함수
  // 레시피 추출 함수 - hero-section 로직 완전 복사
const handleRecipeExtraction = async (url: string) => {
    if (!user) {
      toast({
        title: "로그인 필요",
        description: "레시피 추출을 위해 로그인해주세요.",
        variant: "destructive"
      })
      return
    }
  
    // 즉시 로딩 상태 설정
    setIsProcessing(true)
    setShowLoadingOverlay(true)
    setCurrentLoadingStep(1)
  
    try {
      // 사용량 제한 체크
      const usageCheckResult = await checkDailyUsage()
      if (!usageCheckResult.isAllowed) {
        setShowUsageLimitModal(true)
        return
      }
  
      // 사용량 증가
      await incrementDailyUsage()
  
      // 1단계: 메타데이터 가져오기 + 중복 체크
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
  
      // 중복 레시피 체크
      const duplicateCheckResult = await checkDuplicateRecipe(videoMetadata.videoTitle, videoMetadata.channelName)
      if (duplicateCheckResult.isDuplicate && duplicateCheckResult.recipeId) {
        setDuplicateRecipeId(duplicateCheckResult.recipeId)
        setShowDuplicateModal(true)
        return
      }
  
      setCurrentLoadingStep(2)
  
      // 2단계: 자막 가져오기
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
  
      // 자막 검증
      if (!videoInfo.hasSubtitles || !videoInfo.transcriptText) {
        setRecipeUnavailableMessage("이 영상에는 추출 가능한 자막이 없습니다. 다른 영상을 시도해 주세요.")
        setShowRecipeUnavailableModal(true)
        return
      }
  
      setCurrentLoadingStep(3)
  
      // 3단계: AI 레시피 분석
      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredTranscript: videoInfo.structuredTranscript,
          videoDescription: videoInfo.videoDescription,
        }),
      })
  
      // AI 응답 검증
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
      } catch (parseError) {
        setErrorMessage(`AI 응답이 올바른 JSON 형식이 아닙니다. 원시 응답: ${geminiResponseText.substring(0, 200)}...`)
        setShowErrorModal(true)
        return
      }
  
      // 레시피 데이터 검증
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
  
      // 4단계: 레시피 저장
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

  // YouTube 검색 함수
  const handleYouTubeSearch = async (query: string) => {
    setIsSearching(true)
    
    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, maxResults: 10 })
      })

      if (!response.ok) {
        throw new Error('검색 요청이 실패했습니다.')
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results)
        toast({
          title: "검색 완료",
          description: `${data.results.length}개의 영상을 찾았습니다.`,
        })
      } else {
        setSearchResults([])
        toast({
          title: "검색 결과가 없습니다",
          description: "다른 키워드로 다시 검색해보세요.",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      toast({
        title: "검색 오류",
        description: error.message || "검색 중 문제가 발생했습니다.",
        variant: "destructive"
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // 검색 실행 함수 (URL/키워드 자동 구분)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!searchQuery.trim()) {
      toast({
        title: "검색어를 입력해주세요",
        description: "YouTube URL이나 키워드를 입력해보세요.",
        variant: "destructive"
      })
      return
    }
  
    if (isYouTubeUrl(searchQuery)) {
      // URL인 경우 즉시 레시피 추출
      await handleRecipeExtraction(searchQuery)
    } else {
      // 키워드인 경우 YouTube 검색
      await handleYouTubeSearch(searchQuery)
    }
  }

  // 영상 선택 핸들러
  const handleVideoSelect = async (video: SearchResult) => {
    await handleRecipeExtraction(video.youtubeUrl)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      
      <main className="flex-1 py-8 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto w-full pb-20 lg:pb-8">
        <div className="space-y-8">

          {/* 검색 폼 */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto">
            <div className="relative flex items-center w-full rounded-full shadow-lg border border-gray-200 bg-white overflow-hidden focus-within:border-gray-300 focus-within:shadow-xl transition-all">
              <div className="pl-5">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              
              <Input
                type="text"
                placeholder="URL 또는 키워드 입력"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-14 pl-4 pr-20 text-base border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full rounded-r-none placeholder:text-gray-400"
                disabled={isSearching || isProcessing}
              />
              
              <Button
                type="submit"
                disabled={!searchQuery.trim() || isSearching || isProcessing}
                size="icon"
                className={`absolute right-0 h-full w-14 ${
                  !searchQuery.trim() || isSearching || isProcessing
                    ? 'bg-gray-400'
                    : 'bg-black hover:bg-gray-800'
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

          {/* 검색 결과 */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">검색 결과</h2>
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
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-2">{video.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{video.channelName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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