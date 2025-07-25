/**
 * YouTube Data API v3 래퍼 함수 (API 키 로테이션 및 장애 조치 포함)
 */

import { getNextKey, markKeyAsFailed, isQuotaExceededError } from './api-key-rotation'

/**
 * YouTube API 호출 시 발생할 수 있는 에러 타입
 */
interface YouTubeApiError extends Error {
  status?: number
  code?: string
  details?: any
}

/**
 * 재시도 설정
 */
interface RetryConfig {
  maxRetries: number
  delayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  delayMs: 1000,
  backoffMultiplier: 2
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * YouTube Data API 호출 래퍼 함수
 */
async function callYouTubeAPI(
  endpoint: string,
  params: Record<string, string>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<any> {
  let lastError: YouTubeApiError | null = null
  let currentDelay = config.delayMs
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const apiKey = getNextKey('youtube')
    
    if (!apiKey) {
      throw new Error('No YouTube API keys available. Please check YOUTUBE_API_KEYS environment variable.')
    }
    
    try {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
      
      // API 키와 파라미터 추가
      const searchParams = new URLSearchParams({
        ...params,
        key: apiKey
      })
      
      url.search = searchParams.toString()
      
      console.log(`[YouTubeAPI] Calling ${endpoint} (attempt ${attempt + 1}/${config.maxRetries + 1})`)
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        const error: YouTubeApiError = new Error(
          errorData.error?.message || `YouTube API error: ${response.status}`
        )
        error.status = response.status
        error.code = errorData.error?.code
        error.details = errorData
        
        throw error
      }
      
      const data = await response.json()
      console.log(`[YouTubeAPI] Successfully called ${endpoint}`)
      
      return data
      
    } catch (error: any) {
      lastError = error
      
      console.error(`[YouTubeAPI] Error on attempt ${attempt + 1}:`, {
        endpoint,
        error: error.message,
        status: error.status,
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      })
      
      // 쿼터 초과나 rate limit 에러인 경우 해당 키를 실패 목록에 추가
      if (isQuotaExceededError(error) || error.status === 403 || error.status === 429) {
        console.warn(`[YouTubeAPI] Quota/Rate limit error detected, marking key as failed`)
        markKeyAsFailed('youtube', apiKey, error)
      }
      
      // 마지막 시도가 아니면 재시도
      if (attempt < config.maxRetries) {
        console.log(`[YouTubeAPI] Retrying in ${currentDelay}ms...`)
        await delay(currentDelay)
        currentDelay *= config.backoffMultiplier
      }
    }
  }
  
  // 모든 재시도 실패
  throw new Error(
    `YouTube API call failed after ${config.maxRetries + 1} attempts. Last error: ${lastError?.message}`
  )
}

/**
 * YouTube 비디오 세부 정보 조회
 */
export async function getVideoDetails(videoId: string): Promise<any> {
  return callYouTubeAPI('videos', {
    part: 'snippet,contentDetails,statistics',
    id: videoId
  })
}

/**
 * YouTube 비디오 여러 개 세부 정보 조회
 */
export async function getMultipleVideoDetails(videoIds: string[]): Promise<any> {
  return callYouTubeAPI('videos', {
    part: 'snippet,contentDetails,statistics',
    id: videoIds.join(',')
  })
}

/**
 * YouTube 검색
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 50,
  options: {
    type?: string
    order?: string
    videoCategoryId?: string
    channelId?: string
    publishedAfter?: string
    publishedBefore?: string
  } = {}
): Promise<any> {
  const params: Record<string, string> = {
    part: 'snippet',
    q: query,
    type: options.type || 'video',
    maxResults: maxResults.toString(),
    order: options.order || 'relevance'
  }
  
  // 선택적 파라미터들 추가
  if (options.videoCategoryId) params.videoCategoryId = options.videoCategoryId
  if (options.channelId) params.channelId = options.channelId
  if (options.publishedAfter) params.publishedAfter = options.publishedAfter
  if (options.publishedBefore) params.publishedBefore = options.publishedBefore
  
  return callYouTubeAPI('search', params)
}

/**
 * YouTube 채널 정보 조회
 */
export async function getChannelDetails(channelId: string): Promise<any> {
  return callYouTubeAPI('channels', {
    part: 'snippet,statistics',
    id: channelId
  })
}

/**
 * 현재 사용 중인 API 키 통계 (디버깅용)
 */
export { getKeyStatistics, resetFailedKeys } from './api-key-rotation'