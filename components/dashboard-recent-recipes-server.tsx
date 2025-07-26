"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AspectRatio } from "@/components/ui/aspect-ratio"
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
}

export function DashboardRecentRecipesServer({ recipes }: DashboardRecentRecipesServerProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">최근 본 레시피</h2>
        {recipes.length > 0 && (
          <Button variant="link" asChild className="underline">
            <Link href="/recipes">모두 보기</Link>
          </Button>
        )}
      </div>
      
      {recipes.length === 0 ? (
        <div className="border-dashed border-2 p-8 text-center text-muted-foreground rounded-lg">
          <p className="text-lg mb-4">최근 본 레시피가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-md transition-shadow duration-200">
              <div 
                className="cursor-pointer"
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
                        videoTitle: recipe.recipeName,
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
                <div className="flex flex-col md:flex-row p-4">
                  <div className="w-full md:w-48 md:h-32 flex-shrink-0 md:mr-4 mb-4 md:mb-0">
                    <AspectRatio ratio={16 / 9}>
                      {recipe.videoThumbnail ? (
                        <Image
                          src={recipe.videoThumbnail}
                          alt={recipe.recipeName || "레시피 썸네일"}
                          fill
                          className="object-cover rounded-md"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                          <span className="text-gray-400">썸네일 없음</span>
                        </div>
                      )}
                    </AspectRatio>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {recipe.recipeName || "제목 없음"}
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">{recipe.channelName}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{recipe.summary}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}