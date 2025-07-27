"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Folder, Edit, Trash2, Save, X, Loader2, MoreHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createFolder, updateFolder, deleteFolder } from "@/lib/actions/folder"
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation"
import { useUser } from "@/contexts/user-context"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useRouter, useSearchParams } from "next/navigation"

interface FolderItem {
  id: string
  name: string
}

interface FolderListProps {
  folders: FolderItem[]
  selectedFolderId: string | null
}

export function FolderList({ folders, selectedFolderId }: FolderListProps) {
  const [newFolderName, setNewFolderName] = useState("")
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null)
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null)
  const [showEditMode, setShowEditMode] = useState(false) // 🆕 편집 모드 상태
  const { toast } = useToast()
  const { user } = useUser()
  const { invalidateByAction } = useCacheInvalidation()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 낙관적 UI 업데이트를 위한 상태 추가
  const [optimisticSelectedFolderId, setOptimisticSelectedFolderId] = useState(selectedFolderId)

  // selectedFolderId prop이 변경될 때마다 optimisticSelectedFolderId를 동기화
  useEffect(() => {
    setOptimisticSelectedFolderId(selectedFolderId)
    // 🔧 실제 폴더 변경이 완료되면 로딩 상태 해제
    setLoadingFolderId(null)
  }, [selectedFolderId])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({ title: "알림", description: "폴더 이름을 입력해주세요.", variant: "info" })
      return
    }
    setIsCreating(true)
    try {
      const result = await createFolder(newFolderName)
      if (result.success) {
        toast({ title: "성공", description: result.message })
        setNewFolderName("")
        // React Query 캐시 무효화
        if (user) {
          console.log('[FolderList] 폴더 생성 후 캐시 무효화')
          invalidateByAction('FOLDER_OPERATIONS', user.id)
        }
        router.refresh()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "폴더 생성 실패", variant: "destructive" })
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartEdit = (folder: FolderItem) => {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
  }

  const handleSaveEdit = async (folderId: string) => {
    if (!editingFolderName.trim()) {
      toast({ title: "알림", description: "폴더 이름을 입력해주세요.", variant: "info" })
      return
    }
    try {
      const result = await updateFolder(folderId, editingFolderName)
      if (result.success) {
        toast({ title: "성공", description: result.message })
        setEditingFolderId(null)
        // React Query 캐시 무효화
        if (user) {
          console.log('[FolderList] 폴더 수정 후 캐시 무효화')
          invalidateByAction('FOLDER_OPERATIONS', user.id)
        }
        router.refresh()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "폴더 이름 변경 실패", variant: "destructive" })
    }
  }

  const handleDeleteConfirm = (folder: FolderItem) => {
    setFolderToDelete(folder)
    setIsDeleting(true)
  }

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return

    try {
      const result = await deleteFolder(folderToDelete.id)
      if (result.success) {
        toast({ title: "성공", description: result.message })
        // React Query 캐시 무효화
        if (user) {
          console.log('[FolderList] 폴더 삭제 후 캐시 무효화')
          invalidateByAction('FOLDER_OPERATIONS', user.id)
        }
        // 선택된 폴더가 삭제되면 '모든 레시피'로 이동
        if (optimisticSelectedFolderId === folderToDelete.id) {
          const newSearchParams = new URLSearchParams(searchParams.toString())
          newSearchParams.delete("folder")
          newSearchParams.delete("page")
          router.push(`/recipes?${newSearchParams.toString()}`)
        } else {
          router.refresh()
        }
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      toast({ title: "오류", description: error.message || "폴더 삭제 실패", variant: "destructive" })
    } finally {
      setIsDeleting(false)
      setFolderToDelete(null)
    }
  }

  // 🔧 폴더 선택 핸들러 (로딩 조건 수정)
  const handleSelectFolder = (folderId: string | null) => {
    // 현재 선택된 폴더와 같으면 로딩하지 않음
    if (optimisticSelectedFolderId === folderId) return
    
    setOptimisticSelectedFolderId(folderId)
    setLoadingFolderId(folderId) // 클릭한 폴더ID를 로딩 상태로 설정
    
    const newSearchParams = new URLSearchParams(searchParams.toString())
    if (folderId) {
      newSearchParams.set("folder", folderId)
    } else {
      newSearchParams.delete("folder")
    }
    newSearchParams.delete("page")
    router.push(`/recipes?${newSearchParams.toString()}`)
  }

  // 🆕 편집 모드 토글
  const toggleEditMode = () => {
    setShowEditMode(!showEditMode)
    setEditingFolderId(null) // 편집 중인 폴더 초기화
  }

  return (
    <div className="space-y-4">
      {/* 🆕 폴더 제목과 편집 버튼 */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-800">폴더</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleEditMode}
          className="h-6 w-6"
        >
          {showEditMode ? <X className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex flex-col space-y-1">
        {/* 🔧 "모든 레시피" 버튼 (로딩 조건 수정) */}
        <Button
          variant="ghost"
          className={cn(
            "justify-start mb-2 transition-all duration-200",
            optimisticSelectedFolderId === null ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline",
          )}
          onClick={() => handleSelectFolder(null)}
          disabled={loadingFolderId !== null}
        >
          {loadingFolderId === null ? ( // 🔧 "모든 레시피" 선택 시만 스피너
            <Folder className="mr-2 h-4 w-4" />
          ) : (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          모든 레시피
          {/* 🔧 "로딩 중..." 텍스트 제거 */}
        </Button>
        <Separator className="my-2" />
        
        {folders.map((folder) => (
          <div key={folder.id} className="flex items-center justify-between">
            {editingFolderId === folder.id ? (
              // 편집 중일 때
              <>
                <Input
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  className="flex-grow mr-2 h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveEdit(folder.id)
                    if (e.key === "Escape") setEditingFolderId(null)
                  }}
                />
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(folder.id)} className="h-8 w-8">
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingFolderId(null)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              // 일반 상태일 때
              <>
                {/* 🔧 폴더 버튼 (로딩 조건 수정) */}
                <Button
                  variant="ghost"
                  className={cn(
                    "justify-start flex-grow transition-all duration-200",
                    optimisticSelectedFolderId === folder.id
                      ? "bg-muted hover:bg-muted"
                      : "hover:bg-transparent hover:underline",
                  )}
                  onClick={() => handleSelectFolder(folder.id)}
                  disabled={loadingFolderId !== null}
                >
                  {loadingFolderId === folder.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Folder className="mr-2 h-4 w-4" />
                  )}
                  {folder.name}
                  {/* 🔧 "로딩 중..." 텍스트 제거 */}
                </Button>
                
                {/* 🆕 편집 모드일 때만 편집/삭제 버튼 표시 */}
                {showEditMode && (
                  <div className="flex items-center space-x-1 ml-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleStartEdit(folder)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteConfirm(folder)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-2 mt-4">
        <Input
          placeholder="새 폴더 이름"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          disabled={isCreating}
        />
        <Button onClick={handleCreateFolder} disabled={isCreating}>
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* 🔧 폴더 삭제 확인 AlertDialog - 디자인 통일 */}
      <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
        <DialogContent className="sm:max-w-[425px] p-6 rounded-2xl bg-white shadow-xl border border-gray-100">
          <DialogHeader className="mb-4 text-left w-full">
            <DialogTitle className="text-xl font-semibold text-gray-900">폴더 삭제 확인</DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-2">
              정말로 &quot;{folderToDelete?.name}&quot; 폴더를 삭제하시겠습니까?
              <br />
              폴더 안의 레시피들은 &quot;모든 레시피&quot;로 이동됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 mt-6">
            <Button
              onClick={handleDeleteFolder}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl transition-colors duration-200"
            >
              삭제
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsDeleting(false)}
              className="w-full py-3 px-4 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors duration-200"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}