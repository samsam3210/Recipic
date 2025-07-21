"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // CardDescription 제거
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Edit, Save, X } from "lucide-react"
import { updateUserName } from "@/lib/actions/user"
import { useRouter } from "next/navigation"
import type { UserProfile } from "@/lib/actions/user"

interface ProfileSettingsFormProps {
  user: User
  userProfile: UserProfile
}

export function ProfileSettingsForm({ user, userProfile }: ProfileSettingsFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(userProfile.nickname || "")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    setEditedName(userProfile.nickname || "")
  }, [userProfile])

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

  return (
    <Card className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-2xl font-bold text-gray-800">프로필</CardTitle>{" "}
        {/* '프로필 정보'를 '프로필'로 변경 */}
        {/* CardDescription 제거 */}
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
      </CardContent>
    </Card>
  )
}
