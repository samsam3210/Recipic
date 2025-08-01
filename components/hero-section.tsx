"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, X, ArrowRight, Search, ChefHat, Clock, Target, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"
import { ConsentModal } from "./consent-modal"
import { cn } from "@/lib/utils"
import { checkDailyUsage } from "@/lib/actions/usage"
import { checkDuplicateRecipe, checkAndSaveRecipe } from "@/lib/actions/recipe"
import { DAILY_LIMIT } from "@/lib/constants/usage"
import { Badge } from "@/components/ui/badge"
import { CustomDialog } from "./custom-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useExtraction } from "@/contexts/extraction-context"

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
  channelId: string
  channelUrl: string
  channelThumbnail: string
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
  cachedUsageData?: { currentCount: number; isAdmin: boolean } | null
  isLoading?: boolean
}

export function HeroSection({ user, isDashboard = false, cachedUsageData = null, isLoading = false }: HeroSectionProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showRecipeUnavailableModal, setShowRecipeUnavailableModal] = useState(false)
  const [recipeUnavailableMessage, setRecipeUnavailableMessage] = useState("")
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [currentUsageCount, setCurrentUsageCount] = useState<number | null>(
    cachedUsageData?.currentCount ?? null
  )
  const [isAdmin, setIsAdmin] = useState(cachedUsageData?.isAdmin ?? false)

  console.log('[HeroSection] 초기 상태:', {
    hasCachedUsageData: !!cachedUsageData,
    currentUsageCount,
    isAdmin,
    isLoading,
    isDashboard
  });
  const { startExtraction, isExtracting } = useExtraction()
  const router = useRouter()
  const handleInputClick = () => {
    if (isDashboard) {
      router.push('/search?focus=true')
    }
  }
  const { toast } = useToast()

  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorModalTitle, setErrorModalTitle] = useState("")
  const [errorModalDescription, setErrorModalDescription] = useState("")
  const [currentLoadingStep, setCurrentLoadingStep] = useState(1)
  const [displayedAiMessage, setDisplayedAiMessage] = useState<string>("") // Renamed state
  const animationIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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
    // 캐시된 데이터가 있으면 상태 업데이트
    if (cachedUsageData) {
      setCurrentUsageCount(cachedUsageData.currentCount)
      setIsAdmin(cachedUsageData.isAdmin)
    } else if (!user) {
      setCurrentUsageCount(0)
      setIsAdmin(false)
    }
  }, [user, cachedUsageData])

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
        // 토스트 제거 - 모달로만 표시
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
    setCurrentLoadingStep(2)
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
          // 토스트 제거 - 모달로만 표시
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
      // Step 1: Fetch metadata and check for duplicates
      const videoMetadata = await fetchAndCheckVideoMetadata(youtubeUrl, forceReExtract)

      // Step 2: Fetch transcript and perform AI analysis
      const { videoInfo, extractedRecipe } = await fetchAndProcessTranscript(youtubeUrl, videoMetadata, signal)

      // Step 3: Process and save the extracted recipe
      const saveResult = await processAndSaveRecipe(youtubeUrl, videoInfo, extractedRecipe, forceReExtract)
      
      // 사용량 증가는 이제 extraction-context.tsx에서 처리됨
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
    if (isExtracting) {
      console.warn("[HeroSection] Already extracting, ignoring duplicate click.")
      return
    }

    if (!user) {
      setShowConsentModal(true)
      return
    }

    // 로그인된 사용자의 경우, 사용량 제한을 먼저 체크
    const usageCheckResult = await checkDailyUsage()
    setCurrentUsageCount(usageCheckResult.currentCount || 0)
    setIsAdmin(usageCheckResult.isAdmin || false)

    if (!usageCheckResult.isAllowed) {
      setShowUsageLimitModal(true)
      return
    }

    try {
      // Use floating extraction bar
      await startExtraction(youtubeUrl)
    } catch (error: any) {
      console.error("Recipe extraction error:", error)
      toast({
        title: "레시피 추출 실패",
        description: error.message || "레시피 추출 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  // 카운트업 애니메이션 훅
  const useCountUp = (end: number, duration: number = 2000) => {
    const [count, setCount] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true)
          }
        },
        { threshold: 0.1 }
      )

      const element = document.getElementById(`counter-${end}`)
      if (element) {
        observer.observe(element)
      }

      return () => {
        if (element) {
          observer.unobserve(element)
        }
      }
    }, [end, isVisible])

    useEffect(() => {
      if (isVisible) {
        let startTime: number | null = null
        const animate = (currentTime: number) => {
          if (startTime === null) startTime = currentTime
          const progress = Math.min((currentTime - startTime) / duration, 1)
          
          const easeOutCubic = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(easeOutCubic * end))
          
          if (progress < 1) {
            requestAnimationFrame(animate)
          }
        }
        requestAnimationFrame(animate)
      }
    }, [isVisible, end, duration])

    return count
  }

  // 통계 컴포넌트
  const StatCard = ({ icon: Icon, end, suffix, title, description }: {
    icon: any
    end: number
    suffix: string
    title: string
    description: string
  }) => {
    const count = useCountUp(end)
    
    return (
      <div className="group relative">
        <div className="relative p-8 rounded-2xl bg-white border border-green-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-green-50 to-emerald-100 group-hover:from-green-100 group-hover:to-emerald-200 transition-colors">
              <Icon className="w-8 h-8 text-[#6BA368]" />
            </div>
            <div className="space-y-2">
              <div id={`counter-${end}`} className="text-4xl font-bold text-[#6BA368]">
                {count.toLocaleString()}{suffix}
              </div>
              <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          </div>
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/5 to-emerald-500/10 rounded-full -translate-y-10 translate-x-10"></div>
        </div>
      </div>
    )
  }

  return (
    <section
      className={cn(
        "relative w-full flex flex-col",
        isDashboard
          ? "py-6 space-y-6" // Remove centering classes and padding
          : "py-20 md:py-32 lg:py-[150px] bg-white items-center justify-center text-center",
      )}
    >
      {!isDashboard && (
        <div className="relative">
          {/* 배경 장식 요소 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-green-400/10 to-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-lime-400/10 to-green-400/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-emerald-400/5 to-teal-400/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            {/* 메인 히어로 섹션 */}
            <div className="text-center space-y-8 pb-20">
              {/* 서브헤딩 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100/50 animate-fade-in-up">
                <Sparkles className="w-4 h-4 text-[#6BA368]" />
                <span className="text-sm font-medium text-[#5a8f57]">AI 레시피 추출 서비스</span>
              </div>

              {/* 메인 헤드라인 */}
              <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                  <span className="text-gray-900">
                    YouTube 요리영상,
                  </span>
                  <br />
                  <span className="text-gray-900">
                    나의 레시피북이됩니다
                  </span>
                </h1>
                
                {/* 서브텍스트 */}
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  뒤로 돌리고, 멈추고, 메모할 필요 없어요.
                  <br />
                  영상을 알려주시면 레시피를 알려드릴게요.
                </p>
              </div>

              {/* 검색 입력 필드 */}
              <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                {isLoading ? (
                  <div className="relative">
                    <Skeleton className="h-12 md:h-16 w-full rounded-2xl" />
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-[#6BA368] rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                    <div className="relative flex items-center bg-white rounded-2xl border border-green-200 shadow-xl hover:shadow-2xl transition-all duration-300 focus-within:border-[#6BA368] focus-within:ring-2 focus-within:ring-[#6BA368]/20">
                      <div className="flex items-center pl-4 md:pl-6">
                        <Search className="w-4 h-4 md:w-5 md:h-5 text-[#6BA368]" />
                      </div>
                      <Input
                        id="youtube-url"
                        placeholder="유튜브 영상 검색"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="h-12 md:h-16 flex-grow px-3 md:px-4 border-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base md:text-lg placeholder:text-gray-400 bg-transparent rounded-2xl"
                        disabled={isExtracting}
                      />
                      <Button
                        onClick={handleDiscoverClick}
                        disabled={!youtubeUrl || isExtracting}
                        className="m-2 h-8 md:h-12 px-4 md:px-8 bg-[#6BA368] hover:bg-[#5a8f57] text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl text-sm md:text-base"
                      >
                        {isExtracting ? (
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                        ) : (
                          <>
                            <span>검색</span>
                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 통계 섹션 */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              {isLoading ? (
                <div className="text-center mb-12">
                  <Skeleton className="h-10 w-80 mx-auto mb-4" />
                  <Skeleton className="h-6 w-96 mx-auto" />
                </div>
              ) : (
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    이미 많은 분들이 <span className="text-[#6BA368]">사용해요</span>
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                    매일 수많은 영상들이 레시피로 변하고 있어요.
                  </p>
                </div>
              )}
              
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                      <Skeleton className="w-12 h-12 mx-auto mb-4 rounded-full" />
                      <Skeleton className="h-8 w-20 mx-auto mb-2" />
                      <Skeleton className="h-5 w-32 mx-auto mb-3" />
                      <Skeleton className="h-4 w-full mb-1" />
                      <Skeleton className="h-4 w-3/4 mx-auto" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                  <StatCard
                    icon={ChefHat}
                    end={12847}
                    suffix="+"
                    title="추출된 레시피"
                    description="다양한 요리 장르의 레시피를 정확하게 추출했습니다"
                  />
                  <StatCard
                    icon={Clock}
                    end={30}
                    suffix="초"
                    title="평균 처리 시간"
                    description="AI가 영상을 꼼꼼히 분석해서 정확한 레시피를 만들어드려요"
                  />
                  <StatCard
                    icon={Target}
                    end={97}
                    suffix="%"
                    title="정확도"
                    description="검증된 AI 모델로 높은 품질의 레시피를 보장합니다"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

          {isDashboard && (
            <div className="w-full space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 md:h-14 w-full rounded-xl" />
                  <Skeleton className="h-4 w-64" />
                </>
              ) : (
                <>
                  <div className="relative">
                    <div className="flex items-center bg-white rounded-full border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 focus-within:border-[#6BA368] focus-within:ring-2 focus-within:ring-[#6BA368]/10">
                      <div className="flex items-center pl-4 md:pl-6">
                        <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                      </div>
                      <Input
                        type="text"
                        placeholder="유튜브 영상 검색"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        onClick={handleInputClick}
                        readOnly
                        className="h-12 md:h-14 flex-grow px-3 md:px-4 border-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base md:text-lg placeholder:text-gray-400 bg-transparent rounded-full cursor-pointer"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed text-center">
                    Recipick AI가 레시피 추출을 도와드려요.
                  </p>
                </>
              )}
              
              {/* 사용량 표시 - 스켈레톤 포함 */}
              {user && (
                <div className="text-center">
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Skeleton className="h-4 w-12 rounded-full mr-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 animate-in fade-in duration-200">
                      {isAdmin ? (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#6BA368]/10 text-[#6BA368] mr-2">
                            ADMIN
                          </span>
                          무제한 사용 가능
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[#6BA368]/10 text-[#6BA368] mr-2">
                            FREE
                          </span>
                          총 {DAILY_LIMIT}회 중 {currentUsageCount}회 사용
                        </>
                      )}
                    </p>
                  )}
                </div>
                   )}
                   </div>
                 )}


      {/* 로딩 다이얼로그 (모달 스타일) */}
      <CustomDialog
        isOpen={showLoadingOverlay}
        onClose={handleCancelProcessing} // 취소 버튼과 동일한 동작
        title="레시피 추출 중"
        description={stepMessages[currentLoadingStep as keyof typeof stepMessages]}
        disableClose={true} // 외부 클릭 및 ESC 키 방지
        hideCloseButton={true} // Hide the 'X' button
        className="sm:max-w-[425px] p-6 flex flex-col items-center rounded-xl bg-white shadow-subtle-dialog" // Apply rounded corners, white background, and subtle shadow
        headerClassName="mb-6 text-center w-full"
        titleClassName="text-3xl font-bold text-gray-900"
        descriptionClassName="text-lg text-gray-700 mt-2" // Changed to text-gray-700 for consistency
        footerClassName="w-full mt-6"
        overlayClassName="bg-black/60" // Apply custom overlay background
        footer={
          <Button
            variant="outline"
            onClick={handleCancelProcessing}
            className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-all duration-300"
          >
            <X className="mr-2 h-4 w-4" />
            괜찮아요, 그만둘래요
          </Button>
        }
      >
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" /> {/* Spinner color is primary */}
        {currentLoadingStep === 2 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md w-full text-sm text-gray-700 font-mono h-16 overflow-hidden flex items-center justify-center text-center">
            <p className="animate-fade-in-out">{displayedAiMessage || "AI가 자막을 분석 중..."}</p>{" "}
            {/* Use displayedAiMessage */}
          </div>
        )}
        {/* Removed the specific text area for "AI가 영상 자막을 읽고 있습니다..." */}
      </CustomDialog>

      <CustomDialog
        isOpen={showRecipeUnavailableModal}
        onClose={() => setShowRecipeUnavailableModal(false)}
        title="레시피 조회 불가능"
        description={recipeUnavailableMessage}
        className="sm:max-w-[425px] p-6 flex flex-col items-center text-center"
        headerClassName="mb-4 w-full"
        titleClassName="text-2xl font-bold text-gray-900"
        descriptionClassName="text-base text-gray-600 mt-2"
        footerClassName="w-full mt-4"
        footer={
          <Button onClick={() => setShowRecipeUnavailableModal(false)} className="w-full py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg">
            확인
          </Button>
        }
      />

      <CustomDialog
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        title="이전에 레시피를 조회했던 영상이에요."
        description="레시피 정보 화면으로 바로 이동할까요?"
        className="sm:max-w-[425px]"
        footerClassName="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4"
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateModal(false)}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-xl transition-all duration-300"
            >
              아니요, 다른 영상 입력할게요
            </Button>
            <Button 
              onClick={handleViewExistingRecipe}
              className="flex-1 py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg"
            >
              예, 기존 레시피 보기
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground text-center mt-4 w-full">
          다시 레시피를 새로 추출하고 싶다면{" "}
          <Button variant="link" className="p-0 h-auto text-sm" onClick={handleForceReExtract}>
            여기를 눌러주세요.
          </Button>
        </p>
      </CustomDialog>

      <CustomDialog
        isOpen={showUsageLimitModal}
        onClose={() => setShowUsageLimitModal(false)}
        title="일일 사용량 제한"
        description={
          <div className="text-center space-y-3">
            <div className="space-y-2">
              <p className="text-gray-700">현재 무료 서비스로 운영되고 있어서</p>
              <p className="text-gray-700">하루 {DAILY_LIMIT}회로 제한하고 있어요</p>
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

      {/* 새로운 일반 오류 팝업 */}
      <CustomDialog
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorModalTitle}
        description={errorModalDescription}
        className="sm:max-w-[425px] p-6 flex flex-col items-center text-center"
        headerClassName="mb-4 w-full"
        titleClassName="text-2xl font-bold text-gray-900"
        descriptionClassName="text-base text-gray-600 mt-2"
        footerClassName="w-full mt-4"
        footer={
          <Button onClick={() => setShowErrorModal(false)} className="w-full py-3 px-4 text-sm font-semibold bg-gray-900 hover:bg-black text-white rounded-xl transition-all duration-300 shadow-lg">
            확인
          </Button>
        }
      />

      <ConsentModal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} />
    </section>
  )
}
