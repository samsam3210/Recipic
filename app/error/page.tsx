"use client" // Error components must be Client Components

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"

export default function Error({
  error, // Next.js 기본 error prop (클라이언트 컴포넌트에서만 사용 가능)
  reset, // Next.js 기본 reset prop
}: {
  error: (Error & { digest?: string }) | undefined
  reset: () => void
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get("message")
  const errorType = searchParams.get("type") // 오류 유형 파라미터 추가

  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application Error:", error || message)
  }, [error, message])

  let displayMessage = "알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
  let detailedReason = ""

  if (message) {
    displayMessage = decodeURIComponent(message)
    // 특정 오류 유형에 따라 상세 메시지 조정
    if (errorType === "no_subtitles") {
      displayMessage = "이 영상에는 추출 가능한 자막이 없습니다."
      detailedReason = "다른 영상을 시도해 보세요."
    } else if (errorType === "ai_failure") {
      displayMessage = "레시피를 불러오지 못했습니다."
      detailedReason = "AI 분석 중 오류가 발생했거나, 해당 영상에서 분석 가능한 레시피를 찾지 못했습니다."
    } else if (errorType === "incomplete_data") {
      displayMessage = "레시피 추출 또는 영상 정보가 불완전합니다."
      detailedReason = "영상의 내용이 레시피 형식과 맞지 않을 수 있습니다."
    } else if (errorType === "general_error") {
      displayMessage = "레시피 처리 중 오류가 발생했습니다."
      detailedReason = "네트워크 문제 또는 서버 오류일 수 있습니다. 잠시 후 다시 시도해 주세요."
    } else if (errorType === "auth_callback_error") {
      displayMessage = "로그인 처리 중 오류가 발생했습니다."
      detailedReason = displayMessage // Supabase 콜백 오류 메시지를 그대로 사용
    }
  } else if (error?.message) {
    displayMessage = error.message
  }

  const handleGoHome = () => {
    router.push("/")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
      <h1 className="text-4xl font-bold mb-4">오류가 발생했습니다!</h1>
      <p className="text-lg mb-6">{displayMessage}</p>
      {detailedReason && <p className="text-sm text-muted-foreground mb-8">{detailedReason}</p>}
      <div className="flex gap-4">
        <Button
          onClick={
            // Attempt to recover by trying to re-render the segment
            () => reset()
          }
        >
          다시 시도
        </Button>
        <Button onClick={handleGoHome} variant="outline">
          홈으로 돌아가기
        </Button>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        문제가 계속되면{" "}
        <a href="https://vercel.com/help" className="underline">
          Vercel 지원팀
        </a>
        에 문의해주세요.
      </p>
    </div>
  )
}
