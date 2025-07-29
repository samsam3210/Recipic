"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen } from "lucide-react"
import Image from "next/image"

interface RecentlyViewedRecipeProps {
  id: string
  recipeName: string
  youtubeUrl: string
  videoThumbnail?: string
  channelName?: string
  summary?: string
  viewedAt: Date
  difficulty?: string
  cookingTimeMinutes?: number
  videoTitle?: string
  ingredients?: Array<{ name: string; quantity: number | string; unit: string; notes: string }>
  steps?: Array<{
    stepNumber: number
    description: string
    notes: string
    ingredientsUsed: string[]
    youtubeTimestampSecond: number
  }>
  tips?: Array<{ title: string; description: string }>
  videoDescription?: string
  noRecipeFoundMessage?: string
  videoDurationSeconds?: number
  videoViews?: number
  personalNotes?: string
  savedRecipeId?: string | null
}

interface DashboardRecentRecipesServerProps {
  recipes: RecentlyViewedRecipeProps[]
  isLoading?: boolean
}

export function DashboardRecentRecipesServer({ recipes, isLoading = false }: DashboardRecentRecipesServerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {isLoading ? (
          <Skeleton className="h-7 w-40" />
        ) : (
          <h2 className="text-lg font-semibold text-gray-900">최근 본 레시피</h2>
        )}
      </div>
      
      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border rounded-lg">
              <div className="relative w-32 h-24">
                <Skeleton className="w-full h-full rounded" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="border-dashed border-2 p-8 text-center text-muted-foreground rounded-lg">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="bg-gray-100 p-3 rounded-full">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-600">최근 본 레시피가 없습니다</p>
            <p className="text-sm text-gray-500">YouTube 요리 영상에서 레시피를 추출해보세요!</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                // savedRecipeId가 있으면 레시피 상세 페이지로, 없으면 프리뷰 페이지로
                if (recipe.savedRecipeId) {
                  // 저장된 레시피 → 레시피 상세 페이지
                  window.location.href = `/recipe/${recipe.savedRecipeId}`
                } else {
                  // 프리뷰만 본 레시피 → 프리뷰 페이지 (완전한 레시피 데이터 사용)
                  const previewData = {
                    youtubeUrl: recipe.youtubeUrl,
                    videoInfo: {
                      videoId: '',
                      videoTitle: recipe.videoTitle || recipe.recipeName,
                      videoThumbnail: recipe.videoThumbnail || '',
                      channelName: recipe.channelName || '',
                      videoDurationSeconds: recipe.videoDurationSeconds || 0,
                      videoViews: recipe.videoViews || 0,
                      videoDescription: recipe.videoDescription || '',
                      transcriptText: '',
                      structuredTranscript: [],
                      hasSubtitles: true
                    },
                    extractedRecipe: {
                      recipeName: recipe.recipeName,
                      summary: recipe.summary || '',
                      difficulty: recipe.difficulty || '',
                      cookingTimeMinutes: recipe.cookingTimeMinutes || 0,
                      ingredients: recipe.ingredients || [],
                      steps: recipe.steps || [],
                      tips: recipe.tips || [],
                      personalNotes: recipe.personalNotes,
                      noRecipeFoundMessage: recipe.noRecipeFoundMessage
                    }
                  }
                  localStorage.setItem('recipick_pending_recipe', JSON.stringify(previewData))
                  window.location.href = '/temp-preview'
                }
              }}
            >
              <div className="relative w-32 h-24">
                {recipe.videoThumbnail ? (
                  <img
                    src={recipe.videoThumbnail}
                    alt={recipe.recipeName || "레시피 썸네일"}
                    className="w-full h-full object-cover rounded"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-400 text-xs">썸네일 없음</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 line-clamp-2">
                  {recipe.recipeName || "제목 없음"}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{recipe.channelName}</p>
                <p className="text-sm text-gray-500 line-clamp-2 mt-1">{recipe.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}