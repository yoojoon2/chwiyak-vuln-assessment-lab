# 명품 커머스 플랫폼 (SK쉴더스 루키즈 26기 최종 프로젝트)

> ⚠️ 본 프로젝트는 **웹 취약점 진단 실습을 위해 의도적으로 취약하게 설계된 학습용 웹 애플리케이션**입니다.
> 실제 서비스가 아니며, 등장하는 브랜드명·상품 이미지는 진단 실습 목적의 목업(mock) 데이터입니다.

## 프로젝트 개요

- **기간**: 2025.06 – 2025.12
- **소속**: SK쉴더스 루키즈 · 생성형AI활용 26기
- **역할**: 프로젝트 PM (팀 10명 총괄) — WAS/DB 인프라 구축, 취약점 진단·조치, 진단 자동화 도구 개발 병행
- **구성**: AWS 3-Tier(WEB/WAS/DB) 인프라 위에 구축한 Node.js/Express 백엔드 + 프론트엔드 명품 커머스 서비스

## 디렉터리 구조

ChwiYak-yoojoon_final/
├── backend/ # Node.js + Express + MySQL 백엔드
└── frontend/ # 정적 HTML/JS + Tailwind 프론트엔드


세부 구조는 각 디렉터리의 README를 참고하세요.
- [backend/README.md](./backend/README.md)
- [frontend/front_readme.md](./frontend/front_readme.md)

## 기술 스택

- **Backend**: Node.js, Express, MySQL(mysql2), JWT, bcryptjs, AWS S3(멀티파트 업로드), SendGrid
- **Frontend**: HTML/JS, Tailwind CSS
- **Infra**: AWS EC2/VPC 기반 WEB-WAS-DB 3-Tier 아키텍처

## 이 저장소에 대해

**본 저장소는 코드 구조 참고용입니다.** 프로젝트 진행 당시 사용했던 AWS 3-Tier 인프라(EC2/VPC/DB)는
현재 내려간 상태이며, DB 접속 설정이 담긴 `config` 폴더도 포함되어 있지 않습니다. 따라서 클론 후
바로 실행되지 않으며, 별도의 MySQL 인스턴스 구성과 환경변수 설정이 필요합니다. 필요한 환경변수
목록은 [backend/.env.example](./backend/.env.example)에서 확인할 수 있습니다.

## 보안 관련 참고

이 저장소의 코드는 취약점 진단·조치 실습을 위해 만들어졌으며, 진단 과정에서 발견된 취약점과
조치 내역은 별도 포트폴리오(Notion)에 정리되어 있습니다. `.env`, DB 접속 정보 등 실제 자격 증명은
포함되어 있지 않습니다.
