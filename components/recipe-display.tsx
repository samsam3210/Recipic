"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button" // Button 임포트 추가
import { Play, Save, Loader2, ChevronDown, ChevronUp } from "lucide-react" // 필요한 아이콘들만 임포트

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
  channelName?: string | null
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
  const [showAllIngredients, setShowAllIngredients] = useState(false) // 재료 더보기 상태

  useEffect(() => {
    setPersonalNotes(recipe.personalNotes || "")
  }, [recipe.personalNotes])

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
    <div className="max-w-md mx-auto bg-white">
      {/* 컨텐츠 영역 */}
      <div className="px-6 py-6">
        {/* 레시피 제목 */}
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 leading-tight flex-1">
            {recipe.recipeName || "제목 없음"}
          </h1>
          {onSaveRecipe && (
            <Button
              onClick={onSaveRecipe}
              disabled={isSaving}
              size="sm"
              className="ml-4 w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Recipe by (채널 정보) */}
        {recipe.channelName && (
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-3">
              <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{recipe.channelName}</p>
              <p className="text-sm text-gray-500">채널</p>
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            {recipe.summary || "요약 정보가 없습니다."}
          </p>
        </div>

        {/* 정보 아이콘 섹션 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Cooking Time</p>
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
              <p className="text-xs text-gray-500">Difficulty</p>
              <p className="font-semibold text-gray-900">{displayDifficulty || "미상"}</p>
            </div>
          </div>
        </div>

        {/* 재료 섹션 */}
        <div className="mb-6">
          <div 
            className="flex items-center justify-between cursor-pointer py-3 px-4 bg-gray-50 rounded-lg"
            onClick={() => setShowAllIngredients(!showAllIngredients)}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">재료</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-500 mr-2">전체 재료</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAllIngredients ? 'rotate-180' : ''}`} />
            </div>
          </div>
          
          {showAllIngredients && (
            <div className="mt-3 space-y-3">
              {recipe.ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-4">
                  <span className="text-gray-900">{ingredient.name}</span>
                  <div className="text-right">
                    <span className="text-gray-600 text-sm font-medium">
                      {ingredient.quantity && ingredient.quantity !== "null" 
                        ? `${ingredient.quantity}${ingredient.unit && ingredient.unit !== "null" ? ingredient.unit : ""}`
                        : "적당량"
                      }
                    </span>
                    {ingredient.notes && (
                      <p className="text-xs text-gray-400 mt-1">({ingredient.notes})</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 조리 단계 섹션 */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">조리 단계</h3>
          <div className="space-y-6">
          {recipe.steps.map((step, index) => (
            <div key={step.stepNumber} className="bg-gray-50 rounded-lg p-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-semibold text-sm">
                  {step.stepNumber}
                </div>
              <div className="flex-1 pt-1">
                  {step.youtubeTimestampSecond !== undefined && step.youtubeTimestampSecond !== null && (
                    <div className="flex gap-2 mb-3">
                      {/* 타임스탬프 이동 버튼 */}
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
                <div className="space-y-3">
                  <p className="whitespace-pre-line text-gray-900 leading-relaxed">{step.description}</p>
                  {step.ingredientsUsed && step.ingredientsUsed.length > 0 && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">재료:</span> {step.ingredientsUsed.map(ingredient => {
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
                      <span className="font-medium">팁:</span> {step.notes}
                    </p>
                  )}
                  {getYoutubeTimestampRange(index) && (
                    <p className="text-xs text-gray-400">재생 시간: {getYoutubeTimestampRange(index)}</p>
                  )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

        {/* 추천 핵심 포인트 섹션 */}
        {recipe.tips && recipe.tips.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">추천 핵심 포인트</h3>
            <div className="space-y-3">
              {recipe.tips.map((tip, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-semibold">
                      ✓
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">{tip.title}</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 메모장 섹션 */}
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">메모장</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <Textarea
              name="personalNotes"
              value={personalNotes}
              onChange={handlePersonalNotesChange}
              placeholder="나만의 요리 메모사항을 작성해보세요."
              rows={4}
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
