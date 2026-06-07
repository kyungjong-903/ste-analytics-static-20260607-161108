# Console Analytics UI 개선점 전수 감사 (2026-06-07)

> `#/analytics/*` 하위 5개 화면(Overview / Sales & Royalty / Distribution / Inventory /
> Marketing)의 UI 코드 전수 점검 결과. 대상: `js/console/*` 6개 모듈 + `css/console.css`
> (생성물) + 호스트 통합 코드(`js/app.js`, `index.html` NAV).
> 수정 시 HANDOFF.md §0 작업 규칙 준수: **localhost 금지**(검증은 file:// 새로고침),
> verbatim 추출 모듈(console-data/charts/ui/screens-a12/screens-a345)은 가급적
> console-host.js나 CSS tail(`tools/build-console-css.mjs` 경유)에서 우회.

상태 표기: ✅ 수정됨 · ⬜ 미착수

---

## 🔴 A. 눈에 보이는 버그 (높은 우선순위)

| # | 상태 | 문제 | 위치 | 수정 위치 |
|---|---|---|---|---|
| A1 | ⬜ | **Sticky 3중 충돌**: Console 필터바가 `top:0; z-index:5`인데, 플랫폼 헤더는 sticky `top:0; height:56px; z:45`(`index.html:607`, 스킨 `:17411`), 브레드크럼 `.ste-section-hd`는 sticky `top:56; z:30`(`index.html:6736`). 스크롤하면 필터바가 헤더/브레드크럼 **뒤로 숨음** | `css/console.css:205` (tail) | `tools/build-console-css.mjs` tail에서 `top: calc(56px + 헤더블록 높이)` + z-index 조정 후 재생성. B1 수정으로 `.ste-section-hd`가 타이틀 포함으로 더 높아졌으므로 실측 필요 |
| A2 | ⬜ | A1 연관 — a2 좌측 "Analysis" 트리의 inline sticky `top:calc(var(--topbar-h)+var(--filter-h)+20px)`=138px는 **삭제된 콘솔 자체 topbar(58px) 기준** 잔재. A1 수정 후 어긋남 | `console-screens-a12.js:197` | inline style이라 CSS tail에서 `!important`로 우회 (verbatim 보존) |
| A3 | ⬜ | A1 연관 — 드릴다운 앵커 스크롤 오프셋 `-80`이 실제 sticky 스택(헤더 56 + section-hd + 필터바 60)과 불일치 → 앵커 타깃이 필터바에 가림 | `console-host.js` renderScreen 내 anchor 블록 | host |
| A4 | ⬜ | **범례 색 ≠ 차트 색**: 범례가 다크 팔레트 하드코딩(#5b9bff/#76839c/#3c465c)인데 차트는 LIGHT 팔레트(#2563eb/#94a3b8/#cbd5e1/#7c3aed)로 그림. "Prior Year" 범례는 짙은 네이비, 실제 선/막대는 연회색 — 전 화면 공통 | `console-screens-a12.js:439-445` legend(), `console-screens-a345.js:195-198` legendMini/YoY/PlanActual/Spend | verbatim이지만 색 hex만 교체하는 최소 수정 또는 CSS tail `[style*="#3c465c"]` 속성 셀렉터 우회 (택1) |
| A5 | ⬜ | **차트 내부 다크 테마 하드코딩** (canvas라 CSS 우회 불가): 도넛 조각 테두리 `#0d1422`(`console-charts.js:156`), 히트맵 셀 테두리 `#0b1220`(`:209`), 라인 심볼 테두리 `#0b1422`(`:98,226`), 히트맵 visualMap inRange 다크 전용 팔레트(`:204`). 흰 카드 위에서 어둡고 탁함 | `console-charts.js` | DARK/LIGHT 토큰 객체에 항목 추가하는 직접 수정 불가피 (HANDOFF "가급적 금지"의 예외 — 캔버스 색은 우회 수단 없음) |
| A6 | ⬜ | **재렌더 시 툴팁 고착**: KPI 카드 hover 중 필터 클릭 → hover 대상이 DOM에서 제거돼 mouseout이 안 떠 `.cc-tip`이 화면에 잔존 | `console-ui.js:55-67` | **host에서 해결** — renderScreen()/refreshFilter() 시작 시 `UI.hideTip()` 호출 |
| A7 | ⬜ | `mousemove` 핸들러의 `JSON.parse`에 try/catch 없음(mouseover `:58`엔 있음) → 잘못된 data-tip 하나가 mousemove마다 예외 발생 | `console-ui.js:63` | 1줄 수정 |
| A8 | ⬜ | **사이드바 접기/펼치기 시 차트 리사이즈 안 됨**: 본문 폭이 바뀌어도 window resize 이벤트가 없어 ECharts가 이전 폭 유지. `Charts.resizeAll`(`console-charts.js:42`) 존재하나 **호출처 0건** | `js/app.js:368-374` 토글 핸들러 | app.js 토글에서 transition 후 `Charts.resizeAll()` (window.Charts 존재 가드) |
| A9 | ⬜ | ECharts 레지스트리 누적: `mount()`가 dispose한 옛 인스턴스를 Set에서 제거 안 함 (HANDOFF §10 기지사항) | `console-charts.js:33-40` | mount()에서 disposed prune / `registry.delete` |

## 🟡 B. 일관성 / UX

| # | 상태 | 문제 | 위치 |
|---|---|---|---|
| B1 | ✅ **2026-06-07 수정** | 페이지 타이틀(h1+sub)이 플랫폼 컨벤션(`.ste-section-hd` 안 브레드크럼 바로 아래, cf. `js/screens.js:3313`, `js/screens-analytics.js:937`)과 달리 필터바 아래 콘텐츠 영역에 렌더됨 | `console-host.js` — 수정 내역 아래 참조 |
| B2 | ⬜ | 서브라인 모순 표기: season축이면 Calendar "inactive"인데 `"YTD 2026 · FW25"`로 둘 다 표기, calendar 모드엔 `· All Seasons`가 붙음. 또 a1만 season 표기, a2~a5는 미표기 (불일치) | `console-screens-a12.js:26-29` (verbatim — B1으로 title/sub 갱신이 host에 모였으므로 host에서 sub 문자열을 직접 조립하는 우회 가능) |
| B3 | ⬜ | 서브 메뉴 전환 시 스크롤 위치 유지 → 긴 화면 하단에서 다른 메뉴 클릭하면 중간에 랜딩. 앵커 없을 때 `scrollTo(0,0)` 필요 | `console-host.js` renderScreen |
| B4 | ⬜ | 브레드크럼 `Analytics · Overview` vs h1 `Portfolio Overview/My Overview` — 중복·표현 불일치 | `console-host.js` render() crumbs |
| B5 | ⬜ | `document.title`이 서브 화면 미반영 ("Analytics · Sergio Tacchini" 고정) | `console-host.js` render() |
| B6 | ⬜ | 생성 CSS `.ste-console{min-height:100vh}` → 빈 상태(empty state)에서도 거대한 여백 카드 | `css/console.css:67` → tail에서 `min-height:auto` 재정의 |
| B7 | ⬜ | 도넛 툴팁 `52% · 52` 중복 — 퍼센트 데이터를 percent와 value로 이중 출력 (Quick Mix / Gender / Channel Mix) | `console-charts.js:152` donut formatter |
| B8 | ⬜ | 다크 스크롤바 썸(`#1f2a3c`)·셀렉션 색이 라이트 모드(mode-licensee 블록)에서 재정의 안 됨 | `css/console.css:67` (tail에서 보강) |
| B9 | ⬜ | 반응형 부재: `g-4`만 1320px 분기. hero 5장 `repeat(3,1fr)`, a2 `220px 1fr` 등 **inline grid는 미디어쿼리 영향권 밖** → 좁은 창에서 찌그러짐 (데스크톱 데모 전제면 보류 가능) | a12/a345 전반 |
| B10 | ⬜ | `.kpi-grid-8` / 주석 "8 headline KPIs" — 실제 타일 6개 | `console-data.js:459-468`, `console-screens-a12.js:102-110` |

## 🔵 C. 접근성

| # | 상태 | 문제 | 위치 |
|---|---|---|---|
| C1 | ⬜ | 필터 드롭다운·Licensee 선택기: 옵션이 전부 div — 키보드 포커스/Enter/**Esc 닫기**/ARIA(role, aria-expanded) 없음 | `console-host.js` dd()/licenseeSelector() |
| C2 | ⬜ | 드릴다운 카드(hero/quick-mix, `data-go`)가 div+cursor — 키보드 접근 불가, role 없음 | a12 전반 |
| C3 | ⬜ | Analytics 트리 부모에 `aria-expanded` 없음 (chevron은 aria-hidden이라 상태 전달 수단 전무) | `index.html:5333,5405` + `app.js` paintNavTrees에서 세팅 가능 |
| C4 | ⬜ | `refreshFilter()`의 outerHTML 통교체로 조작 시마다 포커스 소실 | `console-host.js` refreshFilter |
| C5 | ⬜ | 차트 canvas에 aria-label/대체 텍스트 없음 (낮음) | 전 차트 |

## ⚪ D. 코드 위생 (동작 영향 없음, 낮음)

- 데드 코드: `UI.srcNum`(사용 0건), a1 `peerHtml`(`a12:41`), `ICN.clock/check/alert/doc` 미사용,
  빈 함수 `breakTabsActive(){}`(`a12:450`), a3 `tierTotal` 미사용(`a345:17`),
  `STEData.actionItems/licenseeActions/peerBadge/pct` export되나 호출 0건,
  `applyContext`의 `mode-licensor` 토글은 `light=true` 고정이라 항상 false(`console-host.js:90` 부근)
- 3중 중복: mulberry PRNG(`console-data.js:7` / `a12:453` / `a345:199`),
  periodLabel·SEASON_LABELS(`a12:19,22` / `a345:6` / `console-data.js:506`)
- a5 `snsColors` 객체 render/init 중복 정의(`a345:146,186`)
- `esc()` 이스케이프가 콘솔 화면 출력 전반에 미적용 (mock 데이터라 실위험 낮음)
- `console.css`에 삭제된 콘솔 셸 요소(sidebar/topbar/brand/mode-toggle 등) 데드 셀렉터 다수 — 생성물이라 무해

---

## 추천 착수 순서

1. **A1+A2+A3** — sticky 스택 정합 (한 묶음으로; 실측은 file:// 탭에서)
2. ~~B1~~ ✅ 완료 (+ 후속으로 B2/B4를 host의 title/sub 조립 지점에서 함께 처리하면 효율적)
3. **A4+A5** — 라이트 테마 색 정리 (차트/범례)
4. **A6~A9** — 소형 버그 4건 (각 1~5줄)
5. C, B 나머지, D 순

검증은 HANDOFF.md §9 체크리스트 방식 (서버 없이 file:// 새로고침).

---

## B1 수정 내역 (2026-06-07)

`js/console/console-host.js` 2곳 수정 (CSS 변경 없음 — 호스트 기존 클래스 재사용):

1. **render()**: `.ste-section-hd`(sticky, `index.html:6736`)의 브레드크럼 아래에
   `.ste-page-hd-row` 추가 — `<h1 id="ste-console-title">` + `<p id="ste-console-sub">`.
   `.ste-section-hd h1`(700 28px navy) / `p`(400 14px muted) 호스트 스타일 자동 적용.
2. **renderScreen()**: 기존에 `#ste-console-main` 안에 그리던
   `<div class="page-head"><h1>…<div class="sub">…`을 제거하고, 위 두 노드를
   `textContent`로 갱신(필터 변경 시 sub의 기간/시즌/엔티티 즉시 반영).
   PDF/Excel 버튼 + ACTUAL/LICENSOR 필은 `.ste-console` 스코프 클래스(`.btn`/`.pill`)
   의존이라 **콘솔 영역 안에 잔류** — `.page-head`의 좌측만 비워 우측 정렬 액션 줄로 유지.

수정 후 라인 앵커: renderScreen `:225` · render `:278` · wire `:313` · route `:378`
(HANDOFF.md §4 표도 동기 갱신함)

검증 (file:// 새로고침):
- [ ] 5개 서브 각각: 타이틀+서브라인이 브레드크럼 바로 아래(필터바 위) 표시
- [ ] 필터(기간/시즌/Licensee/View) 변경 시 서브라인 즉시 갱신
- [ ] Licensee 계정(`STE.setSession({userId:'usr_06e0bea9'})`)에서 "My Overview" 표기
- [ ] 콘텐츠 상단 우측에 PDF/Excel/필 액션 줄 유지, 콘솔 영역 스타일 깨짐 없음
- [ ] 콘솔 에러 0 (favicon 404 허용)
