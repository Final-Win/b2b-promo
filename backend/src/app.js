const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const routes = require('./routes/auth.routes');
const wbsRoutes = require('./routes/wbs.routes');
const timeAllocationsRoutes = require('./routes/timeAllocations.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(morgan('dev'));

// Swagger UI는 개발 환경에서만 노출한다(운영에는 API 스펙을 공개하지 않음).
if (process.env.NODE_ENV !== 'production') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerDocument = require('../../docs/swagger.json');
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use(routes);
app.use(wbsRoutes);
app.use(timeAllocationsRoutes);

app.use(errorHandler);

module.exports = app;
