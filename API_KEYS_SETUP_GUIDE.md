# Recipick API 키 로테이션 시스템 설정 가이드

## 환경변수 설정

### 1. 기존 단일 키 (호환성 유지)
기존 환경변수들은 그대로 유지되며, 새로운 다중 키가 없을 경우 fallback으로 사용됩니다.

```bash
# 기존 환경변수 (여전히 사용 가능)
YOUTUBE_API_KEY=your_single_youtube_key
GOOGLE_GENERATIVE_AI_API_KEY=your_single_gemini_key
YOUTUBE_TRANSCRIPT_API_KEY=your_transcript_key
```

### 2. 새로운 다중 키 설정
다중 키를 사용하려면 다음 환경변수를 설정하세요:

```bash
# YouTube Data API v3 키들 (쉼표로 구분)
YOUTUBE_API_KEYS=key1_from_project1,key2_from_project2,key3_from_project3

# Gemini AI API 키들 (쉼표로 구분) 
GEMINI_API_KEYS=key1_from_project1,key2_from_project2,key3_from_project3

# 로테이션 전략 설정 (선택사항)
API_KEY_ROTATION_STRATEGY=ROUND_ROBIN  # ROUND_ROBIN | SEQUENTIAL | RANDOM
```

### 3. Vercel 배포 시 설정
Vercel 대시보드에서 환경변수 설정:

1. Vercel 프로젝트 → Settings → Environment Variables
2. 다음 변수들 추가:
   - `YOUTUBE_API_KEYS`: `key1,key2,key3,key4,key5`
   - `GEMINI_API_KEYS`: `key1,key2,key3,key4,key5`
   - `API_KEY_ROTATION_STRATEGY`: `ROUND_ROBIN`

### 4. 로컬 개발 시 설정
`.env.local` 파일에 추가:

```bash
# 로컬 개발용 다중 키
YOUTUBE_API_KEYS=dev_key1,dev_key2,dev_key3
GEMINI_API_KEYS=dev_key1,dev_key2,dev_key3
API_KEY_ROTATION_STRATEGY=ROUND_ROBIN
```

## 로테이션 전략

### ROUND_ROBIN (기본값, 권장)
- 키들을 순환하면서 사용
- 가장 균등한 부하 분산
- 예측 가능한 사용 패턴

### SEQUENTIAL
- 첫 번째 키부터 순차적으로 사용
- 키가 실패하면 다음 키로 이동
- 첫 번째 키에 부하 집중

### RANDOM
- 매번 랜덤하게 키 선택
- 예측 불가능한 사용 패턴
- 완전한 무작위 분산

## 키 관리 및 모니터링

### API 키 상태 확인
```bash
# GET 요청으로 현재 키 상태 조회
curl https://your-domain.com/api/admin/api-keys-status

# 응답 예시:
{
  "status": "success",
  "data": {
    "youtube": {
      "totalKeys": 5,
      "failedKeys": 1,
      "availableKeys": 4,
      "currentIndex": 2,
      "lastUsed": "2024-01-20T10:30:00.000Z"
    },
    "gemini": {
      "totalKeys": 3,
      "failedKeys": 0,
      "availableKeys": 3,
      "currentIndex": 1,
      "lastUsed": "2024-01-20T10:25:00.000Z"
    },
    "strategy": "ROUND_ROBIN"
  },
  "timestamp": "2024-01-20T10:30:15.123Z"
}
```

### 실패한 키 목록 리셋
```bash
# 모든 서비스의 실패한 키 리셋
curl -X POST https://your-domain.com/api/admin/api-keys-status \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_failed_keys"}'

# 특정 서비스의 실패한 키만 리셋
curl -X POST https://your-domain.com/api/admin/api-keys-status \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_failed_keys", "type": "youtube"}'
```

## 로그 모니터링

### 성공적인 키 사용
```
[ApiKeyRotation] Using youtube key: AIzaSyAB... (strategy: ROUND_ROBIN)
[YouTubeAPI] Successfully called videos
```

### 키 실패 시
```
[YouTubeAPI] Quota/Rate limit error detected, marking key as failed
[ApiKeyRotation] Marked youtube key as failed: AIzaSyAB... {
  error: "quotaExceeded",
  failedKeysCount: 2,
  totalKeysCount: 5
}
```

### 모든 키 실패 시
```
[ApiKeyRotation] All youtube keys failed, will reset in next request
```

## 키 추가/제거 방법

### 키 추가
1. Google Cloud Console에서 새 프로젝트 생성
2. YouTube Data API v3 및 Generative Language API 활성화
3. API 키 생성
4. 환경변수에 쉼표로 구분하여 추가
5. 애플리케이션 재배포 (Vercel의 경우 자동 재배포)

### 키 제거
1. 환경변수에서 해당 키 제거
2. Google Cloud Console에서 키 비활성화/삭제
3. 애플리케이션 재배포

## 문제 해결

### 모든 키가 실패하는 경우
1. Google Cloud Console에서 각 프로젝트의 쿼터 상태 확인
2. API 키가 올바른지 확인
3. API가 활성화되어 있는지 확인
4. `/api/admin/api-keys-status`에서 실패한 키 리셋

### 키 로테이션이 작동하지 않는 경우
1. 환경변수가 올바르게 설정되었는지 확인
2. 쉼표로 구분되어 있고 공백이 없는지 확인
3. 서버 재시작 (Vercel의 경우 재배포)

### 특정 키만 계속 사용되는 경우
1. `API_KEY_ROTATION_STRATEGY` 확인
2. 다른 키들이 실패 상태인지 확인
3. 실패한 키 목록 리셋 시도

## 보안 고려사항

- API 키는 절대 코드에 하드코딩하지 않음
- 각 키는 서로 다른 Google Cloud 프로젝트에서 생성
- 정기적으로 키 사용량 모니터링
- 의심스러운 활동 발견 시 즉시 키 교체
- 로그에서 전체 키 값이 노출되지 않도록 주의 (앞 8자리만 표시)