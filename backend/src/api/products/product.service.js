// /backend/src/api/products/product.service.js

import db from "../../config/db.js"; // DB 커넥션 풀을 가져옵니다.

// 모든 상품 또는 필터링된 상품 조회
export const fetchProducts = async (category, brand, keyword) => {
  let connection;
  try {
    connection = await db.getConnection();

    // 테이블 이름을 'products'로 수정
    let query = `SELECT 
      product_id,
      product_id as id,
      seller_id,
      name,
      description,
      price,
      category,
      brand,
      imageUrl
    FROM products WHERE 1=1`;
    const params = [];

    if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'brand') {
      query += " AND category = ?";
      params.push(category);
    }
    if (brand) {
      query += " AND brand = ?";
      params.push(brand);
    }
    if (keyword) {
      query += " AND name LIKE ?";
      params.push(`%${keyword}%`);
    }

    // ID 컬럼 이름을 'product_id'로 수정
    query += " ORDER BY product_id DESC";

    const [rows] = await connection.query(query, params);
    return rows;
  } catch (error) {
    console.error("상품 목록 조회 DB 오류:", error);
    throw new Error("상품 목록을 불러오는 중 오류가 발생했습니다.");
  } finally {
    if (connection) connection.release();
  }
};

// ID로 특정 상품 상세 조회
export const fetchProductDetail = async (id) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    // ID가 없는 경우 에러
    if (!id || id === 'undefined') {
      throw new Error("상품 ID가 제공되지 않았습니다.");
    }
    
    const productId = parseInt(id, 10);
    
    // NaN 체크
    if (isNaN(productId)) {
      throw new Error("유효하지 않은 상품 ID입니다.");
    }

    // 테이블 이름을 'products'로, ID 컬럼을 'product_id'로 수정
    const [rows] = await connection.query(
      `SELECT 
        product_id,
        product_id as id,
        seller_id,
        name,
        description,
        price,
        category,
        brand,
        imageUrl
      FROM products WHERE product_id = ?`, 
      [productId]
    );

    if (rows.length === 0) {
      throw new Error("상품을 찾을 수 없습니다.");
    }
    return rows[0];
  } catch (error) {
    console.error(`상품 상세 조회 DB 오류 (ID: ${id}):`, error);
    throw error; // 에러를 컨트롤러로 다시 전달
  } finally {
    if (connection) connection.release();
  }
};

// 브랜드 목록 조회
export const fetchBrands = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT DISTINCT brand
      FROM products
      WHERE brand IS NOT NULL AND brand != ''
      ORDER BY brand ASC
    `);
    return rows.map((r) => r.brand);
  } catch (error) {
    console.error("브랜드 목록 조회 DB 오류:", error);
    throw new Error("브랜드 목록을 불러오는 중 오류가 발생했습니다.");
  } finally {
    if (connection) connection.release();
  }
};