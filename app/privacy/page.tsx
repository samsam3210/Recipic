import { Header } from "@/components/header"
import { createClient } from "@/lib/supabase/server"

export default async function PrivacyPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <main className="flex-1 py-12 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">개인정보처리방침</h1>

        <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-2">제1조 (수집하는 개인정보 항목)</h2>
            <p>Recipick은 아래와 같은 최소한의 개인정보만을 수집합니다.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Google 계정 이메일 주소 (로그인 및 사용자 식별 목적)</li>
              <li>사용자 이름 또는 프로필 이미지 (선택사항)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제2조 (개인정보 수집 방법)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Google OAuth를 통한 로그인</li>
              <li>서비스 내 입력폼을 통한 사용자 직접 입력</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제3조 (개인정보의 이용 목적)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>로그인 및 사용자 인증</li>
              <li>개인화된 레시피 저장/관리 기능 제공</li>
              <li>고객 지원 응대</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제4조 (개인정보의 보관 및 파기)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>서비스 이용기간 동안 보관되며, 회원 탈퇴 시 즉시 삭제됩니다.</li>
              <li>백업 서버의 경우, 최대 7일 이내 자동 삭제됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제5조 (제3자 제공 및 위탁)</h2>
            <p>동의 없이 개인정보를 외부에 제공하거나 위탁하지 않습니다.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제6조 (이용자의 권리)</h2>
            <p>사용자는 로그인 후 개인정보 열람, 수정, 삭제, 탈퇴가 가능합니다.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제7조 (보호 조치)</h2>
            <p>Supabase 기반 저장, HTTPS 통신, 관리자 권한 제한 등 보안 조치가 적용됩니다.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제8조 (변경 고지)</h2>
            <p>정책 변경 시 서비스 내 공지를 통해 사전 고지합니다.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제9조 (문의처)</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>이메일: help@recipick.app</li>
              <li>개인정보 보호책임자: 김한샘</li>
            </ul>
          </section>
        </div>
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
