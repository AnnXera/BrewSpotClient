<!-- app/components/common/LegalPolicyModal.vue -->
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

export type PolicyTab = 'privacy' | 'terms' | 'refund' | 'cookies'

const props = withDefaults(
  defineProps<{
    open: boolean
    initialTab?: PolicyTab
  }>(),
  {
    initialTab: 'privacy',
  }
)

const emit = defineEmits<{
  (e: 'close'): void
}>()

const activeTab = ref<PolicyTab>(props.initialTab)
const scrollContainer = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      activeTab.value = props.initialTab
      document.body.style.overflow = 'hidden'
      nextTick(() => {
        if (scrollContainer.value) scrollContainer.value.scrollTop = 0
      })
    } else {
      document.body.style.overflow = ''
    }
  }
)

watch(
  () => props.initialTab,
  (newTab) => {
    if (newTab) activeTab.value = newTab
  }
)

function setTab(tab: PolicyTab) {
  activeTab.value = tab
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({ top: 0, behavior: 'smooth' })
    }
  })
}

function handleKeydown(e: KeyboardEvent) {
  if (props.open && e.key === 'Escape') {
    emit('close')
  }
}

function handlePrint() {
  window.print()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        @click.self="emit('close')"
      >
        <Transition
          enter-active-class="transition duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
          enter-from-class="opacity-0 scale-95 translate-y-3"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-3"
        >
          <div
            v-if="open"
            class="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[#FFFDF9] border border-[#E3CFB4] shadow-2xl overflow-hidden text-[#2D201B]"
          >
            <!-- Header Bar -->
            <div class="px-4 py-3 sm:px-7 sm:py-5 bg-gradient-to-r from-[#FAF3EA] to-[#F5ECE1] border-b border-[#E8DCCE] flex items-center justify-between gap-3 shrink-0">
              <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#7D5A50] text-[#FFF8EA] flex items-center justify-center shadow-sm shrink-0">
                  <Icon name="heroicons:shield-check" class="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="text-base sm:text-xl font-extrabold text-[#3B1F0E] truncate sm:whitespace-normal">BrewSpot Legal & Compliance</h2>
                  <p class="text-[11px] sm:text-xs text-[#8B6656] truncate sm:whitespace-normal">Official platform legal policies and customer protection</p>
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  @click="handlePrint"
                  class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D9C3A5] bg-white text-xs font-semibold text-[#7D5A50] hover:text-[#3B1F0E] hover:border-[#7D5A50] transition shadow-2xs active:scale-95 cursor-pointer"
                  title="Print policy document"
                >
                  <Icon name="heroicons:printer" class="w-4 h-4" />
                  <span>Print</span>
                </button>

                <button
                  type="button"
                  @click="emit('close')"
                  class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/90 border border-[#D9C3A5] text-[#7D5A50] hover:text-[#3B1F0E] hover:bg-white flex items-center justify-center transition shadow-2xs active:scale-95 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <Icon name="heroicons:x-mark" class="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <!-- Tab Switcher (Emil Kowalski Pill Bar) -->
            <div class="px-3 py-2 sm:px-7 bg-[#FAF4ED] border-b border-[#EADBCC] flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              <button
                type="button"
                @click="setTab('privacy')"
                class="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5 shrink-0"
                :class="activeTab === 'privacy' ? 'bg-[#7D5A50] text-[#FFF8EA] shadow-sm' : 'text-[#7D5A50] hover:bg-white/80 hover:text-[#3B1F0E]'"
              >
                <Icon name="heroicons:lock-closed" class="w-3.5 h-3.5" />
                <span>Privacy Policy</span>
              </button>

              <button
                type="button"
                @click="setTab('terms')"
                class="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5 shrink-0"
                :class="activeTab === 'terms' ? 'bg-[#7D5A50] text-[#FFF8EA] shadow-sm' : 'text-[#7D5A50] hover:bg-white/80 hover:text-[#3B1F0E]'"
              >
                <Icon name="heroicons:document-text" class="w-3.5 h-3.5" />
                <span>Terms of Service</span>
              </button>

              <button
                type="button"
                @click="setTab('refund')"
                class="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5 shrink-0"
                :class="activeTab === 'refund' ? 'bg-[#7D5A50] text-[#FFF8EA] shadow-sm' : 'text-[#7D5A50] hover:bg-white/80 hover:text-[#3B1F0E]'"
              >
                <Icon name="heroicons:arrow-path-rounded-square" class="w-3.5 h-3.5" />
                <span>Refund Policy</span>
              </button>

              <button
                type="button"
                @click="setTab('cookies')"
                class="px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-full text-xs sm:text-[13px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap active:scale-95 flex items-center gap-1.5 shrink-0"
                :class="activeTab === 'cookies' ? 'bg-[#7D5A50] text-[#FFF8EA] shadow-sm' : 'text-[#7D5A50] hover:bg-white/80 hover:text-[#3B1F0E]'"
              >
                <Icon name="heroicons:circle-stack" class="w-3.5 h-3.5" />
                <span>Cookie Policy</span>
              </button>
            </div>

            <!-- Scrollable Content Body -->
            <div ref="scrollContainer" class="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 text-sm leading-relaxed text-[#4A3228]">
              
              <!-- 1. PRIVACY POLICY -->
              <div v-if="activeTab === 'privacy'" class="space-y-6">
                <div class="border-b border-[#E8DC CE] pb-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#9E6E59] bg-[#FAF1E6] px-2.5 py-1 rounded-md border border-[#E3CFB4]">Compliance & Security</span>
                  <h3 class="text-2xl font-extrabold text-[#3B1F0E] mt-2">Privacy Policy</h3>
                  <p class="text-xs text-[#8B6656] mt-1">Effective Date: October 25, 2026 · Compliant with Republic Act 10173 (Philippine Data Privacy Act) & Global Data Privacy Standards</p>
                </div>

                <div class="rounded-2xl bg-[#FFF8EA] p-4 sm:p-5 border border-[#E5C9B3] space-y-2">
                  <h4 class="font-bold text-[#3B1F0E] flex items-center gap-2 text-sm">
                    <Icon name="heroicons:information-circle" class="w-5 h-5 text-[#A96746]" />
                    Summary of Our Privacy Commitment
                  </h4>
                  <p class="text-xs sm:text-sm text-[#65463D]">
                    At BrewSpot, we believe that your cafe's business, sales, recipe formulas, and customer records belong strictly to you. We never sell your personal information or transaction history to third-party advertisers. All information processed through our Point of Sale and management portals is secured using enterprise-grade TLS encryption.
                  </p>
                </div>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">1</span>
                    Information We Collect
                  </h4>
                  <p>When you register, manage, or operate a cafe on BrewSpot, we collect:</p>
                  <ul class="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-[#5B4036]">
                    <li><strong>Account & Identity Data:</strong> Owner name, email address, phone number, cafe business name, and municipal business permits (DTI/SEC & Mayor's Permit) submitted for verification.</li>
                    <li><strong>Store & Branch Information:</strong> Cafe location addresses, floor plan layout configurations, table arrangements, menu offerings, ingredient recipes, and pricing.</li>
                    <li><strong>POS & Transaction Logs:</strong> Cashier sales records, payment methods (Cash, GCash, Card), timestamps, void/discount audit trails, and item modifier selections.</li>
                    <li><strong>Staff & Access Credentials:</strong> Staff names, role assignments (Manager, Cashier, Barista), hashed login credentials, and station security PINs.</li>
                    <li><strong>Guest Reservation Details:</strong> Customer name, party size, reservation date/time, and contact phone numbers provided during advance table bookings.</li>
                  </ul>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">2</span>
                    How We Use Your Data
                  </h4>
                  <p>We process collected information solely for legitimate operational purposes:</p>
                  <ul class="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-[#5B4036]">
                    <li>Operating the high-speed Barista POS terminal and real-time floor plan seating synchronization.</li>
                    <li>Generating automated daily, weekly, and monthly revenue analytics and inventory consumption projections.</li>
                    <li>Processing recurring SaaS subscription plan billing through certified payment gateways (PayMongo / Stripe).</li>
                    <li>Delivering critical account notifications, verification codes, and automated low-stock warnings.</li>
                    <li>Preventing fraud, unauthorized POS drawer access, and protecting platform integrity.</li>
                  </ul>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">3</span>
                    Data Storage & Security
                  </h4>
                  <p>
                    All customer and business records are stored on dedicated regional cloud servers protected by strict access firewalls, database encryption at rest (AES-256), and Transport Layer Security (TLS 1.3) in transit. Passwords and security PINs are irreversibly hashed using standard cryptographic algorithms.
                  </p>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">4</span>
                    Your Data Privacy Rights
                  </h4>
                  <p>
                    Under the Data Privacy Act of 2012, cafe owners and registered users have the right to access, inspect, export (via Excel reports), rectify inaccurate data, or request complete account deletion. For data privacy inquiries or deletion requests, contact our Data Protection Officer at <span class="font-semibold text-[#7D5A50]">privacy@brewspot.ph</span>.
                  </p>
                </section>
              </div>

              <!-- 2. TERMS OF SERVICE -->
              <div v-else-if="activeTab === 'terms'" class="space-y-6">
                <div class="border-b border-[#E8DC CE] pb-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#9E6E59] bg-[#FAF1E6] px-2.5 py-1 rounded-md border border-[#E3CFB4]">User Agreement</span>
                  <h3 class="text-2xl font-extrabold text-[#3B1F0E] mt-2">Terms of Service</h3>
                  <p class="text-xs text-[#8B6656] mt-1">Last Revised: October 2026 · Governing the use of the BrewSpot Operating System</p>
                </div>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">1</span>
                    Acceptance & Account Responsibility
                  </h4>
                  <p>
                    By creating an account or accessing BrewSpot as a Cafe Owner, Manager, Cashier, Barista, or Administrator, you agree to comply with and be bound by these Terms. You are solely responsible for maintaining the confidentiality of your credentials, staff PINs, and all operational activities under your cafe's branches.
                  </p>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">2</span>
                    SaaS Subscription & Payment Terms
                  </h4>
                  <ul class="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-[#5B4036]">
                    <li><strong>Billing Cycles:</strong> Subscriptions are billed on a recurring monthly or annual basis depending on your selected tier (Single Branch vs Multi-Branch).</li>
                    <li><strong>Automatic Renewal:</strong> Plans renew automatically at the end of each billing cycle unless cancelled prior to the renewal date via the Owner Subscription portal.</li>
                    <li><strong>Service Availability:</strong> We target 99.9% uptime for core POS processing and table management operations. Periodic maintenance will be announced with prior notification.</li>
                  </ul>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">3</span>
                    Acceptable Use & Business Verification
                  </h4>
                  <p>
                    BrewSpot is intended exclusively for verified food service establishments, cafes, bakeries, and roasteries. Users agree not to misuse the platform, attempt unauthorized database penetration, reverse-engineer proprietary software, or execute illegal transactions through the POS system.
                  </p>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">4</span>
                    Limitation of Liability
                  </h4>
                  <p>
                    BrewSpot shall not be liable for indirect, incidental, or consequential damages resulting from local network outages, cafe hardware malfunctions (such as receipt printers or cash drawers), or third-party payment gateway downtime.
                  </p>
                </section>
              </div>

              <!-- 3. REFUND POLICY -->
              <div v-else-if="activeTab === 'refund'" class="space-y-6">
                <div class="border-b border-[#E8DC CE] pb-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#9E6E59] bg-[#FAF1E6] px-2.5 py-1 rounded-md border border-[#E3CFB4]">Transparent Returns</span>
                  <h3 class="text-2xl font-extrabold text-[#3B1F0E] mt-2">Refund Policy</h3>
                  <p class="text-xs text-[#8B6656] mt-1">Clear, fair, and transparent guidelines for SaaS plans and cafe transactions</p>
                </div>

                <div class="rounded-2xl bg-[#F0FDF4] p-4 sm:p-5 border border-[#BBF7D0] space-y-2">
                  <h4 class="font-bold text-[#166534] flex items-center gap-2 text-sm">
                    <Icon name="heroicons:check-badge" class="w-5 h-5 text-[#16A34A]" />
                    14-Day Money-Back Guarantee
                  </h4>
                  <p class="text-xs sm:text-sm text-[#14532D]">
                    We want you to be completely confident in choosing BrewSpot for your cafe. If you are not 100% satisfied with our platform within 14 days of your initial subscription purchase, simply reach out to our team for a full, no-questions-asked refund.
                  </p>
                </div>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">1</span>
                    Subscription Cancellations & Proration
                  </h4>
                  <ul class="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-[#5B4036]">
                    <li><strong>Cancel Anytime:</strong> You may cancel your subscription at any time directly through the Owner Dashboard. Your service will remain fully functional until the end of your current paid billing period.</li>
                    <li><strong>No Hidden Penalties:</strong> There are no cancellation fees, contract termination penalties, or device lock-in fees.</li>
                    <li><strong>Plan Upgrades & Downgrades:</strong> When switching between monthly and annual plans or adding new branch licenses, remaining credits are automatically calculated and prorated to your next invoice.</li>
                  </ul>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">2</span>
                    Cafe Guest Orders & Table Reservation Deposits
                  </h4>
                  <p>
                    Refunds for beverage items, food orders, or advance table reservation deposits made by walk-in customers or guests are handled directly by individual cafe establishments in accordance with their store policies. BrewSpot POS equips managers with instant receipt voiding, transaction auditing, and refund issuance tools.
                  </p>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">3</span>
                    Refund Processing Timelines
                  </h4>
                  <p>
                    Approved subscription refunds are returned directly to the original payment method (Credit/Debit Card or GCash via PayMongo). Depending on your bank's billing schedule, funds typically reflect in your account within <strong class="text-[#3B1F0E]">5 to 10 business days</strong>.
                  </p>
                </section>
              </div>

              <!-- 4. COOKIE POLICY -->
              <div v-else-if="activeTab === 'cookies'" class="space-y-6">
                <div class="border-b border-[#E8DC CE] pb-4">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-[#9E6E59] bg-[#FAF1E6] px-2.5 py-1 rounded-md border border-[#E3CFB4]">Browser Storage</span>
                  <h3 class="text-2xl font-extrabold text-[#3B1F0E] mt-2">Cookie & Local Storage Policy</h3>
                  <p class="text-xs text-[#8B6656] mt-1">How BrewSpot uses cookies to keep your POS station responsive and secure</p>
                </div>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">1</span>
                    What Are Cookies & Why We Use Them
                  </h4>
                  <p>
                    Cookies and HTML5 local storage tokens are small text records placed on your device to remember who you are, maintain secure station authentication, and prevent you from having to sign in repeatedly during a busy cafe shift.
                  </p>
                </section>

                <section class="space-y-4">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">2</span>
                    Categories of Cookies We Use
                  </h4>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div class="p-4 rounded-xl bg-[#FAF4ED] border border-[#EADBCC] space-y-1.5">
                      <div class="flex items-center gap-2 font-bold text-[#3B1F0E] text-xs sm:text-sm">
                        <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
                        <span>Strictly Necessary Cookies</span>
                      </div>
                      <p class="text-xs text-[#7D5A50]">
                        Essential for logging into the POS, verifying CSRF security tokens, maintaining active session tokens (<code class="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-[#E3CFB4]">user_token</code>), and role verification. Cannot be disabled.
                      </p>
                    </div>

                    <div class="p-4 rounded-xl bg-[#FAF4ED] border border-[#EADBCC] space-y-1.5">
                      <div class="flex items-center gap-2 font-bold text-[#3B1F0E] text-xs sm:text-sm">
                        <Icon name="heroicons:adjustments-horizontal" class="w-4 h-4 text-[#A96746]" />
                        <span>Functional & Preference Cookies</span>
                      </div>
                      <p class="text-xs text-[#7D5A50]">
                        Saves your active branch selection, POS floor map view preferences, receipt printer configurations, and operational hours cache to ensure instant loading.
                      </p>
                    </div>

                    <div class="p-4 rounded-xl bg-[#FAF4ED] border border-[#EADBCC] space-y-1.5">
                      <div class="flex items-center gap-2 font-bold text-[#3B1F0E] text-xs sm:text-sm">
                        <Icon name="heroicons:chart-pie" class="w-4 h-4 text-amber-600" />
                        <span>Performance & Telemetry</span>
                      </div>
                      <p class="text-xs text-[#7D5A50]">
                        Anonymous telemetry measuring dashboard page load speed and API latency to continuously optimize barista transaction speed during peak hours.
                      </p>
                    </div>

                    <div class="p-4 rounded-xl bg-[#FAF4ED] border border-[#EADBCC] space-y-1.5">
                      <div class="flex items-center gap-2 font-bold text-[#3B1F0E] text-xs sm:text-sm">
                        <Icon name="heroicons:x-circle" class="w-4 h-4 text-rose-500" />
                        <span>No Advertising Trackers</span>
                      </div>
                      <p class="text-xs text-[#7D5A50]">
                        BrewSpot contains zero third-party advertising cookies, zero social tracker pixels, and zero data broker scripts. Your operational data remains completely private.
                      </p>
                    </div>
                  </div>
                </section>

                <section class="space-y-3">
                  <h4 class="text-base font-bold text-[#3B1F0E] flex items-center gap-2">
                    <span class="w-6 h-6 rounded-lg bg-[#E3CFB4] text-[#3B1F0E] text-xs font-bold flex items-center justify-center">3</span>
                    Managing Cookie Preferences
                  </h4>
                  <p>
                    You can inspect, block, or delete cookies at any time via your browser settings (Chrome, Safari, Edge, Firefox). Please note that blocking strictly necessary cookies will prevent login and station POS synchronization.
                  </p>
                </section>
              </div>

            </div>

            <!-- Footer Bar -->
            <div class="px-5 py-3.5 sm:px-7 bg-[#FAF4ED] border-t border-[#E8DC CE] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <p class="text-xs text-[#8B6656]">
                Questions or concerns? Contact our legal team at <a href="mailto:support@brewspot.ph" class="font-semibold text-[#7D5A50] hover:underline">support@brewspot.ph</a>
              </p>
              <button
                type="button"
                @click="emit('close')"
                class="px-5 py-2 rounded-xl bg-[#7D5A50] text-[#FFF8EA] text-xs sm:text-sm font-bold hover:bg-[#65463D] transition shadow-sm active:scale-95"
              >
                Close & Return
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
