"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
}

export default function RecipeGridWrapper({
  userId,
  initialSelectedFolderId,
  initialPage,
  initialLimit,
  initialFolders,
}: RecipeGridWrapperProps) {
  const [allRecipes, setAllRecipes] = useState<(typeof recipesSchema.$inferSelect)[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const [isFolderChanging, setIsFolderChanging] = useState(false) // 폴더 변경 중 상태
  const [previousFolderId, setPreviousFolderId] = useState<string | null>(initialSelectedFolderId) // 이전 폴더 ID 추적
  const [isLoadingMore, setIsLoadingMore] = useState(false) // 더 불러오기 로딩 상태
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL의 folderId 및 page 변경 감지
  const selectedFolderId = searchParams.get("folder") || null
  const page = Number.parseInt(searchParams.get("page") || "1")

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

  // 레시피 데이터 로드 함수 (수정됨)
  const loadRecipes = useCallback(async (isAppending = false) => {
    if (isAppending) {
      setIsLoadingMore(true) // 더 불러오기 로딩 상태
    } else {
      setIsLoadingRecipes(true) // 일반 로딩 상태
    }
    
    try {
      const {
        recipes: fetchedRecipes,
        hasMore: fetchedHasMore,
        error,
      } = await getPaginatedRecipes({
        userId,
        page,
        limit: initialLimit,
        folderId: selectedFolderId,
      })

      if (error) {
        throw new Error(error)
      }
      
      // 🔧 페이지가 1보다 크고 데이터가 없으면 첫 페이지로 리다이렉트
      if (page > 1 && fetchedRecipes.length === 0 && !isAppending) {
        const newSearchParams = new URLSearchParams(searchParams.toString())
        newSearchParams.delete("page")
        router.replace(`/recipes?${newSearchParams.toString()}`)
        return
      }
      
      if (isAppending) {
        // 더 불러오기: 기존 데이터에 추가
        setAllRecipes(prev => [...prev, ...fetchedRecipes])
      } else {
        // 새로운 조회: 기존 데이터 교체
        setAllRecipes(fetchedRecipes)
      }
      
      setHasMore(fetchedHasMore)
      setCurrentPage(page)
    } catch (err: any) {
      console.error("Failed to load recipes:", err)
      toast({
        title: "오류",
        description: err.message || "레시피를 불러오는 데 실패했습니다.",
        variant: "destructive",
      })
      if (!isAppending) {
        setAllRecipes([])
        setHasMore(false)
      }
    } finally {
      if (isAppending) {
        setIsLoadingMore(false)
      } else {
        setIsLoadingRecipes(false)
      }
    }
  }, [userId, page, initialLimit, selectedFolderId, toast, router, searchParams])


  useEffect(() => {
    // 폴더가 실제로 변경되었는지 확인
    if (previousFolderId !== selectedFolderId) {
      setIsFolderChanging(true)
      setPreviousFolderId(selectedFolderId)
      loadRecipes(false) // 폴더 변경 시에는 새로운 조회
    } else if (page > 1) {
      loadRecipes(true) // 페이지가 증가한 경우에는 추가 로드
    } else {
      loadRecipes(false) // 첫 페이지는 새로운 조회
    }
  }, [loadRecipes, selectedFolderId, previousFolderId, page])

  // 폴더 변경 완료 처리
  useEffect(() => {
    if (isFolderChanging && !isLoadingRecipes) {
      setIsFolderChanging(false)
    }
  }, [isFolderChanging, isLoadingRecipes])

  // 레시피 삭제 핸들러
  const handleDeleteClick = (id: string, name: string | null) => {
    setRecipeToDelete({ id, name })
    setShowDeleteConfirmDialog(true)
  }

  const confirmDeleteRecipe = async () => {
    if (!recipeToDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteRecipe(recipeToDelete.id)
      if (result.success) {
        toast({ title: "삭제 완료", description: result.message })
        loadRecipes() // 레시피 목록 새로고침
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
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
        loadRecipes() // 레시피 목록 새로고침
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
      {(isLoadingRecipes || isFolderChanging) ? (
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
              newSearchParams.set("page", (currentPage + 1).toString())
              router.push(`/recipes?${newSearchParams.toString()}`)
            }}
            disabled={isLoadingMore || isLoadingRecipes}
          >
            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}더 불러오기
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