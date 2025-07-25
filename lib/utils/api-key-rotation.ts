/**
 * API 키 로테이션 및 장애 조치 유틸리티
 */

interface ApiKeyRotationState {
  youtube: {
    keys: string[]
    currentIndex: number
    failedKeys: Set<string>
    lastUsed: Date
  }
  gemini: {
    keys: string[]
    currentIndex: number
    failedKeys: Set<string>
    lastUsed: Date
  }
}

// 로테이션 상태를 메모리에 저장 (서버리스 환경에서는 각 인스턴스별로 독립적)
const rotationState: ApiKeyRotationState = {
  youtube: {
    keys: [],
    currentIndex: 0,
    failedKeys: new Set(),
    lastUsed: new Date()
  },
  gemini: {
    keys: [],
    currentIndex: 0,
    failedKeys: new Set(),
    lastUsed: new Date()
  }
}

/**
 * 환경변수에서 쉼표로 구분된 키들을 배열로 파싱
 */
function parseApiKeys(envValue: string | undefined): string[] {
  if (!envValue) return []
  return envValue.split(',').map(key => key.trim()).filter(key => key.length > 0)
}

/**
 * API 키 초기화 (환경변수에서 로드)
 */
function initializeKeys() {
  if (rotationState.youtube.keys.length === 0) {
    rotationState.youtube.keys = parseApiKeys(process.env.YOUTUBE_API_KEYS || process.env.YOUTUBE_API_KEY)
  }
  
  if (rotationState.gemini.keys.length === 0) {
    rotationState.gemini.keys = parseApiKeys(process.env.GEMINI_API_KEYS || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
  }
}

/**
 * 로테이션 방식 설정
 * SEQUENTIAL: 순차적으로 키 사용
 * RANDOM: 랜덤하게 키 선택
 * ROUND_ROBIN: 라운드 로빈 방식
 */
type RotationStrategy = 'SEQUENTIAL' | 'RANDOM' | 'ROUND_ROBIN'

const ROTATION_STRATEGY: RotationStrategy = (process.env.API_KEY_ROTATION_STRATEGY as RotationStrategy) || 'ROUND_ROBIN'

/**
 * 다음 API 키 선택
 */
function getNextKey(type: 'youtube' | 'gemini'): string | null {
  initializeKeys()
  
  const state = rotationState[type]
  
  if (state.keys.length === 0) {
    console.error(`[ApiKeyRotation] No API keys available for ${type}`)
    return null
  }
  
  // 실패한 키들을 제외한 사용 가능한 키들
  const availableKeys = state.keys.filter(key => !state.failedKeys.has(key))
  
  if (availableKeys.length === 0) {
    console.warn(`[ApiKeyRotation] All ${type} keys have failed, resetting failed keys`)
    state.failedKeys.clear()
    return state.keys[0]
  }
  
  let selectedKey: string
  
  switch (ROTATION_STRATEGY) {
    case 'RANDOM':
      selectedKey = availableKeys[Math.floor(Math.random() * availableKeys.length)]
      break
      
    case 'SEQUENTIAL':
      selectedKey = availableKeys[0]
      break
      
    case 'ROUND_ROBIN':
    default:
      // 현재 인덱스가 사용 가능한 키 범위를 벗어나면 0으로 리셋
      if (state.currentIndex >= availableKeys.length) {
        state.currentIndex = 0
      }
      selectedKey = availableKeys[state.currentIndex]
      state.currentIndex = (state.currentIndex + 1) % availableKeys.length
      break
  }
  
  state.lastUsed = new Date()
  
  console.log(`[ApiKeyRotation] Using ${type} key: ${selectedKey.substring(0, 8)}... (strategy: ${ROTATION_STRATEGY})`)
  
  return selectedKey
}

/**
 * API 키를 실패한 키 목록에 추가
 */
function markKeyAsFailed(type: 'youtube' | 'gemini', apiKey: string, error: any) {
  const state = rotationState[type]
  state.failedKeys.add(apiKey)
  
  console.error(`[ApiKeyRotation] Marked ${type} key as failed: ${apiKey.substring(0, 8)}...`, {
    error: error.message || error,
    failedKeysCount: state.failedKeys.size,
    totalKeysCount: state.keys.length
  })
  
  // 모든 키가 실패하면 5분 후 리셋 (서버리스에서는 인스턴스가 재시작되므로 자동으로 리셋됨)
  if (state.failedKeys.size >= state.keys.length) {
    console.warn(`[ApiKeyRotation] All ${type} keys failed, will reset in next request`)
  }
}

/**
 * 쿼터 초과 에러인지 확인
 */
function isQuotaExceededError(error: any): boolean {
  const errorMessage = error.message || error.toString()
  const quotaKeywords = [
    'quota exceeded',
    'quotaExceeded', 
    'rateLimitExceeded',
    'userRateLimitExceeded',
    'dailyLimitExceeded',
    'The model is overloaded',
    'Resource has been exhausted'
  ]
  
  return quotaKeywords.some(keyword => 
    errorMessage.toLowerCase().includes(keyword.toLowerCase())
  )
}

/**
 * API 키 통계 조회
 */
function getKeyStatistics() {
  initializeKeys()
  
  return {
    youtube: {
      totalKeys: rotationState.youtube.keys.length,
      failedKeys: rotationState.youtube.failedKeys.size,
      availableKeys: rotationState.youtube.keys.length - rotationState.youtube.failedKeys.size,
      currentIndex: rotationState.youtube.currentIndex,
      lastUsed: rotationState.youtube.lastUsed
    },
    gemini: {
      totalKeys: rotationState.gemini.keys.length,
      failedKeys: rotationState.gemini.failedKeys.size,
      availableKeys: rotationState.gemini.keys.length - rotationState.gemini.failedKeys.size,
      currentIndex: rotationState.gemini.currentIndex,
      lastUsed: rotationState.gemini.lastUsed
    },
    strategy: ROTATION_STRATEGY
  }
}

/**
 * 실패한 키 목록 수동 리셋
 */
function resetFailedKeys(type?: 'youtube' | 'gemini') {
  if (type) {
    rotationState[type].failedKeys.clear()
    console.log(`[ApiKeyRotation] Reset failed keys for ${type}`)
  } else {
    rotationState.youtube.failedKeys.clear()
    rotationState.gemini.failedKeys.clear()
    console.log(`[ApiKeyRotation] Reset failed keys for all services`)
  }
}

export {
  getNextKey,
  markKeyAsFailed,
  isQuotaExceededError,
  getKeyStatistics,
  resetFailedKeys,
  type RotationStrategy
}