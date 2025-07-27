"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Edit, Save, X } from "lucide-react"
import { updateUserName, getUserProfile } from "@/lib/actions/user"
import { signOut } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface UserProfile {
  userId: string
  nickname: string
  avatarUrl: string | null
}

interface ProfileSettingsFormProps {
  user: User
  userProfile?: UserProfile // optional로 변경
}

export function ProfileSettingsForm({ user, userProfile: initialProfile }: ProfileSettingsFormProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile || null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(initialProfile?.nickname || "")
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()

  // 초기 프로필이 있으면 즉시 사용
  useEffect(() => {
    if (initialProfile) {
      setUserProfile(initialProfile)
      setEditedName(initialProfile.nickname || "")
    }
  }, [initialProfile])

  // 프로필이 없을 때만 스켈레톤 표시
  if (!userProfile) {
    return (
      <Card className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <CardHeader className="px-0 pt-0 pb-4">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
        </CardHeader>
        <CardContent className="px-0 py-0 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // userProfile이 없으면 에러 상태
  if (!userProfile) {
    return (
      <Card className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-gray-500">프로필 정보를 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  const handleSave = async () => {
    if (!editedName.trim()) {
      toast({
        title: "알림",
        description: "이름을 입력해주세요.",
        variant: "info",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await updateUserName(editedName.trim())
      if (result.success) {
        toast({
          title: "저장 완료",
          description: result.message,
        })
        setIsEditing(false)
        // 로컬 상태 업데이트
        setUserProfile(prev => prev ? { ...prev, nickname: editedName.trim() } : null)
        router.refresh()
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error("[ProfileSettingsForm] Failed to save profile name:", error)
      toast({
        title: "저장 실패",
        description: error.message || "프로필 이름을 저장하는 데 실패했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedName(userProfile.nickname || "")
    setIsEditing(false)
  }

  const handleSignOut = async () => {
    setIsSigningOut(true)
    toast({
      title: "로그아웃 처리 중...",
      description: "잠시만 기다려 주세요.",
      duration: 2000,
    })

    try {
      const serverSignOutResult = await signOut()

      if (serverSignOutResult.success) {
        const { error: clientSignOutError } = await supabase.auth.signOut()

        if (clientSignOutError) {
          console.error("[ProfileSettingsForm] Client-side signOut failed:", clientSignOutError.message)
          toast({
            title: "로그아웃 실패",
            description: clientSignOutError.message || "클라이언트 로그아웃 중 오류가 발생했습니다.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "로그아웃 완료",
            description: serverSignOutResult.message,
          })
          window.location.href = "/"
        }
      } else {
        console.error("[ProfileSettingsForm] Server signOut failed:", serverSignOutResult.message)
        toast({
          title: "로그아웃 실패",
          description: serverSignOutResult.message,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[ProfileSettingsForm] Unexpected error during logout:", error)
      toast({
        title: "오류 발생",
        description: error.message || "로그아웃 중 알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <Card className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-2xl font-bold text-gray-800">프로필</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 mb-1">이름</p>
            {isEditing ? (
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full max-w-md"
                disabled={isSaving}
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900">{userProfile.nickname || "이름 없음"}</p>
            )}
          </div>
          {isEditing ? (
            <div className="flex space-x-2">
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                저장
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm" disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                취소
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              수정
            </Button>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">이메일</p>
          <p className="text-lg font-semibold text-gray-900">{user.email}</p>
        </div>

        {/* 로그아웃 버튼 */}
        <div className="pt-4 border-t border-gray-200">
          <Button 
            onClick={handleSignOut} 
            disabled={isSigningOut || isEditing}
            variant="destructive"
            className="w-full"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그아웃 중...
              </>
            ) : (
              "로그아웃"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}