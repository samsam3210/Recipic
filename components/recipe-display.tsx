"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button" // Button 임포트 추가
import { Play, Save, Loader2, Bookmark, BookmarkCheck, ChevronDown } from "lucide-react" // 필요한 아이콘들만 임포트

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
  youtubeUrl: string
  videoDurationSeconds: number
  videoThumbnail?: string | null
  videoTitle?: string | null
  channelName?: string | null
  channelId?: string | null
  channelUrl?: string | null
  channelThumbnail?: string | null
}

interface RecipeDisplayProps {
  recipe: RecipeData
  isSavedRecipe?: boolean
  handleSeekVideo: (timestamp: number) => void
  handlePauseVideo: () => void  // 🆕 이 줄 추가
  isPlayerReady: boolean
  onSavePersonalNotes?: (notes: string | null) => Promise<void>
  onSaveRecipe?: () => void
  isSaving?: boolean
}

export function RecipeDisplay({
  recipe,
  isSavedRecipe = false,
  handleSeekVideo,
  handlePauseVideo,  // 🆕 이 줄 추가
  isPlayerReady,
  onSavePersonalNotes,
  onSaveRecipe,
  isSaving = false,
}: RecipeDisplayProps) {
  const [personalNotes, setPersonalNotes] = useState(recipe.personalNotes || "")
  const [isSavingMemo, setIsSavingMemo] = useState(false) // 메모 저장 중 상태 추가
  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'memo'>('ingredients') // 탭 상태 추가
  const [isTabSticky, setIsTabSticky] = useState(false) // 탭 메뉴 sticky 상태
  
  // 섹션 ref들
  const ingredientsRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef<HTMLDivElement>(null)
  const memoRef = useRef<HTMLDivElement>(null)
  const tabNavRef = useRef<HTMLDivElement>(null)
  const stickyTriggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPersonalNotes(recipe.personalNotes || "")
  }, [recipe.personalNotes])

  // Intersection Observer로 섹션 감지 및 탭 자동 전환
  useEffect(() => {
    const observerOptions = {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0.1
    }

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLElement
          if (target === ingredientsRef.current) {
            setActiveTab('ingredients')
          } else if (target === stepsRef.current) {
            setActiveTab('steps')
          } else if (target === memoRef.current) {
            setActiveTab('memo')
          }
        }
      })
    }

    const observer = new IntersectionObserver(observerCallback, observerOptions)
    
    if (ingredientsRef.current) observer.observe(ingredientsRef.current)
    if (stepsRef.current) observer.observe(stepsRef.current)
    if (memoRef.current) observer.observe(memoRef.current)

    // 탭 메뉴 sticky 감지
    const stickyObserverCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        setIsTabSticky(!entry.isIntersecting)
      })
    }

    const stickyObserver = new IntersectionObserver(stickyObserverCallback, {
      rootMargin: '0px 0px 0px 0px',
      threshold: 0
    })

    if (stickyTriggerRef.current) {
      stickyObserver.observe(stickyTriggerRef.current)
    }

    return () => {
      observer.disconnect()
      stickyObserver.disconnect()
    }
  }, [])

  const handlePersonalNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersonalNotes(e.target.value)
  }

  const handleSaveMemoClick = async () => {
    setIsSavingMemo(true)
    await onSavePersonalNotes(personalNotes)
    setIsSavingMemo(false)
  }

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds) // 정수로 변환
    const minutes = Math.floor(totalSeconds / 60)
    const remainingSeconds = totalSeconds % 60
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`
  }

  const getYoutubeTimestampRange = useCallback(
    (stepIndex: number) => {
      const currentStep = recipe.steps[stepIndex]
      if (
        !currentStep ||
        currentStep.youtubeTimestampSecond === undefined ||
        currentStep.youtubeTimestampSecond === null
      ) {
        return null
      }

      const startTime = currentStep.youtubeTimestampSecond
      let endTime: number | undefined

      if (stepIndex + 1 < recipe.steps.length) {
        endTime = recipe.steps[stepIndex + 1].youtubeTimestampSecond
      } else {
        endTime = recipe.videoDurationSeconds
      }

      if (endTime === undefined || endTime === null) {
        return null
      }

      if (endTime < startTime) {
        endTime = startTime
      }

      return `${formatTime(startTime)} ~ ${formatTime(endTime)}`
    },
    [recipe.steps, recipe.videoDurationSeconds],
  )

  // 난이도 한글 매핑
  const getDifficultyKorean = (difficulty: string | null) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
      case "쉬움":
        return "쉬움"
      case "medium":
      case "보통":
        return "보통"
      case "hard":
      case "어려움":
        return "어려움"
      default:
        return null
    }
  }

  const displayDifficulty = getDifficultyKorean(recipe.difficulty)
  const displayCookingTime = recipe.cookingTimeMinutes ? `${recipe.cookingTimeMinutes}분` : null

  if (!recipe) {
    return (
      <div className="container mx-auto max-w-2xl text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">레시피를 찾을 수 없습니다.</h2>
        <p className="text-muted-foreground">요청하신 레시피 정보를 불러오는 데 실패했습니다.</p>
      </div>
    )
  }

  if (recipe.noRecipeFoundMessage) {
    return (
      <div className="container mx-auto max-w-2xl text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">레시피를 찾을 수 없습니다.</h2>
        <p className="text-muted-foreground">{recipe.noRecipeFoundMessage}</p>
        <p className="text-sm text-muted-foreground mt-4">다른 영상을 시도해 보시거나, 영상의 자막을 확인해 주세요.</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white">
      {/* 탭 이전 컨텐츠 영역 - 24px 좌우 패딩 */}
      <div className="px-6">
        {/* 레시피 제목 */}
        <div className="flex items-start justify-between mb-0 mt-6">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight flex-1">
            {recipe.recipeName || "제목 없음"}
          </h1>
          {(onSaveRecipe || isSavedRecipe) && (
            <Button
              onClick={onSaveRecipe}
              disabled={isSaving}
              size="sm"
              className={`ml-2 w-10 h-10 rounded-full border-0 ${
                isSavedRecipe 
                  ? 'bg-orange-50 hover:bg-orange-100 text-orange-500' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSavedRecipe ? (
                <BookmarkCheck className="h-4 w-4 fill-current" />
              ) : (
                <Bookmark className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* 채널 정보 */}
        {recipe.channelName && (
          <div className="flex items-center gap-3 mb-2">
            {/* 채널 썸네일 (조건부) */}
            {recipe.channelThumbnail && (
              <img 
                src={recipe.channelThumbnail} 
                alt={recipe.channelName}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            )}
            
            {/* 채널명 (강조) */}
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-base truncate">
                {recipe.channelName}
              </p>
            </div>
            
            {/* 채널 이동 버튼 (조건부) */}
            {recipe.channelUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(recipe.channelUrl, '_blank', 'noopener,noreferrer')}
                className="text-xs px-3 py-1.5 flex-shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                채널 보기
              </Button>
            )}
          </div>
        )}

        {/* 요약 */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">요약</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {recipe.summary || "요약 정보가 없습니다."}
          </p>
        </div>

        {/* 정보 아이콘 섹션 */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">조리시간</p>
              <p className="font-semibold text-gray-900">{displayCookingTime || "미상"}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">난이도</p>
              <p className="font-semibold text-gray-900">{displayDifficulty || "미상"}</p>
            </div>
          </div>
        </div>

        {/* Sticky 트리거 요소 */}
        <div ref={stickyTriggerRef} className="h-0"></div>
      </div>

      {/* 탭 네비게이션 - 전체 너비 사용, 좌우 여백 없음 */}
      <div 
        ref={tabNavRef}
        className={`flex justify-start border-b border-gray-200 mb-6 bg-white transition-all duration-200 w-full ${
          isTabSticky ? 'sticky top-[56.25vw] md:top-[225px] z-20 shadow-md' : 'z-10'
        }`}
      >
        <div className="px-6 flex">{/* 탭 버튼들을 위한 내부 컨테이너 */}
          {[
            { key: 'ingredients', label: '재료' },
            { key: 'steps', label: '조리단계' },
            { key: 'memo', label: '메모' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key as typeof activeTab)
                // 클릭 시 해당 섹션으로 스크롤
                const targetRef = tab.key === 'ingredients' ? ingredientsRef : 
                                 tab.key === 'steps' ? stepsRef : memoRef
                if (targetRef.current) {
                  targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
              className={`py-3 px-4 mr-4 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 전체 컨텐츠 (스크롤 기반) */}
      <div className="px-6 pb-8">
          {/* 재료 섹션 */}
          <div ref={ingredientsRef} className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">재료</h3>
            <div className="divide-y divide-gray-200">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="py-3 flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-gray-900 font-medium">
                      {ingredient.name} {ingredient.quantity && ingredient.quantity !== "null" 
                        ? `${ingredient.quantity}${ingredient.unit && ingredient.unit !== "null" ? ingredient.unit : ""}`
                        : "적당량"
                      }
                    </span>
                    {ingredient.notes && (
                      <p className="text-xs text-gray-500 mt-1">{ingredient.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 조리단계 섹션 */}
          <div ref={stepsRef} className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">조리단계</h3>
            <div className="space-y-4">
              {recipe.steps.map((step, index) => (
                <div key={step.stepNumber} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 border border-gray-300 text-gray-700 flex items-center justify-center font-semibold text-sm">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="space-y-3">
                        <p className="whitespace-pre-line text-gray-900 leading-relaxed font-medium">{step.description}</p>
                        {step.ingredientsUsed && step.ingredientsUsed.length > 0 && (
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">재료:</span> {step.ingredientsUsed.map(ingredient => {
                              if (typeof ingredient === 'string') {
                                return ingredient;
                              }
                              if (typeof ingredient === 'object' && ingredient && ingredient.name) {
                                const name = ingredient.name;
                                const quantity = ingredient.quantity || '';
                                const unit = ingredient.unit || '';
                                return `${name} ${quantity}${unit}`.trim();
                              }
                              return String(ingredient);
                            }).join(", ")}
                          </p>
                        )}
                        {step.notes && (
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">팁:</span> {step.notes}
                          </p>
                        )}
                        {getYoutubeTimestampRange(index) && (
                          <p className="text-xs text-gray-400">재생 시간: {getYoutubeTimestampRange(index)}</p>
                        )}
                        {step.youtubeTimestampSecond !== undefined && step.youtubeTimestampSecond !== null && (
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => handleSeekVideo(step.youtubeTimestampSecond)}
                              disabled={!isPlayerReady}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded text-xs border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="h-3 w-3" />
                              {formatTime(step.youtubeTimestampSecond)}
                            </button>
                            <button
                              onClick={handlePauseVideo}
                              disabled={!isPlayerReady}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 rounded text-xs border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                              </svg>
                              일시중지
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* 핵심팁을 조리단계 끝에 통합 */}
            {recipe.tips && recipe.tips.length > 0 && (
              <div className="mt-8">
                <h4 className="font-semibold text-gray-900 mb-4">핵심팁</h4>
                <div className="space-y-3">
                  {recipe.tips.map((tip, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 border border-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold">
                          ✓
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-900 mb-2">{tip.title}</h5>
                          <p className="text-gray-700 text-sm leading-relaxed">{tip.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 메모 섹션 */}
          <div ref={memoRef} className="mb-8">
            <h3 className="font-semibold text-gray-900 mb-4 text-lg">멤모</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <Textarea
                name="personalNotes"
                value={personalNotes}
                onChange={handlePersonalNotesChange}
                placeholder="나만의 요리 메모사항을 작성해보세요."
                rows={6}
                className="w-full mb-4 border-0 bg-white focus:ring-1 focus:ring-orange-500 focus:border-orange-500 rounded-lg p-3 text-gray-700"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSaveMemoClick} 
                  disabled={isSavingMemo} 
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  {isSavingMemo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  저장
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
