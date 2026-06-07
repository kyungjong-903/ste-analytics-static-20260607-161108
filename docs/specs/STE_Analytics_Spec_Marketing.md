# STE Analytics — Marketing Detail Page Spec
### Sergio Tacchini Global AI Agent · Licensee View (SUGI France)
### v1.0 · 2026-06-07

---

## 0. 라이센시 컨텍스트

- **Licensee**: SUGI France
- **Authorized Territory**: 10 countries — France · DACH · Benelux · North Africa
- **Product Scope**: WEAR + ACC *(SHOES 제외)*
- **Marketing Scope**: **In-Territory 한정** (performance marketing 본인 영역에서만 집행)
- **Currency**: € (Euro) 단일
- **데이터 cadence**: Season Plan / **Monthly Actual** (분기 / 시즌이 아닌 월별)
- **Budget 기준**: Net Sales × 10% (performance marketing). Brand marketing + Photography는 별도 부담

---

## 1. 페이지 개요

- **경로**: Overview → Marketing 카드 클릭
- **필터 컨텍스트**: Calendar / Season / Actual-Plan 토글 승계
- **Marketing 특수성**: **월별 단위 추적**이 메인 (SNS, spend pacing 모두 월 단위)

---

## 2. Sticky Filter Bar

```
[Year▼] [Period▼] · [Season▼] · [Actual | Plan]
```

**우상단**: `[Marketing Type ▼]` — All / Brand / Performance / Photography 토글

---

## 3. KPI Tiles (4개)

| Total Spend | vs Plan | ROI / ROAS | Brand Compliance |
|---|---|---|---|
| **€547K** | **+12%** ▲ | **3.9×** | **0 issues** ✓ |
| YTD 2026 | vs Q2 Plan | Net Sales return / Spend | Issues flagged |

**Tile 의미**:
- **Total Spend**: 기간 내 누적 marketing spend
- **vs Plan**: 시즌 budget plan 대비 페이스
- **ROI**: Net Sales attributable / Marketing spend
- **Brand Compliance**: F&F 가이드라인 위반 건수 (0이면 정상)

---

## 4. Main Visualization

### 4.1 Spend Pacing — Quarterly Bars *(3-Line Always-On)*

**3-Line Always-On 구조** *(bar + line 조합)*:

| 요소 | 스타일 | 의미 |
|---|---|---|
| **Actual** | Navy **bold 막대** | 현재 연도 분기별 spend |
| **Plan** | Gray **점선 라인 overlay** | 분기 budget plan |
| **Prior Year** | Light Gray **얇은 막대 (옆에 ghost)** | 전년 동분기 spend |

```
       Actual ━━ Plan ┅┅ Prior Year ░

Q1   ████████████ €120K
     ░░░░░░░░ €98K (prior)        ━━━━━━━━━━ €115K plan

Q2   ████████████████ €165K
     ░░░░░░░░░░░ €145K (prior)    ━━━━━━━━━━ €180K plan

Q3   ░░░░░░░░░ — (미래)
     ░░░░░░░░░░░░ €175K (prior)   ━━━━━━━━━━ €200K plan

Q4   ░░░░░░░░░ — (미래)
     ░░░░░░░░░░ €145K (prior)     ━━━━━━━━━━ €150K plan
```

- 누적: €280K actual / €295K plan-to-date (95%) / €243K prior YTD
- Legend toggle: 각 요소 visibility on/off
- 미래 분기: Actual 비어있음, Plan + Prior Year는 계속 표시
- vs Plan delta 색상 코드: 녹/황/빨

### 4.2 Channel Mix — Donut

```
Instagram      32% · €175K
TikTok         23% · €126K
X (Twitter)    12% · €66K
OOH            14% · €77K
Print          8%  · €44K
Event          12% · €66K
Influencer     5%  · €27K
```

- 클릭 시 해당 채널의 캠페인 list로 drill-down

---

## 5. SNS Performance Tracking (월별 단위)

