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

    // --- 1. 두 카테고리(26, 24) 각각 검색 ---
    async function fetchSearchResults(videoCategoryId: string) {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
          new URLSearchParams({
            part: "snippet",
            q: `${query} 요리 레시피`,
            type: "video",
            maxResults: "50",
            order: "relevance",
            videoCategoryId,
            key: youtubeApiKey,
          }).toString()
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(`YouTube 검색 API 오류 (categoryId=${videoCategoryId}): ${JSON.stringify(err)}`)
      }
      const data = await res.json()
      return data.items || []
    }

    const [items26, items24] = await Promise.all([
      fetchSearchResults("26"),
      fetchSearchResults("24"),
    ])

    // --- 2. 두 결과 합치고 중복 videoId 제거 ---
    const allItemsMap = new Map<string, any>()
    for (const item of [...items26, ...items24]) {
      const videoId = item.id.videoId
      if (videoId && !allItemsMap.has(videoId)) {
        allItemsMap.set(videoId, item)
      }
    }
    const uniqueItems = Array.from(allItemsMap.values())

    if (uniqueItems.length === 0) {
      return NextResponse.json({
        results: [],
        message: "검색 결과가 없습니다. 다른 키워드로 시도해보세요.",
      })
    }

    // --- 3. 영상 상세정보 요청 ---
    const videoIds = uniqueItems.map(item => item.id.videoId).join(",")

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

    // --- 4. 필터링 + 포맷팅 ---
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