# 로그인 상태 확인 스크립트
# PowerShell에서 실행: .\check_login.ps1

Write-Host "=== 구매자 로그인 상태 ===" -ForegroundColor Cyan
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pchwiyakpt1! chwiyak -e "SELECT buyer_id, username, name, LEFT(token, 30) as token_preview FROM buyer WHERE token IS NOT NULL;"

Write-Host "`n=== 판매자 로그인 상태 ===" -ForegroundColor Cyan
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pchwiyakpt1! chwiyak -e "SELECT seller_id, username, name, LEFT(token, 30) as token_preview FROM seller WHERE token IS NOT NULL;"

Write-Host "`n=== 전체 통계 ===" -ForegroundColor Green
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -pchwiyakpt1! chwiyak -e "SELECT (SELECT COUNT(*) FROM buyer WHERE token IS NOT NULL) as '로그인_구매자', (SELECT COUNT(*) FROM seller WHERE token IS NOT NULL) as '로그인_판매자';"
