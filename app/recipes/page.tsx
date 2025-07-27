"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CachedRecipes } from "@/components/cached-recipes"
import { RecipesContent } from "@/components/recipes-content"
import { useUser } from "@/contexts/user-context"

export default function RecipesPage() {
  const { user, isLoading } = useUser()
  const router = useRouter()
  const searchParams = useSearchParams()

  const selectedFolderId = searchParams.get("folder")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const limit = 6

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return null // UserProvider가 로딩 중
  }

  if (!user) {
    return null // 리다이렉트 중
  }

  return (
    <CachedRecipes 
      user={user}
      selectedFolderId={selectedFolderId}
      initialFolders={[]}
      initialUserProfile={null}
    >
      <RecipesContent 
        userId={user.id}
        selectedFolderId={selectedFolderId}
        page={page}
        limit={limit}
      />
    </CachedRecipes>
  )
}