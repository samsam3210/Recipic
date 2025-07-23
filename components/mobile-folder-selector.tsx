"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import type { folders as foldersSchema } from "@/lib/db/schema"

interface MobileFolderSelectorProps {
  folders: (typeof foldersSchema.$inferSelect)[]
  selectedFolderId: string | null
}

export function MobileFolderSelector({ folders, selectedFolderId }: MobileFolderSelectorProps) {
  const router = useRouter()

  return (
    <div className="lg:hidden mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">폴더 선택</label>
      <Select 
        value={selectedFolderId || "all"} 
        onValueChange={(value) => {
          const folderId = value === "all" ? null : value;
          const params = new URLSearchParams(window.location.search);
          if (folderId) {
            params.set('folder', folderId);
          } else {
            params.delete('folder');
          }
          router.push(`/recipes?${params.toString()}`);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="폴더를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">모든 레시피</SelectItem>
          {folders.map((folder) => (
            <SelectItem key={folder.id} value={folder.id}>
              {folder.name} ({folder.recipeCount || 0})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}