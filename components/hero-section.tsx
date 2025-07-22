"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  X,
  ArrowRight,
  Check,
  Search,        // 새로 추가
  ExternalLink,  // 새로 추가
  Play,          // 새로 추가
  Users,         // 새로 추가
  Clock          // 새로 추가
} from "lucide-react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { checkAndSaveRecipe, checkDuplicateRecipe } from "@/lib/actions/recipe"
import { useToast } from "@/hooks/use-toast"
import { ConsentModal } from "./consent-modal"
import { cn } from "@/lib/utils"
import { checkDailyUsage, incrementDailyUsage } from "@/lib/actions/usage"
import { Badge } from "@/components/ui/badge"
import { CustomDialog } from "./custom-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ClipboardToast } from "./clipboard-toast"
import { isYouTubeURL } from "@/lib/utils"

interface SearchResult {
  videoId: string
  title: string
  channelName: string
  thumbnail: string
  description: string
  duration?: string
  viewCount?: string
  publishedTime?: string
  youtubeUrl: string
}

interface RecipeData {
  id?: string
  recipeName: string | null
  noRecipeFoundMessage: string | null
  summary: string
  difficulty: string
  cookingTimeMinutes: number
  ingredients: Array<{ name: string; quantity: number | string; unit: string; notes: string }>
  steps: Array<{
    stepNumber: number
    description: string
    notes: string
    ingredientsUsed: string[]
    youtubeTimestampSecond: number
  }>
  tips: Array<{ title: string; description: string }>
  personalNotes: string | null
}

interface VideoInfo {
  videoId: string
  videoTitle: string
  videoThumbnail: string
  channelName: string
  videoDurationSeconds: number
  videoViews: number
  videoDescription: string
  transcriptText: string
  structuredTranscript: { text: string; offset: number }[]
  hasSubtitles: boolean
}

interface VideoMetadata {
  videoId: string
  videoTitle: string
  videoThumbnail: string
  channelName: string
  videoDurationSeconds: number
  videoViews: number
  videoDescription: string
}

interface PreviewData {
  youtubeUrl: string
  videoInfo: VideoInfo
  extractedRecipe: RecipeData
}

const PENDING_RECIPE_STORAGE_KEY = "recipick_pending_recipe"

interface HeroSectionProps {
  user: User | null
  isDashboard?: boolean
}

