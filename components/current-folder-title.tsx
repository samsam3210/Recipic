"use client"

import { useSearchParams } from "next/navigation"
import type { folders as foldersSchema } from "@/lib/db/schema"

interface CurrentFolderTitleProps {
  folders: (typeof foldersSchema.$inferSelect)[]
}

export function CurrentFolderTitle({ folders }: CurrentFolderTitleProps) {
  const searchParams = useSearchParams()
  const selectedFolderId = searchParams.get("folder") || null

  const currentFolderName = selectedFolderId
    ? folders.find((f) => f.id === selectedFolderId)?.name || "알 수 없는 폴더"
    : "모든 레시피"

  return <h1 className="text-lg font-semibold text-gray-900 mb-4">{currentFolderName}</h1>
}
