# STE Analytics — Inventory Detail Page Spec
### Sergio Tacchini Global AI Agent · Licensee View (SUGI France)
### v1.0 · 2026-06-07

---

## 0. 라이센시 컨텍스트

- **Licensee**: SUGI France
- **Authorized Territory**: 10 countries — France · DACH · Benelux · North Africa
- **Product Scope**: WEAR + ACC *(SHOES 제외)*
- **Currency**: € (Euro) 단일
- **데이터 특성**: 분기별 snapshot (Actual만, **Plan 개념 없음**)

---

## 1. 페이지 개요

- **경로**: Overview → Inventory 카드 클릭 시 진입
- **필터 컨텍스트**: Calendar / Season / Actual-Plan 토글 승계
- **Plan mode 선택 시**: *"Plan data not applicable for Inventory"* 메시지 표시 → 자동으로 Actual mode 유지
- **Inventory는 snapshot 데이터** → Period 선택 의미 = *"해당 분기말 시점의 재고 상태"*

---

## 2. 페이지 상단

```
[Year▼] [Period▼] · [Season▼] · [Actual | Plan(N/A)]
```

**우상단 toggle**: `[Stock Value €] [Stock Units]` — 금액 vs 수량 단위 전환

---

## 3. KPI Tiles (4개)

| Stock Value | Stock-to-Sales | Inventory Turn | Aged Inventory % |
|---|---|---|---|
| **€3.9M** | **3.6 months** | **2.5×** | **23%** |
| ▲ +5% vs prior Q | ▼ -0.4 vs prior Q | ▲ +0.2 vs prior Q | ▲ +3pp vs prior Q |

**각 KPI hover tooltip**:
- Stock Value: 절대값 + breakdown by 카테고리
- Stock-to-Sales: 정의 (현재 stock / 최근 3개월 평균 sell rate)
- Inventory Turn: 정의 (연환산: COGS 12개월 / 평균 재고)
- Aged Inventory %: 정의 (90일 이상 보유 재고 비중)

---

## 4. Main Visualization — Category × Season Matrix

```
              SS25    FW25    SS26    FW26    SS27
WEAR          60      9       97      90      —
ACC           36      50      12      57      —
```

**셀 색상 코드**:
- 🟢 녹색 (60-100): 정상 — sell-through 진행 중 또는 fresh stock
- 🟡 황색 (30-59): 주의 — 회전 지연
- 🔴 빨강 (0-29): 위험 — aged 또는 stockout 위험
- 🔵 파랑 (높은 회전): 인기 sell-through 강함
- ⬜ 회색 (—): 데이터 없음 (미래 시즌 또는 미생산)

**셀 hover detail**:
- 정확한 Stock Value (€)
- Stock Units (개)
- Aged Days 분포 (0-30 / 30-90 / 90-180 / 180+)
- Sell-through % (대비 시즌 plan)
- Top 3 SKU 미니 list

**셀 클릭 → drill-down**:
- 중분류 (SUB_CATEGORY) 단위로 expand
- 예: WEAR × SS26 클릭 → INNER / OUTER / BOTTOM / OTHERS 행으로 expand
- 한 번 더 클릭 → 소분류 (PRODUCT CATEGORY) 까지

---

## 5. Stock Composition Breakdown

### 5.1 By Category — WEAR / ACC mix

도넛 차트:
- WEAR: 78% (€3.0M)
- ACC: 22% (€0.9M)

### 5.2 By Sub-Category — WEAR 내부 분포

가로 막대:
```
INNER   €1.2M (40%)
OUTER   €0.6M (20%)
BOTTOM  €0.8M (27%)
OTHERS  €0.4M (13%)
```

### 5.3 By Season — 시즌별 재고 비중

가로 막대:
```
SS26 (current)  €2.1M (54%) — fresh
FW25 (closing)  €0.9M (23%) — sell-through
SS25 (aged)     €0.4M (10%) — markdown 후보
SS25- (older)   €0.2M (5%)  — 처분 검토
FW26 (pre)      €0.3M (8%)  — sell-in 시작
```

---

## 6. Risk Flags — Stockout & Markdown ⚠️

### 6.1 Stockout Candidates (재고 부족 위험)

테이블 — 정렬: 위험순 (잔여 주수 작은 것부터):

| SKU | Product Name | Category | Current Stock | Avg Weekly Sell | Weeks Remaining | Action |
|---|---|---|---|---|---|---|
| ST-26-018 | Tennis Polo W M | WEAR · INNER | 142 | 38 | **3.7 weeks** ⚠️ | Reorder |
| ST-26-024 | Court Skirt M | WEAR · BOTTOM | 96 | 22 | **4.4 weeks** ⚠️ | Reorder |
| ST-26-A05 | Classic Cap | ACC · HEADWEAR | 210 | 45 | **4.7 weeks** ⚠️ | Reorder |
| ... | | | | | | |

**경고 threshold**:
- Weeks Remaining < 4 → 빨강
- 4-8 weeks → 황색
- 8+ weeks → 정상

### 6.2 Markdown Candidates (처분 후보)

테이블 — 정렬: Aged Days 큰 순:

| SKU | Product Name | Category | Aged Days | Stock Value | Suggested Markdown % | Action |
|---|---|---|---|---|---|---|
| ST-25-T08 | SS25 Polo Y | WEAR · INNER | **184 days** | €18K | 40% | Markdown |
| ST-25-J03 | SS25 Track Jacket | WEAR · OUTER | **162 days** | €24K | 35% | Markdown |
| ST-24-B02 | Old Season Bag | ACC · BAG | **221 days** | €8K | 50% | Clearance |
| ... | | | | | | |