**3개 SNS 채널 카드 — Instagram / TikTok / X**

각 카드 구성 *(3-Line Always-On — Monthly Cumulative)*:

```
INSTAGRAM
Followers: 62.4K (Target 150K · 42%)

Monthly Cumulative
70K┤             ┅┅┅ Plan (점선)
60K┤            ╱━━━ Actual (bold, navy)
50K┤      ╭─────────── Prior Year (얇은 실선)
30K┤      ╱
10K┤ ────╯
    └────────────────────
    Jan Feb Mar Apr May Jun ...

Engagement Rate: 4.2% (↑ +0.3pp)
Reach: 1.2M YTD
Impressions: 4.8M YTD
```

**3-Line 구조**:
- Actual: Navy bold 실선
- Plan: Gray 점선 (year-end target trajectory)
- Prior Year: Light Gray 얇은 실선 (전년 동월 누적)

**TikTok / X 카드**도 동일 구조.

**KPI per channel**:
- Followers (current / year-end target / % progress)
- Cumulative line chart (Plan vs Actual)
- Engagement Rate
- Reach / Impressions YTD

**경고 표시**: 채널이 *"behind plan"* 페이스면 visual flag.

---

## 6. Brand vs Performance Marketing Breakdown

### 6.1 Spend Split

도넛:
- **Brand Marketing**: €165K (30%) — 브랜드 인지/구축 (Event, Print, Influencer)
- **Performance Marketing**: €330K (60%) — 직접 매출 driver (Instagram/TikTok/X ads, search)
- **Product Photography**: €52K (10%) — flat-lay 등 production cost

### 6.2 Budget Allocation 비교

```
Performance (10% of Net Sales target)
  Plan:  €492K (10% × €4.9M YTD net sales)
  Actual:€330K (67% of plan target)
  → On target

Brand Marketing (별도 budget)
  Plan:  €200K annual
  Actual:€165K YTD (83% pace)

Photography (별도)
  Plan:  €60K annual
  Actual:€52K YTD (87% pace)
```

---

## 7. Campaign Performance

### 7.1 Top Campaigns by ROI

테이블:

| Campaign | Channel | Period | Spend | Attributable Sales | ROI |
|---|---|---|---|---|---|
| SS26 Tennis Hero | Instagram + TikTok | Feb-Mar | €45K | €315K | 7.0× ⭐ |
| French Open Activation | OOH + Event | Apr-Jun | €82K | €420K | 5.1× ⭐ |
| Polo Spring Drop | Instagram | Mar-Apr | €28K | €98K | 3.5× |
| Mother's Day | X + Print | May | €18K | €54K | 3.0× |
| ... | | | | | |

### 7.2 Bottom Campaigns (개선 검토)

| Campaign | Channel | Spend | Sales | ROI | 검토 사유 |
|---|---|---|---|---|---|
| FW Influencer #2 | Influencer | €22K | €18K | 0.8× ⚠️ | Underperformance |
| TikTok Test Drop | TikTok | €15K | €12K | 0.8× ⚠️ | Below threshold |

---

## 8. Geographic Distribution — 마케팅 영역 분포

가로 막대 (10개 territory 국가):

```
France       €270K (49%)
Germany      €98K (18%)
Belgium      €55K (10%)
Netherlands  €44K (8%)
Switzerland  €27K (5%)
Austria      €22K (4%)
Luxembourg   €11K (2%)
Morocco      €11K (2%)
Tunisia      €6K (1%)
Algeria      €6K (1%)
```

각 country 우측: Spend + Net Sales lift + 도출 ROI

---

## 9. Brand Compliance Tracker

### 9.1 Compliance Score

```
BRAND COMPLIANCE · 100% ✓

Last review:  Q2 2026
Total reviews: 18
Compliant:     18
Issues flagged: 0
Avg approval time: 2.3 days
```

### 9.2 Recent Reviews 테이블

