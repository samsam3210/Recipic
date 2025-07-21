-- scripts/009_populate_video_ids.sql

-- 기존 recipes 테이블의 youtube_url에서 video_id를 추출하여 video_id 컬럼을 채웁니다.
-- video_id가 NULL인 레코드만 업데이트합니다.
UPDATE recipes
SET video_id =
    -- 정규 표현식을 사용하여 YouTube URL에서 video_id를 추출합니다.
    -- 이 정규 표현식은 watch?v=, embed/, v/, shorts/ 등 다양한 YouTube URL 형식을 지원합니다.
    SUBSTRING(youtube_url FROM '(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|shorts\/|)([a-zA-Z0-9_-]{11})(?:\S+)?')
WHERE video_id IS NULL;

-- 업데이트된 레코드 수 확인 (선택 사항)
SELECT COUNT(*) AS updated_rows FROM recipes WHERE video_id IS NOT NULL;
