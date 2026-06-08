# STE Analytics — Marketing 모듈 수정 (Patch v1.3)
### Territory ROI Table — Baseline / Lift / Total 컬럼 구조 정정
### 2026-06-07

---

## 🐛 수정 사유

**기존 Marketing 페이지 Territory ROI Table에 "Net Sales Lift" 컬럼이 명시되어 있었으나, 실제 Mock Data에 Lift 수치가 정의되어 있지 않았음.**

또한 Lift만 표시할 경우 라이센시가 *"이 매출이 마케팅으로 만들어진 건지, 원래 발생할 매출인지"* 명확하게 파악하기 어려움. → **Baseline / Lift / Total** 3개 컬럼으로 분해하여 명확성 확보.

---

## 📐 개념 정의

```
Total Net Sales = Baseline Sales + Sales Lift
                  (마케팅 영향 외     (마케팅으로 만들어낸
                   자연 매출)          추가 매출)

ROAS = Sales Lift ÷ Marketing Spend
```

**Sales Lift** = AI Attribution Model (MMM 기반)이 산출한 marketing-attributable incremental revenue. *"마케팅 spend가 없었다면 발생하지 않았을 매출"*.

---

## 📋 영향 받는 파일

| 파일 | 영향 화면 |
|---|---|
| `STE_Analytics_Spec_Marketing.md` | Section 8 (Geographic Distribution) — Territory ROI Table 정의 변경 |
| `STE_Analytics_MockData_SUGI_France.md` | Section 8 (Geography) — Marketing Attribution sub-section 신규 추가 |

---

## 1️⃣ Territory ROI Table — 신규 컬럼 구조

### Before (기존)

```
Country | Marketing Spend | Net Sales Lift | ROI
```

→ Net Sales Lift 수치 미정의, 단일 매출 지표만 표시

### After (수정)

```
Country | Marketing Spend | Baseline Sales | Sales Lift | Total Net Sales | ROAS
```

→ **5개 컬럼**으로 확장. 매출 분해 명시.

---

## 2️⃣ 컬럼 명세

| # | Field | Type | 설명 | 출처 |
|---|---|---|---|---|
| 1 | **Country** | Text | 10개 territory 국가 | 라이센시 territory |
| 2 | **Marketing Spend** | Currency (€) | 해당 국가 marketing spend (YTD) | 라이센시 입력 + AI tracking |
| 3 | **Baseline Sales** | Currency (€) | 마케팅 영향 외 자연 매출 = Total − Lift | 자동 계산 |
| 4 | **Sales Lift** ⭐ | Currency (€) | 마케팅으로 만들어낸 incremental revenue | AI Attribution Model (MMM) |
| 5 | **Total Net Sales** | Currency (€) | 해당 국가 전체 매출 | Sales 데이터 |
| 6 | **ROAS** | Decimal (×) | Sales Lift ÷ Marketing Spend | 자동 계산 |

---

## 3️⃣ Mock Data — SUGI France 2026 YTD *(10개 country)*

| Country | Marketing Spend | Baseline Sales | Sales Lift | Total Net Sales | ROAS |
|---|---|---|---|---|---|
| France | €270K | €5.77M | **€1.03M** | €6.80M | 3.8× |
| Germany | €98K | €2.05M | **€353K** | €2.40M | 3.6× |
| Belgium | €55K | €1.15M | **€248K** | €1.40M | 4.5× |
| Netherlands | €44K | €0.81M | **€189K** | €1.00M | 4.3× |
| Switzerland | €27K | €0.61M | **€86K** | €0.70M | 3.2× |
| Austria | €22K | €0.41M | **€88K** | €0.50M | 4.0× |
| Luxembourg | €11K | €0.25M | **€50K** | €0.30M | 4.5× |
| Morocco | €11K | €0.34M | **€61K** | €0.40M | 5.5× ⭐ |
| Tunisia | €6K | €0.17M | **€29K** | €0.20M | 4.8× |
| Algeria | €6K | €0.17M | **€30K** | €0.20M | 5.0× |
| **Total** | **€547K** | **€11.73M** | **€2.16M** | **€13.89M** | **3.9× avg** |

---

## 4️⃣ 시각화 표현 명세

### 색상 코드

| 컬럼 | 색상 | 의도 |
|---|---|---|
| Baseline Sales | 회색 톤 (light gray) | "마케팅 없어도 나올 매출" — reference |
| **Sales Lift** | **Navy bold + 강조 색** | "마케팅이 만들어낸 부분" — 핵심 메시지 |
| Total Net Sales | Black regular | 합계 |
| ROAS | 색상 신호등 | 5×↑ 녹색 ⭐ / 3~5× 정상 / 3×↓ 빨강 ⚠️ |

