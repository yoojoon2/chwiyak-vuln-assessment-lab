-- ChwiYak E-Commerce Database Schema
-- MySQL Database Setup

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS chwiyak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chwiyak;

-- ==============================
-- 1. 구매자 (Buyer) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS buyer (
    buyer_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    points INT DEFAULT 0,
    token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_token (token)
);

-- ==============================
-- 2. 판매자 (Seller) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS seller (
    seller_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    company_name VARCHAR(200) NOT NULL,
    business_reg_no VARCHAR(50) NOT NULL,
    profile_image_url VARCHAR(500),
    introduction TEXT,
    token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_token (token)
);

-- ==============================
-- 3. 관리자 (Admin) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS admin (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('super_admin', 'admin') DEFAULT 'admin',
    token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_token (token)
);

-- ==============================
-- 4. 상품 (Product) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS product (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    stock INT DEFAULT 0,
    category VARCHAR(50),
    brand VARCHAR(100),
    images JSON,
    status ENUM('active', 'inactive', 'sold_out') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES seller(seller_id) ON DELETE CASCADE,
    INDEX idx_category (category),
    INDEX idx_brand (brand),
    INDEX idx_seller (seller_id),
    INDEX idx_status (status)
);

-- ==============================
-- 5. 주문 (Order) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS `order` (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    total_price INT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_name VARCHAR(100) NOT NULL,
    shipping_phone VARCHAR(20) NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE CASCADE,
    INDEX idx_buyer (buyer_id),
    INDEX idx_status (status)
);

-- ==============================
-- 6. 주문 상품 (Order Item) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS order_item (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES `order`(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- ==============================
-- 7. 리뷰 (Review) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS review (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    buyer_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    images JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_buyer (buyer_id)
);

-- ==============================
-- 8. 위시리스트 (Wishlist) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS buyer_wishlist (
    wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES product(product_id) ON DELETE CASCADE,
    UNIQUE KEY unique_wishlist (buyer_id, product_id),
    INDEX idx_buyer (buyer_id)
);

-- ==============================
-- 9. 쿠폰 (Coupon) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS coupon (
    coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percentage', 'fixed') NOT NULL,
    discount_value INT NOT NULL,
    min_purchase_amount INT DEFAULT 0,
    max_discount_amount INT,
    valid_from DATE,
    valid_until DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_status (status)
);

-- ==============================
-- 10. 구매자 쿠폰 (Buyer Coupon) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS buyer_coupon (
    buyer_coupon_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    coupon_id INT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE CASCADE,
    FOREIGN KEY (coupon_id) REFERENCES coupon(coupon_id) ON DELETE CASCADE,
    INDEX idx_buyer (buyer_id),
    INDEX idx_is_used (is_used)
);

-- ==============================
-- 11. 포인트 내역 (Point History) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS buyer_point_history (
    point_history_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    amount INT NOT NULL,
    type ENUM('earn', 'spend') NOT NULL,
    description VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE CASCADE,
    INDEX idx_buyer (buyer_id),
    INDEX idx_type (type)
);

-- ==============================
-- 12. 배송지 (Buyer Address) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS buyer_address (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT NOT NULL,
    address_name VARCHAR(50),
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    postal_code VARCHAR(10),
    address VARCHAR(300) NOT NULL,
    detail_address VARCHAR(300),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE CASCADE,
    INDEX idx_buyer (buyer_id)
);

-- ==============================
-- 13. 정산 (Seller Settlement) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS seller_settlement (
    settlement_id INT AUTO_INCREMENT PRIMARY KEY,
    seller_id INT NOT NULL,
    amount INT NOT NULL,
    settlement_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES seller(seller_id) ON DELETE CASCADE,
    INDEX idx_seller (seller_id),
    INDEX idx_status (status),
    INDEX idx_settlement_date (settlement_date)
);

-- ==============================
-- 14. 공지사항 (Notice) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS notice (
    notice_id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    views INT DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id) ON DELETE CASCADE,
    INDEX idx_is_pinned (is_pinned)
);

-- ==============================
-- 15. 문의사항 (Support Board) 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS support_board (
    support_id INT AUTO_INCREMENT PRIMARY KEY,
    buyer_id INT,
    seller_id INT,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status ENUM('pending', 'answered', 'closed') DEFAULT 'pending',
    admin_reply TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (buyer_id) REFERENCES buyer(buyer_id) ON DELETE SET NULL,
    FOREIGN KEY (seller_id) REFERENCES seller(seller_id) ON DELETE SET NULL,
    INDEX idx_status (status)
);

-- ==============================
-- 16. FAQ 테이블
-- ==============================
CREATE TABLE IF NOT EXISTS faq (
    faq_id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    question VARCHAR(500) NOT NULL,
    answer TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category)
);

-- ==============================
-- 샘플 데이터 삽입
-- ==============================

-- 관리자 계정 (비밀번호: admin123)
INSERT INTO admin (username, password, name, email, role) VALUES
('admin', '$2a$10$xN9WJ7XFU5z5KwOk4PaO5OZ8xT2qF3yQHxW9Xx4xE5xE5xE5xE5xEO', '관리자', 'admin@chwiyak.com', 'super_admin');

-- 테스트용 구매자 계정 (비밀번호: buyer123)
INSERT INTO buyer (username, password, name, email, phone, points) VALUES
('buyer1', '$2a$10$xN9WJ7XFU5z5KwOk4PaO5OZ8xT2qF3yQHxW9Xx4xE5xE5xE5xE5xEO', '김구매', 'buyer1@test.com', '010-1234-5678', 5000);

-- 테스트용 판매자 계정 (비밀번호: seller123)
INSERT INTO seller (username, password, name, email, phone, company_name, business_reg_no) VALUES
('seller1', '$2a$10$xN9WJ7XFU5z5KwOk4PaO5OZ8xT2qF3yQHxW9Xx4xE5xE5xE5xE5xEO', '이판매', 'seller1@test.com', '010-9876-5432', '럭셔리 부티크', '123-45-67890');

-- 테스트용 상품 데이터
INSERT INTO product (seller_id, name, description, price, stock, category, brand, status) VALUES
(1, 'Louis Vuitton 가방', '고급 가죽 가방', 2500000, 10, 'bag', 'LOUISVUITTON', 'active'),
(1, 'Gucci 스니커즈', '편안한 디자이너 신발', 890000, 15, 'shoes', 'GUCCI', 'active'),
(1, 'Chanel 향수', '우아한 향수', 180000, 50, 'beauty', 'CHANEL', 'active');

-- FAQ 샘플 데이터
INSERT INTO faq (category, question, answer, display_order) VALUES
('배송', '배송은 얼마나 걸리나요?', '일반적으로 주문 후 2-3영업일 내에 배송됩니다.', 1),
('반품', '반품은 어떻게 하나요?', '상품 수령 후 7일 이내에 고객센터로 연락주시면 됩니다.', 2),
('결제', '어떤 결제 수단을 사용할 수 있나요?', '신용카드, 계좌이체, 카카오페이 등을 이용하실 수 있습니다.', 3);

-- 공지사항 샘플
INSERT INTO notice (admin_id, title, content, is_pinned) VALUES
(1, '웹사이트 오픈 안내', 'ChwiYak 쇼핑몰이 정식 오픈했습니다!', TRUE),
(1, '배송 지연 안내', '연휴 기간 중 배송이 지연될 수 있습니다.', FALSE);

SELECT '✅ 데이터베이스 스키마 생성 완료!' as message;
