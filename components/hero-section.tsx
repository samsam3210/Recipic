"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, X, ArrowRight } from "lucide-react"
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
import { YouTubeConfirmationSheet } from "./youtube-confirmation-sheet"
import { isIOS } from "@/lib/utils"

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

  const [showYouTubeSheet, setShowYouTubeSheet] = useState(false)
  const [detectedUrl, setDetectedUrl] = useState("")

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
          const isIOSDevice = isIOS()
          
          if (isIOSDevice) {
            setDetectedUrl(clipboardText.trim())
            setShowYouTubeSheet(true)
          } else {
            setYoutubeUrl(clipboardText.trim())
            setShowClipboardToast(true)
          }
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
    // Make it async
    if (isProcessing) {
      console.warn("[HeroSection] Already processing, ignoring duplicate click from handleDiscoverClick.")
      return
    }

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
    // CRITICAL FIX: Update usage count and admin status immediately
    setCurrentUsageCount(usageCheckResult.currentCount || 0)
    setIsAdmin(usageCheckResult.isAdmin || false)

    if (!usageCheckResult.isAllowed) {
      setShowUsageLimitModal(true)
      resetLoadingState()
      return // IMPORTANT: 사용량 제한 초과 시 여기서 실행 중단
    }

    // 사용이 허용되면 레시피 추출 진행
    handleDiscoverRecipe(false)
  }

  const handleConfirmYouTube = () => {
    setYoutubeUrl(detectedUrl)
    setShowYouTubeSheet(false)
    setTimeout(() => {
      handleDiscoverClick()
    }, 100)
  }

  const handleCancelYouTube = () => {
    setShowYouTubeSheet(false)
    setDetectedUrl("")
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
              className={`absolute right-0 h-full w-12 ${
                !youtubeUrl || isProcessing || showLoadingOverlay 
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
          <div
            className={cn(
              "relative flex items-center w-full max-w-xl mx-auto rounded-full shadow-input-unit-shadow overflow-hidden",
              isDashboard ? "" : "border border-gray-100", // isDashboard일 때 border 제거
            )}
          >
            <Input
              id="youtube-url"
              placeholder="YouTube 주소를 입력해주세요."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="flex-1 h-12 pl-5 pr-20 text-base border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-full rounded-r-none placeholder:text-gray-400"
              disabled={isProcessing || showLoadingOverlay}
            />
            <Button
              onClick={handleDiscoverClick}
              disabled={!youtubeUrl || isProcessing || showLoadingOverlay}
              size="icon"
              className={`absolute right-0 h-full w-12 ${
                !youtubeUrl || isProcessing || showLoadingOverlay 
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

                    {user ? ( // 사용자가 로그인되어 있을 때만 사용량 정보 표시
            isLoadingUsage ? ( // isLoadingUsage가 true일 때 스켈레톤 표시
              <Skeleton className="h-4 w-48 mx-auto mt-2" />
            ) : (
              // isLoadingUsage가 false일 때 실제 사용량 정보 표시
              <p className="text-sm text-muted-foreground text-center mt-2 font-light">
                {isAdmin ? (
                  <>
                    <Badge variant="secondary" className="bg-red-100 text-red-700 mr-1">
                      SUPER
                    </Badge>
                    관리자 계정(제한 없음)
                  </>
                ) : (
                  <>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 mr-1">
                      FREE
                    </Badge>
                    총 2회 중 {currentUsageCount !== null ? currentUsageCount : 0}회 사용
                  </>
                )}
              </p>
            )
          ) : null}
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
      <ClipboardToast
        isVisible={showClipboardToast}
        onClose={() => setShowClipboardToast(false)}
        message="유튜브 링크를 자동으로 불러왔어요!"
      />

      <YouTubeConfirmationSheet
        isVisible={showYouTubeSheet}
        youtubeUrl={detectedUrl}
        onConfirm={handleConfirmYouTube}
        onCancel={handleCancelYouTube}
      />
    </section>
  )
}
