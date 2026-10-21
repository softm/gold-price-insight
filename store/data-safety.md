# Google Play 데이터 보안 검토

확인 기준일: 2026-10-22 (한국시간)

금시그널은 Android WebView에서 운영 웹 화면을 표시합니다. AdFit Web SDK 추가로 기존의 **‘광고 없음·광고 SDK 없음·사용자 데이터 수집/공유 없음’ 일괄 답변은 더 이상 제출 근거로 사용할 수 없습니다.** 이 문서는 코드 확인 결과와 남은 선언 검토를 구분하며, 실제 Play Console 제출 완료를 의미하지 않습니다.

## 현재 작업 상태

| 항목 | 확인 상태 |
|---|---|
| 운영 웹 배포 | 커밋 [`ea7663d057545b5598e474159025a6439eb70c09`](https://github.com/softm/goldsignal/commit/ea7663d057545b5598e474159025a6439eb70c09), [Actions 39635203459](https://github.com/softm/goldsignal/actions/runs/39635203459) 성공 |
| 광고 동작 회귀 검사 | `node tests/adfit-lifecycle.test.cjs` 9개 통과 |
| Play Console 광고 포함 | **예 저장 완료**, 저장 확인 알림 확인. 검토 제출은 아직 하지 않음 |
| 데이터 보안 3종 | 기기 또는 기타 ID·앱 상호작용·진단 **임시저장 완료**. 저장 알림 및 새로고침 후 유형·완료 상태와 미리보기 재확인 |
| 최종 검토 제출 | **미제출**. Web AdFit의 서버측 IP 기반 위치 추론 여부 확인 전 제출 보류 |

웹 배포 완료나 콘솔 저장을 Play 스토어 공개 반영·승인으로 기록하지 않는다.

## 확인한 구현

| 항목 | 확인 내용 | 선언에 반영할 사항 |
|---|---|---|
| 광고 | 하단 Kakao AdFit Web 배너 | 광고 포함 여부 **예** |
| 계정 | 회원가입·로그인 없음 | 계정 생성 없음, 계정 삭제 해당 없음 |
| 목표가 | `dist/app.js`의 `goldSignalTarget`을 `localStorage`에 저장 | 목표가 서버 전송 기능 없음. 로컬 저장만으로 수집이라고 표시하지 않음 |
| 광고 접힘 상태 | 현재 탭의 `sessionStorage`에 보관 | 표시 설정이며 개인정보 동의 철회 기능은 아님 |
| 쿠키 | `MainActivity.java`에서 `setAcceptCookie(false)`, `setAcceptThirdPartyCookies(webView, false)` | 기존 차단 유지. SDK의 모든 정보 처리가 없다는 근거는 아님 |
| Android 광고 SDK | 네이티브 AdFit SDK를 추가하지 않는 구성 | Web SDK 및 앱이 제어하는 WebView 동작을 함께 검토 |
| 접근 권한 | 위치·연락처·사진 권한 요청 없음 | 해당 권한 없음. IP 기반 대략적 위치 등은 별도 검토 |
| 통신 | 앱 화면·시장 파일·광고 로더 URL은 HTTPS. Android는 혼합 콘텐츠 차단 | 광고 제공자의 전체 전송 경로 확인 후 암호화 항목 확정 |

## SDK 소스에서 확인한 전송 경로

2026-10-22 공식 [배포 스크립트](https://t1.kakaocdn.net/kas/static/ba.min.js)의 `ad-fit-web@4.41.4-release`(파일 표기 2026-10-07)를 정적으로 검사했다. 아래는 SDK의 요청 생성·전송 코드에서 확인한 사실이며, 운영 트래픽을 캡처했다는 의미는 아니다.

| 항목 | 코드 근거 | 판단 |
|---|---|---|
| 기기 또는 기타 식별자 | `createRequest()`의 `sdkid`, `dk`; `getSessionId()`는 생성값을 재사용 | **SDK 식별값 전송 경로 확인. 데이터 수집 ‘예’의 근거** |
| 쿠키 차단 시 식별값 | `sdkid` 생성 함수는 쿠키값이 없으면 난수를 만들고 쿠키 기록을 시도한 뒤 값을 반환 | 쿠키 저장 차단만으로 식별자 전송이 없어지지 않음 |
| 접속한 페이지·유입 페이지 | 요청의 `surl`, `refurl` | 페이지 주소 전송 경로 확인. 목표가를 URL에 넣는 앱 기능은 없음 |
| 기기·브라우저 환경 | OS·브라우저 종류/버전, 기기 관련 값, 화면 크기/배율, 네트워크 유형, 쿠키 지원 여부 | 지원되는 정보가 요청에 포함됨. Play 항목별 분류·목적은 확인 필요 |
| 배터리 상태 | 지원 시 `navigator.getBattery()`에서 잔량·충전 상태를 요청에 포함 | 조건부 전송 경로 확인 |
| 앱 상호작용 | `rendered()`·`viewable()`·`click()` → `sendEvent()` → 응답의 이벤트 URL로 이미지 비콘 전송. 클릭 시각·소재 크기·좌표 등의 필드 포함 | **광고 표시·노출·클릭 상호작용 전송 경로 확인**. 검증을 위해 광고를 클릭하지는 않음 |
| 진단 정보 | `AdFitRequestError`·`AdFitRenderError`·`AdFitBeaconError` 등이 오류 수집 서버로 오류 유형·메시지·스택, SDK 버전, User-Agent·페이지·유입 정보를 전송 | **SDK 진단 전송 경로 확인**. 네이티브 앱 강제종료 로그 수집으로 확대 해석하지 않음 |
| Android 광고 식별자 | SDK는 전달된 `adid` 옵션을 지원하나 앱에 네이티브 GAID 브리지를 추가하지 않음 | SDK 생성 식별값과 GAID/ADID를 구분. GAID 수집이라고 추정하지 않음 |

검사본 SHA-256: `dbe575675e99839bcbc5a245568e3e699c444e87f71f868aec1793d2ec5b8cb0`. 배포 스크립트는 공급사에 의해 갱신될 수 있으므로 SDK 변경 시 다시 확인한다. 쿠키의 클라이언트 저장기간이 코드에 있어도 서버 보유기간과 같다고 볼 수 없다.

## 데이터 보안 양식에 임시저장한 3종

다음은 현재 콘솔에 **임시저장한 값**이다. 새로고침 후 유형별 완료 상태와 5단계 미리보기의 수집·공유 목록을 확인했다. 최종 저장·검토 제출은 하지 않았다.

| 데이터 유형 | 수집·공유 | 필수성 | 임시 처리 | 입력 목적 |
|---|---|---|---|---|
| 기기 또는 기타 ID | 수집 및 공유 | 필수 | 임시 처리 아님 | 광고 또는 마케팅, 애널리틱스 |
| 앱 상호작용 | 수집 및 공유 | 필수 | 임시 처리 아님 | 광고 또는 마케팅, 애널리틱스 |
| 진단 | 수집 및 공유 | 필수 | 임시 처리 아님 | 광고 또는 마케팅, 애널리틱스 — 광고 SDK 오류 측정·분석 포함 |

SDK의 전송 경로와 [카카오의 행태정보 안내](https://info.ad.daum.net/optout.do)를 함께 근거로 삼는다. 카카오 안내는 제휴 지면의 자동 전송, 광고·이용 통계 목적, 광고 입찰 참여사 제공 및 보유기간을 설명한다. 이를 단순 기기 내 처리나 실시간 메모리 처리만 있는 것으로 선언하지 않는다. 광고 접기는 모든 이용자가 데이터 수집을 사전에 거부하는 기능이 아니므로 필수로 입력한다. 특정 SDK 항목별 서버 보유기간은 이 일반 안내만으로 확정하지 않는다.

## 최종 제출 전에 남은 불확실성

| 검토 대상 | 확인할 내용 | 현재 상태 |
|---|---|---|
| **대략적인 위치** | Web AdFit 서버가 접속 IP로 위치를 추론하는지. 앱의 위치 권한 없음과는 별개 | **공급사 확인 필요. 이 유형을 확정하지 못해 최종 제출 보류** |
| 3종의 임시저장 | 입력한 유형·필드가 콘솔에 보관되었는지 | **완료**. 저장 알림·재진입·미리보기 확인 |
| 유형별 서버 보유기간 | Web SDK의 식별값·광고 이벤트·진단별 보유 및 삭제 정책 | 미확정 |
| 선언 범위의 완전성 | 위 3종 외 서버측 처리로 추가 유형이 필요한지 | 위 3종이 최종 전체 목록이라고 확정하지 않음 |

**데이터 수집 여부는 ‘예’를 기준으로 정정**한다. 식별값·광고 상호작용·SDK 진단 전송 근거를 확보했지만, 미확인 서버 처리까지 ‘없음’으로 답하지 않는다. 특히 IP가 전달된다는 사실만으로 위치 추론을 확정하거나 배제할 수 없다.

Google 안내는 서드 파티 SDK 전송과 **앱이 동작을 제어하는 WebView**의 처리를 선언에 포함한다. 서버를 직접 운영하지 않아도 적용된다. 기기 밖으로 나가지 않는 저장은 별도로 구분한다. 상세 분류는 [Google Play 데이터 보안 안내](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ko)를 기준으로 확정한다.

## 콘솔 작업 이력과 다음 단계

1. **완료:** [Play Console](https://play.google.com/console/)의 `com.softm.goldsignal` → 앱 콘텐츠 → 광고에서 ‘예’ 저장 및 확인 알림 확인. 아직 검토 제출하지 않음.
2. **완료:** 데이터 보안 3종과 세부 필드 임시저장. ‘변경사항이 저장되었습니다’ 알림, 새로고침 후 유형별 완료 상태, 5단계 미리보기의 3종 수집·공유 목록을 재확인. 최종 저장은 하지 않음.
3. **미완료:** 카카오 Web AdFit의 IP 기반 지역 추론 및 필요한 추가 유형을 확인. 확인 전에는 최종 검토 제출 보류.
4. **미완료:** 공개 [개인정보처리방침](https://goldsignal.designboard.net/privacy.html), 실제 WebView 동작과 선언을 대조한 뒤 검토 제출·상태 확인. 저장소 수정·웹 배포·콘솔 저장·스토어 반영은 각각 구분.

## 공식 근거

- [Google Play 광고 포함 선언](https://support.google.com/googleplay/android-developer/answer/9859455?hl=ko)
- [Google Play 데이터 보안](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ko)
- [Kakao 맞춤형 광고 안내 및 설정](https://info.ds.kakao.com/optout.do?lang=ko)
- [Kakao 행태정보 처리·제공 안내](https://info.ad.daum.net/optout.do)
- [AdFit 이용약관 — 방문자 개인정보 및 자동 수집 정보 고지](https://adfit.kakao.com/web/html/stipulation_kakao.html)
- [AdFit Web SDK](https://github.com/adfit/adfit-web-sdk)
- [AdFit 공식 배포 스크립트 — 위 정적 검사 대상](https://t1.kakaocdn.net/kas/static/ba.min.js)
- [AdFit Android 하이브리드 WebView 참고 가이드](https://github.com/adfit/adfit-web-sdk/blob/master/GUIDE-HYBRID-ANDROID.md)
