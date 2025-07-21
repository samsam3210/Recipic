"use client"

import { Skeleton } from "@/components/ui/skeleton"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DashboardRecentRecipes } from "@/components/dashboard-recent-recipes"
import { fetchRecentRecipes } from "@/lib/actions/recipe-fetch"
import { useToast } from "@/hooks/use-toast"

interface RecipeListItemProps {
  id: string
  recipeName: string | null
  videoThumbnail: string | null
  channelName: string | null
  summary: string | null
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
        const { recipes: fetchedRecipes, error } = await fetchRecentRecipes(userId, 3)
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
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">최근 조회한 레시피</h2>
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
        <div className="border-dashed border-2 p-8 text-center text-muted-foreground rounded-lg">
          <p className="text-lg mb-4">최근 조회한 레시피가 없습니다.</p>
          {/* "새로운 레시피 추출하기" 버튼 제거 */}
        </div>
      ) : (
        <DashboardRecentRecipes recipes={recentRecipes} />
      )}
    </div>
  )
}
