const path = require('path');

// NODE_ENV는 실행 시점에 셸/배포환경이 미리 정해준다(예: `NODE_ENV=production node server.js`).
// 그 값에 따라 .env(개발) 또는 .env.production(운영) 파일을 골라 읽는다.
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
require('dotenv').config({ path: path.resolve(__dirname, envFile) });

const app = require('./src/app');

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
