import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return document.cookie
            .split("; ")
            .find((row) => row.startsWith(`${name}=`))
            ?.split("=")[1]
        },
        set(name: string, value: string, options: any) {
          let cookieString = `${name}=${value}`
          
          // 세션 쿠키가 7일간 유지되도록 설정
          if (name.includes('auth-token')) {
            const maxAge = 7 * 24 * 60 * 60 // 7일 (초 단위)
            cookieString += `; Max-Age=${maxAge}`
            cookieString += `; Path=/`
            
            // HTTPS 환경에서만 Secure 플래그 추가
            if (window.location.protocol === 'https:') {
              cookieString += `; Secure`
            }
            
            // SameSite 설정으로 CSRF 보호
            cookieString += `; SameSite=Lax`
          } else {
            // 다른 쿠키들은 기본 옵션 사용
            if (options?.maxAge) cookieString += `; Max-Age=${options.maxAge}`
            if (options?.path) cookieString += `; Path=${options.path}`
            if (options?.secure) cookieString += `; Secure`
            if (options?.sameSite) cookieString += `; SameSite=${options.sameSite}`
          }
          
          document.cookie = cookieString
          console.log(`[Supabase Client] Set cookie: ${name}, options:`, { 
            maxAge: name.includes('auth-token') ? '7 days' : options?.maxAge,
            secure: window.location.protocol === 'https:',
            sameSite: 'Lax'
          })
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; Max-Age=0; Path=/`
          console.log(`[Supabase Client] Removed cookie: ${name}`)
        },
      },
    }
  )
}