**처분 추천 로직** (자동 제안):
- 90-150 days aged: 20% markdown
- 150-200 days: 35% markdown
- 200+ days: 50% markdown 또는 outlet/clearance

---

## 6.3 *(추가)* Stock Value 추이 차트 *(2-Line — Actual + Prior Year)*

Inventory는 Plan 개념이 없으므로 **2-Line** 구조 적용:

| 라인 | 스타일 | 의미 |
|---|---|---|
| **Actual** | Navy/Black **bold 실선** | 분기말 stock value 추이 |
| **Prior Year** | Light Gray **얇은 실선 (thin)** | 전년 동시점 reference |

```
Stock Value €M
   5.0 ┤
   4.5 ┤    ╭───●  €4.3M (Q1)
   4.0 ┤    ╯    ╲ €3.9M (Q2 current)
   3.5 ┤───●     ─── Prior Year reference
   3.0 ┤
       └────────────────
       Q1 Q2 Q3 Q4 Q1 Q2
       2025         2026
                  ▲ today
```

- Legend toggle: 각 라인 on/off
- 미래 분기: Actual 비어있음, Prior Year 동일 시점 표시

---

## 7. Movement Analysis — Quarter-over-Quarter Waterfall

```
Beginning Stock (Q1 end)    €4.3M
+ Inbound                   €1.8M
+ Returns                   €0.2M
− Sold                     −€2.1M
− Markdowns/Adjustments    −€0.3M
─────────────────────────────────
Ending Stock (Q2 end)       €3.9M
```

**옆 보조 지표**:
- Sell-through rate: 49% (Sold / (Beginning + Inbound))
- Return rate: 9.5% (Returns / Sold)
- Adjustment rate: 1.4%

---

## 8. Geographic Distribution — 국가별 재고

가로 막대 (SUGI France 10개 국가):

```
France       €1.8M (46%)
Germany      €0.7M (18%)
Belgium      €0.4M (10%)
Netherlands  €0.3M (8%)
Switzerland  €0.2M (5%)
Austria      €0.15M (4%)
Luxembourg   €0.1M (3%)
Morocco      €0.15M (4%)
Tunisia      €0.05M (1%)
Algeria      €0.05M (1%)
```

각 bar 우측: Stock Value + 비중 + Stock-to-Sales (months) 보조 metric

---

## 9. Age Distribution — 재고 노화

가로 stack bar:

```
0-30 days       €1.8M  46%
30-90 days      €1.2M  31%
90-180 days     €0.7M  18% ⚠️
180+ days       €0.2M  5%  🔴
```

90+ days 비중이 23% (Aged Inventory %) — **KPI 와 연결**.

---

## 10. 🤖 AI Insights — Inventory

```
🤖 AI INVENTORY INSIGHTS · Q2 2026 snapshot

• Stockout risk: 8 SKUs in INNER category may
  run out within 4 weeks. Recommend reorder
  review focused on Polo and T-Shirt lines.

• €120K of SS25 inventory aged 150+ days —
  suggest 35% markdown to clear by FW26 launch.

• Tunisia stock-to-sales ratio is 5.2 months
  vs portfolio avg of 3.6 — over-supplied.
  Consider rebalance to France or Germany.

• Inventory turn 2.5× — slightly below sport-
  lifestyle benchmark of 2.8×. Aging stock is
  primary driver.
```

필터 변경 시 (period, season) AI insights도 reactive하게 재생성.

---

## 11. 페이지 공통 동작

### 11.1 데이터 스코프
- SUGI France 보유 inventory만
- 카테고리: WEAR + ACC
- 국가: 10개 territory countries
- Out-of-Territory 재고는 별도 flag (있다면)

### 11.2 모든 수치 — Calendar/Season 필터 reactive

### 11.3 Plan mode 처리
- *"Plan data not applicable for Inventory"* 메시지 표시
- 자동으로 Actual mode 유지

### 11.4 모든 차트/테이블 — hover tooltip + drill-through

### 11.5 Export — PDF / Excel — 테이블, 매트릭스 export 가능

### 11.6 통화 — € (Euro)

---

## 12. 개발자 핸드오프 prompt

> *"Sergio Tacchini Global AI Agent — Analytics 모듈 Inventory Detail 페이지 (Licensee View, SUGI France 기준)를 첨부 요구사항 명세에 따라 구현 부탁드립니다.*
>
> *데이터 스코프: SUGI France의 WEAR + ACC 카테고리, 10개 territory 국가. Inventory는 분기별 snapshot 데이터로 Plan 개념 없음 — Plan mode 선택 시 'Plan data not applicable for Inventory' 메시지 표시 후 자동으로 Actual mode 유지.*
>
> *주요 구성: KPI Tiles 4개 (Stock Value, Stock-to-Sales, Inventory Turn, Aged Inventory %) / Main Visualization — Category × Season Matrix (셀 색상 코드 + drill-down) / Stock Composition (Category mix / Sub-Category / Season별) / Risk Flags — Stockout Candidates 테이블 + Markdown Candidates 테이블 / Movement Analysis Waterfall / Geographic Distribution (10개 국가) / Age Distribution / AI Inventory Insights (narrative 3-4 items).*
>
> *모든 수치 Calendar / Season 필터 reactive. 통화 € (Euro)."*

---

## 13. 우선순위

| Priority | 항목 |
|---|---|
| **P0** | KPI Tiles + Category × Season Matrix + Stockout/Markdown Candidates |
| **P1** | AI Inventory Insights + Stock Composition |
| **P2** | Movement Analysis + Geographic Distribution + Age Distribution |
