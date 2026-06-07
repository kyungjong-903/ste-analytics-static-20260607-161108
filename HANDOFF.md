# HANDOFF — Console Analytics 통합 (2026-06-07)

> STE 프로토타입(Sergio Tacchini Global AI Agent)에 독립 실행형 **"ST Licensor Console"**
> 의 분석 화면 5개(Overview / Sales & Royalty / Distribution / Inventory / Marketing)를
> 네이티브 통합한 작업의 인수인계 문서. 다음 작업자가 이 문서만으로 구조 파악 →
> 수정 → 검증 → 롤백까지 가능하도록 작성함.

---

## 0. 실행·작업 규칙 (가장 먼저 읽을 것)

### 실행
- **서버 불필요.** `index.html` 더블클릭(file://)으로 실행한다.
- 모든 데이터·스크립트·폰트·차트 라이브러리가 로컬에서 로드된다. 코드 내 `fetch()`는
  4곳뿐이며 전부 file:// 가드가 있다:
  - `js/state.js:60` — `STE_SEED` 전역이 있으면 fetch 안 함 (seed-inline.js가 항상 제공)
  - `js/services/validate.js:15-16` — `STE_SKU_MASTER`/`STE_FX` 전역 우선
  - `js/screens-design.js:8398` — zip 내보내기, file:// 404를 try/catch + 토스트로 처리
  - Console 모듈 5개에는 fetch 0건

### 작업 규칙
- **localhost 서버를 띄우지 말 것.** (사용자 명시 요구. Playwright MCP는 file://를
  차단하므로 브라우저 자동화는 사실상 불가) → 검증은 §9 체크리스트 방식으로.
- **git 저장소 아님** (의도적). 전체 롤백용 원본:
  `~/Downloads/ste-prototype-demo-20260605-1256` (통합 작업 이전 상태)
- Console 원본 소스: `../STE Console (shareable) (3).html` (리포 상위 폴더, 자가압축 번들)

---

## 1. 작업 이력 (시간순)

| # | 작업 | 비고 |
|---|---|---|
| T1 | 인라인 번들 해체 → js/ 소스 직접 로드 | 동작 동일성 검증(번들≡소스 바이트 일치 확인 후 진행) |
| T2 | Console 번들 디코딩 → echarts/모듈 5개/폰트 추출 | 리뷰에서 폰트 서브셋 버그(키릴→라틴) 수정 |
| T3 | Console 테마 CSS를 `.ste-console` 하위로 스코핑 | 생성 스크립트 방식, `.cc-tip`만 전역 예외 |
| T4 | `console-host.js` 어댑터 신규 작성 | 딥 리뷰 후 3건 보완(§5-4 참조) |
| T5 | 사이드바 NAV에 5개 서브메뉴 추가 | |
| T6 | 라우팅 연결 + 스크립트 태그 + active-nav 패치 | |
| 피드백1 | Analytics를 섹션 라벨→클릭 가능한 부모 메뉴로 | 클릭 시 Overview 진입 |
| 피드백2 | 사이드바 브랜드/뷰 필이 Home과 겹치는 버그 수정 | flex 압축이 원인 (§6-3) |
| 피드백3 | Analytics 트리 열고닫기 + 부모 active 표시 금지 | |
| 피드백4 | Licensor view도 라이트 테마로 통일 | |
| 피드백5 | 기존 단일 Analytics 화면을 "Analytics v2" 메뉴로 부활 | 라우트 `#/analytics-v2` |
| 피드백6 | Console 화면 타이틀(h1+sub)을 플랫폼 컨벤션 위치(브레드크럼 아래 `.ste-section-hd`)로 이동 | UI 감사 B1 — `docs/2026-06-07-console-analytics-ui-audit.md` |

---

## 2. 아키텍처 변화 — 번들 해체 (T1)

### 이전
`index.html` 끝의 `<script id="ste-bundle-loader">`가 xlsx 로드 후 **1,748,558자 인라인
JS 문자열**(seed + js 소스 11개의 연결)을 실행했다. js/ 폴더는 참고용 사본이었고,
js/ 파일을 고쳐도 반영되지 않았다.

### 현재 (index.html:19762~)
인라인 번들 제거. 정적 `<script src>` 20개가 순서대로 로드된다.
**js/ 파일 수정 = 즉시 반영. 빌드 과정 없음.**

```
js/lib/xlsx.full.min.js      ← 엑셀 파싱 (SheetJS)
js/seed-inline.js            ← 생성물: window.STE_SEED + STE_SKU_MASTER + STE_FX (171KB)
js/state.js                  ← 중앙 상태 저장소 (localStorage + pub/sub + 역할 헬퍼)
js/services/validate.js      ← 매출명세서 검증 엔진
js/screens.js                ← 코어 화면 (sales/invoices/agreements/timelines/plans…)
js/screens-onboarding.js
js/screens-account.js
js/screens-admin.js
js/screens-support.js
js/screens-analytics.js      ← 기존 단일 Analytics = 현재 "Analytics v2" (#/analytics-v2)
js/screens-design.js
js/header-menus.js           ← 전역 검색·알림·라이선시 스위처
js/lib/echarts.min.js        ← [신규] Apache ECharts 5.5.0 (~1MB)
js/console/console-data.js   ← [신규] window.STEData
js/console/console-charts.js ← [신규] window.Charts
js/console/console-ui.js     ← [신규] window.UI (+전역 .cc-tip 툴팁 엔진)
js/console/console-screens-a12.js   ← [신규] window.Screens.a1/.a2
js/console/console-screens-a345.js  ← [신규] window.Screens.a3/.a4/.a5
js/console/console-host.js   ← [신규·수작업] 통합 어댑터 (§4)
js/app.js                    ← 부트/라우터/사이드바 페인트 (이번에 3곳 수정, §5-2)
```

순서 의존성: echarts → console-charts(래퍼) → … → console-host(STEConsole 정의) →
app.js(부트 시 STEConsole 호출 가능해야 함). **이 순서를 깨지 말 것.**

### 전역 네임스페이스 (충돌 없음 확인됨)
호스트: `STE, STEApp, STEScreens, STEAnalytics, STEAdmin, STEAccount, STESupport,
STEOnboarding, STEDesign, STEi18n, STEUnread, STE_SEED, STE_SKU_MASTER, STE_FX`
Console: `STEData, Charts, UI, Screens, STEConsole, __steYear`

---

## 3. 라우팅 전체 흐름 (js/app.js)

```
boot() [app.js:9]
  → STE.init() (시드/마이그레이션)
  → 세션 없으면 기본 HQ 어드민 Min Jung(usr_6bc7b45b)으로 setSession
  → bindRouter() + bindNavTrees() + runForCurrentRoute()

hashchange → runForCurrentRoute() [app.js:444]
  → currentRoute() [app.js:411]: 해시 첫 세그먼트 → ROUTES 목록 매칭 (레거시 alias 처리 포함)
  → handlers[route] 실행 [app.js:505]
  → 페인트 체인: removeWireframeChrome → paintHeaderUser → paintBreadcrumb
    → paintActiveNav → paintNavTrees → paintSidebarSections → paintNavBadges
    → paintChromeI18n → translatePage
```

이번 작업과 관련된 라우트 (ROUTES 배열 app.js:7):
| 해시 | 핸들러 | 화면 |
|---|---|---|
| `#/analytics` | `STEConsole.route()` → overview로 redirect | Console |
| `#/analytics/overview·sales·distribution·inventory·marketing` | `STEConsole.route()` | Console 5화면 |
| `#/analytics-v2` | `STEAnalytics.analytics()` | 기존 단일 화면 |

주의: `currentRoute()`는 `#/analytics/xxx`의 첫 세그먼트만 보므로 다섯 서브 라우트의
"라우트"는 전부 `analytics` 하나다. 서브 구분은 `console-host.js route()`가 담당.

---

## 4. console-host.js 상세 (392줄, 유일한 신규 수작업 파일)

원본 Console 앱 셸(자가압축 번들의 `2c913479` 자산)에서 필터바·렌더 파이프라인·이벤트
위어링을 이식하되, **자체 사이드바/탑바/모드 토글/라우터는 제거**하고 호스트에 위임한 것.

### 내부 구조 (라인 앵커)
| 위치 | 내용 |
|---|---|
| :16 `SUBS` | sub↔screen 매핑: overview=a1, sales=a2, distribution=a3, inventory=a4, marketing=a5 (+tag A1~A5) |
| :28 `LIC2ENT` | 플랫폼 조직 id → Console 엔티티 id (아래 표) |
| :44 `state` | 필터 상태. localStorage `ste-console-state-v2` 로드/저장. 필드: mode·season·period·year·axis·view·channel·screen·licensorEnt·licenseeSelf·entId·a2view·a2dim |
| :57 `syncRole()` | `STE.isHQ(currentUser)` → mode='licensor'/'licensee'; licensee면 licenseeSelf를 LIC2ENT로 설정 |
| :78 `applyContext()` | entId 결정, season/calendar 축 정리, **`const light = true` ← 테마 결정(§4-테마)**, `Charts.setTheme/setView`, `STEData.setContext` |
| :111 `renderFilter()` | 필터바: Licensee 선택기(HQ만)/잠금 스코프(licensee), Calendar(연도+기간 dd), Season dd, Actual/Plan seg |
| :225 `renderScreen()` | 타이틀/서브를 `#ste-console-title`/`#ste-console-sub`(섹션 헤더 내)에 textContent로 갱신, availability에 따라 본문 = 빈상태/plan없음/partial배너+`sc.render(state)` → `#ste-console-main`에 주입 → `sc.init(state)`로 차트 마운트 |
| :278 `render()` | `<ste-shell>` + crumbs + **타이틀 골격(`.ste-page-hd-row`의 h1/sub, 피드백6)** + `.ste-console.mode-licensee` 컨테이너 + 필터바 + 본문 골격 |
| :313 `wire()` | document 단일 위임 클릭 리스너(1회 등록, `document._steConsoleWired` 가드). `.ste-console` 내부 클릭만 처리 |
| :378 `route()` | 해시 파싱 → 유효 sub 아니면 overview로 `location.replace` → 섹션 표시 → wire+render |

### wire()가 처리하는 data-속성 (전부 `.ste-console` 내부 한정)
`[data-go]`(드릴다운 카드→화면 이동, gotab/anchor 동반), `#lic-trigger`/`[data-ent]`
(라이선시 선택), `[data-dd-trigger]`(드롭다운), `[data-view]`(Actual/Plan),
`#switch-plan`/`#switch-actual`(빈상태 버튼), `[data-year]`/`[data-period]`/`[data-season]`
(축 전환 — season 선택 시 axis='season', calendar 선택 시 season='all'),
`[data-a2view]`/`[data-a2dim]`/`[data-channel]`(a2 서브뷰), `#exp-pdf`/`#exp-xls`
(STEApp.toast 스텁).

### 역할 ↔ 모드 ↔ 데이터 스코프
| 플랫폼 역할 | mode | 화면 스코프 | 필터바 |
|---|---|---|---|
| HQ (Licensor view, `STE.isHQ`=licenseeId 없음) | licensor | 포트폴리오 전체 또는 선택 엔티티 | Licensee 선택기(STE Total + 5개) |
| Licensee (licenseeId 있음) | licensee | 자기 조직 고정, "Licensee A"로 익명 표기 | 잠금 스코프(선택 불가) |

`LIC2ENT` (screens-analytics.js의 `_refToLicId` 역방향 — 양쪽 동기 유지 필요):
```
lic_75f7462d → bbuk      (BBUK, GB)
lic_c2a5c666 → sugifr    (SUGI FRANCE)
lic_000025e9 → sugifw    (SUGI INTERNATIONAL)
lic_b56a4e2c → benjamin  (BENJAMIN, DE)
lic_05056c4c → bds       (BDS, FR)
```

### 테마 (피드백4)
원래 Console은 licensor=다크/licensee=라이트였으나, **현재는 역할 무관 항상 라이트**:
- `applyContext()` :82 부근 `const light = true`
- `render()` :301 부근 컨테이너 클래스 `"ste-console mode-licensee"` 고정
- 다크 복원: 위 두 곳을 `state.mode === "licensee"` 조건으로 되돌리면 됨
- `mode-licensee` 클래스는 "라이트 테마 키"로만 쓰임 — 데이터 스코프와 무관
  (스코프는 `state.mode`가 결정)

---

## 5. 수정된 기존 파일 상세

### 5-1. index.html (4곳)
1. **`<link rel="stylesheet" href="css/console.css">`** — `<title>` 직후 (10행)
2. **NAV 배열** (5260행~): Analytics 트리 6줄 + Analytics v2 1줄 (§6-1)
3. **NAV 렌더 템플릿 2곳** (renderShell 함수 + STEShell 클래스):
   `treeParent`→`data-nav-parent` 속성+셰브론 span, `treeChild`→`data-subnav` 속성 출력
4. **사이드바 스킨 CSS** (~18171행 블록): `.sidebar-brand{flex-shrink:0}`,
   펼친 모드 `.sidebar-nav{overflow-y:auto}`, `.ste-nav-chev`(셰브론 회전) — §6-3
5. 끝부분: 번들 로더 → 스크립트 태그 20개 (19762행~)

### 5-2. js/app.js (6곳)
| 위치 | 변경 |
|---|---|
| :7 ROUTES | `"analytics-v2"` 추가 |
| boot() :22 부근 | `bindNavTrees()` 호출 추가 |
| runForCurrentRoute() 내 | analytics 진입 시(`_prevRoute !== "analytics"`) `setNavTreeOpen(true)` 자동 펼침 |
| :505 handlers | `analytics:` → `STEConsole.route()` / `"analytics-v2":` → `STEAnalytics.analytics()` |
| :716 paintActiveNav | ① `data-nav-parent` 항목은 항상 active 제거(트리 부모 선택 표시 금지) ② 같은 라우트를 공유하는 링크가 2개 이상이면(=analytics 서브 5개) 해시 prefix로 1개만 active |
| :749~ 신규 | `navTreeOpen/setNavTreeOpen/paintNavTrees(:760)/bindNavTrees(:769)` — §6-2 |
| :796 paintBreadcrumb | `"analytics-v2": "crumb_analytics"` 매핑 추가 |
| 페인트 체인 | `paintNavTrees()` 호출 추가 (paintActiveNav 다음) |

### 5-3. css/console.css — **생성물. 직접 수정 금지**
`tools/build-console-css.mjs`가 `tools/console-template.html`의 2번째 `<style>` 블록을
변환해 생성. 수정하려면 스크립트(특히 끝의 "integration overrides" 수작업 tail)를 고치고
`node tools/build-console-css.mjs` 재실행.

스코핑 규칙: `:root`/`html`/`body`→`.ste-console`, `body.X`→`.ste-console.X`,
기타 셀렉터→`.ste-console ` prefix, `@keyframes`/`@font-face` 원본 유지,
`@media` 내부 재귀 처리. **예외 2가지**:
- `.cc-tip`(툴팁)은 전역 유지 — UI 모듈이 body에 직접 append하기 때문.
  tail에서 다크 토큰 6개를 `.cc-tip`에 literal로 재정의함
- `.main` → `.ste-console .main, .ste-console .cc-main` 이중 출력 — 호스트의
  `main.main{...!important}` 규칙 충돌을 피하려고 console-host가 본문 요소를
  `<div class="cc-main">`으로 렌더하기 때문

### 5-4. T4 리뷰에서 보완된 3건 (재발 방지 참고)
1. 본문 요소가 `<main class="main">`이면 호스트 `main.main{padding:…!important}`에
   패딩을 빼앗김 + 중첩 `<main>` invalid → `div.cc-main`으로 변경
2. `.cc-tip`이 `.ste-console` 밖(body)에 살아서 CSS 변수를 못 받음 → tail에서 토큰 literal 재정의
3. `state._pendingAnchor`(드릴다운 스크롤 앵커)가 빈상태 렌더 시 클리어 안 되고
   localStorage에 잔존 → renderScreen에서 무조건 클리어로 변경

---

## 6. 사이드바 메뉴 구조

### 6-1. NAV 항목 (index.html:5260~, 두 렌더 템플릿이 공유)
```js
{ id:'analytics',          label:'Analytics',       href:'#/analytics',          icon:'analytics', section:'Operations', treeParent:'analytics' },
{ id:'analytics-overview', label:'Overview',        href:'#/analytics/overview', icon:'cOverview', section:'Operations', treeChild:'analytics' },
… (sales/distribution/inventory/marketing 동일 패턴) …
{ id:'analytics-v2',       label:'Analytics v2',    href:'#/analytics-v2',       icon:'analytics', section:'Operations' },
```
- `treeParent` → `data-nav-parent="analytics"` + 우측 셰브론(`.ste-nav-chev`) 렌더
- `treeChild` → `data-subnav="analytics"` (paintNavTrees가 display 토글)
- 하위 들여쓰기: css/console.css tail의 `a.nav-item[href^="#/analytics/"]{padding-left:28px}`
  (부모 `#/analytics`는 슬래시가 없어 매칭 안 됨)

### 6-2. 트리 동작 규칙 (js/app.js bindNavTrees :769)
| 상태 | 부모 클릭 결과 |
|---|---|
| 닫힘 | 펼침 (+ analytics 화면 밖이면 `#/analytics/overview`로 이동) |
| 펼침 + 다른 화면 | Overview로 이동 (트리 유지) |
| 펼침 + analytics 화면 | 접힘 (화면은 유지) |

- 펼침 상태: localStorage `ste.navTree.analytics` ("1"/"0", 기본 닫힘)
- analytics 라우트 **진입 시** 자동 펼침 (runForCurrentRoute, `_prevRoute` 비교)
- **부모는 절대 active 하이라이트 안 됨** (paintActiveNav에서 `data-nav-parent` 제외) —
  현재 보는 하위 메뉴만 하이라이트
- 접힌 사이드바(icon-only) 모드: 셰브론은 기존 collapsed CSS가 자동 숨김

### 6-3. 사이드바 겹침 버그(피드백2)의 원인과 수정
`.sidebar`는 `height:100vh` flex 컬럼. 메뉴 7개 추가로 낮은 창에서 콘텐츠가 100vh 초과
→ flexbox가 `.sidebar-brand`(기존 스킨이 `min-height:0!important`로 풀어둠)를 압축
→ 뷰 모드 필이 넘쳐 Home 위에 겹침. 수정(index.html ~18171):
`.sidebar-brand{flex-shrink:0}` + `body:not(.sidebar-collapsed) .sidebar-nav{overflow-y:auto;min-height:0}`
(접힘 모드는 호버 툴팁 클리핑 방지 위해 스크롤 제외)

---

## 7. Console 데이터 모델 요약 (console-data.js, window.STEData)

- **백엔드 없음.** mulberry32 PRNG + FNV 해시 시드로 (엔티티,연도,시즌,뷰)별 결정론적 수치 생성
- 엔티티 6개: `total`(포트폴리오 집계) + bbuk/sugifr/sugifw/benjamin/bds
- 기간: `ytd`, `q1~q4`, `cum1~cum3`, `full` / 연도: 2025~2027 / 시즌 축: `SEASONS_FILTER`(ss25~fw27)
- `setContext({season,year,view,axis})`로 컨텍스트 주입 — **렌더 전 반드시 applyContext() 경유**
- `availability(period)` → 'full'|'partial'|'none' — partial 배너/빈상태 분기 근거
- 주의: Console 수치는 목데이터라 시드 기반 화면(Analytics v2 등)과 숫자가 다를 수 있음
  (v2 자체도 같은 엔진의 포팅본이지만 엔티티 세부값이 갈라져 있음 — 정상)

## 8. localStorage 키 일람

| 키 | 소유 | 용도 |
|---|---|---|
| `ste.state.v13` | state.js | 플랫폼 전체 상태(시드 사본). 삭제 시 재시드 |
| `ste.session.v13` | state.js | 세션(userId, viewLicenseeId 등) |
| `ste.sidebarCollapsed` | app.js | 사이드바 접힘 |
| `ste.unread.<userId>` | app.js:1118 | 읽음 추적 |
| `ste-console-state-v2` | console-host | Console 필터 상태 (원본 Console과 동일 키 — 격리됨) |
| `ste.navTree.analytics` | app.js | Analytics 트리 펼침 상태 |

**데모 초기화**: 화면의 Reset 버튼(상태만) 또는 콘솔에서 `localStorage.clear()` 후 새로고침.

## 9. 검증 체크리스트 (서버 없이, file:// 새로고침으로)

1. 부팅 → HQ 대시보드(Licensor view 필, 차콜 사이드바)
2. Analytics 클릭 → 트리 펼침 + Overview 진입(라이트 테마, 필터바, KPI, ECharts 차트)
3. 하위 5개 각각 클릭 → 화면 전환, **해당 하위만** 하이라이트(부모는 하이라이트 없음)
4. Analytics 화면에서 부모 재클릭 → 트리 접힘(화면 유지) / 재클릭 → 펼침
5. Sales & Royalty에서 Licensee 선택기 → BBUK 선택 → 수치 변경
6. Analytics v2 클릭 → 기존 단일 화면 정상
7. 프로필 메뉴 → james@bestofbritain.co.uk 로 로그인(또는 콘솔에서
   `STE.setSession({userId:'usr_06e0bea9'}); location.reload()`) → Licensee view:
   트리 보임, Overview = "My Overview", 잠금 스코프 "Licensee A", 라이트 테마
8. 회귀: Home/Sales Statements/Agreements/Admin 정상 + 개발자도구 콘솔 에러 0
   (favicon 404만 허용)
9. 창 높이를 줄여 사이드바가 넘칠 때: 브랜드/뷰 필 겹침 없이 메뉴 영역만 스크롤

## 10. 알려진 트레이드오프 (의도된 것 — 버그 아님)

- PDF/Excel 버튼 = 토스트 스텁 (원본 Console과 동일)
- 화면 전환 반복 시 ECharts 인스턴스가 Charts 레지스트리에 누적 — resize 핸들러가
  try/catch라 기능 영향 없음. 고치려면 console-charts.js `mount()`에서 disposed 인스턴스 prune
- Licensee 모드 화면 내 표기는 "Licensee A" 익명화 (원본 충실 이식)
- 한국어 모드에서 i18n DOM-walk(`translatePage`)가 Console 문자열 일부를 번역할 수 있음
- Analytics v2와 부모 Analytics가 같은 아이콘 (접힌 사이드바에서 동일하게 보임)
- console-screens-*.js 등 추출 모듈 5개는 원본 verbatim — 가급적 수정하지 말고
  console-host.js나 CSS tail에서 우회할 것

## 11. 복원/롤백 레시피

### v2를 다시 기본 Analytics로 (트리 제거)
1. `js/app.js` handlers: `analytics:` 줄을
   `analytics: () => window.STEAnalytics && STEAnalytics.analytics(),` 로 교체,
   `"analytics-v2"` 줄 삭제 (+ ROUTES에서 "analytics-v2" 제거)
2. `index.html` NAV: 트리 6줄+v2 1줄 삭제하고
   `{ id:'analytics', label:'Analytics', href:'#/analytics', icon:'analytics', section:'Operations' }` 한 줄로
3. (선택) Console 관련 script 태그 7개·css link 제거 — 남겨놔도 무해

### 다크 테마 복원 (Licensor만 다크)
`js/console/console-host.js` — `applyContext()`의 `const light = true` →
`const light = state.mode === "licensee"`, `render()`의 `"ste-console mode-licensee"` →
`` `ste-console ${isHQ ? "mode-licensor" : "mode-licensee"}` ``

### 전체 롤백
`~/Downloads/ste-prototype-demo-20260605-1256` 폴더로 통째 교체.

## 12. tools/ 스크립트 (전부 node 1회성, 리포 루트에서 실행)

| 스크립트 | 용도 | 재실행 안전성 |
|---|---|---|
| `deinline-bundle.mjs` | T1 번들 해체 (이미 적용) | 마커가 없어 "bundle marker not found"로 안전 실패 |
| `extract-console.mjs` | Console 번들 → 자산 추출 | 결정론적. `../STE Console (shareable) (3).html` 필요 |
| `build-console-css.mjs` | console-template → css/console.css | 결정론적. **css 수정은 항상 이 스크립트 경유** |
| `console-template.html` | 디코딩된 Console 앱 HTML (CSS 원본) | 참조용 |

## 13. 참고 문서·배경

- 구현 계획서(태스크별 코드/검증 상세): `docs/superpowers/plans/2026-06-07-console-analytics-submenu.md`
- **UI 개선점 전수 감사(2026-06-07)**: `docs/2026-06-07-console-analytics-ui-audit.md` —
  A(버그 9)/B(UX 10)/C(접근성 5)/D(위생) 분류, 우선순위·수정 위치 포함. B1(타이틀 위치)만 수정 완료.
- **혈통 관계**: 프로토타입의 `screens-analytics.js`(현 v2)가 애초에 Console에서 포팅된
  파생본이다 (파일 머리 주석 "Ported verbatim from the Licensor Console reference").
  같은 PRNG/FX 테이블/시즌 가중치/엔티티 5개를 공유하므로 이번 통합에 데이터 모델
  충돌이 없었음. 단 엔티티 세부값(통화·연간 최소액 등)은 양쪽이 갈라져 있음.
- 역할 분기(Licensor/Licensee view)의 전체 메커니즘은 `js/state.js:146-148`
  (`isHQ`=licenseeId 없음, `isAdmin`=role==='administrator')과
  `session.viewLicenseeId`(HQ의 라이선시 임퍼소네이션)가 근간 — Console 통합도
  이 체계에 그대로 올라타 있다.
