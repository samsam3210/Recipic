"use client"

import { useRef, useCallback, useEffect } from "react"
import { RecipeDisplay } from "@/components/recipe-display"
import { useYoutubePlayer } from "@/hooks/use-youtube-player"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { savePersonalNotes } from "@/lib/actions/recipe" // savePersonalNotes 액션 임포트
import { addRecentlyViewedRecipe } from "@/lib/actions/recently-viewed"

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

interface RecipeDetailClientProps {
  recipe: RecipeData
  videoId: string | null
}

export function RecipeDetailClient({ recipe, videoId }: RecipeDetailClientProps) {
  console.log("[RecipeDetailClient] Received videoId:", videoId) // 추가
  const youtubePlayerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { youtubePlayer, isPlayerReady } = useYoutubePlayer({
    videoId,
    playerRef: youtubePlayerRef,
    onReady: (player) => {
      console.log("[RecipeDetailClient] YouTube Player is READY.") // 추가
    },
    onError: (error) => {
      console.error("[RecipeDetailClient] YouTube Player Error:", error) // 기존 로그 유지 또는 수정
      toast({
        title: "유튜브 영상 로드 오류",
        description: "영상을 불러오는 데 문제가 발생했습니다. 영상 ID를 확인해주세요.",
        variant: "destructive",
      })
    },
  })

  const handleSeekVideo = useCallback(
    (timestamp: number) => {
      if (youtubePlayer && isPlayerReady) {
        youtubePlayer.seekTo(timestamp, true)
        youtubePlayer.playVideo()
      } else {
        console.warn("YouTube Player is not ready or does not exist.")
      }
    },
    [youtubePlayer, isPlayerReady],
  )

  // 🆕 여기에 새로운 함수를 별도로 추가하세요
  const handlePauseVideo = useCallback(() => {
    if (youtubePlayer && isPlayerReady) {
      youtubePlayer.pauseVideo()
    }
  }, [youtubePlayer, isPlayerReady])

  // 최근 본 레시피에 기록 (완전한 레시피 데이터 포함, 저장된 레시피 ID 포함)
  useEffect(() => {
    if (recipe.recipeName) {
      addRecentlyViewedRecipe({
        recipeName: recipe.recipeName,
        videoTitle: recipe.videoTitle || recipe.recipeName, // 실제 YouTube 비디오 제목 추가
        youtubeUrl: recipe.youtubeUrl || '',
        videoThumbnail: recipe.videoThumbnail || '',
        channelName: recipe.channelName || '',
        summary: recipe.summary || '',
        difficulty: recipe.difficulty,
        cookingTimeMinutes: recipe.cookingTimeMinutes,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        tips: recipe.tips,
        videoDurationSeconds: recipe.videoDurationSeconds,
        savedRecipeId: recipe.id, // 저장된 레시피 ID 포함
      }).catch(error => {
        console.warn("[RecipeDetailClient] Failed to add to recently viewed:", error)
      })
    }
  }, [recipe])

  // 개인 메모 저장 핸들러
  const handleSavePersonalNotes = async (notes: string | null) => {
    if (!recipe.id) {
      toast({
        title: "오류",
        description: "저장되지 않은 레시피는 메모를 저장할 수 없습니다.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await savePersonalNotes(recipe.id, notes)
      if (result.success) {
        toast({
          title: "메모 저장 완료",
          description: result.message,
          duration: 1500,
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("Failed to save personal notes:", error)
      toast({
        title: "메모 저장 실패",
        description: error.message || "개인 메모를 저장하는 데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {videoId && (
        <div className="sticky top-0 z-30 w-full bg-background shadow-md max-w-3xl mx-auto">
          {" "}
          {/* Added max-w-3xl mx-auto */}
          <Card className="mb-0 rounded-none border-none shadow-none">
            <CardContent className="p-0">
              <div className="aspect-video w-full">
                <div ref={youtubePlayerRef} className="w-full h-full overflow-hidden youtube-player-iframe-container" />
              </div>
              {!isPlayerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="ml-4 text-lg text-muted-foreground">유튜브 영상 로드 중...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-3xl mt-6">
        <RecipeDisplay
          recipe={recipe}
          isSavedRecipe={true}
          handleSeekVideo={handleSeekVideo}
          handlePauseVideo={handlePauseVideo}  // 🆕 이 줄 추가
          isPlayerReady={isPlayerReady}
          onSavePersonalNotes={handleSavePersonalNotes} // 개인 메모 저장 핸들러 전달
        />
      </div>
    </div>
  )
}
