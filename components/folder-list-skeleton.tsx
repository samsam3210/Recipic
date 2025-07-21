import { Skeleton } from "@/components/ui/skeleton"
import { Folder } from "lucide-react"

export function FolderListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-24 mb-2" /> {/* "폴더" 제목 스켈레톤 */}
      <div className="flex flex-col space-y-1">
        {/* "모든 레시피" 스켈레톤 */}
        <div className="flex items-center space-x-2 py-2 px-3 rounded-md">
          <Folder className="h-4 w-4 text-muted-foreground" />
          <Skeleton className="h-4 w-24" />
        </div>
        {/* 가상의 폴더 아이템 스켈레톤 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-2 py-2 px-3 rounded-md">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <div className="flex items-center space-x-2 mt-4">
        <Skeleton className="h-9 flex-grow" />
        <Skeleton className="h-9 w-9" />
      </div>
    </div>
  )
}
