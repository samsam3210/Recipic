"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { checkDailyUsage, incrementDailyUsage } from '@/lib/actions/usage'
import { checkAllDuplicates, checkAndSaveRecipe } from '@/lib/actions/recipe'

export interface ExtractionStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
}

interface ExtractionContextType {
  isExtracting: boolean
  steps: ExtractionStep[]
  currentStep: number
  progress: number
  error: string | null
  isCompleted: boolean
  completedRecipeId: string | null
  isCollapsed: boolean
  showDuplicateModal: boolean
  duplicateInfo: {
    type: 'saved' | 'recently_viewed' | null
    recipeId?: string
    recentlyViewedData?: any
  }
  startExtraction: (url: string) => Promise<void>
  dismissExtraction: () => void
  navigateToRecipe: () => void
  toggleCollapse: () => void
  stopExtraction: () => void
  handleDuplicateConfirm: () => void
  handleDuplicateCancel: () => void
}

const ExtractionContext = createContext<ExtractionContextType | undefined>(undefined)

const defaultSteps: ExtractionStep[] = [
  { id: 1, title: "유튜브 영상 확인", description: "영상 정보를 가져오는 중...", status: 'pending' },
  { id: 2, title: "자막 및 음성 분석", description: "자막과 음성을 분석하는 중...", status: 'pending' },
  { id: 3, title: "레시피 정보 추출", description: "AI가 레시피를 추출하는 중...", status: 'pending' },
  { id: 4, title: "레시피 구성", description: "레시피를 구성하는 중...", status: 'pending' }
]

