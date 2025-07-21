"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { LoadingOverlay } from "@/components/loading-overlay"

const PENDING_RECIPE_STORAGE_KEY = "recipick_pending_recipe"

export default function Index() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      setUser(initialUser)
      if (initialUser) {
        router.replace("/dashboard")
      }
    })

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe()
      }
    }
  }, [toast, router])

  if (user === undefined) {
    return <LoadingOverlay isLoading={true} />
  }

  if (user === null) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header user={user} userProfile={null} />
        <main className="flex-1 flex items-center justify-center">
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
