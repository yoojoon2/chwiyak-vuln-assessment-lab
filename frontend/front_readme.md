### 네비게이션바 사용법


1. head 태그 맨 아레에 다음의 구문을 넣어주세요.
  <!-- 공통 CSS (필요 시) -->
  <link rel="stylesheet" href="/frontend/dist/style.css" />

  <!-- Lucide & 네비게이션 -->
  <script src="https://unpkg.com/lucide@latest" defer></script>
  <script src="/frontend/js/navigation.js" defer></script>


2. body 태그 맨 위에 다음의 구문 넣어주세요.

<!-- 네비게이션바 -->
<div id="navigation" data-src="/frontend/components/navigation.html"></div>


### 상품 카테고리 페이지, 상품 상세 페이지
1. 상품 카테고리 페이지  
상품 카테고리 클릭시 나오는 페이지는 다음 세 파일에서 생성됩니다.
- `/frontend/pages/category/category.html` : 기본 카테고리 페이지 틀입니다.
- `/frontend/js/category/category.js` : category_name을 받아서 해당하는 카테고리의 페이지로 로드해줍니다.
- `/frontend/js/mockData.js` : 임시 데이터 파일(DB 대체용입니다.)

<br>

2. 상품 상세 페이지   
상품 상세페이지는 다음의 두 파일에서 생성됩니다.
- /frontend/pages/category/product.html : 상품 상세 페이지 기본 틀
- /frontend/js/category/product.js : 상품 id를 받아서 해당하는 상품의 데이터를 가져옵니다. + 위시리스트 토글 기능
