const { verifyAccessToken } = require('../utils/jwt');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next({ status: 401, code: 'UNAUTHORIZED', message: '인증이 필요합니다' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    next({ status: 401, code: 'UNAUTHORIZED', message: '인증이 필요합니다' });
  }
}

module.exports = authMiddleware;
