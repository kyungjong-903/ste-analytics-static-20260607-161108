# STE Analytics — Marketing 모듈 신규 추가 (Patch v1.2)
### SNS Engagement Tracker — AI Crawling 기반 포스팅 단위 추적
### 2026-06-07

---

## ✨ 신규 모듈 개요

**모듈명**: SNS Engagement Tracker

**위치**: Marketing Detail Page · Section 5 (SNS Performance Tracking) **하위 신규 섹션**으로 추가
*(기존 Instagram / TikTok / X 채널 카드 아래에 배치)*

**특이사항**:
- **Plan 데이터 없음** — Actual만 추적
- **AI Crawling 기반** — 각 SNS 플랫폼 API / 공개 데이터를 AI Agent가 주기적으로 크롤링하여 자동 수집
- 라이센시가 별도로 입력할 필요 없음 — 데이터 동기화는 백엔드 자동 처리
- **포스팅 단위** (channel 단위 X) — 개별 콘텐츠의 성과를 row별로 추적

---

## 🎯 모듈 목적

기존 SNS Performance Tracking은 **채널 단위 누적 지표**(팔로워, 도달, 노출)를 추적했다면,
SNS Engagement Tracker는 **개별 포스팅 단위 성과**를 추적해서 어떤 콘텐츠가 ROAS가 높았는지 / 어떤 포스팅이 비용 대비 효과가 좋았는지를 즉각 파악할 수 있게 한다.

---

## 📋 데이터 필드 정의 (5개 컬럼)

| # | Field | Type | 설명 | 비고 |
|---|---|---|---|---|
| 1 | **Posting Date** | Date | 콘텐츠 게시 날짜 | YYYY-MM-DD |
| 2 | **Like** | Integer | 좋아요 누적 수 | AI 크롤링 |
| 3 | **Impression** | Integer | 노출 수 (Reach 아님) | AI 크롤링 |
| 4 | **Advertising Cost** | Currency (€) | 해당 포스팅에 집행된 광고비 | Boost / Promotion |
| 5 | **ROAS** | Decimal (×) | Return on Ad Spend = Attributable Sales ÷ Advertising Cost | 자동 계산 |

---

## 📊 Mock Data — 3개 샘플 *(SUGI France 기준)*

### Row 1 — Instagram · SS26 Tennis Hero Reel

| Field | Value |
|---|---|
| Posting Date | 2026-03-12 |
| Like | 18,420 |
| Impression | 412,000 |
| Advertising Cost | €3,200 |
| ROAS | **6.8×** ⭐ |

### Row 2 — TikTok · French Open Activation Teaser

| Field | Value |
|---|---|
| Posting Date | 2026-04-22 |
| Like | 24,800 |
| Impression | 685,000 |
| Advertising Cost | €4,500 |
| ROAS | **5.4×** ⭐ |

### Row 3 — X (Twitter) · Polo Spring Drop Post

| Field | Value |
|---|---|
| Posting Date | 2026-03-28 |
| Like | 3,150 |
| Impression | 78,000 |
| Advertising Cost | €1,800 |
| ROAS | **3.2×** |

### 통합 테이블 뷰 (3 rows)

| Posting Date | Channel | Content | Like | Impression | Ad Cost | ROAS |
|---|---|---|---|---|---|---|
| 2026-03-12 | Instagram | SS26 Tennis Hero Reel | 18,420 | 412,000 | €3,200 | 6.8× ⭐ |
| 2026-03-28 | X | Polo Spring Drop Post | 3,150 | 78,000 | €1,800 | 3.2× |
| 2026-04-22 | TikTok | French Open Activation Teaser | 24,800 | 685,000 | €4,500 | 5.4× ⭐ |

*※ 정렬 default: Posting Date 최신순. Sort 컬럼 클릭 가능.*

---

## 🤖 AI Crawling 동작 명세

### 데이터 수집 흐름

```
SNS 플랫폼 (Instagram / TikTok / X)
        ↓
   AI Agent Crawler (주기적 자동 실행)
        ↓
   Raw Metric 추출 (Like / Impression)
        ↓
   광고비 데이터 join (광고 플랫폼 API)
        ↓
   ROAS 자동 계산
        ↓
   SNS Engagement Tracker 테이블 업데이트
```

### Crawling 표기 *(화면 상단에 표시)*

```
🤖 Last crawled: 2026-06-07 09:32 KST · Auto-sync every 4 hours
```

- *"AI Agent"* 아이콘 + *"Auto-detected"* 라벨로 사용자에게 자동 수집임을 시각적으로 알림
- 수동 입력 불가 (read-only 테이블)
- Refresh 버튼 클릭 시 즉시 재크롤링 트리거

---

## 🎨 UI 구성

```
┌─────────────────────────────────────────────────────────┐
│ SNS Engagement Tracker                          🤖 AI    │
│ Last crawled: 2026-06-07 09:32 KST · [↻ Refresh]        │
├─────────────────────────────────────────────────────────┤
│ Filter: [All Channels▼] [Date Range▼] [Sort: Date▼]      │
├─────────────────────────────────────────────────────────┤
│ Date       │ Channel  │ Like   │ Impression │ Ad € │ROAS│
├────────────┼──────────┼────────┼────────────┼──────┼────┤
│ 2026-04-22 │ TikTok   │ 24,800 │   685,000  │€4,500│5.4×│
│ 2026-03-28 │ X        │  3,150 │    78,000  │€1,800│3.2×│
│ 2026-03-12 │ Instagram│ 18,420 │   412,000  │€3,200│6.8×│
└─────────────────────────────────────────────────────────┘

🤖 AI Insight
"Instagram SS26 Tennis Hero Reel achieved the highest
ROAS (6.8×) with the lowest ad spend. Consider scaling
this content format for SS27 launch."
```

