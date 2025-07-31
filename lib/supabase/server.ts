import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { cache } from "react"

export const createClient = cache(() => {
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          const cookieOptions: any = {
            name,
            value,
            path: "/",
            // 세션 쿠키는 7일간 유지
            ...(name.includes('auth-token') && {
              maxAge: 7 * 24 * 60 * 60, // 7일 (초 단위)
            }),
            // 프로덕션 환경에서만 secure 설정
            secure: process.env.NODE_ENV === "production",
            // SameSite 정책으로 CSRF 보호
            sameSite: "lax",
            // HttpOnly는 auth 토큰에만 적용 (XSS 보호)
            ...(name.includes('auth-token') && { httpOnly: true }),
            ...options,
          }

          cookieStore.set(cookieOptions)
          
          console.log(`[Supabase Server Client] Set cookie: ${name}`, {
            maxAge: name.includes('auth-token') ? '7 days' : options.maxAge,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            httpOnly: name.includes('auth-token')
          })
        } catch (error) {
          console.error("[Supabase Server Client] Error setting cookie:", error)
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({
            name,
            value: "",
            path: "/",
            expires: new Date(0), // 즉시 만료
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            ...options,
          })
          console.log(`[Supabase Server Client] Removed cookie: ${name}`)
        } catch (error) {
          console.error("[Supabase Server Client] Error removing cookie:", error)
        }
      },
    },
  })
})