export function ExtractionProvider({ children }: { children: React.ReactNode }) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [steps, setSteps] = useState<ExtractionStep[]>(defaultSteps)
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [completedRecipeId, setCompletedRecipeId] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<{
    type: 'saved' | 'recently_viewed' | null
    recipeId?: string
    recentlyViewedData?: any
  }>({ type: null })
  const abortControllerRef = useRef<AbortController | null>(null)
  const pendingUrlRef = useRef<string | null>(null)
  
  const router = useRouter()
  const { toast } = useToast()

  const progress = currentStep > 0 ? (currentStep / steps.length) * 100 : 0

  const updateStepStatus = useCallback((stepId: number, status: ExtractionStep['status'], description?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { ...step, status, ...(description && { description }) }
        : step
    ))
  }, [])

  const resetExtraction = useCallback(() => {
    setIsExtracting(false)
    setSteps(defaultSteps)
    setCurrentStep(0)
    setError(null)
    setIsCompleted(false)
    setCompletedRecipeId(null)
    setIsCollapsed(false)
    setShowDuplicateModal(false)
    setDuplicateInfo({ type: null })
    abortControllerRef.current = null
    pendingUrlRef.current = null
  }, [])

  const startExtraction = useCallback(async (url: string) => {
    if (isExtracting) {
      toast({
        title: "알림",
        description: "이전 레시피 추출이 완료된 후 시작 가능합니다.",
        variant: "default",
      })
      return
    }

    // Reset state
    resetExtraction()
    setIsExtracting(true)
    
    // Create abort controller
    abortControllerRef.current = new AbortController()

    try {
      // Step 1: 사용량 체크 - 더 상세한 검증
      const usageCheckResult = await checkDailyUsage()
      if (!usageCheckResult.success) {
        throw new Error(usageCheckResult.message || "사용량 확인에 실패했습니다.")
      }
      
      // 관리자가 아닌 경우에만 사용량 제한 체크
      if (!usageCheckResult.isAdmin && (!usageCheckResult.isAllowed || usageCheckResult.limitExceeded)) {
        throw new Error(`일일 사용량 한도(${usageCheckResult.currentCount}/5)를 초과했습니다. 내일 다시 시도해주세요.`)
      }

      // Step 1: YouTube 영상 확인
      setCurrentStep(1)
      updateStepStatus(1, 'in_progress', "영상 메타데이터를 확인하는 중...")

      const metadataResponse = await fetch("/api/youtube/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
        signal: abortControllerRef.current.signal
      })

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json()
        throw new Error(errorData.error || "유튜브 영상 정보를 불러오는 데 실패했습니다.")
      }

      const videoMetadata = await metadataResponse.json()

      // 통합 중복 체크 (저장된 레시피 -> 최근 본 레시피 순서)
      const duplicateCheckResult = await checkAllDuplicates(videoMetadata.videoTitle, videoMetadata.channelName)
      if (duplicateCheckResult.isDuplicate) {
        // 중복 발견시 모달 표시하고 사용자 확인 대기
        setDuplicateInfo({
          type: duplicateCheckResult.type,
          recipeId: duplicateCheckResult.recipeId,
          recentlyViewedData: duplicateCheckResult.recentlyViewedData
        })
        setShowDuplicateModal(true)
        pendingUrlRef.current = url
        updateStepStatus(1, 'completed', "중복 레시피를 확인했습니다.")
        return
      }

      updateStepStatus(1, 'completed', "영상 정보 확인 완료")

      // Step 2: 자막 분석
      setCurrentStep(2)
      updateStepStatus(2, 'in_progress', "자막과 음성을 분석하는 중...")

      const videoResponse = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: url }),
        signal: abortControllerRef.current.signal
      })

      if (!videoResponse.ok) {
        const errorData = await videoResponse.json()
        throw new Error(errorData.error || "유튜브 자막을 불러오는 데 실패했습니다.")
      }

      const videoInfo = await videoResponse.json()

      if (!videoInfo.hasSubtitles || !videoInfo.transcriptText) {
        throw new Error("이 영상에는 추출 가능한 자막이 없습니다. 다른 영상을 시도해 주세요.")
      }

      updateStepStatus(2, 'completed', "자막 분석 완료")

      // Step 3: AI 레시피 추출
      setCurrentStep(3)
      updateStepStatus(3, 'in_progress', "AI가 레시피를 추출하는 중...")

      const geminiResponse = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          structuredTranscript: videoInfo.structuredTranscript,
          videoDescription: videoInfo.videoDescription,
        }),
        signal: abortControllerRef.current.signal
      })

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text()
        if (errorText.includes("The model is overloaded")) {
          throw new Error("현재 AI 모델에 요청이 많아 레시피 추출이 어렵습니다. 잠시 후 다시 시도해 주세요.")
        } else {
          throw new Error(`AI 레시피 추출 중 오류가 발생했습니다: ${errorText}`)
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
        throw new Error(`AI 응답이 올바른 JSON 형식이 아닙니다. 원시 응답: ${geminiResponseText.substring(0, 200)}...`)
      }

      if (
        !extractedRecipe ||
        !extractedRecipe.ingredients ||
        extractedRecipe.ingredients.length === 0 ||
        !extractedRecipe.steps ||
        extractedRecipe.steps.length === 0
      ) {
        throw new Error("제공된 영상에서 레시피 정보를 충분히 추출할 수 없습니다. 영상에 정확한 재료나 조리 단계가 명시되어 있지 않을 수 있습니다. 다른 영상을 시도해 주세요.")
      }

      updateStepStatus(3, 'completed', "레시피 추출 완료")

      // Step 4: 미리보기 준비
      setCurrentStep(4)
      updateStepStatus(4, 'in_progress', "미리보기를 준비하는 중...")

      // temp-preview를 위해 localStorage에 데이터 저장
      const previewData = {
        youtubeUrl: url,
        videoInfo,
        extractedRecipe,
      }
      localStorage.setItem('recipick_pending_recipe', JSON.stringify(previewData))

      // 사용량 증가 (레시피 추출 성공시)
      try {
        await incrementDailyUsage()
      } catch (usageError) {
        console.error("Failed to increment daily usage:", usageError)
        // 사용량 증가 실패해도 레시피 추출은 완료로 처리
      }

      updateStepStatus(4, 'completed', "미리보기 준비 완료")
      setIsCompleted(true)
      // temp-preview로 이동하기 위해 특별한 상태 설정
      setCompletedRecipeId('temp-preview')

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return // 사용자가 취소한 경우
      }
      
      console.error("Recipe extraction error:", error)
      setError(error.message || "레시피 추출 중 오류가 발생했습니다.")
      
      if (currentStep > 0) {
        updateStepStatus(currentStep, 'error', error.message)
      }
      
      // 토스트 제거 - 모달로만 오류 표시
    }
  }, [isExtracting, currentStep, toast, updateStepStatus, resetExtraction])

  const dismissExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    resetExtraction()
  }, [resetExtraction])

  const navigateToRecipe = useCallback(() => {
    if (completedRecipeId) {
      // 페이지 이동 전에 플로팅 바를 즉시 숨김
      setIsExtracting(false)
      setIsCompleted(false)
      setCompletedRecipeId(null)
      
      // 다음 프레임에서 페이지 이동 (플로팅 바가 사라진 후)
      setTimeout(() => {
        if (completedRecipeId === 'temp-preview') {
          router.push('/temp-preview')
        } else {
          router.push(`/recipe/${completedRecipeId}`)
        }
        // 페이지 이동 후 나머지 상태 초기화
        resetExtraction()
      }, 50) // 50ms 후 이동 (애니메이션 시간 고려)
    }
  }, [completedRecipeId, router, resetExtraction])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev)
  }, [])

  const stopExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    toast({
      title: "레시피 추출 중지",
      description: "레시피 추출이 중지되었습니다.",
      variant: "default",
    })
    
    resetExtraction()
  }, [resetExtraction, toast])

  const handleDuplicateConfirm = useCallback(() => {
    if (duplicateInfo.type === 'saved' && duplicateInfo.recipeId) {
      // 저장된 레시피로 이동
      router.push(`/recipe/${duplicateInfo.recipeId}`)
    } else if (duplicateInfo.type === 'recently_viewed' && duplicateInfo.recentlyViewedData) {
      // 최근 본 레시피 데이터로 temp-preview 이동
      const previewData = {
        youtubeUrl: pendingUrlRef.current || '',
        videoInfo: {
          videoId: '',
          videoTitle: duplicateInfo.recentlyViewedData.recipeName,
          videoThumbnail: duplicateInfo.recentlyViewedData.videoThumbnail || '',
          channelName: duplicateInfo.recentlyViewedData.channelName || '',
          videoDurationSeconds: 0,
          videoViews: 0,
          videoDescription: '',
          transcriptText: '',
          structuredTranscript: [],
          hasSubtitles: true
        },
        extractedRecipe: {
          recipeName: duplicateInfo.recentlyViewedData.recipeName,
          summary: duplicateInfo.recentlyViewedData.summary || '',
          difficulty: '',
          cookingTimeMinutes: 0,
          ingredients: [],
          steps: [],
          tips: [],
          personalNotes: null,
          noRecipeFoundMessage: null
        }
      }
      localStorage.setItem('recipick_pending_recipe', JSON.stringify(previewData))
      router.push('/temp-preview')
    }
    resetExtraction()
  }, [duplicateInfo, router, resetExtraction])

  const handleDuplicateCancel = useCallback(() => {
    setShowDuplicateModal(false)
    setDuplicateInfo({ type: null })
    pendingUrlRef.current = null
    // 추출 상태는 유지하여 사용자가 새로운 URL을 입력할 수 있게 함
    setIsExtracting(false)
  }, [])

  return (
    <ExtractionContext.Provider value={{
      isExtracting,
      steps,
      currentStep,
      progress,
      error,
      isCompleted,
      completedRecipeId,
      isCollapsed,
      showDuplicateModal,
      duplicateInfo,
      startExtraction,
      dismissExtraction,
      navigateToRecipe,
      toggleCollapse,
      stopExtraction,
      handleDuplicateConfirm,
      handleDuplicateCancel
    }}>
      {children}
    </ExtractionContext.Provider>
  )
}

export function useExtraction() {
  const context = useContext(ExtractionContext)
  if (context === undefined) {
    throw new Error('useExtraction must be used within an ExtractionProvider')
  }
  return context
}