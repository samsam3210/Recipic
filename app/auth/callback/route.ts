import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  console.log("[Auth Callback Route] GET request received.")
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  console.log(`[Auth Callback Route] Request URL: ${requestUrl.toString()}`)
  console.log(`[Auth Callback Route] Extracted code: ${code ? "Exists" : "Does not exist"}`)

  if (code) {
    const cookieStore = cookies()
    const supabase = createClient()

    console.log("[Auth Callback Route] Attempting to exchange code for session...")
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      // 오류 객체의 모든 정보를 로그에 출력하여 상세 원인 파악
      console.error("[Auth Callback Route] Error exchanging code for session:", JSON.stringify(error, null, 2))

      let detailedErrorMessage = "Supabase 세션 교환 실패 (상세 오류 없음)"
      if (error instanceof Error) {
        detailedErrorMessage = error.message
      } else if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as any).message === "string"
      ) {
        detailedErrorMessage = (error as any).message
      } else {
        detailedErrorMessage = JSON.stringify(error) // 예상치 못한 형태의 오류 객체 처리
      }

      const encodedErrorMessage = encodeURIComponent(detailedErrorMessage)
      console.log(
        `[Auth Callback Route] Redirecting to error page: ${requestUrl.origin}/error?message=${encodedErrorMessage}`,
      )
      return NextResponse.redirect(`${requestUrl.origin}/error?message=${encodedErrorMessage}`)
    } else {
      console.log("[Auth Callback Route] Successfully exchanged code for session. User ID:", data.user?.id)
      console.log(`[Auth Callback Route] Redirecting to origin: ${requestUrl.origin}`)
      return NextResponse.redirect(requestUrl.origin)
    }
  }

  console.warn("[Auth Callback Route] No code found in URL search params. Redirecting to error page.")
  const errorMessage = encodeURIComponent("인증 코드가 누락되었습니다.")
  return NextResponse.redirect(`${requestUrl.origin}/error?message=${errorMessage}`)
}
