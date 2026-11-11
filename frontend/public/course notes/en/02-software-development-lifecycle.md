# Software Development Lifecycle (SDLC)

---

## 1. What is the SDLC

A structured process outlining the stages of software development. Developed in the **1970s** to manage large-scale business systems; still relevant today.

Stages: **Requirements analysis → System design → Implementation → Unit test → Integration testing → System testing → Acceptance testing → Deployment → Maintenance**.

![Requirement analysis: gathering and documenting functional requirements — stakeholder interviews, user needs, SRS document, feasibility study](../notes_img/L2/p03_00_p03_0.jpg)

## 2. Requirements

![Functional requirement: a description of what a system must do, with a text-note app example](../notes_img/L2/p04_00_p04_0.jpg)

![Non-functional requirements with examples: scalability, availability, performance, usability, maintainability, reliability](../notes_img/L2/p17_00_p17_0.jpg)

### Functional vs non-functional

- **Functional requirements** define *what* the system accomplishes (e.g., "send confirmation email on account creation", "search items by query", "manage cart before checkout", "social login", "notifications", "feedback/ratings").
- **Non-functional requirements** define *how well* it operates.

![Six requirements-elicitation techniques: document analysis, observation, interviews, surveys and questionnaires, focus groups, prototyping](../notes_img/L2/p05_00_p05_0.jpg)

### Collecting functional requirements

| Method | Purpose |
|---|---|
| Document analysis | Review existing business processes/systems |
| Observation | Watch users in their environment (workflows, pain points) |
| Interviews | One-on-one stakeholder discussions |
| Surveys & questionnaires | Quantitative data from large audiences |
| Focus groups | Diverse stakeholder perspectives |
| Prototyping | Early versions to visualize and gather feedback |

AI can help (e.g., summarizing Zoom meetings into requirements) — but **always check the AI output for correctness, refine, and confirm with the client**.

### Requirements elicitation & management

