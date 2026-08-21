// Vercel 서버리스 진입점. server.js(app.listen 사용)와 달리 Vercel이 자체
// HTTP 서버를 관리하므로, Express 앱 인스턴스만 내보낸다(Express 앱은 그대로
// (req, res) => ... 형태의 핸들러라 별도 어댑터 없이 동작한다).
// Vercel 배포본에는 .env* 파일이 올라가지 않고(.gitignore) 대시보드/CLI로
// 등록한 환경변수가 process.env에 이미 채워져 있으므로, 아래 config()는
// 로컬에서 `node backend/api/index.js`로 직접 켜볼 때만 의미가 있다(파일이
// 없으면 조용히 무시됨).
require('dotenv').config({
  path: require('path').resolve(__dirname, '..', process.env.NODE_ENV === 'production' ? '.env.production' : '.env'),
});

module.exports = require('../src/app');
