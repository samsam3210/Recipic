"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { LoadingOverlay } from "@/components/loading-overlay"
import ErrorPage from "@/components/error-page"

const PENDING_RECIPE_STORAGE_KEY = "recipick_pending_recipe"

export default function Index() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [authError, setAuthError] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // 5초 타임아웃 설정
    const timeoutId = setTimeout(() => {
      console.log("User authentication timeout - 5 seconds elapsed")
      setAuthError(true)
    }, 5000)

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      clearTimeout(timeoutId) // 인증 상태 변경 시 타임아웃 취소
      const currentUser = session?.user || null
      setUser(currentUser)

      if (event === "SIGNED_OUT") {
        localStorage.removeItem(PENDING_RECIPE_STORAGE_KEY)
      }

      if (currentUser && event === "SIGNED_IN") {
        router.replace("/dashboard")
        return
      }
    })

    supabase.auth.getUser().then(({ data: { user: initialUser } }) => {
      clearTimeout(timeoutId) // 사용자 정보 로드 시 타임아웃 취소
      setUser(initialUser)
      if (initialUser) {
        router.replace("/dashboard")
      }
    }).catch((error) => {
      clearTimeout(timeoutId)
      console.error("Error loading user:", error)
      setAuthError(true)
    })

    return () => {
      clearTimeout(timeoutId)
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [toast, router])

  if (user === undefined && !authError) {
    return <LoadingOverlay isLoading={true} />
  }

  if (authError) {
    return <ErrorPage />
  }

  if (user === null) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header user={user} userProfile={null} />
        <main className="flex-1 pt-6 md:pt-8 flex items-center justify-center">
          <HeroSection user={user} />
        </main>
        <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Recipick. All rights reserved.
        </footer>
      </div>
    )
  }

  return null
}
