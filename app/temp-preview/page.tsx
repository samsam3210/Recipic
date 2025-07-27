"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { RecipeDisplay } from "@/components/recipe-display"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { checkAndSaveRecipe } from "@/lib/actions/recipe" // 수정된 서버 액션 임포트
import { addRecentlyViewedRecipe } from "@/lib/actions/recently-viewed"
import { incrementDailyUsage } from "@/lib/actions/usage"
import { useYoutubePlayer } from "@/hooks/use-youtube-player"
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Bookmark } from "lucide-react"
import { Header } from "@/components/header"
import type { User } from "@supabase/supabase-js"
import { CustomDialog } from "@/components/custom-dialog"

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
}

interface VideoInfo {
  videoId: string
  videoTitle: string
  videoThumbnail: string
  channelName: string
  videoDurationSeconds: number
  videoViews: number
  transcriptText: string
  hasSubtitles: boolean
}

interface PreviewData {
  youtubeUrl: string
  videoInfo: VideoInfo
  extractedRecipe: RecipeData
}

const PENDING_RECIPE_STORAGE_KEY = "recipick_pending_recipe"

export default function RecipePreviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast, dismiss } = useToast()
  const { invalidateRecentlyViewed, invalidateByAction } = useCacheInvalidation()
  
  // 기존 토스트를 dismiss하고 새 토스트를 표시하는 헬퍼 함수
  const showToast = (toastProps: Parameters<typeof toast>[0]) => {
    dismiss() // 기존 토스트 제거
    setTimeout(() => toast(toastProps), 50) // 약간의 지연 후 새 토스트 표시
  }
  
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateRecipeId, setDuplicateRecipeId] = useState<string | null>(null)

  useEffect(() => {
    console.log("[RecipePreviewPage] useEffect started.")
    const dataParam = searchParams.get("data")
    console.log("[RecipePreviewPage] dataParam from URL:", dataParam)

    if (dataParam) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(dataParam))
        setPreviewData(decodedData)
        console.log("[RecipePreviewPage] Preview data loaded from URL param:", decodedData)
      } catch (error) {
        console.error("[RecipePreviewPage] Failed to parse preview data from URL:", error)
        showToast({
          title: "오류",
          description: "레시피 데이터를 불러오는 데 실패했습니다.",
          variant: "destructive",
        })
        router.replace("/")
      }
    } else {
      console.log("[RecipePreviewPage] No dataParam. Checking localStorage...")
      const storedData = localStorage.getItem(PENDING_RECIPE_STORAGE_KEY)
      console.log("[RecipePreviewPage] Stored data from localStorage:", storedData ? "Exists" : "Does not exist")

      if (storedData) {
        try {
          const parsedStoredData = JSON.parse(storedData)
          setPreviewData(parsedStoredData)
          console.log("[RecipePreviewPage] Preview data loaded from localStorage:", parsedStoredData)
          
          // 최근 본 레시피에 기록 (완전한 레시피 데이터 포함, 프리뷰는 savedRecipeId null)
          if (parsedStoredData?.extractedRecipe?.recipeName) {
            addRecentlyViewedRecipe({
              recipeName: parsedStoredData.extractedRecipe.recipeName,
              videoTitle: parsedStoredData.videoInfo?.videoTitle, // 실제 YouTube 비디오 제목 추가
              youtubeUrl: parsedStoredData.youtubeUrl || '',
              videoThumbnail: parsedStoredData.videoInfo?.videoThumbnail,
              channelName: parsedStoredData.videoInfo?.channelName,
              summary: parsedStoredData.extractedRecipe?.summary,
              difficulty: parsedStoredData.extractedRecipe?.difficulty,
              cookingTimeMinutes: parsedStoredData.extractedRecipe?.cookingTimeMinutes,
              ingredients: parsedStoredData.extractedRecipe?.ingredients,
              steps: parsedStoredData.extractedRecipe?.steps,
              tips: parsedStoredData.extractedRecipe?.tips,
              videoDescription: parsedStoredData.videoInfo?.videoDescription,
              noRecipeFoundMessage: parsedStoredData.extractedRecipe?.noRecipeFoundMessage,
              videoDurationSeconds: parsedStoredData.videoInfo?.videoDurationSeconds,
              videoViews: parsedStoredData.videoInfo?.videoViews,
              savedRecipeId: null, // 프리뷰는 저장된 레시피가 아니므로 null
            }).then(() => {
              // 사용자가 로그인된 경우 캐시 무효화는 별도 useEffect에서 처리
              console.log("[RecipePreviewPage] Recently viewed recipe added successfully")
            }).catch(error => {
              console.warn("[RecipePreviewPage] Failed to add to recently viewed:", error)
            })
          }
        } catch (error) {
          console.error("[RecipePreviewPage] Failed to parse stored recipe data from localStorage:", error)
          showToast({
            title: "오류",
            description: "임시 저장된 레시피 데이터를 불러오는 데 실패했습니다.",
            variant: "destructive",
          })
          router.replace("/")
        }
      } else {
        console.warn("[RecipePreviewPage] No preview data found in URL or localStorage. Redirecting to home.")
        showToast({
          title: "오류",
          description: "표시할 레시피 데이터가 없습니다.",
          variant: "destructive",
        })
        router.replace("/")
      }
    }

    const supabase = createClient()
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      console.log("[RecipePreviewPage] Auth state changed:", event, "User:", session?.user?.id)
      if (event === "SIGNED_OUT") {
        console.log("[RecipePreviewPage] SIGNED_OUT event detected. Calling router.refresh().")
        router.refresh() // 로그아웃 시 UI 강제 업데이트
      }
    })

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [searchParams, router, toast])

  // 사용자가 로그인된 상태에서 프리뷰 페이지 진입 시 최근 본 레시피 캐시 무효화 후 prefetch
  useEffect(() => {
    if (user && previewData?.extractedRecipe?.recipeName) {
      console.log("[RecipePreviewPage] User logged in with preview data, invalidating recently viewed cache")
      invalidateRecentlyViewed(user.id)
    }
  }, [user, previewData, invalidateRecentlyViewed])

  const handleSaveRecipe = async (forceReExtract = false) => {
    if (!previewData) {
      console.warn("[RecipePreviewPage] Attempted to save recipe but previewData is null.")
      return
    }

    setIsSaving(true)
    setShowDuplicateModal(false) // 모달 닫기
    setDuplicateRecipeId(null) // 중복 레시피 ID 초기화

    if (!user) {
      console.log("[RecipePreviewPage] User not logged in. Saving to localStorage and redirecting for login.")
      localStorage.setItem(PENDING_RECIPE_STORAGE_KEY, JSON.stringify(previewData))
      showToast({
        title: "로그인 필요",
        description: "레시피를 저장하려면 Google로 로그인해야 합니다.",
        variant: "info",
      })
      router.push("/")
      setIsSaving(false)
      return
    }

    try {
      console.log("[RecipePreviewPage] User logged in. Attempting to save recipe to DB.")
      // processAndSaveRecipeForLoggedInUser를 호출하여 중복 확인 및 저장 처리
      const result = await checkAndSaveRecipe(
        previewData.youtubeUrl,
        previewData.videoInfo,
        previewData.extractedRecipe,
        forceReExtract,
      )

      if (result.success) {
        if (result.isDuplicate && result.recipeId && !forceReExtract) {
          // 중복 레시피 발견 시 모달 표시
          setDuplicateRecipeId(result.recipeId)
          setShowDuplicateModal(true)
          toast({
            title: "알림",
            description: "이미 저장된 레시피입니다.",
            variant: "info",
          })
        } else if (result.recipeId) {
          // 새 레시피 저장 또는 강제 재추출 성공
          // 사용량 증가는 레시피 추출 시에만 하므로 여기서는 제거
          
          showToast({
            title: "레시피 저장 완료!",
            description: "나의 레시피에서 확인 가능합니다.",
          })
          localStorage.removeItem(PENDING_RECIPE_STORAGE_KEY) // 저장 완료 후 로컬 스토리지 제거
          // 레시피 저장 후 캐시 무효화
          if (user) {
            invalidateByAction('RECIPE_SAVED', user.id)
          }
          // router.replace 제거 - 페이지 이동하지 않음
          console.log("[RecipePreviewPage] Recipe saved successfully.")
        } else {
          // 성공했지만 recipeId가 없는 경우 (예외 상황)
          throw new Error(result.message || "레시피 처리 후 ID를 찾을 수 없습니다.")
        }
      } else {
        throw new Error(result.message || "레시피 저장에 실패했습니다.")
      }
    } catch (error: any) {
      console.error("[RecipePreviewPage] Failed to save recipe:", error)
      showToast({
        title: "저장 실패",
        description: error.message || "레시피 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleViewExistingRecipe = () => {
    if (duplicateRecipeId) {
      router.push(`/recipe/${duplicateRecipeId}`)
      setShowDuplicateModal(false)
    }
  }

  const handleForceSaveNew = () => {
    handleSaveRecipe(true) // 강제 저장 실행 (새로운 레시피로)
  }

  // YouTube URL에서 videoId 추출
  const getVideoIdFromUrl = (url: string): string | null => {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const videoId = previewData ? getVideoIdFromUrl(previewData.youtubeUrl) : null

  // YouTube 플레이어 설정
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const { youtubePlayer, isPlayerReady } = useYoutubePlayer({
    videoId: videoId || '',
    playerRef: playerContainerRef,
    onReady: () => {
      console.log("[TempPreview] YouTube Player is ready.")
    },
    onError: (error) => {
      console.error("[TempPreview] YouTube Player error:", error)
      showToast({
        title: "유튜브 영상 로드 오류",
        description: "영상을 불러오는 데 문제가 발생했습니다.",
        variant: "destructive",
      })
    },
  })

  const handleSeekVideo = useCallback(
    (timestamp: number) => {
      if (youtubePlayer && isPlayerReady) {
        youtubePlayer.seekTo(timestamp, true)
        youtubePlayer.playVideo()
      }
    },
    [youtubePlayer, isPlayerReady],
  )

  const handlePauseVideo = useCallback(() => {
    if (youtubePlayer && isPlayerReady) {
      youtubePlayer.pauseVideo()
    }
  }, [youtubePlayer, isPlayerReady])

  if (!previewData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-white to-gray-50 p-4 text-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <h1 className="text-2xl font-bold mt-4">레시피 데이터를 불러오는 중...</h1>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 상단 고정 YouTube 플레이어 */}
      {videoId && (
        <div className="sticky top-0 z-30 w-full bg-background shadow-md max-w-3xl mx-auto">
          <Card className="mb-0 rounded-none border-none shadow-none">
            <CardContent className="p-0">
              <div className="aspect-video w-full">
                <div ref={playerContainerRef} className="w-full h-full overflow-hidden youtube-player-iframe-container" />
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

      <main className="flex-1">
        <div className="container mx-auto px-4 max-w-3xl mt-6">
          {previewData.extractedRecipe.noRecipeFoundMessage ? (
            <div className="border-dashed border-2 p-6 text-center text-muted-foreground">
              <p>{previewData.extractedRecipe.noRecipeFoundMessage}</p>
            </div>
          ) : (
            <RecipeDisplay 
              recipe={previewData.extractedRecipe} 
              isSavedRecipe={false}
              handleSeekVideo={handleSeekVideo}
              handlePauseVideo={handlePauseVideo}
              isPlayerReady={isPlayerReady}
              onSaveRecipe={user ? () => handleSaveRecipe(false) : undefined}
              isSaving={isSaving}
            />
          )}

          {!user && (
            <div className="flex justify-center mt-8">
              <Button onClick={() => handleSaveRecipe(false)} disabled={isSaving} size="lg">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  "내 레시피 북에 저장"
                )}
              </Button>
            </div>
          )}
        </div>
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>

      {/* 중복 레시피 확인 모달 */}
      <CustomDialog
        isOpen={showDuplicateModal}
        onClose={setShowDuplicateModal}
        title="이전에 레시피를 조회했던 영상이에요."
        description="레시피 정보 화면으로 바로 이동할까요?"
        className="sm:max-w-[425px]"
        footerClassName="flex flex-col sm:flex-row sm:justify-end gap-2 mt-4"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDuplicateModal(false)}>
              아니요, 다른 영상 입력할게요
            </Button>
            <Button onClick={handleViewExistingRecipe}>예, 기존 레시피 보기</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground text-center mt-4 w-full">
          다시 레시피를 새로 추출하고 싶다면{" "}
          <Button variant="link" className="p-0 h-auto text-sm" onClick={handleForceSaveNew}>
            여기를 눌러주세요.
          </Button>
        </p>
      </CustomDialog>
    </div>
  )
}
