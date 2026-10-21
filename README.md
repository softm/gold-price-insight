# 금시그널 — 금 시세 전망 인사이트

국제 금값, 원·달러 환율, 국내 프리미엄, 시장 온도를 조합해 원화 기준 금 시세 시나리오를 탐색하는 정적 웹 앱입니다.

공개 주소: [금시그널](https://goldsignal.designboard.net/)

개인정보처리방침: [개인정보처리방침](https://goldsignal.designboard.net/privacy.html)

저장소: [softm/goldsignal](https://github.com/softm/goldsignal)

## 로컬 실행

```bash
python3 -m http.server 4173 --directory dist
```

브라우저에서 `http://localhost:4173`을 엽니다.

## 주요 기능

- 7일, 30일, 90일, 1년 전망 기간 선택
- 상승, 기본, 하락 시나리오 비교
- 국제 금값·환율·국내 프리미엄·시장 온도 조절
- 입력값을 원화 1g 가격과 전망 범위로 즉시 환산
- 목표가를 브라우저 로컬 저장소에 저장
- 라이트/다크 테마와 반응형 레이아웃
- 본문과 내비게이션 영역을 확보하는 하단 접기·펼치기 AdFit 배너
- Gold API와 Frankfurter를 이용한 6시간 주기 시장 데이터 자동 수집
- GitHub Actions 기반 GitHub Pages 자동 배포

## 디자인 시스템

UI는 [Google Stitch의 Gold Signal UI System](https://stitch.withgoogle.com/projects/12537166845152557427?pli=1)을 기준으로 구현했습니다. Newsreader·Manrope 조합, 아이보리 페이퍼 표면, 차콜 모놀리스, 브라스 포인트와 편집형 12열 그리드를 데스크톱·모바일 반응형 화면에 적용했습니다.

## 데이터 자동화

`.github/workflows/pages.yml`은 6시간마다 국제 금값과 USD/KRW 환율을 수집해 `dist/data/market.json`을 갱신하고 GitHub Pages를 다시 배포합니다. API 장애 시 마지막 정상 데이터가 유지됩니다.

수동 실행은 GitHub 저장소의 **Actions → Collect market data and deploy Pages → Run workflow**에서 할 수 있습니다.

## 광고 운영

돌봄한눈의 하단 접기·펼치기 경험을 참고하여 대시보드에 광고 영역 하나를 둡니다. 모바일 320×100과 데스크톱 728×90 중 화면에 맞는 한 단위만 사용합니다. 시세 갱신이나 재펼치기를 광고 재요청과 연결하지 않으며, 접힘 상태는 탭 세션에 보관합니다. 로드 실패 시 광고 공간을 반환합니다.

매체·광고단위 상태, 구현 기준, QA 항목은 [AdFit 적용 계획](docs/adfit-plan.md)에서 관리합니다. **코드 설치, 매체 심사 승인, 실제 광고 송출은 서로 다른 상태입니다.**

## 개인정보

앱은 회원가입을 요구하지 않으며 목표가는 사용자의 브라우저 또는 앱 내부 저장소에 보관합니다. 하단 광고의 Kakao AdFit Web SDK에는 광고용 브라우저·세션 식별값, 페이지 주소 및 기기·브라우저 환경정보를 전송하는 경로가 확인되어 이를 별도로 고지합니다. 운영자가 목표가를 서버에 저장하지 않는다는 사실이 광고 SDK의 데이터 처리까지 없다는 뜻은 아닙니다.

자세한 내용은 [개인정보처리방침](dist/privacy.html), Google Play 선언 검토 내용은 [데이터 보안](store/data-safety.md)과 [제출 답변표](store/play-console-answers.md)에 있습니다. Android WebView의 기존 쿠키 및 제3자 쿠키 차단 설정은 유지합니다. 광고 적용 후 Play Console의 **광고 포함 여부를 ‘예’로 갱신**해야 하며, SDK 데이터 항목은 확인한 근거에 따라 별도로 제출해야 합니다.

## Android

`android/`는 GitHub Pages의 최신 화면을 표시하고 네트워크 장애 시 번들에 포함된 `dist/` 화면으로 전환하는 Android WebView 앱입니다.

```bash
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

릴리스 빌드에는 로컬 `signing.properties`와 `keystore/`의 업로드 키가 필요하며 두 경로는 Git에서 제외됩니다.

이 앱의 수치는 자동 수집 시장 데이터와 사용자가 조정한 가정을 기반으로 한 시뮬레이션이며 실제 시세나 투자 수익을 보장하지 않습니다.
