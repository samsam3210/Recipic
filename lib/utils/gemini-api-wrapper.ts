/**
 * Google Gemini AI API 래퍼 함수 (API 키 로테이션 및 장애 조치 포함)
 */

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { getNextKey, markKeyAsFailed, isQuotaExceededError } from './api-key-rotation'

/**
 * Gemini API 호출 시 발생할 수 있는 에러 타입
 */
interface GeminiApiError extends Error {
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
  maxRetries: 2, // Gemini는 응답 시간이 길어서 재시도 횟수를 줄임
  delayMs: 2000,
  backoffMultiplier: 1.5
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Gemini API를 사용한 텍스트 생성 (레시피 추출용)
 */
export async function generateRecipeWithGemini(
  structuredTranscript: { text: string; offset: number }[],
  videoDescription: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<string> {
  let lastError: GeminiApiError | null = null
  let currentDelay = config.delayMs
  
  // 프롬프트 구성
  const transcriptForPrompt = structuredTranscript
    .map((item) => `[${item.offset}s] ${item.text}`)
    .join("\n")

  const truncatedVideoDescription = videoDescription ? videoDescription.substring(0, 1500) : "영상 설명란이 없습니다."
  if (videoDescription && videoDescription.length > 1500) {
    console.warn("[GeminiAPI] videoDescription was truncated to 1500 characters.")
  }

  const prompt = `다음은 유튜브 요리 영상의 자막 텍스트와 영상 설명란 정보입니다.
자막 텍스트 각 줄은 "[시간(초)s] 텍스트" 형식으로, 해당 텍스트가 영상에서 시작되는 시간을 나타냅니다.
영상 설명란은 영상 제작자가 제공한 추가 정보입니다.

**지시사항:**
1.  **재료 및 조리 단계 추출**: 영상 설명란에 재료 목록이나 조리 순서가 명확하게 정리되어 있다면, 해당 정보를 **우선적으로** 사용하여 재료와 조리 단계를 추출하세요. 자막 정보는 보조적으로 활용하여 누락된 세부 사항을 보완하거나, 설명란에 없는 정보를 추가하는 데 사용하세요.
2.  **재료 양 정보**: 재료의 양 정보는 영상이나 설명에서 언급된 내용을 최대한 상세하게 추출하되, 명확한 수치나 단위가 없더라도 '약간', '적당량', '조금', '한 줌'과 같은 양적 표현이 있다면 이를 \`quantity\` 필드에 문자열로 그대로 기입하세요. '토막', '손질된', '다진 것' 등은 양 정보가 아닌 상태 정보이므로 \`notes\` 필드에 기입하세요. 양 정보가 전혀 없는 경우 \`quantity\` 필드를 빈 문자열(\"\")로 기입하세요.
3.  **조리 단계별 사용 재료**: 각 조리 단계의 \`ingredientsUsed\` 필드에는 해당 단계에서 **새롭게 투입되거나 사용이 시작되는** 재료만 포함해야 하며, 각 재료는 이름과 함께 **정량 정보**를 명확히 포함해야 합니다 (예: '고춧가루 0.5큰술', '다진 마늘 1큰술'). 재료 이름 뒤에 공백 없이 정량 정보를 붙여주세요. 이미 이전 단계에서 투입된 재료는 다시 명시하지 않습니다. 해당 단계에서 새롭게 추가되는 재료가 없으면 빈 배열로 기입하세요.
4.  **youtubeTimestampSecond**: 각 조리 단계의 'youtubeTimestampSecond'는 해당 단계의 설명이 영상에서 시작되는 정확한 초를 나타내야 합니다. 이는 자막의 시간 정보를 기반으로 추출해야 합니다.
5.  **누락된 레시피**: 만약 레시피를 찾을 수 없다면, \`recipeName\`을 \`null\`로, \`noRecipeFoundMessage\`에 적절한 안내 문구를 넣어주세요.

--- 영상 설명란 시작 ---
${truncatedVideoDescription}
--- 영상 설명란 끝 ---

--- 자막 텍스트 시작 ---
${transcriptForPrompt}
--- 자막 텍스트 끝 ---

결과는 아래 JSON 스키마를 따릅니다:
\`\`\`json
{
  \"recipeName\": \"string | null\",
  \"noRecipeFoundMessage\": \"string | null\",
  \"summary\": \"string\",
  \"difficulty\": \"string\",
  \"cookingTimeMinutes\": \"number\",
  \"ingredients\": [
    {
      \"name\": \"string\",
      \"quantity\": \"string\",
      \"unit\": \"string | null\",
      \"notes\": \"string\"
    }
  ],
  \"steps\": [
    {
      \"stepNumber\": \"number\",
      \"description\": \"string\",
      \"notes\": \"string\",
      \"ingredientsUsed\": \"array\",
      \"youtubeTimestampSecond\": \"number\"
    }
  ],
  \"tips\": [
    {
      \"title\": \"string\",
      \"description\": \"string\"
    }
  ]
}
\`\`\`
`

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const apiKey = getNextKey('gemini')
    
    if (!apiKey) {
      throw new Error('No Gemini API keys available. Please check GEMINI_API_KEYS environment variable.')
    }
    
    try {
      console.log(`[GeminiAPI] Generating recipe (attempt ${attempt + 1}/${config.maxRetries + 1})`)
      
      // AI SDK를 사용한 텍스트 생성 (API 키를 환경변수로 설정)
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey
      
      const { text } = await generateText({
        model: google("gemini-2.0-flash-lite"),
        system:
          "You are an expert AI for extracting cooking recipes from YouTube video transcripts and descriptions into a precise JSON format. Focus solely on recipe details. If information is missing, use `null` or empty arrays, and provide a `noRecipeFoundMessage`. Crucially, accurately extract `youtubeTimestampSecond` for each step based on subtitle timings.",
        prompt: prompt,
      })
      
      // 원래 키 복원
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey
      
      console.log(`[GeminiAPI] Successfully generated recipe`)
      
      // JSON 파싱 검증
      try {
        let parsedText = text
        if (parsedText.startsWith("```json")) {
          parsedText = parsedText.substring("```json".length, parsedText.lastIndexOf("```")).trim()
        }
        JSON.parse(parsedText) // 파싱 검증만
      } catch (parseError) {
        console.error("[GeminiAPI] Failed to parse Gemini response for validation:", parseError)
        throw new Error(`Invalid JSON response from Gemini: ${parseError}`)
      }
      
      return text
      
    } catch (error: any) {
      lastError = error
      
      // 원래 키 복원
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      
      console.error(`[GeminiAPI] Error on attempt ${attempt + 1}:`, {
        error: error.message,
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      })
      
      // 쿼터 초과나 과부하 에러인 경우 해당 키를 실패 목록에 추가
      if (isQuotaExceededError(error)) {
        console.warn(`[GeminiAPI] Quota/Overload error detected, marking key as failed`)
        markKeyAsFailed('gemini', apiKey, error)
      }
      
      // 마지막 시도가 아니면 재시도
      if (attempt < config.maxRetries) {
        console.log(`[GeminiAPI] Retrying in ${currentDelay}ms...`)
        await delay(currentDelay)
        currentDelay *= config.backoffMultiplier
      }
    }
  }
  
  // 모든 재시도 실패
  throw new Error(
    `Gemini API call failed after ${config.maxRetries + 1} attempts. Last error: ${lastError?.message}`
  )
}

/**
 * 범용 Gemini API 텍스트 생성 함수
 */
export async function generateTextWithGemini(
  prompt: string,
  systemPrompt?: string,
  model: string = "gemini-2.0-flash-lite",
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<string> {
  let lastError: GeminiApiError | null = null
  let currentDelay = config.delayMs
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const apiKey = getNextKey('gemini')
    
    if (!apiKey) {
      throw new Error('No Gemini API keys available. Please check GEMINI_API_KEYS environment variable.')
    }
    
    try {
      console.log(`[GeminiAPI] Generating text (attempt ${attempt + 1}/${config.maxRetries + 1})`)
      
      // AI SDK를 사용한 텍스트 생성 (API 키를 환경변수로 설정)
      const originalKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey
      
      const { text } = await generateText({
        model: google(model),
        system: systemPrompt,
        prompt: prompt,
      })
      
      // 원래 키 복원
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalKey
      
      console.log(`[GeminiAPI] Successfully generated text`)
      return text
      
    } catch (error: any) {
      lastError = error
      
      // 원래 키 복원
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      
      console.error(`[GeminiAPI] Error on attempt ${attempt + 1}:`, {
        error: error.message,
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      })
      
      // 쿼터 초과나 과부하 에러인 경우 해당 키를 실패 목록에 추가
      if (isQuotaExceededError(error)) {
        console.warn(`[GeminiAPI] Quota/Overload error detected, marking key as failed`)
        markKeyAsFailed('gemini', apiKey, error)
      }
      
      // 마지막 시도가 아니면 재시도
      if (attempt < config.maxRetries) {
        console.log(`[GeminiAPI] Retrying in ${currentDelay}ms...`)
        await delay(currentDelay)
        currentDelay *= config.backoffMultiplier
      }
    }
  }
  
  // 모든 재시도 실패
  throw new Error(
    `Gemini API call failed after ${config.maxRetries + 1} attempts. Last error: ${lastError?.message}`
  )
}

/**
 * 현재 사용 중인 API 키 통계 (디버깅용)
 */
export { getKeyStatistics, resetFailedKeys } from './api-key-rotation'