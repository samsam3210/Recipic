import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getOrCreateUserProfile } from "@/lib/actions/user"
import { CachedSettings } from "@/components/cached-settings"
import { SettingsContent } from "@/components/settings-content"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/")
  }

  // userProfile 변수 정의 및 초기화
  const userProfile = await getOrCreateUserProfile(user)

  return (
    <CachedSettings 
      user={user}
      initialUserProfile={userProfile}
    >
      <SettingsContent user={user} />
    </CachedSettings>
  )
}