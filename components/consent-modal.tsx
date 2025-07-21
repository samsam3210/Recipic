"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { signInWithGoogle } from "@/lib/actions/auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface ConsentModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ConsentModal({ isOpen, onClose }: ConsentModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true)
    toast({
      title: "로그인 처리 중...",
      description: "Google 로그인 페이지로 이동합니다.",
      duration: 2000,
    })

    try {
      const result = await signInWithGoogle()
      if (result.success && typeof result.url === "string" && result.url.startsWith("http")) {
        router.push(result.url)
      } else {
        const errorMessage = result.message || "Google 로그인 시작 중 알 수 없는 오류가 발생했습니다."
        toast({
          title: "로그인 실패",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "오류 발생",
        description: error.message || "Google 로그인 중 알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSigningIn(false)
      onClose() // 모달 닫기
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100vw-2rem)] w-full sm:max-w-[425px] mx-auto p-4 sm:p-6 flex flex-col items-center">
        {/* DialogContent는 전체 콘텐츠를 중앙 정렬합니다. */}
        <DialogHeader className="mb-6 text-center w-full">
          {" "}
          {/* text-center와 w-full 추가 */}
          <DialogTitle className="text-2xl sm:text-3xl font-bold text-gray-900">Recipick</DialogTitle>
          <DialogDescription className="text-base sm:text-lg text-gray-600 mt-2 text-center">
            <span className="block sm:inline">5초 만에 로그인하고</span>
            <br className="hidden sm:block" />
            <span className="block sm:inline">레시피를 편리하게 관리해보세요!</span>
          </DialogDescription>
        </DialogHeader>
        

        <div className="flex justify-center mb-4 w-full">
          {" "}
          {/* 버튼 컨테이너를 중앙 정렬합니다. */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full max-w-xs py-3 text-base sm:text-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          >
            {isSigningIn ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                로그인 중...
              </>
            ) : (
              "Google로 시작하기"
            )}
          </Button>
        </div>

        <DialogFooter className="flex flex-col items-center mt-2 w-full">
          {" "}
          {/* Footer 콘텐츠를 세로로 쌓고 중앙 정렬합니다. w-full 추가 */}
          <p className="text-xs sm:text-sm text-muted-foreground mb-4 text-center w-full px-2">
            로그인하면 하단 정책에 모두 동의한 것으로 간주합니다.
          </p>
          <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0 text-xs sm:text-sm justify-center w-full">
            <Link href="/terms" className="hover:underline text-center" onClick={onClose}>
              이용약관
            </Link>
            <Link href="/privacy" className="hover:underline text-center" onClick={onClose}>
              개인정보처리방침
            </Link>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
