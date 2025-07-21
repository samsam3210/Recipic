import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { cache } from "react"

export const createClient = cache(() => {
  const cookieStore = cookies()

  // NEXT_PUBLIC_BASE_URL에서 쿠키 도메인을 동적으로 추출
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  let cookieDomain: string | undefined

  if (baseUrl) {
    try {
      const url = new URL(baseUrl)
      // Vercel 배포 환경에서는 .vercel.app 도메인을 사용하므로,
      // 서브도메인까지 포함하는 hostname을 그대로 사용합니다.
      cookieDomain = url.hostname
      console.log(`[Supabase Server Client] Derived cookie domain: ${cookieDomain}`)
    } catch (e) {
      console.error("[Supabase Server Client] Invalid NEXT_PUBLIC_BASE_URL for cookie domain derivation:", e)
    }
  } else {
    console.warn("[Supabase Server Client] NEXT_PUBLIC_BASE_URL is not set. Cookie domain might not be explicitly set.")
  }

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value,
            ...options,
            // 명시적으로 도메인 설정 (있는 경우)
            ...(cookieDomain && { domain: cookieDomain }),
            // 프로덕션 환경에서는 항상 secure: true
            secure: process.env.NODE_ENV === "production" || options.secure,
            // SameSite 정책 설정 (기본값 Lax, 필요시 None으로 변경 가능하나 보안 고려)
            sameSite: options.sameSite || "Lax",
          })
        } catch (error) {
          // The `cookies().set()` method can only be called from a Server Component or Server Action.
          // This error can be ignored if you are processing a form submission with `redirect()` enabled
          console.error("[Supabase Server Client] Error setting cookie:", error)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: "",
            ...options,
            expires: new Date(0), // 즉시 만료
            ...(cookieDomain && { domain: cookieDomain }),
            secure: process.env.NODE_ENV === "production" || options.secure,
            sameSite: options.sameSite || "Lax",
          })
        } catch (error) {
          // The `cookies().set()` method can only be called from a Server Component or Server Action.
          // This error can be ignored if you are processing a form submission with `redirect()` enabled
          console.error("[Supabase Server Client] Error removing cookie:", error)
        }
      },
    },
  })
})

// getSupabaseServerClient export 추가
export const getSupabaseServerClient = createClient
