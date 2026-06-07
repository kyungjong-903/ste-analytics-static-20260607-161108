# STE Analytics — Distribution Detail Page Spec
### Sergio Tacchini Global AI Agent · Licensee View (SUGI France)
### v1.0 · 2026-06-07

---

## 0. 라이센시 컨텍스트

- **Licensee**: SUGI France
- **Authorized Territory**: 10 countries — France · DACH · Benelux · North Africa
- **Product Scope**: WEAR + ACC *(SHOES 제외)*
- **Currency**: € (Euro) 단일
- **Distribution Type**: Wholesale 중심 *(multi-brand retail, department stores, independent boutiques)*
- **데이터 cadence**: Season Plan / Season Actual *(분기 snapshot도 보조)*

---

## 1. 페이지 개요

- **경로**: Overview → Distribution 카드 클릭
- **필터 컨텍스트**: Calendar / Season / Actual-Plan 토글 승계
- **Distribution 특수성**: Season axis가 주, Calendar는 snapshot 시점

---

## 2. Sticky Filter Bar

```
[Year▼] [Period▼] · [Season▼] · [Actual | Plan]
```

**우상단**: `[All Tiers ▼]` — Tier별 필터 (All / Tier 1 / Tier 2 / Tier 3 / ST Online / Other)

---

## 3. KPI Tiles (4개)

| Active Doors | Net Door Δ | Revenue per Door | Top 5 Concentration |
|---|---|---|---|
| **386 / 420** | **+11** (YTD) | **€35.5K** | **42%** |
| (Active / Plan) | New +28 / Closed −17 | ▲ +5% vs prior Q | Top 5 accounts |

**KPI 의미**:
- **Active Doors X / Y**: 현재 운영중 도어 수 / 시즌 plan 목표
- **Net Door Δ**: 기간 내 신규 − 종결
- **Revenue per Door**: 평균 도어당 매출 (productivity)
- **Top 5 Concentration**: 상위 5개 account의 매출 비중 (편중 리스크)

---

## 4. Main Visualization

### 4.1 Door Movement Timeline *(시계열 — 시즌별, 3-Line Always-On)*

**항상 3개 라인 동시 표시**:

| 라인 | 스타일 | 의미 |
|---|---|---|
| **Actual** | Navy/Black **bold 실선** | 현재 active doors 추이 |
| **Plan** | Gray **점선 (dotted)** | 시즌 plan trajectory |
| **Prior Year** | Light Gray **얇은 실선 (thin)** | 전년 동시즌 reference |

```
Doors Active
   430 ┤            ┅ Plan (점선)
   400 ┤        ╭─━━ Actual (현재 SS26 386)
   380 ┤    ╭───╯─── Prior Year (얇은 실선)
   350 ┤────╯
   300 ┤
       └─────────────────────
       SS24 FW24 SS25 FW25 SS26 FW26
```

- **Legend toggle**: 각 라인 클릭으로 on/off
- **기본값**: 3개 모두 표시
- **미래 시즌**: Actual 비어있음, Plan 계속 표시, Prior Year 동일 시즌 reference

### 4.2 Tier Mix — Stacked Bar 또는 Donut

```
Tier 1 (Anchor)   32 doors  (8%)   €4.9M (36%)
Tier 2 (Core)     158 doors (41%)  €5.3M (39%)
Tier 3 (Volume)   142 doors (37%)  €2.8M (21%)
ST Online         38 doors  (10%)  €0.5M (4%)
Other             16 doors  (4%)   —
```

- 도어 수 + 매출 기여 동시 표시
- 각 Tier 클릭 시 해당 Tier 내 도어 list로 drill-down

---

## 5. Geographic Distribution — 10개 territory 국가

### 5.1 By Country (가로 막대)

```
France       178 doors · €6.8M · €38.2K/door
Germany      68 doors · €2.4M · €35.3K/door
Belgium      42 doors · €1.4M · €33.3K/door
Netherlands  34 doors · €1.0M · €29.4K/door
Switzerland  22 doors · €0.7M · €31.8K/door
Austria      16 doors · €0.5M · €31.3K/door
Luxembourg   6 doors  · €0.3M · €50K/door ⭐
Morocco      10 doors · €0.4M · €40K/door ⭐
Tunisia      6 doors  · €0.2M · €33.3K/door
Algeria      4 doors  · €0.2M · €50K/door ⭐
```

- ⭐ = 평균 이상 productivity 표시
- 도어 수 / 매출 / 도어당 매출 동시 표시

### 5.2 Region Grouping (보조 카드)

| Region | Doors | Net Sales | Productivity |
|---|---|---|---|
| **France** | 178 (46%) | €6.8M | €38.2K/door |
| **DACH** | 106 (28%) | €3.6M | €33.9K/door |
| **Benelux** | 82 (21%) | €2.7M | €33.0K/door |
| **North Africa** | 20 (5%) | €0.8M | €40.0K/door ⭐ |

---

## 6. Account-Level Analysis

### 6.1 Top 10 Accounts (매출 큰 순)

| 순위 | Account | Tier | Country | Doors | Net Sales | vs Plan | vs YoY |
|---|---|---|---|---|---|---|---|
| 1 | Galeries Lafayette | T1 | France | 12 | €1.4M | +8% | +12% |
| 2 | KaDeWe Group | T1 | Germany | 8 | €0.9M | +3% | +5% |
| 3 | Printemps | T1 | France | 6 | €0.7M | -2% | +1% |
| 4 | Inno Brussels | T2 | Belgium | 4 | €0.5M | +15% | +20% ⭐ |
| ... | | | | | | | |

