import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"

export default async function ExtractRecipePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 이 페이지는 로그인 여부와 관계없이 접근 가능하지만,
  // HeroSection 내부에서 로그인 상태에 따라 동작이 달라집니다.
  // 만약 로그인하지 않은 사용자가 이 페이지에 직접 접근하는 것을 막고 싶다면 redirect("/")를 추가할 수 있습니다.

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <main className="flex-1">
        <HeroSection user={user} />
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