| Asset | Type | Submitted | Status | Reviewer |
|---|---|---|---|---|
| French Open OOH | Visual | 2026-04-20 | ✓ Approved | F&F Brand |
| Polo Campaign Hero | Photo | 2026-04-15 | ✓ Approved | F&F Brand |
| Tennis Spring Video | Video | 2026-03-10 | ✓ Approved | F&F Brand |

### 9.3 Compliance Issues (있을 때만 표시)

- 위반 사항 발생 시 빨강 패널 강조
- 해결 액션 명시

---

## 10. Customer Type Distribution (마케팅 spend 기준)

도넛:
- Wholesale Trade Activation: 18% (€98K)
- Retail / Brand DTC: 42% (€230K)
- Marketplace Co-op: 15% (€82K)
- ST Online Support: 10% (€55K)
- Cross-channel (Brand): 15% (€82K)

---

## 11. 🤖 AI Marketing Insights

```
🤖 AI MARKETING INSIGHTS · YTD 2026

• French Open Activation (€82K) delivered 5.1×
  ROI — best campaign of the year. Consider
  doubling investment for Roland-Garros 2027.

• TikTok follower growth (57K vs 110K target,
  52%) is behind plan. Performance marketing
  reallocation suggested from print (current
  8% share) to TikTok creator partnerships.

• North Africa marketing spend (€23K, 4%) vs
  sales contribution (6%) — under-invested.
  Productivity €40K/door highest of all
  regions. Consider local campaigns to support
  FW26 launch.

• Brand Compliance: 100% YTD (18/18). Zero
  guideline violations. Avg approval 2.3 days.
```

---

## 12. 페이지 공통 동작

### 12.1 데이터 스코프
- SUGI France marketing 활동만
- 10개 territory 국가만
- Marketing type 토글에 따라 표시 영역 변동

### 12.2 모든 수치 — Calendar / Season / Actual-Plan reactive

### 12.3 월별 단위 우선
- SNS는 월별 granularity (분기로 group 불가)
- Spend pacing은 분기별 가능

### 12.4 Drill-through
- 캠페인 클릭 → 캠페인 detail
- 채널 클릭 → 채널 분석
- 국가 클릭 → 해당 국가 marketing detail

### 12.5 Export — PDF / Excel

### 12.6 통화 — € (Euro)

---

## 13. 개발자 핸드오프 prompt

> *"Sergio Tacchini Global AI Agent — Analytics 모듈 Marketing Detail 페이지 (Licensee View, SUGI France 기준)를 첨부 요구사항 명세에 따라 구현 부탁드립니다.*
>
> *데이터 스코프: SUGI France의 In-Territory marketing 활동 (10개 territory 국가), 월별 actual data + 시즌별 plan data 기반.*
>
> *주요 구성: KPI Tiles 4개 (Total Spend, vs Plan, ROI, Brand Compliance Issues) / Main Visualization — Spend Pacing 분기별 Plan vs Actual + Channel Mix 도넛 / SNS Performance Tracking — Instagram / TikTok / X 카드 3개 (월별 cumulative chart Plan vs Actual, follower target progress, engagement, reach) / Brand vs Performance Marketing Breakdown — Brand / Performance / Photography spend split + budget allocation 분석 / Campaign Performance — Top campaigns by ROI 테이블 + Bottom campaigns 검토 테이블 / Geographic Distribution — 10개 territory 국가별 spend + Net Sales lift + ROI / Brand Compliance Tracker — score + Recent reviews / Customer Type Distribution / AI Marketing Insights.*
>
> *모든 수치 Calendar/Season/Actual-Plan reactive. SNS는 월별 granularity 우선. 통화 € (Euro)."*

---

## 14. 우선순위

| Priority | 항목 |
|---|---|
| **P0** | KPI Tiles + Channel Mix + Spend Pacing + SNS Tracking (Instagram/TikTok/X) |
| **P1** | Campaign Performance + Brand vs Performance breakdown + AI Insights |
| **P2** | Geographic + Brand Compliance + Customer Type |