**클릭 시 Account detail로 navigate** — 해당 account의 SKU별 매출, door별 분포, 시즌별 추이.

### 6.2 Account Concentration Risk

```
Top 5 accounts:  42% of total Net Sales  ⚠️ 집중도 높음
Top 10 accounts: 61%
Top 20 accounts: 76%
```

- Top 5 비중이 40% 이상이면 *concentration risk* flag
- AI insight: *"Galeries Lafayette 의존도 10.2% — diversification 검토 권장"*

---

## 7. Door Movement Detail

### 7.1 시즌별 movement waterfall

```
SS25 Ending Doors      375  ████████████████
+ New Doors            +28  ███
+ Reactivated          +5   █
− Closed              −17   ██
─────────────────────────────
SS26 Active Doors      391  ████████████████
```

### 7.2 New Doors Pipeline

테이블 — 시즌 내 신규 오픈한 도어:

| Account | Country | Tier | Open Date | First Season | YTD Sales |
|---|---|---|---|---|---|
| Boutique X (Lyon) | France | T3 | 2026-03-15 | SS26 | €18K |
| Modehaus Y | Germany | T2 | 2026-04-02 | SS26 | €42K |
| ... | | | | | |

### 7.3 Closed Doors Analysis

테이블 — 종결된 도어:

| Account | Country | Tier | Close Date | Last Season | Lost Revenue |
|---|---|---|---|---|---|
| Boutique Z | France | T3 | 2026-02-28 | FW25 | €28K/season |
| ... | | | | | |

**Closure reasons** 자동 분류 (가능하면):
- Business closure
- Brand discontinuation
- F&F territory reallocation
- Account default

---

## 8. Productivity Analysis — Revenue per Door

### 8.1 Revenue per Door by Tier

```
Tier 1 (Anchor)   €153K/door
Tier 2 (Core)     €34K/door
Tier 3 (Volume)   €19K/door
ST Online         €13K/door
```

### 8.2 Productivity Distribution (히스토그램)

```
Doors by revenue bucket:
< €10K       142 doors (37%) — Tier 3 dominant
€10-30K      96 doors  (25%)
€30-60K      78 doors  (20%)
€60-100K     32 doors  (8%)
€100K+       38 doors  (10%) — Tier 1 + top T2
```

### 8.3 Top / Bottom Performing Doors

**Top 10** — Revenue 가장 높은 도어 (개별 location 단위)
**Bottom 10** — Revenue 가장 낮은 도어 (closure 검토 후보)

---

## 9. Customer Type Distribution

도넛 + breakdown:
- Wholesale: 78% (302 doors, €10.7M)
- Retail (own stores): 12% (46 doors, €1.6M)
- Marketplace: 7% (28 doors, €1.0M)
- ST Online: 3% (10 doors, €0.4M)
- Other: <1%

---

## 10. 🤖 AI Distribution Insights

```
🤖 AI DISTRIBUTION INSIGHTS · YTD 2026

• Active doors 386 vs SS26 plan 420 (92%).
  Recovery from FW25 closures still incomplete.
  Focus: Germany Tier 2 expansion (10 net new
  needed for plan).

• Top 5 accounts = 42% concentration. Galeries
  Lafayette dependency at 10.2% — consider
  diversification toward Printemps & regional.

• North Africa productivity (€40K/door) leads
  all regions. Underexposed (20 doors only) —
  expansion opportunity for FW26.

• 17 doors closed YTD, net −€480K revenue loss.
  Reactivation pipeline: 5 doors in discussion
  targeting €120K recovery.
```

---

## 11. 페이지 공통 동작

### 11.1 데이터 스코프
- SUGI France 보유 distribution 정보만
- 10개 territory 국가만
- Out-of-Territory door는 별도 compliance flag

### 11.2 모든 수치 — Calendar / Season / Actual-Plan reactive

### 11.3 Drill-through
- Account 클릭 → Account detail
- Door 클릭 → Door detail (개별 location)
- Country 클릭 → Country expand

### 11.4 Export — PDF / Excel

### 11.5 통화 — € (Euro)

---

## 12. 개발자 핸드오프 prompt

> *"Sergio Tacchini Global AI Agent — Analytics 모듈 Distribution Detail 페이지 (Licensee View, SUGI France 기준)를 첨부 요구사항 명세에 따라 구현 부탁드립니다.*
>
> *데이터 스코프: SUGI France의 10개 territory 국가 distribution 정보. 카테고리 스코프는 WEAR + ACC.*
>
> *주요 구성: KPI Tiles 4개 (Active Doors X/Y, Net Door Δ, Revenue per Door, Top 5 Concentration) / Main Visualization — Door Growth Timeline (3-Line Always-On: Actual + Plan + Prior Year) + Tier Mix (T1/T2/T3/Online) / Geographic Distribution — 10개 국가 + Region Grouping / Account-Level Analysis — Top 10 + Concentration Risk / Door Movement Detail — 시즌별 waterfall + New/Closed Pipeline / Productivity Analysis — Revenue per Door by Tier + Distribution histogram + Top/Bottom doors / Customer Type Distribution / AI Distribution Insights.*
>
> *모든 수치 Calendar/Season/Actual-Plan reactive. Plan mode 정상 작동. 통화 € (Euro)."*

---

## 13. 우선순위

| Priority | 항목 |
|---|---|
| **P0** | KPI Tiles + Door Growth Timeline + Tier Mix + Geographic by Country |
| **P1** | Top 10 Accounts + Concentration Risk + AI Insights |
| **P2** | Door Movement (New/Closed) + Productivity + Customer Type |
