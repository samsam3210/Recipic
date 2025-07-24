import { NextResponse } from "next/server"

function formatViewCount(count: number): string {
  if (count >= 1_000_000) {
    return (count / 1_000_000).toFixed(1).replace(/\.0$/, '') + '만회'
  } else if (count >= 1_000) {
    return (count / 1_000).toFixed(1).replace(/\.0$/, '') + '천회'
  } else {
    return count + '회'
  }
}

function parseISODuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ""

  const hours = parseInt(match[1] || "0", 10)
  const minutes = parseInt(match[2] || "0", 10)
  const seconds = parseInt(match[3] || "0", 10)

  const secondsPadded = seconds.toString().padStart(2, "0")
  const minutesPadded = minutes.toString().padStart(2, "0")

  if (hours > 0) {
    return `${hours}:${minutesPadded}:${secondsPadded}`
  }
  return `${minutes}:${secondsPadded}`
}

export async function POST(req: Request) {
  const { query } = await req.json()
  const maxResults = 20

  if (!query) {
    return NextResponse.json({ error: "검색 키워드가 필요합니다." }, { status: 400 })
  }

  try {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY
    if (!youtubeApiKey) {
      throw new Error("YOUTUBE_API_KEY is not set in environment variables.")
    }

    // 1. 검색
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

    // 2. 비디오 상세 정보
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",")

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

    // 3. 필터링 + 포맷팅
    const results = videosData.items
      .filter((video: any) => parseInt(video.statistics.viewCount, 10) >= 1000)
      .map((video: any) => {
        const viewCountNum = parseInt(video.statistics.viewCount, 10)
        return {
          videoId: video.id,
          title: video.snippet.title,
          channelName: video.snippet.channelTitle,
          thumbnail:
            video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url,
          description: video.snippet.description,
          viewCount: viewCountNum,
          viewCountFormatted: formatViewCount(viewCountNum),
          duration: video.contentDetails.duration,
          durationFormatted: parseISODuration(video.contentDetails.duration),
          publishedAt: video.snippet.publishedAt,
          youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
        }
      })
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