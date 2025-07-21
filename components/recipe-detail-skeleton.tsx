import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function RecipeDetailSkeleton() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* YouTube Player Skeleton */}
      <div className="sticky top-0 z-30 w-full bg-background shadow-md max-w-3xl mx-auto">
        <Card className="mb-0 rounded-none border-none shadow-none">
          <CardContent className="p-0">
            <div className="aspect-video w-full flex items-center justify-center bg-gray-100">
              <Skeleton className="h-full w-full" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="container mx-auto px-4 max-w-3xl mt-6">
        <div className="max-w-2xl mx-auto px-6 py-8">
          {/* Header Section Skeletons */}
          <div className="mb-8">
            <div className="flex gap-3 mb-4">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-3" />
            <Skeleton className="h-5 w-full mb-4" />
            <Skeleton className="h-5 w-5/6" />
          </div>

          <Skeleton className="h-px w-full mb-8" />

          {/* Ingredients Section Skeletons */}
          <div className="mb-8">
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-5/6" />
          </div>

          <Skeleton className="h-px w-full mb-8" />

          {/* Steps Section Skeletons */}
          <div className="mb-8">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="flex-shrink-0 w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips Section Skeletons (Optional) */}
          <Skeleton className="h-px w-full mb-8" />
          <div className="mb-8">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>

          {/* Personal Notes Section Skeletons */}
          <Skeleton className="h-px w-full mb-8" />
          <div className="mb-8">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-9 w-20 mt-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
