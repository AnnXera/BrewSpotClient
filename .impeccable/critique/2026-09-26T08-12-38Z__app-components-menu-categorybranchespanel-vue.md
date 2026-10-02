---
target: category branch card in category [uuid].vue
total_score: 17
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\components\\menu\\CategoryBranchesPanel.vue"
target_fingerprint: "sha256:c1f4fa0170ffa8502f9c29036e0d3b673f2cd4f49931dae1f5483846381f99b9"
target_path: "C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\components\\menu\\CategoryBranchesPanel.vue"
timestamp: 2026-09-26T08-12-38Z
slug: app-components-menu-categorybranchespanel-vue
closed: true
---
# Critique: CategoryBranchesPanel.vue (category branch card)

Method: dual-agent (A: design review, B: detector). Browser pass blocked (two Chrome browsers connected, none selected).

## Heuristics (17/40, Poor)
1 Status 2 | 2 Real world 2 | 3 Control 2 | 4 Consistency 2 | 5 Error prevention 2 | 6 Recognition 1 | 7 Flexibility 1 | 8 Minimalist 3 | 9 Error recovery 1 | 10 Help 1

## Specificity
On-brand but generic: stock settings-list-with-toggles. has_override is stored (l.45) and never rendered; category.is_available default from getCategoryBranchesStatus is discarded (l.27). Detector: 0 findings in panel and page.

## Priority issues
- [P1] Fetch failure renders as "No branches found." (l.28-30, 74). Fix: error ref + retry state. harden
- [P1] Doesn't scale to 20-40 branches: no bulk show/hide, no filter, unbounded sticky height (l.59, 76), order-first pushes list above items on mobile, two-line rows. layout / adapt / distill
- [P1] Contrast: #B4846C ~3.25:1 on white, ~2.9:1 on #FBF2E1 hover, used at 11-12px (l.63, 67, 74, 90, 97); off track #E5D5C3 ~1.4:1 vs white (l.105). Use #7D5A50 (~6:1) for secondary text; border or darken the off track. colorize / audit
- [P2] alert() on toggle failure (l.49), no branch named, weak pending cue, no live region. harden / clarify
- [P2] Overrides and category default invisible: add "Custom" marker on has_override rows and "Default: Visible" in header. clarify / layout

## Personas
Alex: O(n) clicks, no bulk/filter. Sam: aria-label "Toggle X" overrides visible name; disabled while pending can drop focus (l.83); no focus-visible ring, overflow-hidden may clip outline. Multi-location owner: can't see exceptions; "Hidden" from whom?

## Minor
Heading #3D2B24 vs sibling #3B1F0E; weight change on toggle reflows long names; spinner instead of skeleton; server is_available not reconciled after PATCH (only has_override); fake pagination on page.

## Questions
Matrix view on Menu Management index instead? Show only exceptions? Should hiding carry more friction?
