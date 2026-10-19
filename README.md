# 금시그널 — 금 시세 전망 인사이트

국제 금값, 원·달러 환율, 국내 프리미엄, 시장 온도를 조합해 원화 기준 금 시세 시나리오를 탐색하는 정적 웹 앱입니다.

공개 주소: `https://softm.github.io/gold-price-insight/`

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
- Gold API와 Frankfurter를 이용한 6시간 주기 시장 데이터 자동 수집
- GitHub Actions 기반 GitHub Pages 자동 배포

## 디자인 시스템

UI는 [Google Stitch의 Gold Signal UI System](https://stitch.withgoogle.com/projects/12537166845152557427?pli=1)을 기준으로 구현했습니다. Newsreader·Manrope 조합, 아이보리 페이퍼 표면, 차콜 모놀리스, 브라스 포인트와 편집형 12열 그리드를 데스크톱·모바일 반응형 화면에 적용했습니다.

## 데이터 자동화

`.github/workflows/pages.yml`은 6시간마다 국제 금값과 USD/KRW 환율을 수집해 `dist/data/market.json`을 갱신하고 GitHub Pages를 다시 배포합니다. API 장애 시 마지막 정상 데이터가 유지됩니다.

수동 실행은 GitHub 저장소의 **Actions → Collect market data and deploy Pages → Run workflow**에서 할 수 있습니다.

## 개인정보

앱은 계정, 광고 SDK, 분석 도구를 사용하지 않습니다. 목표가는 사용자의 브라우저 또는 앱 내부 저장소에만 보관됩니다. 자세한 내용은 `dist/privacy.html`에서 확인할 수 있습니다.

## Android

`android/`는 GitHub Pages의 최신 화면을 표시하고 네트워크 장애 시 번들에 포함된 `dist/` 화면으로 전환하는 Android WebView 앱입니다.

```bash
cd android
./gradlew assembleDebug
./gradlew bundleRelease
```

릴리스 빌드에는 로컬 `signing.properties`와 `keystore/`의 업로드 키가 필요하며 두 경로는 Git에서 제외됩니다.

이 앱의 수치는 자동 수집 시장 데이터와 사용자가 조정한 가정을 기반으로 한 시뮬레이션이며 실제 시세나 투자 수익을 보장하지 않습니다.
