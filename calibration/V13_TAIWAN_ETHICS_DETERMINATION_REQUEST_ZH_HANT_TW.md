# 人體研究倫理／IRB 適用性判定申請摘要（草案）

文件版本：`CIL-V13-TW-ETHICS-DETERMINATION-REQUEST-2026.09.1`

> 本文件僅供送審／判定準備。尚未取得倫理審查結論，也尚未開始招募或收案。

## 一、研究名稱

Cognitive IQ Lab — Calibration v13 台灣繁體中文成人心理計量驗證研究

## 二、申請目的

敬請審查單位協助正式判定：

1. 本研究是否屬《人體研究法》所稱人體研究；
2. 若屬人體研究，應採一般審查、簡易程序、免審證明或其他適用程序；
3. 後續 Phase A 驗證與 Phase B 獨立常模研究是否可納入同一核准計畫，或需另行變更／申請。

本研究團隊不自行宣稱免審、簡易審查或已核准。

## 三、研究概要

研究對象：18–65 歲、具有台灣戶籍、可獨立閱讀繁體中文之成年人。

研究方式：線上完成 42 題認知測驗；部分研究流程可能在另行同意後包含 6 題 anchor
研究題。

研究目的：評估可靠度、IRT 題目特性、DIF／公平性、結構效度、外部連結及後續常模
研究可行性。

本研究不是醫療診斷、治療或臨床試驗，不涉及身體侵入性程序。

## 四、預計蒐集資料

僅限：

- pseudonymous `sourceKey`
- `sessionId`
- 整歲年齡與 age band
- 台灣戶籍資格
- weighting 用性別欄位
- 五大區 macro region
- 測驗作答與反應時間等研究紀錄

不蒐集：

- 姓名
- Email
- 帳號 ID
- 電話
- 出生日期
- IP
- 精確位置
- 地址
- raw county/city

## 五、風險與保護

預期主要風險為隱私風險、認知表現造成的不適，以及 CPI 被誤解為 IQ。

主要保護措施：

- 直接識別資料不進研究資料集；
- sex / macro region 可選擇 not-stated；
- 不從 IP、姓名、帳號或其他訊號推測拒答欄位；
- public reporting 僅 aggregate；
- participant-level raw data 不進 Git／公開 artifact；
- CPI 明確標示不是 IQ；
- 發生 privacy incident、consent/schema drift 或倫理狀態失效時停止收案。

## 六、招募與同意

採至少三類多來源線上招募；單一來源不得超過 unweighted cohort 60%。

正式研究須在任何研究資料被記錄前取得 affirmative consent。

目前 consent 草案版本：

`CIL-V13-TW-CONSENT-2026.09.1`

## 七、保存與刪除

目前規劃 participant-level research records 於正式研究結案後最多保存 5 年。

一次性 recruitment token 只保留 salted hash，兌換後最多 30 天。

參與者可利用 pseudonymous `sourceKey/sessionId` 提出資料刪除申請，不要求姓名、
Email、帳號或政府證件。

若審查單位要求不同保存／刪除規則，將在收案前修訂計畫與 consent。

## 八、待申請人補齊

送出前必須由實際申請人填寫：

- PI 法定姓名：
- PI 職稱／角色：
- 所屬研究機構；若無，採未隸屬研究機構申請路徑：
- 送審 IRB／REC：
- 研究聯絡方式：
- 資料權利申請聯絡方式：
- 經費來源／無經費聲明：
- 利益衝突聲明：

## 九、目前狀態

`ethicsDeterminationStatus = unset`

`realParticipantCollectionAuthorized = false`

`recruitmentLaunchAuthorized = false`

`participantDataAccessAuthorized = false`

`productIqUnlocked = false`
