import { drizzle } from "drizzle-orm/postgres-js" // postgres-js 드라이버용 drizzle 함수 임포트
import postgres from "postgres" // postgres-js 클라이언트 임포트
import * as schema from "./schema"

// Supabase 데이터베이스 URL을 사용하여 직접 PostgreSQL 클라이언트 생성
// process.env.POSTGRES_URL 환경 변수가 올바르게 설정되어 있어야 합니다.
const queryClient = postgres(process.env.POSTGRES_URL!)

// 생성된 PostgreSQL 클라이언트를 drizzle에 전달하여 DB 인스턴스 생성
export const db = drizzle(queryClient, { schema })
