import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { query } = await req.json()
  const maxResults = 20 // 최종 반환 개수

  if (!query) {
    return NextResponse.json({ error: "검색 키워드가 필요합니다." }, { status: 400 })
  }

  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      throw new Error("YOUTUBE_API_KEY is not set in environment variables.")
    }

    // 1. YouTube Search API: 최대 50개 불러오기
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
        new URLSearchParams({
          part: "snippet",
          q: `${query} 요리 레시피`,
          type: "video",
          maxResults: "50",
          order: "relevance",
          videoCategoryId: "26",
          key: youtubeApiKey,
        }).toString()
    )

    if (!searchResponse.ok) {
      const errorData = await searchResponse.json()
      console.error("[youtube/search] Search API Error:", errorData)
      return NextResponse.json({ error: "YouTube 검색 API 오류" }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({
        results: [],
        message: "검색 결과가 없습니다. 다른 키워드로 시도해보세요.",
      })
    }

    // videoId 배열 생성
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")

    // 2. Videos API: 상세 정보(조회수 포함) 조회
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?` +
        new URLSearchParams({
          part: "contentDetails,statistics,snippet",
          id: videoIds,
          key: youtubeApiKey,
        }).toString()
    )

    if (!videosResponse.ok) {
      const errorData = await videosResponse.json()
      console.error("[youtube/search] Videos API Error:", errorData)
      return NextResponse.json({ error: "YouTube Videos API 오류" }, { status: 500 })
    }

    const videosData = await videosResponse.json()

    // 3. 조회수 1,000 이상 필터링 및 데이터 매핑
    const results = videosData.items
      .filter((video: any) => parseInt(video.statistics.viewCount, 10) >= 1000)
      .map((video: any) => ({
        videoId: video.id,
        title: video.snippet.title,
        channelName: video.snippet.channelTitle,
        thumbnail:
          video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
        description: video.snippet.description,
        viewCount: video.statistics.viewCount,
        duration: video.contentDetails.duration,
        publishedAt: video.snippet.publishedAt,
        youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      }))
      .slice(0, maxResults)

    return NextResponse.json({
      results,
      totalResults: results.length,
      query,
    })
  } catch (error) {
    console.error("[youtube/search] Error searching YouTube videos:", error)
    return NextResponse.json(
      { error: "YouTube 검색 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}