const { Pool, types } = require('pg');

// DATE 컬럼(OID 1082)을 JS Date로 파싱하면 서버 로컬 타임존 변환 과정에서
// toISOString() 직렬화 시 하루가 밀린다(예: 2026-08-11 -> "2026-08-10T15:00:00.000Z").
// 원본 'YYYY-MM-DD' 문자열을 그대로 반환해 날짜 컬럼은 항상 문자열로 다룬다.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
