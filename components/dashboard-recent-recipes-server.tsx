"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BookOpen, Clock, BarChart3, Bookmark, BookmarkCheck } from "lucide-react"
import Image from "next/image"
import { deleteRecipe, saveRecipeFromRecentlyViewed } from "@/lib/actions/recipe"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

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
  const [localRecipes, setLocalRecipes] = useState(recipes)
  const [bookmarkLoadingIds, setBookmarkLoadingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  // recipes prop이 변경되면 localRecipes 업데이트
  useEffect(() => {
    setLocalRecipes(recipes)
  }, [recipes])

  // 북마크 토글 함수
  const handleBookmarkToggle = async (recipe: RecentlyViewedRecipeProps) => {
    const isSaved = !!recipe.savedRecipeId
    
    setBookmarkLoadingIds(prev => new Set([...prev, recipe.id]))
    
    try {
      if (isSaved && recipe.savedRecipeId) {
        // 삭제
        const result = await deleteRecipe(recipe.savedRecipeId)
        if (result.success) {
          // UI 업데이트: savedRecipeId를 null로 설정
          setLocalRecipes(prev => 
            prev.map(r => 
              r.id === recipe.id 
                ? { ...r, savedRecipeId: null }
                : r
            )
          )
          toast({
            title: "레시피 삭제",
            description: `"${recipe.recipeName || "레시피"}"를 나의레시피에서 삭제했습니다.`,
          })
        } else {
          throw new Error(result.message)
        }
      } else {
        // 저장
        const result = await saveRecipeFromRecentlyViewed(recipe.id)
        if (result.success && result.recipeId) {
          // UI 업데이트: savedRecipeId 설정
          setLocalRecipes(prev => 
            prev.map(r => 
              r.id === recipe.id 
                ? { ...r, savedRecipeId: result.recipeId }
                : r
            )
          )
          toast({
            title: "레시피 저장",
            description: `"${recipe.recipeName || "레시피"}"를 나의레시피에 저장했습니다.`,
          })
        } else {
          throw new Error(result.message)
        }
      }
    } catch (error: any) {
      console.error("북마크 토글 실패:", error)
      toast({
        title: "오류",
        description: error.message || "북마크 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setBookmarkLoadingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recipe.id)
        return newSet
      })
    }
  }
  return (
    <div>
      <div className="px-6 mb-6">
        {isLoading ? (
          <Skeleton className="h-7 w-40" />
        ) : (
          <h2 className="text-xl font-bold text-gray-800">최근 본 레시피</h2>
        )}
      </div>
      
      {isLoading ? (
        <div 
          className="flex gap-4 pb-2 px-6" 
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
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-full rounded-full mt-2.5" />
            </div>
          ))}
        </div>
      ) : localRecipes.length === 0 ? (
        <div className="text-center py-12 px-6">
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
          className="flex gap-4 pb-2 px-6"
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
          {localRecipes.map((recipe) => (
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
                  <div className="mb-2">
                    <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
                      {recipe.recipeName || "제목 없음"}
                    </h3>
                  </div>
                  <div className="text-sm text-gray-500 mb-2 h-4 truncate">
                    {recipe.channelName || ''}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 mb-2 h-4">
                    {recipe.cookingTimeMinutes ? (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{recipe.cookingTimeMinutes}분</span>
                      </div>
                    ) : <div></div>}
                    {recipe.difficulty ? (
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>{recipe.difficulty}</span>
                      </div>
                    ) : <div></div>}
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-2 mb-2 min-h-[3rem] leading-6">
                    {recipe.summary || ''}
                  </div>
                </div>
              <div className="flex gap-2 mt-2.5">
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
                      className="flex-1 text-center py-2.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90"
                      style={{
                        background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
                        boxShadow: '0 3px 12px rgba(255, 87, 34, 0.3)'
                      }}
                    >
                      레시피 보기
                    </button>
                <button
                  className={`w-12 h-12 flex items-center justify-center rounded-full border transition-colors disabled:opacity-50 ${
                    recipe.savedRecipeId 
                      ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' 
                      : 'bg-white border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={bookmarkLoadingIds.has(recipe.id)}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleBookmarkToggle(recipe)
                  }}
                >
                  {bookmarkLoadingIds.has(recipe.id) ? (
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  ) : recipe.savedRecipeId ? (
                    <BookmarkCheck className="w-5 h-5 text-orange-500 fill-current" />
                  ) : (
                    <Bookmark className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}