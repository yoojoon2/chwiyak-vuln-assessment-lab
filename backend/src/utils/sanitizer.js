/**
 * XSS/CSRF 공격 방지를 위한 입력값 Sanitization 유틸리티
 * 취약점 보고서 1-1 조치: XSS / CSRF 공격 가능성
 */
import xss from 'xss';
import validator from 'validator';
/**
 * XSS 방지를 위한 기본 옵션
 * 모든 HTML 태그를 제거하고 스크립트를 차단
 */
const xssOptions = {
  whiteList: {}, // 모든 HTML 태그 제거
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  css: false
};

/**
 * 텍스트 입력값 sanitize (상품명, 제목 등)
 * @param {string} input - 사용자 입력값
 * @returns {string} - sanitize된 안전한 문자열
 */
const sanitizeText = (input) => {
  if (!input) return input;
  
  // 1. XSS 라이브러리로 위험 태그 제거
  let cleaned = xss(input, xssOptions);
  
  // 2. HTML 특수문자 이스케이프
  cleaned = validator.escape(cleaned);
  
  // 3. 위험한 문자열 패턴 추가 제거
  cleaned = cleaned
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '') // onerror=, onclick= 등
    .replace(/<script/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/expression\(/gi, '');
  
  return cleaned;
};

/**
 * HTML 콘텐츠 sanitize (설명, 본문 등 - 제한된 태그만 허용)
 * @param {string} input - 사용자 입력값
 * @returns {string} - sanitize된 HTML
 */
const sanitizeHTML = (input) => {
  if (!input) return input;
  
  // 안전한 태그만 허용
  const allowedOptions = {
    whiteList: {
      p: ['style'],
      br: [],
      strong: [],
      em: [],
      u: [],
      b: [],
      i: [],
      span: ['style']
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe']
  };
  
  return xss(input, allowedOptions);
};

/**
 * 배열 내 모든 문자열 sanitize
 * @param {Array} arr - 문자열 배열
 * @returns {Array} - sanitize된 배열
 */
const sanitizeArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(item => {
    if (typeof item === 'string') {
      return sanitizeText(item);
    }
    return item;
  });
};

/**
 * 객체의 특정 필드들을 일괄 sanitize
 * @param {Object} obj - 대상 객체
 * @param {Array} textFields - 텍스트로 처리할 필드명 배열
 * @param {Array} htmlFields - HTML로 처리할 필드명 배열
 * @returns {Object} - sanitize된 객체
 */
const sanitizeObject = (obj, textFields = [], htmlFields = []) => {
  const sanitized = { ...obj };
  
  textFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeText(sanitized[field]);
    }
  });
  
  htmlFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizeHTML(sanitized[field]);
    }
  });
  
  return sanitized;
};

/**
 * 입력값 길이 검증
 * @param {string} input - 입력값
 * @param {number} maxLength - 최대 길이
 * @returns {boolean} - 유효성 여부
 */
const validateLength = (input, maxLength) => {
  if (!input) return true;
  return input.length <= maxLength;
};

/**
 * SQL Injection 패턴 검증
 * @param {string} input - 입력값
 * @returns {boolean} - 위험 패턴 포함 여부
 */
const containsSQLInjection = (input) => {
  if (!input) return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(union.*select|select.*from|insert.*into)/gi,
    /(or\s+1\s*=\s*1|and\s+1\s*=\s*1)/gi,
    /('|"|;|--|\/\*|\*\/)/g
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

export {
  sanitizeText,
  sanitizeHTML,
  sanitizeArray,
  sanitizeObject,
  validateLength,
  containsSQLInjection
};
