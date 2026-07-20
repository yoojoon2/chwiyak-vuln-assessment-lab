// backend/src/middleware/errorHandler.js

import path from 'path';

// ✅ 404 Not Found 처리
export const notFoundHandler = (req, res, next) => {
  // API 요청인 경우 JSON으로 응답
  if (req.path.startsWith('/api') || req.headers['accept']?.includes('application/json')) {
    return res.status(404).json({ 
      success: false, 
      message: "존재하지 않는 API 경로입니다." 
    });
  }

  // 일반 브라우저 요청인 경우 -> 404 상태코드만 보냄 
  // (아파치가 ErrorDocument 설정에 따라 404.html을 보여주게 됨)
  res.status(404).send('Not Found');
};

// ✅ 500 Server Error 처리
export const globalErrorHandler = (err, req, res, next) => {
  console.error("🔥 Server Error:", err); // 서버 로그에는 기록 (디버깅용)

  const statusCode = err.status || 500;
  const message = "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

  // API 요청인 경우 JSON으로 응답 (내부 에러 내용 숨김)
  if (req.path.startsWith('/api') || req.headers['accept']?.includes('application/json')) {
    return res.status(statusCode).json({ 
      success: false, 
      message: message
    });
  }

  // 일반 요청인 경우 -> 상태코드만 보냄
  // (아파치가 ErrorDocument 설정에 따라 500.html을 보여주게 됨)
  res.status(statusCode).send('Server Error');
};
