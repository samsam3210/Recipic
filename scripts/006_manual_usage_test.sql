-- 현재 날짜 (KST)를 가져오는 쿼리 (참고용)
SELECT TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD');

-- 1. 새로운 사용량 레코드 삽입 (처음 시도하는 경우)
-- 'YOUR_USER_ID'를 실제 로그인된 사용자의 UUID로 교체하세요.
-- 'YYYY-MM-DD'를 오늘 날짜(예: '2025-07-17')로 교체하세요.
INSERT INTO daily_usage_limits (user_id, usage_date, count)
VALUES ('YOUR_USER_ID', 'YYYY-MM-DD', 1)
ON CONFLICT (user_id, usage_date) DO UPDATE SET count = daily_usage_limits.count + 1
RETURNING *;

-- 2. 삽입 또는 업데이트 후 데이터 확인
-- 'YOUR_USER_ID'를 실제 로그인된 사용자의 UUID로 교체하세요.
-- 'YYYY-MM-DD'를 오늘 날짜(예: '2025-07-17')로 교체하세요.
SELECT * FROM daily_usage_limits
WHERE user_id = 'YOUR_USER_ID' AND usage_date = 'YYYY-MM-DD';