- **Elicitation**: identify stakeholders → collect info (interviews, surveys, workshops) → document.
- **Management**: prioritization (what's essential first), change management (controlled changes, prevent scope creep), verification & validation (system meets requirements; requirements fulfill their purpose).

### Challenges & solutions

Challenges: stakeholders can't articulate needs; conflicting priorities; shifting business needs.

- **Ask better questions**: start from the problem, not the solution ("What pain point? What business value?"); open-ended process questions ("How do you currently do this? What breaks?"); challenge assumptions ("What if data is missing? Who owns this decision?"); use **5 Whys** for root causes.
- **Synthesize & resolve conflicts**: paraphrase to confirm ("So what I hear is…"); convert vague statements into testable requirements; use **MoSCoW** (Must/Should/Could/Won't).

![Mobile wireframes: login, registration, and registration-confirmation screens](../notes_img/L2/p11_00_p11_0.jpg)

## 3. Prototyping & MVP

- **Wireframes** — low-fidelity page structure. **Mockups** — static but realistic (branding, colors, fonts). **Hi-fi prototypes** — closest to the final product; test visuals *and* user flow.
- **Types**: throwaway (quick feedback, discarded) / evolutionary (incrementally refined to final) / incremental (parts built separately, integrated at the end).
- "I can't tell you what I want, but I'll know it when I see it."

![Iterative delivery with user feedback (Henrik Kniberg): prefer many small increments over one big-bang release](../notes_img/L2/p14_00_p14_0.jpg)

![Build–measure–learn loop around the MVP](../notes_img/L2/p15_00_p15_0.jpg)

### MVP (Minimum Viable Product)

- Collect the **maximum validated learning about customers with the least effort**. Minimum = as little effort as possible; Viable = enough quality to judge whether customers will use it.
- Test the idea with real users → learn → iterate the next MVP; reduces the risk of building something not economically viable.

| Aspect | Prototype | MVP |
|---|---|---|
| Purpose | Test/visualize concept, design, UX | Deliver core functionality to users |
| Functionality | Often non-functional/limited | Fully functional core features |
| Market readiness | Not market-ready | Market-ready |
| Feedback focus | Design & feasibility | Product value & usability |
| Stage | Early, before full development | First usable launch |
| Goal | Validate design/feasibility | Validate business idea & attract users |

![GenAI chat app architecture: React frontend, Python Flask API backend, OpenAI Azure service, chat-history database](../notes_img/L2/p19_00_p19_0.jpg)

![.env with API key and .gitignore shield keep secrets out of the public GitHub repository](../notes_img/L2/p21_00_p21_0.jpg)

![Secret-injection flow: .env on the laptop, .gitignore shield, code-only GitHub repo, server with injected API key, Azure OpenAI](../notes_img/L2/p22_00_p22_0.jpg)

## 4. Design & implementation

- Requirements say **what**; design says **how**.
- A **system design interview** asks a candidate to architect a scalable system on a whiteboard — testing reasoning about requirements, trade-offs, component interactions.
- **Example: GenAI chat app** — Python Flask API backend (business logic, data storage/retrieval; relays questions to the AI service) + React frontend (UI; sends API requests, displays responses) + OpenAI Azure service (GenAI answers) + database (past chats).
- **Protecting API keys:**
  - Development: secrets in `.env` (local env vars); `.gitignore` excludes `.env` from version control. **Secrets must never appear in the remote repository.**
  - Production: keys stored in the platform (e.g., Vercel environment variables), injected at deployment, hidden from the public and frontend.

![Mock Weather Station API replacing the real API inside an isolated unit-test environment](../notes_img/L2/p23_00_p23_0.jpg)

![Integration testing: combining individual units and testing them as a group](../notes_img/L2/p24_01_p24_1.jpg)

![System testing: verifying the complete system meets all specified requirements](../notes_img/L2/p25_00_p25_0.jpg)

![Confirmation testing: re-test the fixed feature to verify the fix](../notes_img/L2/p27_00_p27_0.jpg)

![Regression testing: re-test previously working features to ensure no side effects](../notes_img/L2/p27_01_p27_1.jpg)

![Acceptance testing: customers/end-users validate the system and sign off](../notes_img/L2/p29_00_p29_0.jpg)

## 5. Testing phases

- **Unit testing**: individual units (functions, methods, classes) tested **in isolation** against their design spec; faults are easy to locate.
- **Integration testing**: modules combined and tested as a group — a bug-free module can still break when integrated (e.g., a caller misunderstands the interface spec).
- **System testing**: the whole system implements all requirements — functionality, robustness (recover from errors), interoperability (third-party systems), performance (throughput, response time), scalability, reliability over time, documentation usability.
- **Pull Request (PR)**: a workflow where a developer proposes merging one branch into another so teammates can review before integration.
- **Confirmation testing**: re-run test cases that failed previously to verify the fix.
- **Regression testing**: re-test after modification to ensure no previously-correct function broke. Re-run all tests (automation helps — Microsoft runs **60,000+ unit tests on every PR in under 7 minutes**) or select a subset reaching the modified code.
- **Test automation**: software controls test execution; a unit test is code that checks another piece of code works as expected (e.g., JUnit for Java).
- **Acceptance testing**: customer/end-users validate the system against acceptance criteria (functionality, performance, security).
  - **Alpha test**: at the developer's site, with developer present.
  - **Beta test**: at user sites without the developer — closest to actual use.

![Code → Verify → Validate → Iterate loop toward product success](../notes_img/L2/p34_01_p34_1.jpg)

### Verification vs validation

- **Verification** — "Are we building the product **right**?" Code review, unit/integration/system testing; done by developers.
- **Validation** — "Are we building the **right** product?" Prototyping, acceptance testing, usability testing, A/B testing.
- Validation feeds **new requirements** back into the loop (feedback loop).

![Deployment: releasing software to the production environment (environment prep, install, data migration, training, go-live)](../notes_img/L2/p35_04_p35_4.jpg)

![Dev vs production environment: different OS/libraries, stricter access controls, edge-case data volumes](../notes_img/L2/p36_01_p36_1.jpg)

## 6. Deployment & environments

- **Dev vs production differences**: OS/library versions; production data edge cases & volumes; stricter access controls/firewalls; different resource limits; live external services behaving differently. ("Works on my machine" ≠ works for users.)

![Maintenance: ongoing support, bug fixes, and updates after deployment](../notes_img/L2/p37_00_p37_0.jpg)

![Maintenance split: ~60% adding new features while keeping the system stable](../notes_img/L2/p38_00_p38_0.jpg)

![40% initial development vs 60% average maintenance cost (IEEE Software, 2001)](../notes_img/L2/p38_01_p38_1.jpg)

![Maintenance challenge (constrained, high risk) vs clean-slate project (fewer constraints)](../notes_img/L2/p38_02_p38_2.jpg)

![Corrective maintenance: fixing defects found in the software](../notes_img/L2/p39_00_p39_0.jpg)

![Adaptive maintenance: staying compatible with a changing environment (e.g., a new iOS version)](../notes_img/L2/p39_01_p39_1.jpg)

![Perfective maintenance: enhancing performance or maintainability](../notes_img/L2/p39_02_p39_2.jpg)

![Preventive maintenance: addressing potential issues before they become problems](../notes_img/L2/p39_03_p39_3.jpg)

## 7. Maintenance

- Modification of a software product **after** deployment: fix production bugs, release patches, enhance performance, new versions.
- **60/60 rule** (IEEE Software, 2001): maintenance averages **60% of lifecycle cost**; ~60% of maintenance is adding new features without breaking existing ones. In clean-slate projects, maintenance is often harder than development.
- **ISO/IEC 14764:2006** maintenance types: **corrective** (fix defects), **adaptive** (stay compatible with changing environments), **perfective** (enhance performance/maintainability), **preventive** (address potential issues early).

![Three production-incident categories: deployment failure, capacity issues, software bugs](../notes_img/L2/p40_00_p40_0.jpg)

![Upgrade failure between V1.0 and V2.0: HTTP 500 Internal Server Error](../notes_img/L2/p40_01_p40_1.jpg)

### Deployment failure case study

- 1:00 AM: new feature deployed; health checks pass.
- 3:00 AM: new inefficient queries (lacking indexes) start locking resources; response times degrade — **no alarms**.
- 10:00 AM: incident discovered — 7 hours of unnoticed degradation.
- Investigation: resource exhaustion + high latency correlates with the 1:00 AM deployment → root cause: unindexed queries.
- Mitigation: rewrite queries, add indexes; patch v1.1 tested in staging; deployed to production; **service restored at 9:00 PM**.

| Metric | Definition | This case |
|---|---|---|
| **TTD** (time to discover) | failure start → team aware | 7 hours (3 AM → 10 AM) |
| **TTM** (time to mitigate) | aware → fix verified | ~8 hours (diagnosis, patch, staging, deploy) |
| **TTR** (time to recover) | total customer impact | 18 hours (3 AM → 9 PM) |

![1:00 AM — new feature deployed from code to production](../notes_img/L2/p41_00_p41_0.jpg)

![3:00 AM to 10:00 AM — the visibility gap: users degrade while the team is unaware](../notes_img/L2/p42_00_p42_0.jpg)

![10:00 AM — incident discovered with 50+ new alerts](../notes_img/L2/p42_01_p42_1.jpg)

![Investigation: high CPU usage and slow query response](../notes_img/L2/p43_00_p43_0.jpg)

![Root cause identified: unoptimized queries](../notes_img/L2/p43_01_p43_1.jpg)

![Patching in progress (50%)](../notes_img/L2/p44_00_p44_0.jpg)

![Patch v1.1 verified in the staging environment](../notes_img/L2/p44_01_p44_1.jpg)

![6:00 PM — patch v1.1 deployed from staging to the production cloud](../notes_img/L2/p45_00_p45_0.jpg)

![9:00 PM — incident resolved](../notes_img/L2/p45_01_p45_1.jpg)

![TTD (time to discover): 7 hours](../notes_img/L2/p46_00_p46_0.jpg)

![TTM (time to mitigate): 8 hours](../notes_img/L2/p46_01_p46_1.jpg)

![TTR (total time to recover): 18 hours = TTD 7h + TTM 8h + stabilization 3h](../notes_img/L2/p46_02_p46_2.jpg)

![MTBF = MTTF + MTTR: time from application failure to system restored to next failure](../notes_img/L2/p47_01_p47_1.jpg)

## 8. Availability

- **Availability = Uptime / (Uptime + Downtime)** = MTTF / (MTTF + MTTR). Described in "9s":

| Uptime | Downtime/week | Downtime/month | Downtime/year |
|---|---|---|---|
| 99% | 1.68 h | 7.2 h | 3.65 days |
| 99.9% | 10 min | 43.2 min | 8.76 h |
| 99.95% | 5 min | 21.6 min | 4.38 h |
| 99.99% | 1 min | 4.32 min | 52.56 min |
| 99.999% | 6 s | 26 s | 5.26 min |

- Factors affecting availability: hardware failure, network instability, software bugs, maintenance windows, security attacks (DDoS), power outages, capacity overload, configuration errors, third-party outages, poor backup/recovery.

![Prototype (AI-accelerated) to production (human-hardened)](../notes_img/L2/p50_00_p50_0.jpg)

![Big Bang deployment: all users switch from V1.0 to V2.0 at once](../notes_img/L2/p52_00_p52_0.jpg)

![Rolling deployment: phased replacement of old servers with V2.0](../notes_img/L2/p53_00_p53_0.jpg)

![Blue-Green deployment: two identical environments with instant rollback](../notes_img/L2/p54_00_p54_0.jpg)

![Canary deployment: a slice of users routed to the new version](../notes_img/L2/p55_00_p55_0.jpg)

![Feature flag rollouts: percent rollout from 10% to 100% with performance feedback](../notes_img/L2/p56_00_p56_0.jpg)

![The dark launch: feature flags control which consumers see the new feature](../notes_img/L2/p56_01_p56_1.jpg)

## 9. Deployment strategies

| Strategy | How it works | Trade-offs |
|---|---|---|
| **Big Bang** | Release new version in one go, with downtime; roll back if it fails | Risky for public-facing/business-critical apps; no easy rollback during downtime |
| **Rolling upgrade** | New version gradually replaces old; both coexist | Incompatible components can be rolled back |
| **Blue-Green** | Two identical environments; all traffic on Blue; deploy + test on Green; switch traffic when ready | Instant rollback by routing back to Blue |
| **Canary** | Upgrade a small subset of instances; route a slice of users to them; expand if no errors | Lowest blast radius for a new version |
| **Feature flags** | Toggle feature visibility/activation **without deploying new code** | Decouples release from rollout |

### How big tech ships code

1. Git commits during development (every change tracked).
2. **CI/CD** (e.g., CircleCI) takes over on commit: build, unit tests, quality checks.
3. Code moves to **QA environments** for regression & performance checks.
4. Production rollout via feature toggles, canary deployments, A/B testing.
5. **Monitoring & reliability**: SREs use Prometheus, Datadog, etc., to watch performance and resolve issues live.

## 10. Key takeaways

- Requirements quality drives everything downstream; use elicitation techniques, MoSCoW, and 5 Whys.
- Prototype to validate design; MVP to validate the business idea.
- Verification = product right; validation = right product.
- Bugs found early are far cheaper; test in layers (unit → integration → system → acceptance).
- Deployment is a risk-management exercise: choose the strategy by criticality and need for rollback.
- Maintenance dominates lifecycle cost (60/60) — design for it.
- Production is its own environment: expect different data, limits, and dependencies.
