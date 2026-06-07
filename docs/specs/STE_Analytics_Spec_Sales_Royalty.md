# STE Analytics — Sales & Royalty Detail Page Spec
### Sergio Tacchini Global AI Agent · Licensee View (SUGI France)
### v1.0 · 2026-06-07

---

## 0. 라이센시 컨텍스트

- **Licensee**: SUGI France
- **Authorized Territory**: 10 countries — France · DACH · Benelux · North Africa
- **Product Scope**: WEAR + ACC *(SHOES 제외)*
- **Currency**: € (Euro) 단일
- **Out-of-Territory**: 별도 compliance flag

### Category Hierarchy (3-Level)

| 대분류 (CATEGORY) | 중분류 (SUB_CATEGORY) | 소분류 (PRODUCT CATEGORY) |
|---|---|---|
| **WEAR** | INNER | T SHIRT, POLO, KNITWEAR, FLEECE, DRESS, TRACKTOP |
| | OUTER | JACKETS, SKIWEAR |
| | BOTTOM | LEGGINGS, PANTS, SHORTS, SKIRTS, TRACKPANTS |
| | OTHERS | TRACKSUIT |
| **ACC** | HEADWEAR | HEADWEAR (Hats, Caps, Visors) |
| | UNDERWEAR | UNDERWEAR |
| | SOCKS | SOCKS |
| | BAG | SPORTS/TENNIS BAGS, BACKPACKS, SHOE BAGS, LUGGAGE |
| | OTHERS | WRISTBANDS, TOWELS, WATCHES, COSMETICS, LEATHER GOODS, SUNGLASSES, OPTICAL FRAMES, etc. |

---

## 1. 페이지 개요

- **경로**: Overview → Sales 카드 또는 Royalty 카드 클릭 시 진입
- **필터 컨텍스트**: Overview에서 설정된 Calendar / Season / Actual-Plan 토글 그대로 승계

---

## 2. 페이지 상단 — Sub-Navigation Tabs

```
[ Net Sales ]  [ Royalty ]  [ Variance Analysis ]  [ vs Contract Minimum ]
```

기본 탭: **Net Sales**

---

## 3. Sticky Filter Bar *(전역과 동일)*

- Calendar (Year + Period with Cumulative Through)
- Season
- Actual ↔ Plan 토글

**페이지 우상단**:
- **Wholesale ↔ Retail 토글** (Sales & Royalty 전용)
- **Country Region 필터**: All / France / DACH / Benelux / North Africa

---

## 4. Net Sales 탭

### 4.1 KPI Tiles (4개)

**Actual mode**:
| Net Sales | vs Plan % | vs YoY % | Effective Royalty % |

**Plan mode**:
| Net Sales Plan | Achieved % | vs Prior Plan % | Plan Royalty Rate |

### 4.2 Main Chart — 시계열 누적 라인 *(3-Line Always-On)*

**항상 3개 라인 동시 표시**:

| 라인 | 스타일 | 의미 |
|---|---|---|
| **Actual** | Navy/Black **bold 실선** | 현재 연도 실적 |
| **Plan** | Gray **점선 (dotted)** | 현재 연도 계획 |
| **Prior Year** | Light Gray **얇은 실선 (thin)** | 전년 동기 실적 (역사 reference) |

- X축: 월별 또는 분기별
- **Legend toggle**: 각 라인 클릭으로 visibility on/off 가능
- **기본값**: 3개 모두 표시

**Mode별 동작**:

| Mode | 메인 강조 | 비교 라인 |
|---|---|---|
| **Actual mode (기본)** | Actual (bold) | Plan (점선) + Prior Year (얇은 실선) |
| **Plan mode** | Plan (bold) | Actual (점선, 흐림) + Prior Year (얇은 실선) |

**미래 시점 처리**:
- Actual mode + 미래 기간: Actual 라인 끝남 (자연스럽게 종료), Plan + Prior Year는 계속 표시
- Plan mode + 미래 기간: Plan 라인 전체 표시, Actual은 비어있음, Prior Year 유지

### 4.3 Analytical Breakdowns

#### C-1. Season Contribution
해당 기간 매출에 기여한 시즌 분포 (stacked bar 또는 donut):
```
SS26 65% (€8.9M)
FW25 25% (€3.4M)
SS25 8%  (€1.1M)
Other 2% (€0.3M)
```

#### C-2. Geography — 국가별 매출 (SUGI France 10개 국가만)

가로 막대 (Top 10 = 전체):

```
France       €6.8M (49%) ▲ +5%
Germany      €2.4M (17%) ▼ -2%
Belgium      €1.4M (10%) ▲ +12%
Netherlands  €1.0M (7%)  ▲ +3%
Switzerland  €0.7M (5%)  ▼ -8%
Austria      €0.5M (4%)  ▲ +2%
Luxembourg   €0.3M (2%)  ▲ +18%
Morocco      €0.4M (3%)  ▲ +25%
Tunisia      €0.2M (1%)  ▲ +10%
Algeria      €0.2M (1%)  ▲ +15%
```