### Stacked Bar (옵션 추가 시각화)

각 country에 stacked bar 표시:

```
France       ████████████░░░░░░░░░░  Lift €1.03M / Baseline €5.77M
Germany      ████░░░░░░░░░░          Lift €353K / Baseline €2.05M
Belgium      ███░░░░                 Lift €248K / Baseline €1.15M
...
```

→ 한눈에 "어느 시장에서 마케팅이 얼마나 기여했는지" 비교 가능.

---

## 5️⃣ AI Insights — 신규 표현

기존 AI Insights에 다음 메시지 추가 가능:

```
🤖 AI ATTRIBUTION INSIGHTS

• Morocco achieved highest ROAS (5.5×) with
  smallest spend (€11K). Lift contribution
  15% of total Morocco sales — strongest
  marketing leverage of all territories.

• Switzerland ROAS 3.2× — lowest in portfolio.
  Lift only €86K vs €27K spend. Consider
  reviewing channel mix or creative localization.

• Marketing-attributable lift €2.16M represents
  15.5% of total YTD sales (€13.89M). Baseline
  €11.73M reflects strong brand equity.

• Aggregate ROAS 3.9× confirms healthy marketing
  efficiency vs sportswear industry benchmark (3.0×).
```

---

## ✅ 검증 체크리스트 *(개발자용)*

수정 후 다음 항목 모두 확인 부탁드립니다:

- [ ] Marketing Detail Page Section 8 (Geographic Distribution) 컬럼 구조를 5개로 확장
- [ ] Baseline = Total − Lift 자동 계산 공식 적용
- [ ] ROAS = Lift ÷ Marketing Spend 자동 계산
- [ ] 색상 코드: Baseline 회색 / Lift Navy bold / ROAS 신호등
- [ ] 10개 country mock data 모두 표시
- [ ] Total row 합계 자동 집계
- [ ] Tooltip: *"Sales Lift = AI Attribution Model 산출치 (MMM 기반)"* 설명 표시
- [ ] (선택) Stacked Bar 시각화 옵션 — Lift / Baseline 비율
- [ ] AI Attribution Insights 카드 자동 생성
- [ ] Filter 변경 (Calendar / Season) 시 모든 수치 reactive 재계산

---

## 6️⃣ 영향 없는 항목 *(변경 불필요)*

- Country별 Net Sales (Section 8 메인 표) — 기존 그대로
- Region grouping (France/DACH/Benelux/North Africa) — 기존 그대로
- Channel Mix / Campaign Performance — 기존 그대로

---

## 📨 개발자 전달 문구 *(메일/Slack 복붙용)*

> 안녕하세요. STE Analytics Marketing 페이지의 Territory ROI Table에 컬럼 구조 수정이 필요합니다.
>
> **기존 문제**: 기존 Spec에는 *"Net Sales Lift"* 컬럼이 명시되어 있었으나 실제 Mock Data에 Lift 수치가 정의되지 않았음.
>
> **수정 사항**: 단일 Lift 컬럼 대신 **Baseline / Sales Lift / Total Net Sales** 3개 컬럼으로 분해해서 표시. 라이센시가 *"마케팅이 만들어낸 추가 매출"* 과 *"원래 발생할 매출"* 을 명확히 구분할 수 있게 함.
>
> **신규 컬럼 구조**: Country | Marketing Spend | Baseline Sales | Sales Lift | Total Net Sales | ROAS (6개)
>
> **계산 공식**:
> - Sales Lift = AI Attribution Model 산출치 (MMM 기반, 백엔드 자동 계산)
> - Baseline = Total − Lift
> - ROAS = Sales Lift ÷ Marketing Spend
>
> **Mock Data** (10개 country): 첨부 패치 노트 `STE_Analytics_Patch_v1.3_Territory_ROI_Table.md` Section 3 참조. SUGI France 2026 YTD 기준, Marketing-attributable lift 총 €2.16M / Aggregate ROAS 3.9×.
>
> **색상 코드**: Baseline 회색 (reference) / Sales Lift Navy bold (강조) / ROAS 신호등 (5×↑ 녹색, 3×↓ 빨강). 데모에서 *"마케팅이 만든 매출"* 이 시각적으로 즉시 보이게 강조해주세요.

---

## 📝 버전 기록

| 버전 | 날짜 | 변경 |
|---|---|---|
| v1.3 | 2026-06-07 | Territory ROI Table — Baseline / Lift / Total 3컬럼 분해, Mock data 10개 country 추가 |
