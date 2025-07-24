"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button" // Button 임포트 추가
import { Play, Save, Loader2 } from "lucide-react" // Save, Loader2 아이콘 추가

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
  isPlayerReady: boolean
  onSavePersonalNotes: (notes: string | null) => Promise<void> // 개인 메모 저장 핸들러 추가
}

export function RecipeDisplay({
  recipe,
  isSavedRecipe = false,
  handleSeekVideo,
  isPlayerReady,
  onSavePersonalNotes,
}: RecipeDisplayProps) {
  const [personalNotes, setPersonalNotes] = useState(recipe.personalNotes || "")
  const [isSavingMemo, setIsSavingMemo] = useState(false) // 메모 저장 중 상태 추가

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
      {/* 헤더 섹션 */}
      <div className="mb-8">
        {/* 난이도와 조리시간 태그 */}
        <div className="flex gap-3 mb-4">
          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
            난이도: {displayDifficulty ? displayDifficulty : <span className="text-gray-500">측정불가</span>}
          </span>
          <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
            조리시간: {displayCookingTime ? displayCookingTime : <span className="text-gray-500">측정불가</span>}
          </span>
        </div>

        {/* 레시피 제목 */}
        <h1 className="text-3xl font-bold mb-3 flex items-center gap-2">{recipe.recipeName || "제목 없음"}</h1>

        {/* 레시피 설명 */}
        <p className="text-gray-600 mb-4">{recipe.summary || "요약 정보가 없습니다."}</p>
      </div>

      <hr className="border-gray-200 mb-8" />

      {/* 재료 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">재료</h2>
        <p className="text-gray-700 leading-relaxed">
          {recipe.ingredients.map((ingredient, index) => (
            <span key={index}>
              {ingredient.name}
              {ingredient.quantity &&
                ingredient.quantity !== "null" &&
                ` ${ingredient.quantity}${ingredient.unit && ingredient.unit !== "null" ? ingredient.unit : ""}`}
              {ingredient.notes && <span className="text-gray-500"> ({ingredient.notes})</span>}
              {index < recipe.ingredients.length - 1 && " / "}
            </span>
          ))}
        </p>
      </div>

      <hr className="border-gray-200 mb-8" />

      {/* 조리 단계 섹션 */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">조리 단계</h2>
        <div className="space-y-6">
          {recipe.steps.map((step, index) => (
            <div key={step.stepNumber} className="relative">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-sm">
                  {step.stepNumber}
                </div>
                <div className="flex-1">
                  {step.youtubeTimestampSecond !== undefined && step.youtubeTimestampSecond !== null && (
                    <button
                      onClick={() => handleSeekVideo(step.youtubeTimestampSecond)}
                      disabled={!isPlayerReady}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 mb-2 text-sm"
                    >
                      <Play className="h-4 w-4" />
                      {formatTime(step.youtubeTimestampSecond)}
                    </button>
                  )}
                  <h3 className="font-bold mb-2">{step.description.split("\n")[0]}</h3>
                  <div className="space-y-1 text-gray-700">
                    <p className="whitespace-pre-line">{step.description.split("\n").slice(1).join("\n")}</p>
                    {step.ingredientsUsed && step.ingredientsUsed.length > 0 && (
                      <p className="text-sm">
                        <span className="font-medium">재료:</span> {step.ingredientsUsed.map(ingredient => {
                          // 문자열인 경우 그대로 반환
                          if (typeof ingredient === 'string') {
                            return ingredient;
                          }
                          // 객체인 경우 name, quantity, unit 조합
                          if (typeof ingredient === 'object' && ingredient && ingredient.name) {
                            const name = ingredient.name;
                            const quantity = ingredient.quantity || '';
                            const unit = ingredient.unit || '';
                            return `${name} ${quantity}${unit}`.trim();
                          }
                          // 기타 예상치 못한 경우
                          return String(ingredient);
                        }).join(", ")}
                      </p>
                    )}
                    {step.notes && (
                      <p className="text-sm">
                        <span className="font-medium">팁:</span> {step.notes}
                      </p>
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
            <div className="bg-gray-100 rounded-lg p-4">
              <ul className="space-y-2">
                {recipe.tips.map((tip, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>
                      {tip.title}: {tip.description}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* 메모장 섹션 */}
      <hr className="border-gray-200 mb-8" />
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">메모장</h2>
        <Textarea
          name="personalNotes"
          value={personalNotes}
          onChange={handlePersonalNotesChange}
          placeholder="나만의 요리 메모사항을 작성해보세요."
          rows={4}
          className="w-full mb-4"
        />
        <Button onClick={handleSaveMemoClick} disabled={isSavingMemo} size="sm">
          {isSavingMemo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          저장
        </Button>
      </div>
    </div>
  )
}
