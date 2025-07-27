"use client"

import React, { useState, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Loader2, Folder } from "lucide-react"
import { RecipeGrid } from "@/components/recipe-grid"
import { useToast } from "@/hooks/use-toast"
import { deleteRecipe } from "@/lib/actions/recipe"
import { moveRecipeToFolder } from "@/lib/actions/folder"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { RecipeCardSkeleton } from "@/components/recipe-card-skeleton"
import { getPaginatedRecipes } from "@/lib/actions/recipe-fetch"
import { cn } from "@/lib/utils"
import type { recipes as recipesSchema, folders as foldersSchema } from "@/lib/db/schema"

interface RecipeGridWrapperProps {
  userId: string
  initialSelectedFolderId: string | null
  initialPage: number
  initialLimit: number
  initialFolders: (typeof foldersSchema.$inferSelect)[]
  initialRecipesData?: any
}

export default function RecipeGridWrapper({
  userId,
  initialSelectedFolderId,
  initialPage,
  initialLimit,
  initialFolders,
  initialRecipesData,
}: RecipeGridWrapperProps) {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // URL의 folderId 및 page 변경 감지
  const selectedFolderId = searchParams.get("folder") || null
  const page = Number.parseInt(searchParams.get("page") || "1")

  // 서버 초기 데이터를 React Query 캐시에 즉시 설정
  React.useEffect(() => {
    if (initialRecipesData && page === 1) {
      const cacheKey = ['paginated-recipes', userId, selectedFolderId, page, initialLimit]
      console.log('[RecipeGridWrapper] 서버 초기 데이터를 캐시에 설정:', cacheKey)
      queryClient.setQueryData(cacheKey, initialRecipesData)
    }
  }, [initialRecipesData, page, userId, selectedFolderId, initialLimit, queryClient]) // 필요한 의존성 모두 추가

  // 캐시가 있는지 확인
  const cacheKey = ['paginated-recipes', userId, selectedFolderId, page, initialLimit]
  const cachedData = queryClient.getQueryData(cacheKey)
  const hasInitialData = initialRecipesData && page === 1
  const isQueryEnabled = !cachedData && !hasInitialData // 캐시와 초기 데이터 모두 체크

  console.log('[RecipeGridWrapper] 캐시 상태:', {
    hasCachedData: !!cachedData,
    hasInitialData,
    isQueryEnabled,
    page,
    cacheKey: JSON.stringify(cacheKey)
  });

  // React Query로 레시피 데이터 관리 (캐시가 없을 때만 활성화)
  const { 
    data: recipesData, 
    isLoading: isLoadingRecipes, 
    isFetching,
    error,
    status
  } = useQuery({
    queryKey: cacheKey,
    queryFn: () => {
      console.log('[RecipeGridWrapper] API 호출:', { userId, selectedFolderId, page, initialLimit });
      return getPaginatedRecipes({
        userId,
        page,
        limit: initialLimit,
        folderId: selectedFolderId,
      });
    },
    initialData: hasInitialData ? initialRecipesData : undefined, // 첫 페이지만 초기 데이터 사용
    enabled: isQueryEnabled, // 캐시도 없고 초기 데이터도 없을 때만 쿼리 실행
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  })

  // 데이터 우선순위: 캐시 > 쿼리 결과 (initialData로 처리됨)
  const finalData = cachedData || recipesData
  
  // 실제 로딩 상태 - 데이터가 있으면 false, 없고 쿼리가 활성화되어 로딩 중이면 true
  const actualIsLoading = !finalData && isQueryEnabled && isLoadingRecipes

  const allRecipes = finalData?.recipes || []
  const hasMore = finalData?.hasMore || false

  console.log('[RecipeGridWrapper] 상태:', {
    originalIsLoading: isLoadingRecipes,
    actualIsLoading,
    isFetching,
    hasCachedData: !!cachedData,
    hasInitialData,
    hasRecipesData: !!finalData,
    recipesCount: finalData?.recipes?.length || 0,
    allRecipesLength: allRecipes.length,
    selectedFolderId,
    page,
    queryStatus: status,
    isQueryEnabled,
    cachedDataType: cachedData ? 'cached' : 'none',
    finalDataSource: cachedData ? 'cache' : recipesData ? 'query+initial' : 'none'
  });

  // 레시피 삭제 관련 상태
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false)
  const [recipeToDelete, setRecipeToDelete] = useState<{ id: string; name: string | null } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // 레시피 폴더 이동 관련 상태
  const [showMoveToFolderDialog, setShowMoveToFolderDialog] = useState(false)
  const [recipeToMove, setRecipeToMove] = useState<{ id: string; name: string | null } | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [folderSearchTerm, setFolderSearchTerm] = useState("")
  const [selectedMoveToFolderId, setSelectedMoveToFolderId] = useState<string | null>(null) // 🆕 선택된 폴더 ID

  // 에러 처리
  if (error) {
    console.error("Failed to load recipes:", error)
    if (recipesData?.error) {
      toast({
        title: "오류",
        description: recipesData.error || "레시피를 불러오는 데 실패했습니다.",
        variant: "destructive",
      })
    }
  }

  // 레시피 삭제 핸들러
  const handleDeleteClick = (id: string, name: string | null) => {
    setRecipeToDelete({ id, name })
    setShowDeleteConfirmDialog(true)
  }

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return

    setIsDeleting(true)
    
    // 옵티미스틱 업데이트: UI에서 즉시 제거
    const currentData = queryClient.getQueryData(['paginated-recipes', userId, selectedFolderId, page, initialLimit])
    console.log('[RecipeGridWrapper] 삭제 전 캐시 데이터:', {
      hasCurrentData: !!currentData,
      currentRecipeCount: currentData && typeof currentData === 'object' && 'recipes' in currentData ? (currentData.recipes as any[]).length : 0,
      recipeToDeleteId: recipeToDelete.id
    })
    
    if (currentData && typeof currentData === 'object' && 'recipes' in currentData) {
      const updatedData = {
        ...currentData,
        recipes: (currentData.recipes as any[]).filter(recipe => recipe.id !== recipeToDelete.id)
      }
      console.log('[RecipeGridWrapper] 옵티미스틱 업데이트 적용:', {
        beforeCount: (currentData.recipes as any[]).length,
        afterCount: updatedData.recipes.length,
        removedRecipeId: recipeToDelete.id
      })
      queryClient.setQueryData(['paginated-recipes', userId, selectedFolderId, page, initialLimit], updatedData)
    }
    
    try {
      const result = await deleteRecipe(recipeToDelete.id)
      if (result.success) {
        console.log('[RecipeGridWrapper] 레시피 삭제 성공, 토스트 표시:', result.message)
        toast({ title: "삭제 완료", description: result.message })
        // 폴더 캐시만 무효화 (레시피 수 업데이트용)
        queryClient.invalidateQueries({ queryKey: ['recipes-folders', userId] })
      } else {
        // 실패 시 옵티미스틱 업데이트 롤백
        queryClient.invalidateQueries({ queryKey: ['paginated-recipes', userId, selectedFolderId, page, initialLimit] })
        throw new Error(result.message)
      }
    } catch (error: any) {
      // 실패 시 옵티미스틱 업데이트 롤백
      queryClient.invalidateQueries({ queryKey: ['paginated-recipes', userId, selectedFolderId, page, initialLimit] })
      toast({
        title: "삭제 실패",
        description: error.message || "레시피 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirmDialog(false)
      setRecipeToDelete(null)
    }
  }

  // 레시피 폴더 이동 핸들러
  const handleMoveClick = (id: string, name: string | null) => {
    setRecipeToMove({ id, name })
    setSelectedMoveToFolderId(null) // 🆕 선택 초기화
    setShowMoveToFolderDialog(true)
  }

  // 🆕 폴더 선택 핸들러 (이동은 하지 않고 선택만)
  const handleSelectFolderToMove = (folderId: string | null) => {
    setSelectedMoveToFolderId(folderId)
  }

  // 🆕 실제 폴더 이동 실행
  const handleConfirmMoveToFolder = async () => {
    if (!recipeToMove) return

    setIsMoving(true)
    try {
      const result = await moveRecipeToFolder(recipeToMove.id, selectedMoveToFolderId)
      if (result.success) {
        toast({ title: "이동 완료", description: result.message })
        // 폴더 캐시만 무효화 (레시피 수 업데이트용)
        queryClient.invalidateQueries({ queryKey: ['recipes-folders', userId] })
        queryClient.invalidateQueries({ queryKey: ['paginated-recipes', userId, selectedFolderId, page, initialLimit] })
        setShowMoveToFolderDialog(false) // 🆕 다이얼로그 닫기
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({
        title: "이동 실패",
        description: error.message || "레시피 이동 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsMoving(false)
      setRecipeToMove(null)
      setSelectedMoveToFolderId(null) // 🆕 선택 초기화
      setFolderSearchTerm("")
    }
  }

  // 🆕 이동 다이얼로그 닫기
  const handleCloseMoveDialog = () => {
    setShowMoveToFolderDialog(false)
    setRecipeToMove(null)
    setSelectedMoveToFolderId(null)
    setFolderSearchTerm("")
  }

  const filteredFolders = initialFolders.filter((folder) =>
    folder.name.toLowerCase().includes(folderSearchTerm.toLowerCase()),
  )

  return (
    <>
      {(actualIsLoading && !finalData) ? ( // 실제 로딩 상태 및 캐시된 데이터가 없을 때만 스켈레톤 표시
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: initialLimit }).map((_, i) => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : allRecipes.length === 0 ? (
        <div className="border-dashed border-2 p-8 text-center text-muted-foreground rounded-lg">
          <p className="text-lg mb-4">
            {selectedFolderId ? "이 폴더에 저장된 레시피가 없습니다." : "아직 저장된 레시피가 없습니다."}
          </p>
          <Button asChild>
            <Link href="/dashboard">
              <Plus className="mr-2 h-4 w-4" />
              새로운 레시피 추출하기
            </Link>
          </Button>
        </div>
      ) : (
        <RecipeGrid
          recipes={allRecipes}
          onDelete={handleDeleteClick}
          onMove={handleMoveClick}
          folders={initialFolders}
          currentFolderId={selectedFolderId}
        />
      )}

      {/* 더 불러오기 버튼 */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => {
              const newSearchParams = new URLSearchParams(searchParams.toString())
              newSearchParams.set("page", (page + 1).toString())
              router.push(`/recipes?${newSearchParams.toString()}`)
            }}
            disabled={isFetching || actualIsLoading}
          >
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}더 불러오기
          </Button>
        </div>
      )}

      {/* 레시피 삭제 확인 AlertDialog */}
      <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>레시피 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{recipeToDelete?.name || "이 레시피"}&quot;를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteConfirmDialog(false)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRecipe}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🔧 레시피 폴더 이동 Dialog - 선택 방식 변경 */}
      <Dialog open={showMoveToFolderDialog} onOpenChange={handleCloseMoveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>&quot;{recipeToMove?.name || "이 레시피"}&quot; 폴더 이동</DialogTitle>
            <DialogDescription>이 레시피를 이동할 폴더를 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="폴더 검색..."
              value={folderSearchTerm}
              onChange={(e) => setFolderSearchTerm(e.target.value)}
              className="mb-4"
            />
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              {/* 🔧 모든 레시피 버튼 - 선택 방식 */}
              <Button
                variant={selectedMoveToFolderId === null ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start mb-1",
                  selectedMoveToFolderId === null && "bg-blue-600 hover:bg-blue-700 text-white"
                )}
                onClick={() => handleSelectFolderToMove(null)}
                disabled={isMoving}
              >
                <Folder className="mr-2 h-4 w-4" /> 모든 레시피
              </Button>
              <Separator className="my-2" />
              {filteredFolders.length > 0 ? (
                filteredFolders.map((folder) => (
                  <Button
                    key={folder.id}
                    variant={selectedMoveToFolderId === folder.id ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start mb-1",
                      selectedMoveToFolderId === folder.id && "bg-blue-600 hover:bg-blue-700 text-white"
                    )}
                    onClick={() => handleSelectFolderToMove(folder.id)}
                    disabled={isMoving}
                  >
                    <Folder className="mr-2 h-4 w-4" /> {folder.name}
                  </Button>
                ))
              ) : (
                <p className="text-center text-muted-foreground text-sm">폴더를 찾을 수 없습니다.</p>
              )}
            </ScrollArea>
          </div>
          {/* 🆕 저장/취소 버튼 */}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleCloseMoveDialog} disabled={isMoving}>
              취소
            </Button>
            <Button 
              onClick={handleConfirmMoveToFolder} 
              disabled={isMoving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isMoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  이동 중...
                </>
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}