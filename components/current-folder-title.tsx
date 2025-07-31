"use client"

import { useSearchParams } from "next/navigation"
import type { folders as foldersSchema } from "@/lib/db/schema"

interface CurrentFolderTitleProps {
  folders: (typeof foldersSchema.$inferSelect)[]
  recipeCount?: number
}

export function CurrentFolderTitle({ folders, recipeCount }: CurrentFolderTitleProps) {
  const searchParams = useSearchParams()
  const selectedFolderId = searchParams.get("folder") || null

  const currentFolderName = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.name || "알 수 없는 폴더"
    : "모든 레시피"

  return (
    <h1 className="text-lg font-semibold text-gray-900 mb-4">
      {currentFolderName} {recipeCount !== undefined && <span className="text-gray-500 text-sm">({recipeCount}개)</span>}
    </h1>
  )
}
