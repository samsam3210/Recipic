import { Skeleton } from "@/components/ui/skeleton"

export function RecipeCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 border border-gray-100 p-4 relative">
      {/* 썸네일 - 상단 전체 너비 */}
      <div className="relative w-full mb-3">
        <div className="relative w-full aspect-video rounded-xl overflow-hidden">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
      
      {/* 콘텐츠 정보 */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-3" />
        
        {/* 난이도와 조리시간 */}
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
        
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  )
}
