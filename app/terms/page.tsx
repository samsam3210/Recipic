import { Header } from "@/components/header"
import { createClient } from "@/lib/supabase/server"

export default async function TermsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen">
      <Header user={user} />
      <main className="flex-1 py-12 px-4 md:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Recipick 이용약관</h1>

        <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none text-gray-700 space-y-6">
          <section>
            <h2 className="text-2xl font-bold mb-2">제1조 (목적)</h2>
            <p>
              본 약관은 Recipick이 제공하는 AI 기반 요리 레시피 관리 서비스의 이용조건 및 절차, 이용자와 Recipick 간의
              권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                <strong>서비스:</strong> 사용자가 YouTube 등의 영상 링크를 입력하면 AI가 레시피 정보를 추출하고, 이를
                저장 및 관리할 수 있도록 지원하는 웹서비스
              </li>
              <li>
                <strong>회원:</strong> Google 로그인 등을 통해 본 서비스에 접속하여 이용하는 개인
              </li>
              <li>
                <strong>콘텐츠:</strong> 사용자가 저장하는 레시피 정보, 개인 메모, 입력 URL 등
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>본 약관은 서비스 화면에 게시하거나 기타 방법으로 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있으며, 변경 시 사전 공지합니다.</li>
              <li>변경 된 약관에 동의하지 않을 경우 회원은 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제4조 (회원 가입 및 관리)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>본 서비스는 Google OAuth 로그인 방식으로만 회원가입이 가능합니다.</li>
              <li>회사는 회원의 정보를 수집·관리하며, 자세한 내용은 개인정보처리방침에 따릅니다.</li>
              <li>회원은 정확하고 최신의 정보를 제공해야 하며, 타인의 정보를 무단으로 사용해서는 안 됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제5조 (서비스 이용)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                회원은 본 서비스를 통해 YouTube 링크를 입력하고, AI 기반 레시피 추출 결과를 열람하고 저장할 수 있습니다.
              </li>
              <li>서비스는 AI 기반 자동화 결과를 제공하며, 일부 정보는 부정확하거나 누락될 수 있습니다.</li>
              <li>
                본 서비스는 콘텐츠 무단 복제·배포, 상업적 이용을 금지하며, 이를 위반할 경우 계정이 제한될 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제6조 (지식재산권)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Recipick 서비스 및 그 결과물의 저작권은 회사 또는 제휴사에 있으며, 무단 복제 및 배포는 금지됩니다.
              </li>
              <li>
                사용자가 저장한 레시피 및 개인 메모는 사용자 본인에게 귀속되며, 회사는 해당 데이터를 내부 개선
                목적으로만 활용할 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제7조 (서비스의 제공 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
              <li>
                불가피한 사유로 인해 서비스의 일부 또는 전부가 변경되거나 중단될 수 있으며, 이 경우 사전 고지합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제8조 (회원의 의무)</h2>
            <p>회원은 다음 행위를 해서는 안 됩니다:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>타인의 정보를 도용하는 행위</li>
              <li>불법적인 YouTube URL 다운로드 또는 추출 행위</li>
              <li>서비스 결과물을 무단 복제하거나 상업적으로 이용하는 행위</li>
              <li>기타 법령 및 공서양속에 위배되는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제9조 (책임 제한)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회사는 AI 추출 결과의 정확성이나 완전성에 대해 보장하지 않습니다.</li>
              <li>
                서비스는 YouTube, Meta 등 외부 플랫폼과의 연동을 기반으로 하며, 외부 서비스의 변경에 따라 기능이 제한될
                수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제10조 (이용 종료 및 탈퇴)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>회원은 언제든지 서비스 내 제공되는 탈퇴 기능을 통해 계정을 삭제할 수 있습니다.</li>
              <li>회원 탈퇴 시 저장된 레시피 및 메모 등 개인 데이터는 복구 불가하게 삭제됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">제11조 (준거법 및 관할)</h2>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                본 약관은 대한민국 법률에 따라 해석되며, 서비스와 관련한 분쟁은 민사소송법상의 관할법원에 제소합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-2">부칙</h2>
            <p>본 약관은 2025년 7월 15일부터 적용됩니다.</p>
          </section>
        </div>
      </main>
      <footer className="border-t bg-background py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Recipick. All rights reserved.
      </footer>
    </div>
  )
}
