/**
 * API 키 로테이션 시스템 테스트
 */

import { getNextKey, markKeyAsFailed, isQuotaExceededError, getKeyStatistics, resetFailedKeys } from '../api-key-rotation'

// 환경변수 모킹
const originalEnv = process.env

describe('API Key Rotation System', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
    // 테스트용 환경변수 설정
    process.env.YOUTUBE_API_KEYS = 'youtube_key1,youtube_key2,youtube_key3'
    process.env.GEMINI_API_KEYS = 'gemini_key1,gemini_key2'
    process.env.API_KEY_ROTATION_STRATEGY = 'ROUND_ROBIN'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('getNextKey', () => {
    test('should return keys in round robin fashion for YouTube', () => {
      const key1 = getNextKey('youtube')
      const key2 = getNextKey('youtube')
      const key3 = getNextKey('youtube')
      const key4 = getNextKey('youtube') // Should wrap around to first key

      expect(key1).toBe('youtube_key1')
      expect(key2).toBe('youtube_key2')
      expect(key3).toBe('youtube_key3')
      expect(key4).toBe('youtube_key1')
    })

    test('should return keys in round robin fashion for Gemini', () => {
      const key1 = getNextKey('gemini')
      const key2 = getNextKey('gemini')
      const key3 = getNextKey('gemini') // Should wrap around to first key

      expect(key1).toBe('gemini_key1')
      expect(key2).toBe('gemini_key2')
      expect(key3).toBe('gemini_key1')
    })

    test('should fallback to single key when multi-keys not available', () => {
      process.env.YOUTUBE_API_KEYS = ''
      process.env.YOUTUBE_API_KEY = 'single_youtube_key'
      
      const key = getNextKey('youtube')
      expect(key).toBe('single_youtube_key')
    })

    test('should return null when no keys available', () => {
      process.env.YOUTUBE_API_KEYS = ''
      process.env.YOUTUBE_API_KEY = ''
      
      const key = getNextKey('youtube')
      expect(key).toBeNull()
    })
  })

  describe('markKeyAsFailed', () => {
    test('should mark key as failed and exclude from rotation', () => {
      // 첫 번째 키를 실패로 마킹
      markKeyAsFailed('youtube', 'youtube_key1', new Error('Quota exceeded'))
      
      // 다음 키들은 실패한 키를 제외하고 반환되어야 함
      const key1 = getNextKey('youtube')
      const key2 = getNextKey('youtube')
      const key3 = getNextKey('youtube')
      
      expect(key1).toBe('youtube_key2')
      expect(key2).toBe('youtube_key3')
      expect(key3).toBe('youtube_key2') // 다시 처음으로
    })

    test('should reset failed keys when all keys fail', () => {
      // 모든 키를 실패로 마킹
      markKeyAsFailed('gemini', 'gemini_key1', new Error('Quota exceeded'))
      markKeyAsFailed('gemini', 'gemini_key2', new Error('Quota exceeded'))
      
      // 모든 키가 실패하면 첫 번째 키를 반환해야 함
      const key = getNextKey('gemini')
      expect(key).toBe('gemini_key1')
    })
  })

  describe('isQuotaExceededError', () => {
    test('should detect quota exceeded errors', () => {
      const quotaError1 = new Error('Quota exceeded')
      const quotaError2 = new Error('quotaExceeded')
      const quotaError3 = new Error('The model is overloaded')
      const quotaError4 = new Error('Resource has been exhausted')
      
      expect(isQuotaExceededError(quotaError1)).toBe(true)
      expect(isQuotaExceededError(quotaError2)).toBe(true)
      expect(isQuotaExceededError(quotaError3)).toBe(true)
      expect(isQuotaExceededError(quotaError4)).toBe(true)
    })

    test('should not detect non-quota errors', () => {
      const normalError = new Error('Network error')
      const authError = new Error('Unauthorized')
      
      expect(isQuotaExceededError(normalError)).toBe(false)
      expect(isQuotaExceededError(authError)).toBe(false)
    })
  })

  describe('getKeyStatistics', () => {
    test('should return correct statistics', () => {
      // 하나의 키를 실패로 마킹
      markKeyAsFailed('youtube', 'youtube_key1', new Error('Test error'))
      
      const stats = getKeyStatistics()
      
      expect(stats.youtube.totalKeys).toBe(3)
      expect(stats.youtube.failedKeys).toBe(1)
      expect(stats.youtube.availableKeys).toBe(2)
      expect(stats.gemini.totalKeys).toBe(2)
      expect(stats.gemini.failedKeys).toBe(0)
      expect(stats.gemini.availableKeys).toBe(2)
      expect(stats.strategy).toBe('ROUND_ROBIN')
    })
  })

  describe('resetFailedKeys', () => {
    test('should reset failed keys for specific service', () => {
      // 키를 실패로 마킹
      markKeyAsFailed('youtube', 'youtube_key1', new Error('Test error'))
      markKeyAsFailed('youtube', 'youtube_key2', new Error('Test error'))
      
      let stats = getKeyStatistics()
      expect(stats.youtube.failedKeys).toBe(2)
      
      // YouTube 키만 리셋
      resetFailedKeys('youtube')
      
      stats = getKeyStatistics()
      expect(stats.youtube.failedKeys).toBe(0)
    })

    test('should reset failed keys for all services', () => {
      // 모든 서비스의 키를 실패로 마킹
      markKeyAsFailed('youtube', 'youtube_key1', new Error('Test error'))
      markKeyAsFailed('gemini', 'gemini_key1', new Error('Test error'))
      
      let stats = getKeyStatistics()
      expect(stats.youtube.failedKeys).toBe(1)
      expect(stats.gemini.failedKeys).toBe(1)
      
      // 모든 키 리셋
      resetFailedKeys()
      
      stats = getKeyStatistics()
      expect(stats.youtube.failedKeys).toBe(0)
      expect(stats.gemini.failedKeys).toBe(0)
    })
  })

  describe('Different rotation strategies', () => {
    test('should use sequential strategy', () => {
      process.env.API_KEY_ROTATION_STRATEGY = 'SEQUENTIAL'
      
      // Sequential 전략에서는 항상 첫 번째 사용 가능한 키를 반환
      const key1 = getNextKey('youtube')
      const key2 = getNextKey('youtube')
      const key3 = getNextKey('youtube')
      
      expect(key1).toBe('youtube_key1')
      expect(key2).toBe('youtube_key1')
      expect(key3).toBe('youtube_key1')
    })

    test('should use random strategy', () => {
      process.env.API_KEY_ROTATION_STRATEGY = 'RANDOM'
      
      // Random 전략에서는 매번 다를 수 있음 (테스트하기 어려움)
      // 최소한 유효한 키가 반환되는지만 확인
      const key = getNextKey('youtube')
      expect(['youtube_key1', 'youtube_key2', 'youtube_key3']).toContain(key)
    })
  })
})