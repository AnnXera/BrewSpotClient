---
target: subscription page of owner side
total_score: 26
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 0
target_identity: "file:C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\pages\\owner\\subscription.vue"
target_fingerprint: "sha256:53e94774d69f1482b45eee05a2779dc14993959821d282d7ae3335dad2f12db1"
target_path: "C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\pages\\owner\\subscription.vue"
timestamp: 2026-09-20T05-24-58Z
slug: app-pages-owner-subscription-vue
closed: true
---
Method: ⚠️ DEGRADED: single-context (no sub-agent tool exposed/declined)

#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Excellent loading states and plan status visibility |
| 2 | Match System / Real World | 3 | Clear terminology ("Billing Cycle", "Transaction History") |
| 3 | User Control and Freedom | 3 | Easy toggle between Current and Browse modes |
| 4 | Consistency and Standards | 4 | Consistent button shadows, badges, and color mapping |
| 5 | Error Prevention | 3 | Prevent double-subscription with disabled active plan buttons |
| 6 | Recognition Rather Than Recall | 3 | Unlocked features listed directly on current plan |
| 7 | Flexibility and Efficiency | n/a | Standard billing page; power shortcuts not applicable |
| 8 | Aesthetic and Minimalist Design | 3 | Clean, but dashed borders and nested boxes add minor noise |
| 9 | Error Recovery | 3 | Graceful empty state when no active subscription exists |
| 10 | Help and Documentation | n/a | Self-explanatory interface; no explicit docs needed |
| **Total** | | **26/32** | **Good** |

#### Design Specificity Verdict

The interface feels distinct and aligned with the "Brewspot" brand. The warm color palette (coffee tones like `#3B1F0E` and `#FDF3E7`) and the playful, brutalist-lite button shadows (`shadow-[4px_4px_0px_0px_#3B1F0E]`) give the page a solid, non-generic character. Structurally, it follows standard SaaS billing page patterns, but the visual execution is authored specifically for this product.

**Deterministic scan**: The automated detector found 0 issues across the target file.

**Visual overlays**: No reliable user-visible overlay is available because browser automation/injection was skipped in this degraded run.

#### Overall Impression
A solid, brand-aligned subscription management page. The split between "Current" and "Browse" modes works well. The biggest opportunity is refining the mobile responsiveness of custom controls and elevating the visual polish of the "Next Plan" and "Empty" states.

#### What's Working
- **Clear Information Architecture**: The separation of the current plan summary and the plan browsing view prevents information overload.
- **Brand Consistency**: The heavy drop shadows and warm coffee-toned palette make the interface feel tactile and cohesive.

#### Priority Issues
1. **[P2] Hardcoded widths on the billing toggle**
   - **Why it matters**: The `w-[92px]` and `w-[142px]` classes on the Monthly/Yearly toggle can cause alignment issues or clipped text on different viewports, hurting the mobile experience.
   - **Fix**: Use flex layouts (`flex-1`) and generous padding instead of hardcoded pixel widths for the sliding indicator.
   - **Suggested command**: `/impeccable layout`

2. **[P2] The empty state lacks emotional pull**
   - **Why it matters**: The "No Active Subscription" state is functional but a missed opportunity to visually persuade the user to upgrade.
   - **Fix**: Add a branded illustration or a more visually striking call-to-action block rather than a basic icon.
   - **Suggested command**: `/impeccable onboard`

3. **[P3] Visual noise from dashed borders**
   - **Why it matters**: The "Next Plan" card uses a dashed border that conflicts slightly with the solid, brutalist shadows used elsewhere in the design language.
   - **Fix**: Use a distinct background tint (e.g., a soft warning/amber hue) or a solid border with a different tone to indicate the pending state.
   - **Suggested command**: `/impeccable polish`

#### Persona Red Flags

**Casey (Distracted Mobile User)**: 
- The hardcoded pixel widths on the billing toggle (`w-[92px]`, `w-[142px]`) are brittle and might misalign or break on very narrow screens.

**Jordan (First-Timer)**: 
- The feature list parsing logic (`feat.key.replace(/_/g, ' ')`) might surface raw technical keys (like `multi_branch_v2`) to the user if the backend doesn't provide friendly names.

#### Minor Observations
- The use of `v-if="currentPlan.pending_plan"` relies heavily on backend structure; ensure the skeleton loading states cover this block gracefully if the API is slow.

#### Questions to Consider
- What if the "Next Plan" wasn't a separate card, but an inline badge on the current plan indicating a scheduled change?
- Does the empty state need a clearer breakdown of what the user is missing out on, rather than just text?
