"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Clock, BarChart3, Bookmark } from "lucide-react"
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
    <div className="p-6" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="flex items-center justify-between mb-6">
        {isLoading ? (
          <Skeleton className="h-7 w-40" />
        ) : (
          <h2 className="text-base font-bold text-gray-800">최근 본 레시피</h2>
        )}
      </div>
      
      {isLoading ? (
        <div 
          className="flex gap-4 pb-2" 
          style={{ 
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-none" style={{ width: '256px' }}>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="relative w-full rounded-xl overflow-hidden mb-3" style={{ paddingBottom: '56.25%' }}>
                  <Skeleton className="absolute inset-0 w-full h-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-12 w-full min-h-[3.6rem]" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-full mt-2.5" />
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-6">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300" />
          </div>
          <p className="text-gray-500 mb-2">아직 조회한 레시피가 없어요</p>
          <p className="text-sm text-gray-400">
            유튜브에서 맛있는 레시피를 찾아보세요!
          </p>
        </div>
      ) : (
        <div 
          className="flex gap-4 pb-2"
          style={{ 
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {recipes.map((recipe) => (
            <div key={recipe.id} className="flex-none" style={{ width: '256px' }}>
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <div className="relative w-full rounded-xl overflow-hidden mb-3" style={{ paddingBottom: '56.25%' }}>
                  <Image
                    src={recipe.videoThumbnail || "/placeholder.svg?height=192&width=256&text=No+Thumbnail"}
                    alt={recipe.recipeName || "레시피 썸네일"}
                    fill
                    className="object-cover"
                  />
                </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                      {recipe.recipeName || "제목 없음"}
                    </h3>
                    <Bookmark className="w-4 h-4 text-gray-400 flex-none ml-2" />
                  </div>
                  {recipe.channelName && (
                    <p className="text-xs text-gray-500 mb-2">{recipe.channelName}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                    {recipe.cookingTimeMinutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{recipe.cookingTimeMinutes}분</span>
                      </div>
                    )}
                    {recipe.difficulty && (
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>{recipe.difficulty}</span>
                      </div>
                    )}
                  </div>
                  {recipe.summary && (
                    <p className="text-xs text-gray-600 line-clamp-3 mb-2 min-h-[3.6rem]">
                      {recipe.summary}
                    </p>
                  )}
                </div>
              <button
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
                    className="block w-full text-center py-2.5 mt-2.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90"
                    style={{
                      background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
                      boxShadow: '0 3px 12px rgba(255, 87, 34, 0.3)'
                    }}
                  >
                    레시피 보기
                  </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}