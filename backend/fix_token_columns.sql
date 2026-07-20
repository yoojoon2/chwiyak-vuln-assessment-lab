-- ====================================
-- Token 컬럼 추가 및 로그인 문제 해결
-- MySQL Workbench에서 실행하세요
-- ====================================

USE chwiyak;

-- 1. buyer 테이블에 token 컬럼 추가
ALTER TABLE buyer 
ADD COLUMN token VARCHAR(255) DEFAULT NULL AFTER points,
ADD INDEX idx_token (token);

-- 2. seller 테이블에 token 컬럼 추가  
ALTER TABLE seller 
ADD COLUMN token VARCHAR(255) DEFAULT NULL AFTER business_reg_no,
ADD INDEX idx_token (token);

-- 3. 확인: buyer 테이블 구조
DESCRIBE buyer;

-- 4. 확인: seller 테이블 구조
DESCRIBE seller;

-- 5. 확인: 현재 사용자 목록
SELECT buyer_id, username, name, email, token FROM buyer;
SELECT seller_id, username, name, email, token FROM seller;

SELECT '✅ Token 컬럼이 성공적으로 추가되었습니다!' as message;
SELECT '이제 로그인이 정상 작동합니다.' as message;
