# 금시그널 도메인 전환 상태

확인일: 2026-10-21 14:08 (Asia/Seoul)

## 완료

- 서비스: https://goldsignal.designboard.net/ — HTTP 200, TLS 인증서 검증 성공
- 개인정보처리방침: https://goldsignal.designboard.net/privacy.html — HTTP 200, TLS 인증서 검증 성공
- 공개 시세 데이터: https://goldsignal.designboard.net/data/market.json — 2026-10-21 13:58 KST 수집 데이터 확인
- 공개 화면에 같은 수집 시각이 표시되고 브라우저 오류/경고 로그가 없음을 확인
- Android 접속 주소와 WebView 내부 허용 호스트를 새 도메인으로 변경
- Android 1.0.1 (versionCode 2) 서명 AAB 생성 및 Play Console 업로드
- 사용자 승인 후 1.0.1 프로덕션 전체 출시와 새 개인정보처리방침 URL을 추가 심사로 전송
- Play 게시 개요에서 1.0.1 및 새 개인정보처리방침이 '검토 중인 변경사항'에 포함되고 사전 검사가 끝났음을 확인
- Play 스토어 연락처 웹사이트 주소는 새 도메인으로 게시 완료
- 웹/오프라인 번들 하단에 개인정보처리방침 링크 추가, 문의 저장소 링크 갱신
- 로컬 미리보기에서 개인정보처리방침 열기/홈 복귀 및 오류 로그 없음 확인
- 관련 소스 10개 파일을 부모 디렉토리별 6개 커밋으로 나누어 `softm/goldsignal`의 `main`에 푸시
- GitHub Actions Pages 배포 성공 및 새 개인정보처리방침 링크의 공개 화면 동작 확인
- 최근 정기 수집 작업 성공 및 공개 JSON과 저장소 데이터의 수집 시각 일치 확인

## 검증

- `node --check dist/app.js`: 통과
- `node --check .github/scripts/update-market-data.mjs`: 통과
- `./gradlew --offline :app:bundleRelease :app:assembleDebug :app:lintRelease`: 성공
- Android lint: 오류 0개, 기존 API 33 매니페스트 속성 경고 1개
- 뒤로가기: API 33+의 기존 OnBackInvokedCallback 등록과 API 24–32의 기존 fallback을 확인하고, fallback 메서드에만 GestureBackNavigation lint 예외 사유 명시
- `jarsigner -verify`: 서명 검증 성공 (Android 업로드 키의 자체 서명 및 타임스탬프 부재 경고는 별도 출력)
- AAB 내부 dex에서 새 도메인, 버전 User-Agent 확인
- AAB 내부 웹 자산에서 개인정보처리방침/문의 링크 확인
- 에뮬레이터에 `com.softm.goldsignal.debug` 설치 성공, 버전 `1.0.1-debug` / versionCode 2 확인
- 에뮬레이터의 앱 화면 및 뒤로가기 제스처 실행 검증은 미실시
- Play 사전 버전 검사: 가독화 파일 경고 1개. 이 앱은 `minifyEnabled false`로 난독화하지 않음

## 아티팩트

- 보존한 기존 파일: `android/app/build/outputs/bundle/release/app-release-1.0.0.aab`
- 새 파일: `android/app/build/outputs/bundle/release/app-release-1.0.1.aab`
- 새 파일 SHA-256: `0bc1325e98f3c032bf33f55a93afe3e9972f1258d5dc8fa62f6ef222ad8cdebf`
- 새 출시 노트: `store/release-notes-1.0.1-ko.txt`

## GitHub 반영 및 배포

- 소스 반영 커밋: `299da4f`, `a1ceedd`, `99734ee`, `9b1a28c`, `9c772d1`, `81a729a`
- 배포 성공: https://github.com/softm/goldsignal/actions/runs/39547345074
- 정기 수집 성공: https://github.com/softm/goldsignal/actions/runs/39546900675
- 최신 수집 시각: `2026-10-21T04:58:09.257Z` (13:58 KST)
- 새 HTML/개인정보처리방침 HTTP 200 및 TLS 인증서 검증 성공. CDN/브라우저 캐시와 구분하기 위해 `?release=1.0.1`로 새 배포 내용도 확인
- 서명키·비밀번호·AAB·`.DS_Store`·30 MiB 이상 파일은 커밋하지 않음
- 각 커밋이 부모 디렉토리 하나만 포함하고, 의도하지 않은 스테이징이 없으며, 최신 원격 `dist/data/market.json`이 보존됐음을 검증

## 남은 작업 — Google Play 승인 및 공개 확인

1. Google Play의 1.0.1 심사 결과 대기
2. 실제 스토어 페이지에서 금시그널 / softmnet / com.softm.goldsignal 및 설치 가능 상태 검증

추가 제출로 대기 시간이 늘어날 수 있음을 안내했고 사용자가 GitHub 반영과 Play 추가 심사 모두 승인했다. Console의 정상 추가 제출 확인 절차에서 '검토 다시 시작'을 실행했다. 따라서 기존 1.0.0 검토는 1.0.1과 새 개인정보처리방침을 포함한 검토로 다시 시작됐다. 별도의 '변경사항 삭제'는 실행하지 않았다.

관리형 게시가 꺼져 있어 승인 시 자동 게시된다. 공개 스토어는 2026-10-21 14:06 KST 확인 시 아직 '찾을 수 없음'이며, 공개 완료로 처리하지 않았다. 기존 6시간 간격 자동 확인은 1.0.1의 새 심사 상태를 기준으로 계속한다.

DNS 및 GitHub Pages 도메인 설정은 변경하지 않았다. 기존 로컬 작업 폴더의 미커밋 파일을 보존하고, 원격 이력에서 복제한 별도 작업 폴더에 이번 수정만 반영해 일반 푸시했다. 이 상태 기록은 소스 변경과 구분하여 `store` 디렉토리 단독 커밋으로 보관한다.