#### C-3. Region Grouping

| Region | 국가 수 | 매출 | 기여 % |
|---|---|---|---|
| **France** | 1 | €6.8M | 49% |
| **DACH** | 3 | €3.6M | 26% |
| **Benelux** | 3 | €2.7M | 19% |
| **North Africa** | 3 | €0.8M | 6% |

#### C-4. Geography × Product Matrix — Table ↔ Heatmap 토글

**View toggle**: `[Table] [Heatmap]` 우상단

**Table view** (10개 국가 × 2개 대분류):

| 국가 | WEAR | ACC | Total |
|---|---|---|---|
| France | €5.5M | €1.3M | €6.8M |
| Germany | €1.9M | €0.5M | €2.4M |
| Belgium | €1.1M | €0.3M | €1.4M |
| ... | | | |

- 정렬 가능 (각 컬럼 클릭)
- 셀 hover: SUB_CATEGORY 분포 tooltip
- 셀 클릭: SUB_CATEGORY 단위로 drill-down

**Heatmap view**:
- 행: 10개 국가 / 열: 2개 대분류 (WEAR, ACC)
- 색상 강도: 매출 값 비례
- Hover: 정확한 매출, vs Plan/YoY

#### C-5. Category Drill-Down (3단계 hierarchy)

```
Level 1 — CATEGORY
  WEAR  ████████████████ €9.2M (72%)
  ACC   ████████░░░░░░░░ €3.6M (28%)
       ▼ click to drill

Level 2 — SUB_CATEGORY (WEAR 클릭 시)
  WEAR → INNER  ████████████ €5.1M
       → OUTER  ████░░░░░░░░ €2.0M
       → BOTTOM ███████░░░░░ €1.8M
       → OTHERS █░░░░░░░░░░░ €0.3M

Level 3 — PRODUCT CATEGORY (INNER 클릭 시)
  WEAR → INNER → T SHIRT  €2.1M
              → POLO     €1.5M
              → KNITWEAR €0.8M
              → ...
```

- 각 레벨에서 vs Plan / vs YoY mini delta 표시
- Breadcrumb navigation

#### C-6. Customer Type Mix (anchor: #customer-type)

도넛 + legend:
- Wholesale / Retail / Marketplace / ST Online / Other Licensee / Other
- 예: Wholesale 72% · Retail 18% · Marketplace 7% · ST Online 3%

#### C-7. Tier Distribution

가로 바:
- Tier 1 / Tier 2 / Tier 3 / ST Online / Other
- 매출 분포 + 매출 per Tier

#### C-8. Gender Mix (anchor: #gender-mix)

도넛:
- Mens / Womens / Kids / Other
- 매출 % + vs Plan, vs YoY mini delta

#### C-9. In-Territory vs Out (anchor: #in-territory) ⚠️ Compliance Flag

```
TERRITORIAL COMPLIANCE

In-Territory      ██████████████ 98%
Out-of-Territory  █░░░░░░░░░░░░░ 2%

⚠️ €280K out-of-territory sales detected
[ View Investigation Report → ]
```

- In-Territory %가 95% 이하면 **빨간색 경고**
- Out-of-Territory 클릭 시 Investigation 페이지로 — Out 영역 정도 표시 (예: "EU non-territory: €180K" / "Non-EU: €100K") — **국가별 break down 안 함**

#### C-10. Top / Bottom 20 SKU

**Top 20** 테이블 (매출 큰 순):

| 순위 | SKU | Product Name | Category | Sub-Cat | 매출 € | Qty | 마진 % | 마진 € |
|---|---|---|---|---|---|---|---|---|
| 1 | ST-26-001 | Classic Polo White | WEAR | INNER (POLO) | €185K | 4,200 | 48% | €89K |
| ... | | | | | | | | |

**Bottom 20** 테이블 (Slow Movers):

| 순위 | SKU | Product Name | Category | Sub-Cat | 매출 € | Qty | 마진 % | Aged Days |

- 모든 컬럼 정렬 가능
- SKU 클릭 시 상세 페이지

---

## 5. Royalty 탭

### 5.1 KPI Tiles (4개)

| Royalty Earned | Effective Royalty % | vs Plan % | YTD Min Progress |

### 5.2 Main Chart
- Royalty 누적 라인 (월별/분기별)
- Effective rate 변화 추이 (보조 라인)

### 5.3 Breakdown
- **Royalty by Category** — WEAR / ACC royalty 기여
- **Royalty by Country** — 10개 영역 국가
- **Royalty by Customer Type** — Wholesale vs Retail 비교
- **Royalty Rate by Tier** (tier별 rate 다른 경우)
- **Royalty per Net Sales 추이** — effective rate % 월별/분기별 변화

---

## 6. Variance Analysis 탭

### 6.1 Plan vs Actual Heatmap
- 행 선택: Category / Country (10개) / Customer Type / Tier
- 열: 시즌 또는 분기
- 색상: Plan 대비 attainment %
  - 녹색 (>110%) / 황색 (90-110%) / 빨강 (<90%)

