"use client"

import { FolderList } from "@/components/folder-list"
import type { folders as foldersSchema } from "@/lib/db/schema"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Folder } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface MobileFolderSelectorProps {
  folders: (typeof foldersSchema.$inferSelect)[]
  selectedFolderId: string | null
}

export function MobileFolderSelector({ folders, selectedFolderId }: MobileFolderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-12 px-4"
          >
            <div className="flex items-center gap-2">
              <Folder className="h-4 w-4" />
              <span className="font-medium">폴더 관리</span>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 p-4 border rounded-lg bg-gray-50">
          <FolderList folders={folders} selectedFolderId={selectedFolderId} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}