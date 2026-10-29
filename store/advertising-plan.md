# 금시그널 광고 수익화 운영 계획

작성: 2026-10-21 / 목적: 매체 광고 수익화. 유료 Google Ads 캠페인이나 광고비 집행은 하지 않는다.

## 배치와 단계

| 환경 | 1차 적용 | 노출 규칙 | 후속 단계 |
| --- | --- | --- | --- |
| 일반 웹 | Kakao AdFit 320×100 한 개 | 목표가·리서치 콘텐츠 아래 인플로우, 사용자 허용 후 화면 근처에서 한 번 요청 | 전용 매체/광고 단위 발급, 공개 배포, 매체 검토 |
| Android | Google AdMob 앵커형 적응형 배너 한 개 | 웹뷰 밖 네이티브 컨테이너, 기본 꺼짐, 사용자 허용 + UMP + 온라인 콘텐츠 표시 후 요청 | 1.0.2 제출 승인, Play 연결, app-ads.txt 인증, AdMob 검토 |
| 웹 Google | AdSense 비교 실험 계획 | AdFit과 동일 페이지에서 동시 실행하지 않음 | autorunnavi 사이트 승인·전용 단위·인증 CMP 확보 후 별도 활성화 |

전면/앱 오프닝/보상형 광고, 목표가 버튼 근처 배너, 가짜 다운로드 버튼, 광고 클릭 유도, 자체 새로고침 루프는 사용하지 않는다. 광고 장애·거부 시 핵심 기능은 계속 작동한다. Android 1.0.0/1.0.1도 웹 광고 제외 대상이다.

## 계정 및 전용 ID

- Google 계정: autorunnavi@gmail.com — 2026-10-21 AdMob 화면에서 확인.
- AdMob 앱: 금시그널 / Android / 현재 스토어 미연결(미공개 앱으로 등록).
- 앱 ID: `ca-app-pub-4219853075548260~5635970987`
- 배너 이름: `금시그널_하단_배너`
- 배너 ID: `ca-app-pub-4219853075548260/4239303840`
- Debug는 Google 공식 테스트 앱/배너 ID만 사용한다. 다른 앱의 실운영 ID는 재사용하지 않는다.
- AdFit: 금시그널 Web 매체 `ND9`, 금융/도구, `goldsignal.designboard.net`. 전용 배너 `금시그널_하단_320x100`, ID `DAN-4P5RJYzkhG0yWAns` 발급 및 로컬 코드 연결 완료. 새로고침/대체 광고 미설정. 공개 배포와 매체 심사는 미완료.
- AdSense: autorunnavi의 계정 정보 화면에서 사용 제품이 **AdMob**만 표시됨을 확인. 웹 AdSense 활성화/사이트 승인 여부는 준비되지 않았으며 Google 웹 광고 코드는 넣지 않았다.
- `dist/app-ads.txt`: autorunnavi 게시자 선언. 공개 도메인 루트 배포 및 Play 개발자 웹사이트 연결 후 크롤러 결과를 확인해야 한다.

## 개인정보와 안전장치

웹: 광고 선택을 별도 로컬 키에 180일 저장. 선택 없음/거부/저장 실패/잘못된 ID/미허용 호스트/앱 웹뷰에서는 AdFit SDK를 로드하지 않는다. 로컬 미리보기는 광고 모양만 그리는 가짜 테스트 영역이다. 거부 시 기존 SDK가 로드된 페이지를 다시 불러와 후속 요청을 막는다.

Android: 별도 기기 내 선택 + 매 실행 UMP 갱신, 동의 확인 오류 시 광고 차단, UMP 요구 시 개인정보 옵션 제공. 광고 ID 권한 제거, 위치 권한 없음. 그 외 IP·SDK 식별 정보·광고 이용 기록·진단 정보 처리는 고지 및 Play 데이터 보안 답변에 포함해야 한다. 개인정보 옵션 메시지를 실제 금시그널 앱 ID에 연결해 검증해야 하며, 자체 허용 버튼만으로 Google 인증 CMP 요건을 충족했다고 간주하지 않는다.

AdSense는 승인과 인증 CMP가 없는 상태에서 스크립트만 심지 않는다. AdFit 무응답 직후 AdSense를 자동 호출하는 워터폴도 1차에는 사용하지 않는다. AdSense 검증은 메타 태그 또는 ads.txt 방식으로 광고 호출 없이 준비할 수 있다.

## 측정과 수익 실험

별도 사용자 추적 SDK 없이 각 광고 서비스 보고서로 요청수, 노출수, 일치율/게재율, eCPM, 예상 수익, 정책 경고를 확인한다. 광고 활성화 후 첫 7일은 동작·오클릭 위험·핵심 기능 사용성을 점검하고, 충분한 표본이 생긴 뒤 연속된 동일 길이 기간을 비교한다. AdSense 실험은 전용 기간에 AdFit을 끄고 시작한다. 자동 일정은 생성하지 않는다.

추정 수익 = 실제 유효 노출수 ÷ 1,000 × 실제 eCPM. 방문 수나 수익을 보장하지 않으며 초기 0원 또는 no-fill은 가능하다. 광고를 직접 클릭하거나 새로고침하여 노출을 늘리는 테스트는 하지 않는다.

## 출시 순서와 중단 조건

1. AdFit 금시그널 매체/단위 발급 및 코드 연결 완료. 활성화 설정은 공개 배포 후 적용된다.
2. 테스트 전용 검증, 개인정보 고지/Play 신고 검토, 최신 원격 시세 데이터를 보존한 소스 반영.
3. 사용자 승인 후 디렉토리별 커밋·푸시, Pages 배포 및 privacy/app-ads 응답 확인. DNS/Pages 도메인 설정은 변경하지 않는다.
4. AdMob 개인정보 메시지를 금시그널 앱에 연결하고 테스트 장치에서 UMP/배너/거부/철회를 검증.
5. 사용자 승인 후 새 AAB와 ‘광고 포함: 예’·데이터 보안 변경을 같은 출시로 제출. 기존 1.0.1 심사를 임의 취소하지 않는다.
6. Play 공개 후 AdMob 스토어 연결/소유권 인증/검토 상태 확인. 실제 광고 수익 발생 여부는 별도 결과다.

광고 겹침, 개인정보 확인 실패, 정책 경고, 잘못된 게시자 ID 발견 시 광고를 끈 상태로 유지하고 원인을 해결한다. Play 승인/거절 자동 확인 스케줄러는 사용자 요청으로 취소된 상태를 유지한다.

## 공식 근거

- [AdFit 웹 SDK](https://github.com/adfit/adfit-web-sdk), [AdFit 웹 가이드](https://adfit.github.io/wiki/web-guide/), [운영정책](https://adfit.kakao.com/web/html/use_kakao.html)
- [AdMob Android SDK](https://developers.google.com/admob/android/quick-start), [테스트 광고](https://developers.google.com/admob/android/test-ads), [UMP](https://developers.google.com/admob/android/privacy)
- [Google SDK 데이터 공개](https://developers.google.com/admob/android/privacy/play-data-disclosure), [app-ads.txt](https://support.google.com/admob/answer/9363762?hl=ko)
- [AdSense 사이트 연결](https://support.google.com/adsense/answer/7584263), [Google 인증 CMP](https://support.google.com/adsense/answer/13554116)

이 문서는 구현·운영 체크리스트이며 광고 승인이나 법률 준수 인증을 의미하지 않는다.
