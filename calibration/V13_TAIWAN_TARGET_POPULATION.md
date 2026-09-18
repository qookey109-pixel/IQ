# Calibration v13 — Taiwan Target-Population Freeze

Status: **target population frozen — collection still locked**

This amendment freezes the target population for the next real-participant evidence stage as:

**Taiwan household-registered adults age 18–65 who can independently read Traditional Chinese and complete the browser-based assessment.**

Production language is frozen to `zh-Hant-TW`.

This is deliberately narrower than “all adults living in Taiwan.” The benchmark authority is the
Taiwan household-registration statistical system, so the target-population definition is aligned
to that benchmark.

## Official benchmark

Primary benchmark:

- Department of Household Registration, Ministry of the Interior
- table family: Current population by sex and age / 現住人口數按性別及年齡分
- official table code: `10122-00-02`
- benchmark date: **2026-08-31**
- release used: **2026-09-10**
- version: `MOI-HR-2026-08-31`

The benchmark must be refreshed before collection if the first participant would occur more than
120 days after the benchmark reference date.

The 2026 DGBAS usual-resident statistics may be used as a contextual coverage cross-check, but are
not the weighting authority for this protocol.

## Benchmark margins

Primary calibration margins are prospectively frozen as:

- age band
- sex for weighting
- macro region

Age bands remain:

- 18–24
- 25–34
- 35–44
- 45–54
- 55–65

Macro regions:

- North: Taipei, New Taipei, Keelung, Taoyuan, Hsinchu County/City, Yilan
- Central: Miaoli, Taichung, Changhua, Nantou, Yunlin
- South: Chiayi County/City, Tainan, Kaohsiung, Pingtung
- East: Hualien, Taitung
- Offshore: Penghu, Kinmen, Lienchiang

Only the macro-region category needs to be retained in participant research data; raw county/city
does not need to be stored.

## Recruitment frame

The prospective frame is:

`CIL-V13-TW-MULTISOURCE-ONLINE-FRAME-2026.09.1`

It is a **nonprobability** multi-source online recruitment frame. The project must not claim that it
is a probability sample.

At least three independent channel classes are planned:

1. general-population/research online panel
2. broad digital advertising
3. community/public outreach

No single channel may exceed 60% of the unweighted independent cohort.

Quota monitoring uses age band and macro region. Sex is monitored as a benchmark margin.

Reaching quota targets does not by itself prove representativeness.

## Weighting

The primary weighting method is frozen prospectively as iterative proportional fitting (raking)
against official margins for:

- age band
- sex
- macro region

Rules:

- base weight = 1
- maximum 100 iterations
- convergence: maximum absolute margin difference <= 0.005
- bounded final weights: 0.33 to 3.0
- normalize final weights to mean 1

The study must report:

- unweighted estimates
- untrimmed raked estimates
- bounded-raked estimates
- Kish effective sample size
- weighting design effect

There is no automatic effective-sample-size unlock threshold. Human psychometric review remains
required.

The weighting method may not be chosen after observing which method produces the most favorable
score distribution.

## Phase B readiness floors

Unchanged:

- >= 5,000 independent participants
- >= 500 per age band
- all 56 Matrix slots
- >= 80% Anchor completion
- average formal-item exposure >= 80
- no Phase A participant reused as an independent Phase B norming participant

These floors are necessary planning gates, not proof of population representativeness.

## Schema/privacy gate still blocking collection

The current response schema does not yet contain the coarse fields needed by this amendment.

Before collection, a separate schema/privacy amendment must prospectively add only the minimum
needed weighting fields:

- household-registration eligibility
- sex-for-weighting category
- macro region

Direct identifiers, precise address, date of birth, IP address, raw county/city storage, and
automatic upload remain prohibited.

## Current execution locks

Still false:

- real-participant collection authorization
- participant-data access authorization
- external-instrument administration
- Phase A analysis authorization
- Phase B collection authorization
- Phase B norm estimation authorization
- backend collection authorization
- `productNormEligible`
- `productIqUnlocked`
- `autoCpiToIq`

## Next gate

The target population is now specific enough to design the data fields prospectively.

The next low-risk engineering step is the **v13 Taiwan schema/privacy amendment**. That amendment
may define the three coarse weighting fields and their retention/consent rules, but must still not
authorize participant collection.
