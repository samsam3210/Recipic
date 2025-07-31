"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { Clock, BarChart3, Bookmark, BookOpen } from "lucide-react"
import { getRecentlyViewedRecipes } from "@/lib/actions/recently-viewed"
import { deleteRecipe, saveRecipeFromRecentlyViewed } from "@/lib/actions/recipe"
import { useToast } from "@/hooks/use-toast"

interface RecipeListItemProps {
  id: string
  recipeName: string | null
  videoThumbnail: string | null
  channelName: string | null
  summary: string | null
  cookingTimeMinutes?: number | null
  difficulty?: string | null
  savedRecipeId?: string | null
}

interface DashboardRecentRecipesClientProps {
  userId: string
}

export function DashboardRecentRecipesClient({ userId }: DashboardRecentRecipesClientProps) {
  const [recentRecipes, setRecentRecipes] = useState<RecipeListItemProps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [bookmarkLoadingIds, setBookmarkLoadingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        const result = await getRecentlyViewedRecipes()
        
        if (!result.success) {
          throw new Error(result.message || "최근 조회한 레시피를 불러오는 데 실패했습니다.")
        }
        
        setRecentRecipes(result.recipes || [])
      } catch (err: any) {
        console.error("Failed to load recently viewed recipes:", err)
        toast({
          title: "오류",
          description: err.message || "최근 조회한 레시피를 불러오는 데 실패했습니다.",
          variant: "destructive",
        })
        setRecentRecipes([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  // 북마크 토글 함수
  const handleBookmarkToggle = async (recipe: RecipeListItemProps) => {
    const isSaved = !!recipe.savedRecipeId
    
    setBookmarkLoadingIds(prev => new Set([...prev, recipe.id]))
    
    try {
      if (isSaved && recipe.savedRecipeId) {
        // 삭제
        const result = await deleteRecipe(recipe.savedRecipeId)
        if (result.success) {
          // UI 업데이트: savedRecipeId를 null로 설정
          setRecentRecipes(prev => 
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
          setRecentRecipes(prev => 
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">최근 본 레시피</h2>
        {!isLoading && recentRecipes.length > 0 && (
          <Button variant="link" asChild className="underline">
            <Link href="/recipes">모두 보기</Link>
          </Button>
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
            <div key={i} className="flex-none" style={{ width: '224px' }}>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <Skeleton className="absolute inset-0 w-full h-full" />
                </div>
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-10 w-full rounded-full mt-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : recentRecipes.length === 0 ? (
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
          {recentRecipes.map((recipe) => (
            <div key={recipe.id} className="flex-none" style={{ width: '224px' }}>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <Image
                    src={recipe.videoThumbnail || "/placeholder.svg?height=192&width=256&text=No+Thumbnail"}
                    alt={recipe.recipeName || "레시피 썸네일"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                      {recipe.recipeName || "제목 없음"}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleBookmarkToggle(recipe.id, recipe.recipeName)
                      }}
                      disabled={bookmarkLoadingIds.has(recipe.id)}
                      className="flex-none ml-2 p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      {bookmarkLoadingIds.has(recipe.id) ? (
                        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Bookmark 
                          className={`w-4 h-4 transition-colors ${
                            recipe.savedRecipeId 
                              ? 'text-orange-500 fill-orange-500' 
                              : 'text-gray-400 hover:text-orange-500'
                          }`} 
                        />
                      )}
                    </button>
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
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                      {recipe.summary}
                    </p>
                  )}
                  <Link
                    href={`/recipe/${recipe.id}`}
                    className="block w-full text-center py-2.5 mt-2.5 text-white text-sm font-medium rounded-full transition-all hover:opacity-90"
                    style={{
                      background: 'linear-gradient(120deg, #FF9057 0%, #FF5722 100%)',
                      boxShadow: '0 3px 12px rgba(255, 87, 34, 0.3)'
                    }}
                  >
                    레시피 보기
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}