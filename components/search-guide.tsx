export function SearchGuide() {
    return (
      <div className="max-w-2xl mx-auto mb-8">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            💡 YouTube 요리 영상 URL을 입력하면 AI가 자동으로 레시피를 추출해드려요
          </p>
          <p className="text-xs text-gray-500 text-center mt-2">
            예시: youtube.com/watch?v=... 또는 youtu.be/...
          </p>
        </div>
      </div>
    )
  }