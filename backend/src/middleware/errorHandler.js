function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) {
    // DB 드라이버 등에서 올라온 원본 에러(SQLSTATE, 제약명, 스택)는 콘솔에만 남기고
    // 클라이언트에는 8-plan.md 4절 code 목록 밖의 값이나 내부 메시지를 노출하지 않는다.
    console.error(err);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } });
  }

  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || '서버 오류가 발생했습니다';
  res.status(status).json({ error: { code, message } });
}

module.exports = errorHandler;