---

## 🎯 핵심 컴포넌트 명세

### Top Bar
- AI Agent 라벨 + Last crawled timestamp + Refresh 버튼

### Filter Bar
- Channel 필터 (All / Instagram / TikTok / X)
- Date Range 필터 (지난 7일 / 30일 / 90일 / Custom)
- Sort 옵션 (Posting Date / Like / Impression / Ad Cost / ROAS)

### Data Table
- 5개 컬럼 + Channel + Content 보조 컬럼 (총 7개)
- Read-only (수동 편집 불가)
- ROAS 색상 코드: 5×↑ 녹색 ⭐ / 2~5× 노랑 / 2×↓ 빨강 ⚠️

### AI Insight Card
- 테이블 하단에 1~2개 핵심 인사이트 자동 생성
- Best ROAS 포스팅 강조 / 학습할 콘텐츠 패턴 제안

---

## 🤖 AI Insights — 톤 가이드

기존 Marketing AI Insights 톤 유지:

```
🤖 AI ENGAGEMENT INSIGHTS

• Instagram SS26 Tennis Hero Reel achieved the
  highest ROAS (6.8×) with the lowest ad spend
  (€3,200) — strongest content efficiency in
  current period.

• TikTok French Open Activation generated 685K
  impressions, the highest reach of the period.
  ROAS 5.4× confirms event-tied content drives
  both awareness and conversion.

• X (Twitter) Polo Spring Drop underperformed
  at 3.2× ROAS — consider reallocating X budget
  to Instagram Reels format for SS27.

• Posting cadence: avg 1 post per 14 days
  observed. Recommended cadence: 1 post per
  7 days for sustained engagement growth.
```

---

## ⚙️ 기존 모듈과의 관계

| 모듈 | 단위 | 데이터 소스 |
|---|---|---|
| 기존 SNS Performance Tracking (Section 5) | **채널 누적** (팔로워, 도달, 노출 YTD) | Plan + Actual |
| **신규 SNS Engagement Tracker** | **포스팅 단위** (개별 콘텐츠 성과) | **Actual only (AI Crawling)** |

→ 두 모듈은 **상호 보완**. 기존 모듈은 장기 트렌드를, 신규 모듈은 콘텐츠 단위 의사결정을 지원.

---

## ✅ 검증 체크리스트 *(개발자용)*

수정 후 다음 항목 모두 확인 부탁드립니다:

- [ ] Marketing Detail Page Section 5 하위에 신규 섹션 배치
- [ ] 5개 필드 (Posting Date / Like / Impression / Advertising Cost / ROAS) 모두 표시
- [ ] AI Agent 아이콘 + Last crawled timestamp 상단 표시
- [ ] Refresh 버튼 클릭 시 재크롤링 트리거 (mock 동작)
- [ ] Filter (Channel / Date Range / Sort) 동작
- [ ] ROAS 색상 코드 (≥5× 녹색 / 2~5× 노랑 / <2× 빨강)
- [ ] 수동 편집 불가 (read-only)
- [ ] AI Insight 카드 자동 표시
- [ ] Mock data 3개 row 표시 (Instagram / TikTok / X 각 1개)
- [ ] Plan 토글 무관 — 항상 Actual만 표시

---

## 📨 개발자 전달 문구 *(메일/Slack 복붙용)*

> 안녕하세요. 어제 만든 Sergio Tacchini Global AI Agent의 Marketing 페이지에 신규 분석 모듈을 추가해야 합니다.
>
> **추가 모듈**: **SNS Engagement Tracker**
>
> **위치**: Marketing Detail Page · 기존 SNS Performance Tracking 섹션(Instagram/TikTok/X 채널 카드) 하단에 신규 섹션으로 배치
>
> **특이사항**:
> 1. **Plan 데이터 없음** — Actual만 추적 (Plan-Actual 토글 영향 없음)
> 2. **AI Crawling 기반** — SNS 플랫폼에서 AI Agent가 주기적으로 자동 수집하는 형태로 구성 (라이센시 수동 입력 불가, read-only)
> 3. 화면 상단에 *"🤖 Last crawled: YYYY-MM-DD HH:MM · Auto-sync every 4 hours"* 표기 + Refresh 버튼
>
> **5개 필드**:
> 1. Posting Date
> 2. Like
> 3. Impression
> 4. Advertising Cost (€)
> 5. ROAS (Return on Ad Spend = Attributable Sales ÷ Ad Cost)
>
> **Mock Data 3개**: 첨부 패치 노트 `STE_Analytics_Patch_v1.2_SNS_Engagement_Tracker.md` Section 5 참조 (Instagram SS26 Tennis Hero Reel / TikTok French Open Teaser / X Polo Spring Drop, 각 1 row).
>
> **AI Insights 카드**도 테이블 하단에 함께 배치 부탁드립니다. 톤은 기존 Marketing AI Insights와 동일하게 가져가시면 됩니다.
>
> ROAS 색상 코드: 5× 이상 녹색(⭐) / 2~5× 노랑 / 2× 미만 빨강(⚠️). 컨퍼런스 데모에서 *"AI가 자동으로 가져오는 데이터"* 컨셉을 시각적으로 강조해주세요.

---

## 📝 버전 기록

| 버전 | 날짜 | 변경 |
|---|---|---|
| v1.2 | 2026-06-07 | SNS Engagement Tracker 신규 모듈 추가 (Marketing 페이지) |
