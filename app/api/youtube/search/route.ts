// app/api/youtube/search/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { query, maxResults = 20 } = await req.json()

  if (!query) {
    return NextResponse.json({ error: "검색 키워드가 필요합니다." }, { status: 400 })
  }

  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      throw new Error("YOUTUBE_API_KEY is not set in environment variables.")
    }

    // 1. Search API 호출 (넉넉하게 3배 요청)
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      new URLSearchParams({
        part: 'snippet',
        q: `${query} 요리 레시피`,
        type: 'video',
        maxResults: (maxResults * 3).toString(), // 필터링 대비 넉넉히 요청
        order: 'relevance',
        key: youtubeApiKey
      }).toString()
    )

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      console.error("[youtube/search] YouTube Search API Error:", errorData)
      return NextResponse.json({ error: "YouTube 검색 API 오류가 발생했습니다." }, { status: 500 })
    }

    const searchData = await searchResponse.json()

    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ 
        results: [], 
        message: "검색 결과가 없습니다. 다른 키워드로 시도해보세요." 
      })
    }

    // 2. 검색 결과에서 videoId만 추출
    const results = searchData.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelName: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      description: item.snippet.description,
      publishedAt: item.snippet.publishedAt,
      youtubeUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }))

    // 3. videos API로 상세정보 조회
    const videoIds = results.map(r => r.videoId).join(',')
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
      new URLSearchParams({
        part: 'contentDetails,statistics',
        id: videoIds,
        key: youtubeApiKey
      }).toString()
    )

    if (!videosResponse.ok) {
      return NextResponse.json({ error: "YouTube videos API 오류" }, { status: 500 })
    }

    const videosData = await videosResponse.json()

    // 4. Map으로 duration, viewCount 매핑
    const videosMap = new Map(
      videosData.items.map((video: any) => [
        video.id,
        {
          duration: video.contentDetails.duration,
          viewCount: parseInt(video.statistics.viewCount)
        }
      ])
    )

    // Helper: ISO duration → mm:ss
    const parseDuration = (duration: string) => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      if (!match) return "0:00"
      const h = parseInt(match[1] || "0", 10)
      const m = parseInt(match[2] || "0", 10)
      const s = parseInt(match[3] || "0", 10)
      return h > 0
        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${m}:${s.toString().padStart(2, '0')}`
    }

    // Helper: 조회수 포맷
    const formatViewCount = (viewCount: number) => {
      if (viewCount >= 1_000_000) return `${(viewCount / 1_000_000).toFixed(1)}M`
      if (viewCount >= 1_000) return `${(viewCount / 1_000).toFixed(1)}K`
      return viewCount.toString()
    }

    // Helper: 업로드 시간 상대 표기
    const formatPublishedTime = (publishedAt: string) => {
      const now = new Date()
      const published = new Date(publishedAt)
      const diffDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return "오늘"
      if (diffDays === 1) return "1일 전"
      if (diffDays < 7) return `${diffDays}일 전`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`
      return `${Math.floor(diffDays / 365)}년 전`
    }

    // 5. 조회수 1000 이상 필터 후 병합
    const filteredResults = results
      .map(result => {
        const videoInfo = videosMap.get(result.videoId)
        if (!videoInfo || videoInfo.viewCount < 1000) return null

        return {
          ...result,
          duration: parseDuration(videoInfo.duration),
          viewCount: formatViewCount(videoInfo.viewCount),
          publishedTime: formatPublishedTime(result.publishedAt)
        }
      })
      .filter(Boolean)

    // 6. 최종 20개만 반환
    const finalResults = filteredResults.slice(0, maxResults)

    return NextResponse.json({
      results: finalResults,
      totalResults: finalResults.length,
      query
    })

  } catch (error) {
    console.error("[youtube/search] Error searching YouTube videos:", error)
    return NextResponse.json({ error: "YouTube 검색 중 오류가 발생했습니다." }, { status: 500 })
  }
}