### 6.2 Top Performers — Plan 초과 달성 Top 10

### 6.3 Bottom Performers — Plan 미달 Bottom 10
- 갭 크기 순 정렬
- 자동 인사이트 (예: *"WEAR · OUTER -€450K — 매장 노출 감소"*)

### 6.4 Driver Analysis Insight Box
- *"YTD 갭의 65%가 WEAR · OUTER underperformance"*
- *"DACH 시장이 +€280K 초과 달성 — France 일부 부진 상쇄"*

### 6.5 YoY Drivers *(신규 추가)*

**메인 차트의 Prior Year 라인과 연결된 깊이 분석 섹션**:

🤖 자동 생성 narrative insight 형태:

```
🤖 YoY DRIVERS · YTD 2026 vs 2025

• Overall growth: +13% (€13.7M vs €12.1M)
• Top positive driver: France WEAR · INNER +€850K
  (+22%) — SS26 Polo line strong sell-through
• Top negative driver: ACC · BAG -€120K (-15%) —
  legacy bag line discontinued
• Region growth: DACH +24% leads vs France +8%
• Channel: Marketplace +45% — fastest growing
  channel YoY
• Season comparison: SS26 +18% vs SS25 same point
```

**보조 시각화**:
- YoY 변화율 horizontal bar (Category / Region / Channel별 +/- delta)
- Top 5 positive / Top 5 negative drivers
- YoY waterfall: Prior Year → +Growth − Decline → Current Year

---

## 7. vs Contract Minimum 탭

### 7.1 Year-to-Date Progress Bar
- 0% ~ 100% = Annual Minimum
- 현재 위치 마커
- 초과 (>100%) 다른 색상

### 7.2 Year-End Projection
- 현재 페이스로 연말 도달 % 예상
- 만약 미달: *"⚠️ 현재 페이스로 연말 84%만 달성. 부족액 €160K"*

### 7.3 Historic Comparison
- 최근 3년 최종 달성 %
- 라인 또는 막대

### 7.4 Required Pace
- *"100% 달성을 위해 매월 필요한 royalty: €X"*
- *"현재 월별 실적: €Y → 페이스 충분/부족"*

---

## 8. 페이지 공통 동작

### 8.1 데이터 스코프
- SUGI France에 귀속된 매출만
- 국가 dimension: 10개 authorized territory 국가만 표시
- Out-of-Territory: 별도 compliance 영역으로만 처리

### 8.2 모든 수치 — Calendar/Season/Actual-Plan 토글 reactive

### 8.3 모든 차트 — hover tooltip + 정확한 수치

### 8.4 Drill-through
- 카테고리 클릭 → sub-category 노출
- 국가 클릭 → 해당 국가 detail
- SKU 클릭 → 해당 SKU 분석 페이지

### 8.5 Export
- 우상단 *"Export"* 버튼 — PDF / Excel

### 8.6 통화 — € (Euro)

---

## 9. 개발자 핸드오프 prompt

> *"Sergio Tacchini Global AI Agent — Analytics 모듈 Sales & Royalty Detail 페이지 (Licensee View, SUGI France 기준)를 첨부 요구사항 명세에 따라 구현 부탁드립니다.*
>
> *데이터 스코프: SUGI France의 authorized territory (France/DACH/Benelux/North Africa 10개 국가)로 제한, WEAR + ACC 카테고리만. Out-of-Territory 매출은 별도 compliance flag로만 표시. Overview의 filter 컨텍스트와 동기화되어 모든 수치가 reactive하게 재계산.*
>
> *4 sub-tabs: Net Sales / Royalty / Variance Analysis / vs Contract Minimum. 페이지 우상단 Wholesale ↔ Retail 토글 + Country Region 필터.*
>
> *Net Sales 탭의 주요 breakdown: Season Contribution / Geography (10국) / Region Grouping / Geography × Product Matrix (Table ↔ Heatmap 토글) / Category Drill-down (3단계: WEAR-ACC 대분류 → SUB_CATEGORY → PRODUCT CATEGORY) / Customer Type Mix (anchor #customer-type) / Tier Distribution / Gender Mix (anchor #gender-mix) / In-Territory vs Out Compliance Flag (anchor #in-territory) / Top 20 + Bottom 20 SKU 테이블 (매출, 수량, 마진 정보 포함).*
>
> *Main Chart는 3-Line Always-On 구조: Actual (Navy bold 실선) + Plan (Gray 점선) + Prior Year (Light Gray 얇은 실선) 항상 동시 표시, Legend 토글로 각 라인 visibility 제어 가능. Variance Analysis 탭에 YoY Drivers 섹션 추가 (Prior Year 라인과 연결되는 깊이 분석).*"

---

## 10. 우선순위

| Priority | 항목 |
|---|---|
| **P0** | Net Sales 탭 + KPI + Main Chart + Geography + Category Drill-down |
| **P1** | Royalty 탭 + vs Contract Minimum 탭 |
| **P2** | Variance Analysis 탭 + Driver insights |
| **P3** | Top/Bottom SKU + Heatmap toggle |
