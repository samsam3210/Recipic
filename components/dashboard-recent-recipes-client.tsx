"use client"

import { Skeleton } from "@/components/ui/skeleton"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardRecentRecipes } from "@/components/dashboard-recent-recipes"
import { fetchRecentRecipes } from "@/lib/actions/recipe-fetch"
import { useToast } from "@/hooks/use-toast"
import { BookOpen } from "lucide-react"

interface RecipeListItemProps {
  id: string
  recipeName: string | null
  videoThumbnail: string | null
  channelName: string | null
  summary: string | null
  cookingTimeMinutes?: number | null
  difficulty?: string | null
}

interface DashboardRecentRecipesClientProps {
  userId: string
}

export function DashboardRecentRecipesClient({ userId }: DashboardRecentRecipesClientProps) {
  const [recentRecipes, setRecentRecipes] = useState<RecipeListItemProps[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const loadRecentRecipes = async () => {
      setIsLoading(true)
      try {
        const { recipes: fetchedRecipes, error } = await fetchRecentRecipes(userId, 10)
        if (error) {
          throw new Error(error)
        }
        setRecentRecipes(fetchedRecipes)
      } catch (err: any) {
        console.error("Failed to load recent recipes:", err)
        toast({
          title: "오류",
          description: err.message || "최근 레시피를 불러오는 데 실패했습니다.",
          variant: "destructive",
        })
        setRecentRecipes([])
      } finally {
        setIsLoading(false)
      }
    }

    if (userId) {
      loadRecentRecipes()
    }
  }, [userId, toast])

  return (
    <div className="p-6" style={{ backgroundColor: '#FAFAFA' }}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">최근 본 레시피</h2>
        {/* 최근 레시피가 있을 때만 "모두 보기" 버튼 표시 */}
        {!isLoading && recentRecipes.length > 0 && (
          <Button variant="link" asChild className="underline">
            <Link href="/recipes">모두 보기</Link>
          </Button>
        )}
      </div>
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center p-4">
              <div className="w-24 h-16 flex-shrink-0 mr-4">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
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
        <DashboardRecentRecipes recipes={recentRecipes} />
      )}
    </div>
  )
}