export function HeroSection({ user, isDashboard = false }: HeroSectionProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showRecipeUnavailableModal, setShowRecipeUnavailableModal] = useState(false)
  const [recipeUnavailableMessage, setRecipeUnavailableMessage] = useState("")
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [currentUsageCount, setCurrentUsageCount] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const [showClipboardToast, setShowClipboardToast] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const [currentLoadingStep, setCurrentLoadingStep] = useState(1)
  const [displayedAiMessage, setDisplayedAiMessage] = useState<string>("") // Renamed state
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalTitle, setErrorModalTitle] = useState("")
  const [errorModalDescription, setErrorModalDescription] = useState("")

  const [searchMode, setSearchMode] = useState<'url' | 'keyword'>('url')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Updated step messages
  const stepMessages = {
    1: "1단계: 유튜브 영상을 불러오는 중입니다.",
    2: "2단계: AI가 레시피를 분석하고 있어요!",
  }

  // New AI analysis messages for animation
  const aiAnalysisMessages = [
    "AI가 영상 속 모든 재료를 파악하는 중입니다...",
    "조리 단계를 꼼꼼히 정리하고 있어요...",
    "셰프의 핵심 팁을 놓치지 않도록 분석 중...",
    "레시피의 예상 시간을 계산하고 있습니다...",
    "이제 곧 나만의 맞춤 레시피가 완성됩니다! ✨",
    "잠시만 기다려주세요, 맛있는 레시피가 곧 나타나요!",
    "AI가 요리 비법을 학습하고 있어요...",
  ]

  // Renamed and updated animation function
  const animateAiMessages = useCallback(() => {
    if (aiAnalysisMessages.length === 0) return

    let messageIndex = 0
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
    }
    animationIntervalRef.current = setInterval(() => {
      setDisplayedAiMessage(aiAnalysisMessages[messageIndex])
      messageIndex = (messageIndex + 1) % aiAnalysisMessages.length
    }, 3000) // 3 seconds as requested
  }, [])

  const resetLoadingState = useCallback(() => {
    setIsProcessing(false)
    setShowLoadingOverlay(false)
    setCurrentLoadingStep(1)
    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
      animationIntervalRef.current = null
    }
    setDisplayedAiMessage("") // Reset the new state
    if (abortControllerRef.current) {
      abortControllerRef.current = null
    }
  }, [])

  const handleCancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      console.log("[HeroSection] Aborting ongoing fetch requests.")
      abortControllerRef.current.abort()
    }
    toast({
      title: "레시피 추출 취소",
      description: "레시피 추출이 취소되었습니다.",
      variant: "info",
    })
    resetLoadingState()
  }, [resetLoadingState, toast])

  useEffect(() => {
    const fetchUsage = async () => {
      if (user) {
        setIsLoadingUsage(true)
        const result = await checkDailyUsage()
        if (result.success) {
          setCurrentUsageCount(result.currentCount || 0)
          setIsAdmin(result.isAdmin || false)
        } else {
          console.error("[HeroSection] Failed to fetch daily usage:", result.message)
          setCurrentUsageCount(0) // Ensure it's a number even on failure for display
          setIsAdmin(false) // Assume not admin on failure
        }
        setIsLoadingUsage(false)
      } else {
        setCurrentUsageCount(0) // Not logged in, so 0 usage, not admin
        setIsAdmin(false)
        setIsLoadingUsage(false)
      }
    }
    fetchUsage()
  }, [user])

  useEffect(() => {
    const checkClipboardForYouTubeURL = async () => {
      if (youtubeUrl) return

      if (!navigator.clipboard || !window.isSecureContext) return

      try {
        const clipboardText = await navigator.clipboard.readText()

        if (clipboardText && isYouTubeURL(clipboardText)) {
          setYoutubeUrl(clipboardText.trim())
          setShowClipboardToast(true)
        }
      } catch (err) {
        console.debug('Clipboard access denied or failed:', err)
      }
    }

    checkClipboardForYouTubeURL()
  }, [])

  // MODIFIED: 함수 분리 - 유튜브 메타데이터만 가져오는 함수
  const fetchAndCheckVideoMetadata = async (url: string, forceReExtract: boolean): Promise<VideoMetadata> => {
    const response = await fetch(`/api/youtube/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ youtubeUrl: url }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "유튜브 영상 정보를 불러오는 데 실패했습니다.")
    }

    const videoMetadata: VideoMetadata = await response.json()

    // 로그인한 사용자이고 강제 재추출이 아닌 경우, 메타데이터만으로 중복 체크
    if (user && !forceReExtract) {
      const duplicateCheckResult = await checkDuplicateRecipe(videoMetadata.videoTitle, videoMetadata.channelName)

      if (duplicateCheckResult.isDuplicate && duplicateCheckResult.recipeId) {
        setDuplicateRecipeId(duplicateCheckResult.recipeId)
        setShowDuplicateModal(true)
        toast({
          title: "알림",
          description: "이미 저장된 레시피입니다.",
          variant: "info",
        })
        throw new Error("DUPLICATE_RECIPE") // 중복 레시피임을 알리는 특별한 오류
      }
    }
    // Removed incrementDailyUsage from here
    return videoMetadata
  }

  // MODIFIED: 함수 분리 - 자막 추출 및 AI 분석
  const fetchAndProcessTranscript = async (
    url: string,
    videoMetadata: VideoMetadata,
    signal: AbortSignal,
  ): Promise<{ videoInfo: VideoInfo; extractedRecipe: RecipeData }> => {
    const videoInfo = await (async () => {
      const response = await fetch(`/api/youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "유튜브 자막을 불러오는 데 실패했습니다.")
      }
      return await response.json()
    })()

    if (!videoInfo.hasSubtitles || !videoInfo.transcriptText) {
      setRecipeUnavailableMessage("이 영상에는 추출 가능한 자막이 없습니다. 다른 영상을 시도해 주세요.")
      setShowRecipeUnavailableModal(true)
      throw new Error("NO_SUBTITLES") // 자막 없음 오류
    }

    // Removed: transcriptLinesRef.current = videoInfo.transcriptText.split(". ").filter(Boolean);

    await new Promise((resolve) => setTimeout(resolve, 2000))
    setCurrentLoadingStep(3)
    animateAiMessages() // Call the new animation function

    const geminiResponse = await fetch(`/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredTranscript: videoInfo.structuredTranscript,
        videoDescription: videoInfo.videoDescription,
      }),
      signal,
    })

    let recipeJsonString = ""
    if (!geminiResponse.ok) {
      setCurrentLoadingStep(4)
      const errorText = await geminiResponse.text()
      if (errorText.includes("The model is overloaded")) {
        setErrorModalTitle("AI 모델 과부하")
        setErrorModalDescription("현재 AI 모델에 요청이 많아 레시피 추출이 어렵습니다. 잠시 후 다시 시도해 주세요.")
        setShowErrorModal(true)
        throw new Error("AI_OVERLOAD")
      } else {
        setErrorModalTitle("레시피 추출 실패")
        setErrorModalDescription(`AI 레시피 추출 중 오류가 발생했습니다: ${errorText}`)
        setShowErrorModal(true)
        throw new Error("AI_EXTRACTION_FAILED")
      }
    }

    recipeJsonString = await geminiResponse.text()

    let extractedRecipe: RecipeData | null = null
    try {
      if (recipeJsonString.startsWith("```json")) {
        recipeJsonString = recipeJsonString.substring("```json".length, recipeJsonString.lastIndexOf("```")).trim()
      }
      extractedRecipe = JSON.parse(recipeJsonString)
    } catch (jsonError) {
      console.error("[HeroSection] Failed to parse Gemini response as JSON:", jsonError)
      setErrorModalTitle("AI 응답 파싱 오류")
      setErrorModalDescription(
        `AI 응답이 올바른 JSON 형식이 아닙니다. 원시 응답: ${recipeJsonString.substring(0, 200)}...`,
      )
      setShowErrorModal(true)
      throw new Error("AI_PARSE_ERROR")
    }

    if (animationIntervalRef.current) {
      clearInterval(animationIntervalRef.current)
    }

    if (
      !extractedRecipe ||
      !extractedRecipe.ingredients ||
      extractedRecipe.ingredients.length === 0 ||
      !extractedRecipe.steps ||
      extractedRecipe.steps.length === 0
    ) {
      setRecipeUnavailableMessage(
        "제공된 영상에서 레시피 정보를 충분히 추출할 수 없습니다. 영상에 정확한 재료나 조리 단계가 명시되어 있지 않을 수 있습니다. 다른 영상을 시도해 주세요.",
      )
      setShowRecipeUnavailableModal(true)
      throw new Error("INSUFFICIENT_RECIPE_DATA")
    }

    return { videoInfo, extractedRecipe }
  }

  // MODIFIED: 함수 분리 - 추출된 레시피 저장
  const processAndSaveRecipe = async (
    youtubeUrl: string,
    videoInfo: VideoInfo,
    extractedRecipe: RecipeData,
    forceReExtract: boolean,
  ) => {
    const previewData: PreviewData = {
      youtubeUrl,
      videoInfo,
      extractedRecipe,
    }

    if (user) {
      const result = await checkAndSaveRecipe(youtubeUrl, videoInfo, extractedRecipe, forceReExtract)

      if (result.success) {
        if (result.isDuplicate && result.recipeId && !forceReExtract) {
          // 중복 레시피 발견 시 모달 표시
          setDuplicateRecipeId(result.recipeId)
          setShowDuplicateModal(true)
          toast({
            title: "알림",
            description: "이미 저장된 레시피입니다.",
            variant: "info",
          })
          throw new Error("DUPLICATE_RECIPE_AFTER_SAVE") // 저장 후 중복 알림
        } else if (result.recipeId) {
          // 새 레시피 저장 또는 강제 재추출 성공
          toast({
            title: "저장 완료",
            description: result.message,
          })
          localStorage.removeItem(PENDING_RECIPE_STORAGE_KEY)
          router.push(`/recipe/${result.recipeId}`)
          return true // 성공적으로 저장 및 리디렉션
        } else {
          // 성공했지만 recipeId가 없는 경우 (예외 상황)
          throw new Error(result.message || "레시피 처리 후 ID를 찾을 수 없습니다.")
        }
      } else {
        throw new Error(result.message || "레시피 저장에 실패했습니다.")
      }
    } else {
      localStorage.setItem(PENDING_RECIPE_STORAGE_KEY, JSON.stringify(previewData))
      router.push(`/temp-preview`)
      return true // 로그인 필요, 미리보기 페이지로 이동
    }
  }

  const handleDiscoverRecipe = async (forceReExtract = false) => {
    if (!youtubeUrl) {
      toast({
        title: "알림",
        description: "유튜브 URL을 입력해주세요.",
        variant: "info",
      })
      resetLoadingState()
      return
    }

    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    try {
      // 사용량 증가: 로그인된 사용자이고, 관리자가 아니며, 강제 재추출이 아닌 경우에만
      if (user && !isAdmin && !forceReExtract) {
        await incrementDailyUsage()
        // 사용량 증가 후 UI 업데이트를 위해 최신 사용량 다시 가져오기
        const updatedUsage = await checkDailyUsage()
        if (updatedUsage.success) {
          setCurrentUsageCount(updatedUsage.currentCount || 0)
        } else {
          console.error("[HeroSection] Failed to update usage count after increment:", updatedUsage.message)
          setCurrentUsageCount(0) // Fallback to 0 on failure
        }
      }

      // Step 1: Fetch metadata and check for duplicates
      const videoMetadata = await fetchAndCheckVideoMetadata(youtubeUrl, forceReExtract)

      // Step 2: Fetch transcript and perform AI analysis
      const { videoInfo, extractedRecipe } = await fetchAndProcessTranscript(youtubeUrl, videoMetadata, signal)

      // Step 3: Process and save the extracted recipe
      await processAndSaveRecipe(youtubeUrl, videoInfo, extractedRecipe, forceReExtract)
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[HeroSection] Fetch aborted by user.")
      } else if (error.message === "DUPLICATE_RECIPE" || error.message === "DUPLICATE_RECIPE_AFTER_SAVE") {
        // 중복 레시피 모달은 이미 해당 함수에서 처리했으므로 추가 토스트/모달 없음
      } else if (error.message === "NO_SUBTITLES" || error.message === "INSUFFICIENT_RECIPE_DATA") {
        // 레시피 없음 모달은 이미 해당 함수에서 처리했으므로 추가 토스트/모달 없음
      } else if (
        error.message === "AI_OVERLOAD" ||
        error.message === "AI_EXTRACTION_FAILED" ||
        error.message === "AI_PARSE_ERROR"
      ) {
        // AI 관련 오류 모달은 이미 해당 함수에서 처리했으므로 추가 토스트/모달 없음
      } else {
        console.error("[HeroSection] Error in handleDiscoverRecipe:", error)
        setErrorModalTitle("오류 발생")
        setErrorModalDescription(error.message || "레시피 처리 중 알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.")
        setShowErrorModal(true)
      }
    } finally {
      setIsProcessing(false)
      resetLoadingState() // 모든 처리 후 로딩 상태 초기화
    }
  }

  const handleViewExistingRecipe = () => {
    if (duplicateRecipeId) {
      router.push(`/recipe/${duplicateRecipeId}`)
      setShowDuplicateModal(false)
    }
  }

  const handleForceReExtract = async () => {
    // Make it async
    setIsProcessing(true)
    setShowLoadingOverlay(true)
    setCurrentLoadingStep(1)
    setShowDuplicateModal(false)

    // 강제 재추출 시에도 사용량 제한 체크는 필요
    if (user) {
      const usageCheckResult = await checkDailyUsage()
      // CRITICAL FIX: Update usage count and admin status immediately
      setCurrentUsageCount(usageCheckResult.currentCount || 0)
      setIsAdmin(usageCheckResult.isAdmin || false)

      if (!usageCheckResult.isAllowed) {
        setShowUsageLimitModal(true)
        resetLoadingState()
        return // IMPORTANT: Stop execution if limit exceeded
      }
    }

    handleDiscoverRecipe(true) // Pass true for forceReExtract
  }

  const handleDiscoverClick = async () => {
    if (isProcessing) {
      console.warn("[HeroSection] Already processing, ignoring duplicate click from handleDiscoverClick.")
      return
    }

    // ✅ 키워드 검색 모드인 경우 검색만 실행 (팝업 없음)
    if (searchMode === 'keyword') {
      await handleKeywordSearch()
      return
    }

    // ✅ URL 모드인 경우 기존 레시피 추출 로직 실행
    setIsProcessing(true)
    setShowLoadingOverlay(true)
    setCurrentLoadingStep(1)

    if (!user) {
      setShowConsentModal(true)
      setIsProcessing(false)
      setShowLoadingOverlay(false)
      return
    }

    // 로그인된 사용자의 경우, 사용량 제한을 먼저 체크
    const usageCheckResult = await checkDailyUsage()
    setCurrentUsageCount(usageCheckResult.currentCount || 0)
    setIsAdmin(usageCheckResult.isAdmin || false)

    if (!usageCheckResult.isAllowed) {
      setShowUsageLimitModal(true)
      resetLoadingState()
      return
    }

    // 사용이 허용되면 레시피 추출 진행
    handleDiscoverRecipe(false)
  }

  // 키워드 검색 함수 - 간단한 로딩만 표시
  const handleKeywordSearch = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "검색 키워드를 입력해주세요",
        description: "요리 이름이나 재료를 입력해서 검색해보세요.",
        variant: "destructive"
      })
      return
    }

    // 단순 검색 로딩만 표시 (팝업 없음)
    setIsSearching(true)

    try {
      const response = await fetch('/api/youtube/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: youtubeUrl,
          maxResults: 10
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
          variant: "info"
        })
      }
    } catch (error) {
      console.error('YouTube search error:', error)
      toast({
        title: "검색 오류",
        description: "검색 중 문제가 발생했습니다. 다시 시도해주세요.",
        variant: "destructive"
      })
      setSearchResults([])
    } finally {
      // 검색 로딩만 종료 (팝업이나 다른 상태는 건드리지 않음)
      setIsSearching(false)
    }
  }

  // 영상 선택 함수 - 즉시 팝업 표시
  const handleVideoSelect = async (video: SearchResult) => {
    // ✅ 즉시 로딩 팝업 표시
    setIsProcessing(true)
    setShowLoadingOverlay(true)
    setCurrentLoadingStep(1)

    // URL 설정
    setYoutubeUrl(video.youtubeUrl)

    if (!user) {
      setShowConsentModal(true)
      setIsProcessing(false)
      setShowLoadingOverlay(false)
      return
    }

    // 사용량 제한 체크
    const usageCheckResult = await checkDailyUsage()
    setCurrentUsageCount(usageCheckResult.currentCount || 0)
    setIsAdmin(usageCheckResult.isAdmin || false)

    if (!usageCheckResult.isAllowed) {
      setShowUsageLimitModal(true)
      resetLoadingState()
      return
    }

    // 기존 handleDiscoverRecipe 함수 호출
    handleDiscoverRecipe(false)
  }

  // 검색 모드 토글 함수
  const toggleSearchMode = () => {
    setSearchMode(searchMode === 'url' ? 'keyword' : 'url')
    setYoutubeUrl('')
    setSearchResults([])
  }

  return (
    <section
      className={cn(
        "relative w-full flex flex-col items-center justify-center text-center",
        isDashboard
          ? "py-6 px-4 md:px-6 space-y-6" // 박스 상자 관련 클래스 제거
          : "py-20 md:py-32 lg:py-48 bg-background",
      )}
    >
      {!isDashboard && (
        <div className="container px-4 md:px-6 max-w-4xl space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-gray-900">
              YouTube 레시피
              <br />
              이제, 당신의 요리책이 됩니다.
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-16">
              유튜브 영상 속 레시피를 AI가 자동 추출하고,
              <br />
              나만의 노트를 추가해 요리가 더욱 즐거워집니다.
            </p>
          </div>
          <div className="relative flex items-center w-full max-w-xl mx-auto rounded-full border border-gray-100 shadow-input-unit-shadow overflow-hidden focus-within:border-primary">
            <Input
              id="youtube-url"
              placeholder="YouTube 주소를 입력해주세요."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="h-12 flex-grow pl-5 pr-20 border-none focus:outline-none focus:ring-0 focus:ring-offset-0 text-base rounded-l-full rounded-r-none placeholder:text-gray-400"
              disabled={isProcessing || showLoadingOverlay}
            />
            <Button
              onClick={handleDiscoverClick}
              disabled={!youtubeUrl || isProcessing || showLoadingOverlay}
              size="icon"
              className={`absolute right-0 h-full w-12 ${!youtubeUrl || isProcessing || showLoadingOverlay
                  ? 'bg-gray-600'
                  : 'bg-black hover:bg-gray-800'
                } text-white rounded-r-full rounded-l-none transition-colors duration-200`}
            >
              {isProcessing && showLoadingOverlay ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      )}

      {isDashboard && (
        <div className="w-full space-y-4">
          {/* ✅ 검색 모드 토글 추가 */}
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-1 rounded-lg flex text-xs">
              <button
                onClick={() => searchMode !== 'url' && toggleSearchMode()}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${searchMode === 'url'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                YouTube 주소 입력
              </button>
              <button
                onClick={() => searchMode !== 'keyword' && toggleSearchMode()}
                className={`px-3 py-1.5 rounded-md font-medium transition-all ${searchMode === 'keyword'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                YouTube 키워드 검색
              </button>
            </div>
          </div>

          {/* ✅ 기존 입력 필드에 아이콘 및 placeholder 수정 */}
          <div
            className={cn(
              "relative flex items-center w-full max-w-xl mx-auto rounded-full shadow-input-unit-shadow overflow-hidden",
              isDashboard ? "" : "border border-gray-100",
            )}
          >
            {/* ✅ 아이콘 추가 */}
            <div className="pl-5">
              {searchMode === 'keyword' ? (
                <Search className="h-5 w-5 text-gray-400" />
              ) : (
                <ExternalLink className="h-5 w-5 text-gray-400" />
              )}
            </div>
            <Input
              id="youtube-url"
              placeholder={
                searchMode === 'keyword'
                  ? '요리 이름을 검색해보세요'
                  : '유튜브 URL를 입력해주세요.'
              }
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1 h-12 pl-4 pr-20 text-base border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full rounded-r-none placeholder:text-gray-400"
              disabled={isProcessing || showLoadingOverlay || isSearching}
              onKeyPress={(e) => e.key === 'Enter' && handleDiscoverClick()}
            />
            <Button
              onClick={handleDiscoverClick}
              disabled={!youtubeUrl || isProcessing || showLoadingOverlay || isSearching}
              size="icon"
              className={`absolute right-0 h-full w-12 ${!youtubeUrl || isProcessing || showLoadingOverlay || isSearching
                  ? 'bg-gray-600'
                  : 'bg-black hover:bg-gray-800'
                } text-white rounded-r-full rounded-l-none transition-colors duration-200`}
            >
              {isProcessing || showLoadingOverlay || isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* 사용량 표시 */}
          {user && !isLoadingUsage && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                {isAdmin ? (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      ADMIN
                    </span>
                    무제한 사용 가능
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                      FREE
                    </span>
                    총 2회 중 {currentUsageCount}회 사용
                  </>
                )}
              </p>
            </div>
          )}

          {/* ✅ 검색 결과 영역 - 최근 조회한 레시피와 완전히 동일한 반응형 디자인 */}
          {searchMode === 'keyword' && searchResults.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  검색 결과 ({searchResults.length}개)
                </h2>
              </div>
              <div className="space-y-4">
                {searchResults.map((video: SearchResult) => (
                  <div
                    key={video.videoId}
                    className="border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-shadow cursor-pointer group"
                    onClick={() => handleVideoSelect(video)}
                  >
                    {/* 최근 조회한 레시피와 완전히 동일한 반응형 구조 */}
                    <div className="flex flex-col md:flex-row">
                      {/* 썸네일 - 최근 조회한 레시피와 동일한 반응형 클래스 */}
                      <div className="w-full md:w-48 md:h-32 flex-shrink-0 md:mr-4 mb-4 md:mb-0">
                        <div className="aspect-video">
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

                      {/* 정보 영역 - 최근 조회한 레시피와 완전히 동일한 구조 및 좌측 정렬 */}
                      <div className="flex-1 space-y-2">
                        <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-black line-clamp-2 text-left">
                          {video.title}
                        </h3>
                        <p className="text-xs text-gray-600 mb-1 text-left">
                          {video.channelName}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          {video.viewCount && (
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span>{video.viewCount}</span>
                            </div>
                          )}
                          {video.publishedTime && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{video.publishedTime}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* 레시피 조회 버튼 - 호버 시 표시 */}
                        <div className="pt-2">
                          <Button
                            size="sm"
                            className="px-3 py-1.5 bg-black text-white text-xs rounded-md hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleVideoSelect(video)
                            }}
                          >
                            레시피 조회
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isDashboard && (
        <p className="text-sm text-gray-500 mt-8">
          수많은 요리사들이 Recipick과 함께합니다.
          <br />
          지금 바로 당신의 요리 경험을 업그레이드하세요!
        </p>
      )}

      {/* 로딩 다이얼로그 (모달 스타일) */}
      <CustomDialog
        isOpen={showLoadingOverlay}
        onClose={handleCancelProcessing}
        title="레시피 분석 중입니다"
        description=""
        disableClose={true}
        hideCloseButton={true}
        className="sm:max-w-[425px] p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        headerClassName="mb-4 text-left w-full"
        titleClassName="text-xl font-semibold text-gray-900"
        descriptionClassName="hidden"
        footerClassName="w-full mt-4"
        overlayClassName="bg-black/50 backdrop-blur-sm"
        footer={
          <Button
            variant="outline"
            onClick={handleCancelProcessing}
            className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
          >
            괜찮아요, 그만둘래요
          </Button>
        }
      >
        {/* Progress Steps */}
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
                <div className={`
                    relative w-5 h-5 rounded-full transition-all duration-300 ease-out
                    ${isCompleted
                    ? 'bg-gray-600'
                    : isCurrent
                      ? 'bg-gray-100 border-2 border-gray-600'
                      : 'bg-gray-100 border-2 border-gray-200'
                  }
                  `}>
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-gray-600 rounded-full absolute inset-0 m-auto animate-pulse" />
                  ) : null}
                </div>
                <span className={`
                    text-sm font-medium transition-all duration-300
                    ${isCompleted
                    ? 'text-gray-400'
                    : isCurrent
                      ? 'text-gray-900 animate-pulse'
                      : 'text-gray-400'
                  }
                  `}>
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>
      </CustomDialog>

      <CustomDialog
        isOpen={showRecipeUnavailableModal}
        onClose={() => setShowRecipeUnavailableModal(false)}
        title="레시피 조회 불가능"
        description={recipeUnavailableMessage}
        disableClose={false}
        hideCloseButton={true}
        className="sm:max-w-[425px] p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        headerClassName="mb-6 text-left w-full"
        titleClassName="text-xl font-semibold text-gray-900"
        descriptionClassName="text-sm text-gray-600 mt-2"
        footerClassName="w-full mt-6"
        overlayClassName="bg-black/50 backdrop-blur-sm"
        footer={
          <Button
            onClick={() => setShowRecipeUnavailableModal(false)}
            className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
          >
            확인
          </Button>
        }
      />

      <CustomDialog
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="이미 조회했던 레시피에요."
        description="레시피 정보를 다시 보여드릴까요?"
        disableClose={false}
        hideCloseButton={true}
        className="sm:max-w-[425px] p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        headerClassName="mb-6 text-left w-full"
        titleClassName="text-2xl font-semibold text-gray-900 mb-2"
        descriptionClassName="text-base text-gray-600"
        footerClassName="w-full"
        overlayClassName="bg-black/50 backdrop-blur-sm"
        footer={
          <div className="space-y-3">
            <div className="space-y-3 mb-4">
              <Button
                onClick={handleViewExistingRecipe}
                className="w-full py-3 px-4 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors duration-200"
              >
                네, 볼게요
              </Button>

              <Button
                variant="outline"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
              >
                아니요, 다른 영상 조회할래요
              </Button>
            </div>

            <div className="text-center pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">
                이미 조회한 레시피를 업데이트하고 싶다면
              </p>
              <Button
                variant="link"
                onClick={handleForceReExtract}
                className="text-sm text-gray-700 hover:text-gray-900 underline font-medium p-0 h-auto"
              >
                여기를 눌러주세요
              </Button>
            </div>
          </div>
        }
      >
      </CustomDialog>

      <CustomDialog
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        title="일일 사용량 제한"
        description={
          <>
            하루에 최대 2회만 레시피 조회가 가능해요 🙏
            <br />
            서비스 개선이 될 때까지 잠시만 기다려주세요!
          </>
        }
        disableClose={false}
        hideCloseButton={true}
        className="sm:max-w-[425px] p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        headerClassName="mb-6 text-left w-full"
        titleClassName="text-xl font-semibold text-gray-900"
        descriptionClassName="text-sm text-gray-600 mt-2"
        footerClassName="w-full mt-6"
        overlayClassName="bg-black/50 backdrop-blur-sm"
        footer={
          <Button
            onClick={() => setShowUsageLimitModal(false)}
            className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
          >
            확인
          </Button>
        }
      />

      {/* 새로운 일반 오류 팝업 */}
      <CustomDialog
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalTitle}
        description={errorModalDescription}
        disableClose={false}
        hideCloseButton={true}
        className="sm:max-w-[425px] p-6 rounded-2xl bg-white shadow-xl border border-gray-100"
        headerClassName="mb-6 text-left w-full"
        titleClassName="text-xl font-semibold text-gray-900"
        descriptionClassName="text-sm text-gray-600 mt-2"
        footerClassName="w-full mt-6"
        overlayClassName="bg-black/50 backdrop-blur-sm"
        footer={
          <Button
            onClick={() => setShowErrorModal(false)}
            className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
          >
            확인
          </Button>
        }
      />

      <ConsentModal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} />
      <ClipboardToast
        isVisible={showClipboardToast}
        onClose={() => setShowClipboardToast(false)}
        message="유튜브 링크를 자동으로 불러왔어요!"
      />

    </section>
  )
}