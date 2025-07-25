#!/usr/bin/env node

/**
 * API 키 로테이션 시스템 수동 테스트 스크립트
 * 
 * 사용법:
 * node scripts/test-api-keys.js
 * 
 * 환경변수 설정 필요:
 * YOUTUBE_API_KEYS=key1,key2,key3
 * GEMINI_API_KEYS=key1,key2,key3
 */

const { getNextKey, markKeyAsFailed, getKeyStatistics, resetFailedKeys } = require('../lib/utils/api-key-rotation.ts')

console.log('🚀 API 키 로테이션 시스템 테스트 시작\n')

// 1. 초기 상태 확인
console.log('📊 초기 키 통계:')
console.log(JSON.stringify(getKeyStatistics(), null, 2))
console.log('\n')

// 2. YouTube 키 로테이션 테스트
console.log('🎥 YouTube 키 로테이션 테스트:')
for (let i = 1; i <= 5; i++) {
  const key = getNextKey('youtube')
  console.log(`  ${i}. ${key ? key.substring(0, 12) + '...' : 'null'}`)
}
console.log('\n')

// 3. Gemini 키 로테이션 테스트
console.log('🤖 Gemini 키 로테이션 테스트:')
for (let i = 1; i <= 5; i++) {
  const key = getNextKey('gemini')
  console.log(`  ${i}. ${key ? key.substring(0, 12) + '...' : 'null'}`)
}
console.log('\n')

// 4. 키 실패 시뮬레이션
console.log('❌ 키 실패 시뮬레이션:')
const firstYouTubeKey = getNextKey('youtube')
if (firstYouTubeKey) {
  console.log(`  실패로 마킹할 키: ${firstYouTubeKey.substring(0, 12)}...`)
  markKeyAsFailed('youtube', firstYouTubeKey, new Error('Quota exceeded (test)'))
  console.log('  ✅ 키 실패로 마킹 완료')
}
console.log('\n')

// 5. 실패 후 통계 확인
console.log('📊 키 실패 후 통계:')
console.log(JSON.stringify(getKeyStatistics(), null, 2))
console.log('\n')

// 6. 실패한 키 제외하고 로테이션 테스트
console.log('🔄 실패한 키 제외 로테이션 테스트:')
for (let i = 1; i <= 5; i++) {
  const key = getNextKey('youtube')
  console.log(`  ${i}. ${key ? key.substring(0, 12) + '...' : 'null'}`)
}
console.log('\n')

// 7. 실패한 키 리셋
console.log('🔧 실패한 키 리셋:')
resetFailedKeys('youtube')
console.log('  ✅ YouTube 실패 키 리셋 완료')
console.log('\n')

// 8. 리셋 후 통계 확인
console.log('📊 리셋 후 통계:')
console.log(JSON.stringify(getKeyStatistics(), null, 2))
console.log('\n')

// 9. 환경변수 확인
console.log('🔧 환경변수 설정 확인:')
console.log(`  YOUTUBE_API_KEYS 개수: ${(process.env.YOUTUBE_API_KEYS || '').split(',').filter(k => k.trim()).length}`)
console.log(`  GEMINI_API_KEYS 개수: ${(process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim()).length}`)
console.log(`  로테이션 전략: ${process.env.API_KEY_ROTATION_STRATEGY || 'ROUND_ROBIN (기본값)'}`)
console.log('\n')

console.log('✅ API 키 로테이션 시스템 테스트 완료!')

// 실제 API 호출 테스트 (선택사항)
if (process.argv.includes('--api-test')) {
  console.log('\n🌐 실제 API 호출 테스트 시작...')
  
  // YouTube API 테스트
  testYouTubeAPI()
  
  // Gemini API 테스트 (주의: 실제 API 호출 발생)
  // testGeminiAPI()
}

async function testYouTubeAPI() {
  try {
    const { getVideoDetails } = require('../lib/utils/youtube-api-wrapper.ts')
    console.log('📺 YouTube API 테스트: 샘플 비디오 조회...')
    
    const result = await getVideoDetails('dQw4w9WgXcQ') // Rick Roll video for testing
    console.log(`  ✅ 성공: ${result.items[0]?.snippet?.title || 'Unknown title'}`)
  } catch (error) {
    console.log(`  ❌ 실패: ${error.message}`)
  }
}

async function testGeminiAPI() {
  try {
    const { generateTextWithGemini } = require('../lib/utils/gemini-api-wrapper.ts')
    console.log('🤖 Gemini API 테스트: 간단한 텍스트 생성...')
    
    const result = await generateTextWithGemini('Say hello in Korean', 'You are a helpful assistant')
    console.log(`  ✅ 성공: ${result.substring(0, 50)}...`)
  } catch (error) {
    console.log(`  ❌ 실패: ${error.message}`)
  }
}