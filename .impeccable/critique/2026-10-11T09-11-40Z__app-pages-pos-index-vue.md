---
target: pos
total_score: 19
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\pages\\pos\\index.vue"
target_fingerprint: "sha256:8a6d0d3964a23be277825e9ba874b0e284643ac99483c269e757f03bc650324a"
target_path: "C:\\Users\\ASUS\\Documents\\BrewspotCode\\client\\app\\pages\\pos\\index.vue"
timestamp: 2026-10-11T09-11-40Z
slug: app-pages-pos-index-vue
---
Method: dual-agent. Total 19/40 (Poor). Verdict: category-interchangeable.
P0 touch targets + a11y (24px qty buttons, no aria-labels, no focus rings, modals lack dialog semantics, low contrast) -> adapt, audit
P1 overloaded checkout panel, no speed paths (no quick-cash, numpad, keyboard, double confirm) -> layout, clarify
P1 alert()/confirm() errors, swallowed menu-load errors, no offline state -> harden, clarify
P2 generic identity, brand warmth lost, hardcoded hex, Outfit unused -> colorize, typeset
P3 no tap feedback, undefined animate-in/hide-scrollbar -> animate
Minor: dead Insufficient branch (:763), VAT on discounted sale (verify), hardcoded discounts, Admin cashier fallback.
