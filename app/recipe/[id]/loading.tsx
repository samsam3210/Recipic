import { Header } from "@/components/header"
import { RecipeDetailSkeleton } from "@/components/recipe-detail-skeleton"

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 로딩 중에도 헤더는 항상 표시되어야 하므로, 여기에 포함합니다. */}
      {/* user와 userProfile은 서버 컴포넌트에서만 접근 가능하므로, 여기서는 null 또는 undefined로 처리합니다. */}
      <Header user={null} userProfile={null} hideAuthButton={true} />
      <main className="flex-1">
        <RecipeDetailSkeleton />
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
