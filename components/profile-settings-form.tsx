"use client"

import { useState, useEffect } from "react"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Edit2, Check, X } from "lucide-react"
import { updateUserName, getUserProfile } from "@/lib/actions/user"
import { signOut } from "@/lib/actions/auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useCacheInvalidation } from "@/hooks/use-cache-invalidation"
import { useUser } from "@/contexts/user-context"
import { AccountDeletionModal } from "@/components/account-deletion-modal"

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClient()
  const { invalidateUserProfile } = useCacheInvalidation()
  const { userProfile: contextUserProfile, updateUserProfile: updateContextUserProfile } = useUser()
  
  // UserContext의 프로필을 우선 사용, fallback으로 캐시된 프로필 사용
  const activeUserProfile = contextUserProfile || userProfile

  // 초기 프로필이 있으면 즉시 사용
  useEffect(() => {
    if (initialProfile) {
      setUserProfile(initialProfile)
      setEditedName(initialProfile.nickname || "")
    }
  }, [initialProfile])

  // 프로필이 없을 때만 스켈레톤 표시  
  if (!activeUserProfile) {
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
        // UserContext도 동기화
        updateContextUserProfile({ nickname: editedName.trim() })
        // React Query 캐시 무효화 (대시보드 홈화면 갱신)
        invalidateUserProfile(user.id)
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
    setEditedName(activeUserProfile.nickname || "")
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
      // 1. 클라이언트 세션 삭제 (세션 만료 상태여도 로컬 토큰 정리)
      const { error: clientSignOutError } = await supabase.auth.signOut()
      
      if (clientSignOutError) {
        console.warn("[ProfileSettingsForm] Client signOut warning (but continuing):", clientSignOutError.message)
      }

      // 2. 서버 캐시 정리 (항상 성공)
      await signOut()

      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다.",
      })
      
      // 3. 홈으로 리다이렉트
      window.location.href = "/"
      
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

  const handleAccountDeletion = async () => {
    try {
      const response = await fetch('/api/users/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "계정 삭제 완료",
          description: result.message,
        })
        // 홈페이지로 리다이렉트
        window.location.href = '/'
      } else {
        throw new Error(result.message)
      }
    } catch (error: any) {
      console.error('[ProfileSettingsForm] Account deletion failed:', error)
      toast({
        title: "계정 삭제 실패",
        description: error.message || "계정을 삭제하는 데 실패했습니다.",
        variant: "destructive",
      })
      throw error // Modal에서 로딩 상태 해제를 위해 에러 재발생
    } finally {
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <Card className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <CardContent className="px-0 py-0 space-y-6">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">이름</p>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="flex-1"
                    disabled={isSaving}
                  />
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving} 
                    size="icon" 
                    variant="outline"
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button onClick={handleCancel} variant="ghost" size="icon" disabled={isSaving}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-900 flex-1">
                    {activeUserProfile.nickname || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "이름 없음"}
                  </p>
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    size="icon" 
                    variant="outline"
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">이메일</p>
          <p className="text-lg font-semibold text-gray-900">{user.email}</p>
        </div>

        {/* 로그아웃 및 계정 삭제 버튼 */}
        <div className="pt-4 border-t border-gray-200 space-y-3">
          <Button 
            onClick={handleSignOut} 
            disabled={isSigningOut || isEditing}
            variant="outline"
            className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
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
          
          <Button 
            onClick={() => setIsDeleteModalOpen(true)} 
            disabled={isSigningOut || isEditing}
            variant="outline"
            className="w-full text-gray-600 border-gray-300 hover:bg-gray-50"
          >
            탈퇴하기
          </Button>
        </div>

        {/* 계정 삭제 모달 */}
        <AccountDeletionModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          userEmail={user.email || ""}
          onConfirm={handleAccountDeletion}
        />
      </CardContent>
    </Card>
  )
}