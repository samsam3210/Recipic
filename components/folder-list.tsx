"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Folder, Edit, Trash2, Save, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createFolder, updateFolder, deleteFolder } from "@/lib/actions/folder"
import { cn } from "@/lib/utils"
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
  const [loadingFolderId, setLoadingFolderId] = useState<string | null>(null) // 🆕 로딩 상태
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  // 낙관적 UI 업데이트를 위한 상태 추가
  const [optimisticSelectedFolderId, setOptimisticSelectedFolderId] = useState(selectedFolderId)

  // selectedFolderId prop이 변경될 때마다 optimisticSelectedFolderId를 동기화
  useEffect(() => {
    setOptimisticSelectedFolderId(selectedFolderId)
    // 🆕 실제 폴더 변경이 완료되면 로딩 상태 해제
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

  // 🆕 폴더 선택 핸들러 (즉시 로딩 상태 표시)
  const handleSelectFolder = (folderId: string | null) => {
    setOptimisticSelectedFolderId(folderId) // 클릭 즉시 UI 업데이트
    setLoadingFolderId(folderId) // 🆕 로딩 상태 시작
    
    const newSearchParams = new URLSearchParams(searchParams.toString())
    if (folderId) {
      newSearchParams.set("folder", folderId)
    } else {
      newSearchParams.delete("folder")
    }
    newSearchParams.delete("page")
    router.push(`/recipes?${newSearchParams.toString()}`)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">폴더</h3>
      <div className="flex flex-col space-y-1">
        {/* 🆕 "모든 레시피" 버튼 (로딩 상태 포함) */}
        <Button
          variant="ghost"
          className={cn(
            "justify-start mb-2 transition-all duration-200",
            optimisticSelectedFolderId === null ? "bg-muted hover:bg-muted" : "hover:bg-transparent hover:underline",
          )}
          onClick={() => handleSelectFolder(null)}
          disabled={loadingFolderId !== null} // 🆕 로딩 중 클릭 방지
        >
          {loadingFolderId === null ? (
            <Folder className="mr-2 h-4 w-4" />
          ) : (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> // 🆕 스피너 표시
          )}
          모든 레시피
          {loadingFolderId === null && (
            <span className="ml-auto text-xs text-muted-foreground">로딩 중...</span> // 🆕 로딩 텍스트
          )}
        </Button>
        <Separator className="my-2" />
        {folders.map((folder) => (
          <div key={folder.id} className="flex items-center justify-between group">
            {editingFolderId === folder.id ? (
              <Input
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                className="flex-grow mr-2 h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit(folder.id)
                  if (e.key === "Escape") setEditingFolderId(null)
                }}
              />
            ) : (
              // 🆕 폴더 버튼 (로딩 상태 포함)
              <Button
                variant="ghost"
                className={cn(
                  "justify-start flex-grow transition-all duration-200",
                  optimisticSelectedFolderId === folder.id
                    ? "bg-muted hover:bg-muted"
                    : "hover:bg-transparent hover:underline",
                )}
                onClick={() => handleSelectFolder(folder.id)}
                disabled={loadingFolderId !== null} // 🆕 로딩 중 클릭 방지
              >
                {loadingFolderId === folder.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> // 🆕 스피너 표시
                ) : (
                  <Folder className="mr-2 h-4 w-4" />
                )}
                {folder.name}
                {loadingFolderId === folder.id && (
                  <span className="ml-auto text-xs text-blue-500">로딩 중...</span> // 🆕 로딩 텍스트
                )}
              </Button>
            )}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingFolderId === folder.id ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(folder.id)}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingFolderId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="icon" onClick={() => handleStartEdit(folder)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteConfirm(folder)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
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

      {/* 폴더 삭제 확인 AlertDialog */}
      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>폴더 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 &quot;{folderToDelete?.name}&quot; 폴더를 삭제하시겠습니까?
              <br />
              폴더 안의 레시피들은 &quot;모든 레시피&quot;로 이동됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleting(false)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}