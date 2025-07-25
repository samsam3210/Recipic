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
import { checkDailyUsage, incrementDailyUsage } from "@/lib/actions/usage"
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
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null)
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [showRecipeUnavailableModal, setShowRecipeUnavailableModal] = useState(false)
  const [recipeUnavailableMessage, setRecipeUnavailableMessage] = useState("")
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false)
  const [currentUsageCount, setCurrentUsageCount] = useState<number | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const { startExtraction, isExtracting } = useExtraction()
  const router = useRouter()
  const handleInputClick = () => {
    if (isDashboard) {
      router.push('/search')
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
    const fetchUsage = async () => {
      if (user) {
        setIsLoadingUsage(true)
        try {
          const result = await checkDailyUsage()
          if (result.success) {
            setCurrentUsageCount(result.currentCount || 0)
            setIsAdmin(result.isAdmin || false)
          } else {
            console.error("[HeroSection] Failed to fetch daily usage:", result.message)
            setCurrentUsageCount(0)
            setIsAdmin(false)
          }
        } catch (error) {
          console.error("[HeroSection] Error fetching usage:", error)
          setCurrentUsageCount(0)
          setIsAdmin(false)
        } finally {
          // 더 빠르게 로딩 완료 처리 (100ms 지연으로 자연스럽게)
          setTimeout(() => setIsLoadingUsage(false), 100)
        }
      } else {
        setCurrentUsageCount(0)
        setIsAdmin(false)
        setIsLoadingUsage(false)
      }
    }
    fetchUsage()
  }, [user])

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
        <div className="relative p-8 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 group-hover:from-blue-100 group-hover:to-indigo-100 transition-colors">
              <Icon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div id={`counter-${end}`} className="text-4xl font-bold text-gray-900">
                {count.toLocaleString()}{suffix}
              </div>
              <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
            </div>
          </div>
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 rounded-full -translate-y-10 translate-x-10"></div>
        </div>
      </div>
    )
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
        <div className="relative">
          {/* 배경 장식 요소 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-indigo-400/5 to-cyan-400/5 rounded-full blur-3xl"></div>
          </div>

          <div className="container px-4 md:px-6 max-w-6xl mx-auto">
            {/* 메인 히어로 섹션 */}
            <div className="text-center space-y-12 pb-20">
              {/* 서브헤딩 */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 animate-fade-in-up">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">AI 기반 레시피 추출 서비스</span>
              </div>

              {/* 메인 헤드라인 */}
              <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
                  <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                    YouTube 요리영상,
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    5초만에 내 레시피북이 됩니다
                  </span>
                </h1>
                
                {/* 서브텍스트 */}
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  수많은 요리사들이 Recipick과 함께합니다.
                  <br />
                  지금 바로 당신의 요리 경험을 업그레이드하세요!
                </p>
              </div>

              {/* 검색 입력 필드 */}
              <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-300"></div>
                  <div className="relative flex items-center bg-white rounded-2xl border border-gray-200 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <div className="flex items-center pl-6">
                      <Search className="w-5 h-5 text-gray-400" />
                    </div>
                    <Input
                      id="youtube-url"
                      placeholder="레시피 검색하기"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="h-16 flex-grow px-4 border-none focus:outline-none focus:ring-0 text-lg placeholder:text-gray-400 bg-transparent rounded-2xl"
                      disabled={isExtracting}
                    />
                    <Button
                      onClick={handleDiscoverClick}
                      disabled={!youtubeUrl || isExtracting}
                      className="m-2 h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      {isExtracting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>추출하기</span>
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 통계 섹션 */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  신뢰할 수 있는 <span className="text-blue-600">성능</span>
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  수천 명의 사용자가 검증한 정확하고 빠른 레시피 추출 서비스
                </p>
              </div>
              
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
                  end={5}
                  suffix="초"
                  title="평균 추출 시간"
                  description="빠르고 효율적인 AI 기술로 즉시 결과를 제공합니다"
                />
                <StatCard
                  icon={Target}
                  end={97}
                  suffix="%"
                  title="정확도"
                  description="검증된 AI 모델로 높은 품질의 레시피를 보장합니다"
                />
              </div>
            </div>
          </div>
        </div>
      )}

          {isDashboard && (
            <div className="w-full max-w-2xl space-y-4">
              <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="레시피 검색하기"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onClick={handleInputClick}
                  readOnly
                  className="w-full h-14 pl-12 pr-4 text-base rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:ring-0 transition-colors cursor-pointer"
                />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Recipick AI가 레시피 추출을 도와드려요.
              </p>
              
              {/* 사용량 표시 - 스켈레톤 포함 */}
              {user && (
                <div className="text-center">
                  {isLoadingUsage ? (
                    <div className="text-sm text-gray-500 opacity-50">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 mr-2">
                        ...
                      </span>
                      사용량 확인 중...
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 animate-in fade-in duration-200">
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
            className="w-full rounded-md border-gray-300 text-gray-700 hover:bg-gray-50 bg-transparent" // Adjusted button style
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
          <Button onClick={() => setShowRecipeUnavailableModal(false)} className="w-full">
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
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)}>
              아니요, 다른 영상 입력할게요
            </Button>
            <Button onClick={handleViewExistingRecipe}>예, 기존 레시피 보기</Button>
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
          <>
            하루에 최대 2회만 레시피 조회가 가능해요 🙏
            <br />
            서비스 개선이 될 때까지 잠시만 기다려주세요!
          </>
        }
        className="sm:max-w-[425px] p-6 flex flex-col items-center text-center"
        headerClassName="mb-4 w-full"
        titleClassName="text-2xl font-bold text-gray-900"
        descriptionClassName="text-base text-gray-600 mt-2"
        footerClassName="w-full mt-4"
        footer={
          <Button onClick={() => setShowUsageLimitModal(false)} className="w-full">
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
          <Button onClick={() => setShowErrorModal(false)} className="w-full">
            확인
          </Button>
        }
      />

      <ConsentModal isOpen={showConsentModal} onClose={() => setShowConsentModal(false)} />
    </section>
  )
}
