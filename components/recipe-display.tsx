"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button" // Button 임포트 추가
import { Play, Save, Loader2, Clock, BarChart3, ChefHat, Users, ChevronDown, ChevronUp } from "lucide-react" // 추가 아이콘들 임포트

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
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* 헤더 섹션 - 그라데이션 배경 */}
      <div className="rounded-2xl p-6 mb-8 text-white" style={{
        background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
        boxShadow: '0 8px 32px rgba(255, 87, 34, 0.3)'
      }}>
        {/* 레시피 제목과 저장 버튼 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{recipe.recipeName || "제목 없음"}</h1>
          {onSaveRecipe && (
            <Button
              onClick={onSaveRecipe}
              disabled={isSaving}
              variant="secondary"
              size="sm"
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "저장 중..." : "저장"}
            </Button>
          )}
        </div>

        {/* 레시피 설명 */}
        <p className="text-white/90 mb-6 leading-relaxed">{recipe.summary || "요약 정보가 없습니다."}</p>

        {/* 정보 카드들 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/70">난이도</span>
            </div>
            <span className="font-semibold">
              {displayDifficulty || "측정불가"}
            </span>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/70">조리시간</span>
            </div>
            <span className="font-semibold">
              {displayCookingTime || "측정불가"}
            </span>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <ChefHat className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/70">재료수</span>
            </div>
            <span className="font-semibold">
              {recipe.ingredients.length}개
            </span>
          </div>
          <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-white/80" />
              <span className="text-sm text-white/70">단계수</span>
            </div>
            <span className="font-semibold">
              {recipe.steps.length}단계
            </span>
          </div>
        </div>
      </div>

      <hr className="border-gray-200 mb-8" />

      {/* 재료 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">재료</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 transition-all duration-300">
          {(showAllIngredients ? recipe.ingredients : recipe.ingredients.slice(0, 6)).map((ingredient, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{ingredient.name}</span>
                <span className="text-sm text-gray-600">
                  {ingredient.quantity && ingredient.quantity !== "null" 
                    ? `${ingredient.quantity}${ingredient.unit && ingredient.unit !== "null" ? ingredient.unit : ""}`
                    : "적당량"
                  }
                </span>
              </div>
              {ingredient.notes && (
                <p className="text-sm text-gray-500 mt-1">({ingredient.notes})</p>
              )}
            </div>
          ))}
        </div>
        
        {/* 더보기/접기 버튼 */}
        {recipe.ingredients.length > 6 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowAllIngredients(!showAllIngredients)}
              className="flex items-center gap-2 px-6 py-3 text-white font-medium rounded-2xl transition-all hover:opacity-90 shadow-md"
              style={{
                background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
                boxShadow: '0 4px 16px rgba(255, 87, 34, 0.3)'
              }}
            >
              <span>{showAllIngredients ? '접기' : `더보기 (+${recipe.ingredients.length - 6})`}</span>
              {showAllIngredients ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      <hr className="border-gray-200 mb-8" />

      {/* 조리 단계 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">조리 단계</h2>
        <div className="space-y-4">
          {recipe.steps.map((step, index) => (
            <div 
              key={step.stepNumber} 
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg" style={{
                  background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)'
                }}>
                  {step.stepNumber}
                </div>
                <div className="flex-1">
                  {step.youtubeTimestampSecond !== undefined && step.youtubeTimestampSecond !== null && (
                    <div className="flex gap-2 mb-3">
                      {/* 타임스탬프 이동 버튼 */}
                      <button
                        onClick={() => handleSeekVideo(step.youtubeTimestampSecond)}
                        disabled={!isPlayerReady}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded-full text-sm border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="h-4 w-4" />
                        {formatTime(step.youtubeTimestampSecond)}
                      </button>
                      
                      {/* 일시정지 버튼 */}
                      <button
                        onClick={handlePauseVideo}
                        disabled={!isPlayerReady}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 rounded-full text-sm border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                        </svg>
                        일시중지
                      </button>
                    </div>
                  )}
                  <h3 className="font-bold text-lg mb-3 text-gray-900">{step.description.split("\n")[0]}</h3>
                  <div className="space-y-3">
                    <p className="whitespace-pre-line text-gray-700 leading-relaxed">{step.description.split("\n").slice(1).join("\n")}</p>
                    {step.ingredientsUsed && step.ingredientsUsed.length > 0 && (
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                        <p className="text-sm">
                          <span className="font-medium text-orange-800">재료:</span>
                          <span className="text-orange-700 ml-1">
                            {step.ingredientsUsed.map(ingredient => {
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
                          </span>
                        </p>
                      </div>
                    )}
                    {step.notes && (
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                        <p className="text-sm">
                          <span className="font-medium text-blue-800">팁:</span>
                          <span className="text-blue-700 ml-1">{step.notes}</span>
                        </p>
                      </div>
                    )}
                    {getYoutubeTimestampRange(index) && (
                      <p className="text-sm text-gray-500">재생 시간: {getYoutubeTimestampRange(index)}</p>
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
        <>
          <hr className="border-gray-200 mb-8" />
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">✓ 추천 핵심 POINT</h2>
            <div className="space-y-3">
              {recipe.tips.map((tip, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <span className="text-green-600 text-sm font-bold">✓</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{tip.title}</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 메모장 섹션 */}
      <hr className="border-gray-200 mb-8" />
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">메모장</h2>
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <Textarea
            name="personalNotes"
            value={personalNotes}
            onChange={handlePersonalNotesChange}
            placeholder="나만의 요리 메모사항을 작성해보세요."
            rows={4}
            className="w-full mb-4 border-none focus:ring-0 focus:outline-none resize-none p-0 text-gray-700"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveMemoClick} 
              disabled={isSavingMemo} 
              className="text-white font-medium rounded-xl transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
                boxShadow: '0 2px 8px rgba(255, 87, 34, 0.3)'
              }}
            >
              {isSavingMemo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
