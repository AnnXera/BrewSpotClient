<!-- BrewSpot Landing Page (minimal) -->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'
import logoIcon from '~/assets/images/logo-icon.svg'
import { getRedirectForRole } from '~/utils/roleRedirects'
import LegalPolicyModal, { type PolicyTab } from '~/components/common/LegalPolicyModal.vue'

// ── Auth state ───────────────────────────────────────────────────────────
const authStore = useAuthStore()
const authTokenCookie = useCookie<string | null>('auth_token')
const userRoleCookie = useCookie<string | null>('user_role')

// Only authenticated if a valid auth_token cookie actually exists
const isAuthenticated = computed(() => !!authTokenCookie.value && !!(authStore.role || userRoleCookie.value))
const role = computed(() => isAuthenticated.value ? (authStore.role || userRoleCookie.value) : null)

// ── Legal policy modal ───────────────────────────────────────────────────
const isPolicyModalOpen = ref(false)
const activePolicyTab = ref<PolicyTab>('privacy')

function openPolicy(tab: PolicyTab) {
  activePolicyTab.value = tab
  isPolicyModalOpen.value = true
}

useHead({
  title: 'BrewSpot - Modern Coffee Shop OS & Barista POS Platform',
  meta: [
    { name: 'description', content: 'BrewSpot runs your cafe in one place: a touchscreen POS, table floor plans and reservations, menu and stock, cashier shifts, and reports for every branch.' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
    { name: 'theme-color', content: '#7B5A50' },
  ],
  htmlAttrs: { class: 'scroll-smooth' },
})

// ── Header state ─────────────────────────────────────────────────────────
const isScrolled = ref(false)
const isMobileMenuOpen = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 8
}

function checkHash() {
  if (!import.meta.client) return
  const hash = window.location.hash.replace('#', '').toLowerCase()
  if (['privacy', 'terms', 'refund', 'cookies'].includes(hash)) openPolicy(hash as PolicyTab)
}

// ── Navigation ───────────────────────────────────────────────────────────
const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#roles', label: 'Who it\'s for' },
  { href: '#faq', label: 'FAQ' },
]

function goLogin() { navigateTo('/login') }
function goRegister() { navigateTo('/register') }
function goDashboard() {
  navigateTo(isAuthenticated.value && role.value ? getRedirectForRole(role.value) : '/login')
}

// ── Content ──────────────────────────────────────────────────────────────
const features = [
  { icon: 'heroicons:computer-desktop', title: 'Touchscreen POS', description: 'Fast counter orders for dine-in, take-out and delivery, with discounts, receipts and refunds that need a manager\'s approval.' },
  { icon: 'heroicons:squares-2x2', title: 'Floor plans & reservations', description: 'Draw your tables once. Staff see who is free, held or seated, and seat bookings straight from the register.' },
  { icon: 'heroicons:book-open', title: 'Menu & stock', description: 'Categories, items and availability in one list, with spoilage logged at the counter so stock stays honest.' },
  { icon: 'heroicons:banknotes', title: 'Cashier shifts', description: 'Open each shift with a cash float and close it with a count, so every drawer is accounted for.' },
  { icon: 'heroicons:building-storefront', title: 'Every branch, one account', description: 'Add branches as you grow and compare sales across them from the owner dashboard.' },
  { icon: 'heroicons:shield-check', title: 'The right access for each role', description: 'Owners, managers and cashiers each see only what they need. Cashiers sign in with a 6-digit PIN.' },
]

const steps = [
  { icon: 'heroicons:envelope', title: 'Create your account', description: 'Sign up with your email and confirm it with the 6-digit code we send you.', meta: 'About 2 minutes' },
  { icon: 'heroicons:document-arrow-up', title: 'Submit your business documents', description: 'Upload a valid government ID, your BIR Certificate of Registration (Form 2303), and your DTI or SEC certificate.', meta: 'Photos or PDFs' },
  { icon: 'heroicons:shield-check', title: 'Get approved', description: 'Our team reviews your documents and emails you once your cafe is approved. If something needs fixing, you can resubmit.', meta: '1–3 business days' },
  { icon: 'heroicons:squares-2x2', title: 'Access your dashboard', description: 'Once approved, you can sign in to your owner dashboard and the full management system: branches, menu, floor plans, staff and reports.', meta: 'Right after approval' },
  { icon: 'heroicons:credit-card', title: 'Choose your plan', description: 'Pick the subscription that fits your cafe and keep everything running as you grow.', meta: 'Upgrade any time' },
]

const roles = [
  { icon: 'heroicons:briefcase', title: 'Cafe owners', points: ['Sales and reports across branches', 'Branches, plans and billing', 'Staff and managers'] },
  { icon: 'heroicons:clipboard-document-check', title: 'Store managers', points: ['Menu, stock and floor plan', 'Reservations for the day', 'Approve voids and refunds'] },
  { icon: 'heroicons:user', title: 'Cashiers', points: ['Take orders on the POS', 'Seat tables and walk-ins', 'Open and close their shift'] },
]

const faqs = [
  { question: 'What do I need to sign up?', answer: 'An email address, a valid government ID, your BIR Certificate of Registration (Form 2303), and a DTI or SEC certificate.' },
  { question: 'How long does approval take?', answer: 'Usually 1–3 business days. We email you when your cafe is approved, or tell you what to fix if a document needs another look.' },
  { question: 'When can I use the dashboard?', answer: 'As soon as your cafe is approved. Sign in and you can set up your branches, menu, floor plans and staff, then choose a plan.' },
  { question: 'Do I need special hardware?', answer: 'No. BrewSpot runs in the browser on a tablet, laptop or desktop.' },
  { question: 'Can I manage more than one branch?', answer: 'Yes. Add branches from your owner dashboard and compare their sales side by side.' },
]

const openFaqIndex = ref<number | null>(0)
function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index
}

const year = new Date().getFullYear()

// ── Lifecycle ────────────────────────────────────────────────────────────
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!authTokenCookie.value) authStore.clear()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('hashchange', checkHash)
  handleScroll()
  checkHash()

  observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed')
        observer?.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('hashchange', checkHash)
  observer?.disconnect()
})
</script>

<template>
  <div class="min-h-screen bg-[#FFF8EA] font-sans text-[#2D201B] antialiased selection:bg-[#EEDFC4] selection:text-[#2D201B]">
    <!-- ── Header: floating bar ─────────────────────────────────────── -->
    <header class="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        class="nav-shell mx-auto max-w-6xl rounded-2xl border"
        :class="isScrolled || isMobileMenuOpen
          ? 'border-[#65463D] bg-[#7B5A50]/95 text-white shadow-[0_10px_28px_-14px_rgba(59,31,14,0.55)]'
          : 'border-white/15 bg-white/10 text-white'"
      >
        <div class="flex h-16 items-center justify-between gap-4 pl-3 pr-2 sm:pl-4">
          <!-- Same logo as the login page -->
          <NuxtLink to="/" class="press flex shrink-0 items-center rounded-xl" aria-label="BrewSpot, Cafe Management System, home">
            <img :src="logoFull" alt="BrewSpot" class="h-10 w-auto sm:h-11" />
          </NuxtLink>

          <nav class="hidden items-center gap-0.5 lg:flex" aria-label="Main">
            <a
              v-for="l in navLinks"
              :key="l.href"
              :href="l.href"
              class="nav-link rounded-lg px-3.5 py-2 text-[14px] font-medium"
              :class="'text-white/85 hover:bg-white/10 hover:text-white'"
            >{{ l.label }}</a>
          </nav>

          <div class="hidden items-center gap-2 md:flex">
            <button
              v-if="isAuthenticated && role"
              type="button"
              class="btn-primary h-11 px-5 text-sm"
              @click="goDashboard"
            >
              Go to dashboard
            </button>
            <template v-else>
              <button
                type="button"
                class="press inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold transition-colors duration-200"
                :class="'text-white hover:bg-white/10'"
                @click="goLogin"
              >Sign in</button>
              <button type="button" class="press inline-flex h-11 items-center rounded-xl bg-[#FFF8EA] px-5 text-sm font-semibold text-[#7B5A50] transition-colors duration-200 hover:bg-white" @click="goRegister">Create account</button>
            </template>
          </div>

          <button
            type="button"
            class="press grid size-11 place-items-center rounded-xl transition-colors duration-200 lg:hidden"
            :class="'hover:bg-white/10'"
            :aria-label="isMobileMenuOpen ? 'Close menu' : 'Open menu'"
            :aria-expanded="isMobileMenuOpen"
            aria-controls="mobile-menu"
            @click="isMobileMenuOpen = !isMobileMenuOpen"
          >
            <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-2'" class="size-6" />
          </button>
        </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="isMobileMenuOpen" id="mobile-menu" class="border-t border-white/15 px-3 pb-4 pt-2 lg:hidden">
          <nav class="flex flex-col" aria-label="Mobile">
            <a
              v-for="l in navLinks"
              :key="l.href"
              :href="l.href"
              class="rounded-lg px-3 py-3 text-[15px] font-medium text-white hover:bg-white/10"
              @click="isMobileMenuOpen = false"
            >{{ l.label }}</a>
          </nav>
          <div class="mt-3 grid gap-2 border-t border-white/15 pt-4">
            <button v-if="isAuthenticated && role" type="button" class="btn-primary h-11 w-full text-sm" @click="goDashboard(); isMobileMenuOpen = false">Go to dashboard</button>
            <template v-else>
              <button type="button" class="press h-11 w-full rounded-xl bg-[#FFF8EA] text-sm font-semibold text-[#7B5A50]" @click="goRegister(); isMobileMenuOpen = false">Create account</button>
              <button type="button" class="press h-11 w-full rounded-xl border border-white/30 text-sm font-semibold text-white hover:bg-white/10" @click="goLogin(); isMobileMenuOpen = false">Sign in</button>
            </template>
          </div>
        </div>
      </Transition>
      </div>
    </header>

    <main>
      <!-- ── Hero: blurred photo background ──────────────────────────── -->
      <section id="hero" class="relative isolate overflow-hidden bg-[#2A150A] px-4 pb-16 pt-32 sm:px-6 sm:pb-20 sm:pt-36">
        <img
          src="/images/hero-coffee-bg.png"
          alt=""
          class="absolute -inset-4 -z-20 h-[calc(100%+2rem)] w-[calc(100%+2rem)] max-w-none object-cover object-[center_35%] blur-[3px]"
          fetchpriority="high"
        />
        <!-- warm brown wash so text stays readable -->
        <div class="absolute inset-0 -z-10 bg-gradient-to-b from-[#2A150A]/70 via-[#3B1F0E]/60 to-[#5C3C32]/80" aria-hidden="true" />

        <div class="mx-auto w-full max-w-3xl text-center text-white">
          <p class="hero-in inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] font-medium text-[#FFF8EA] backdrop-blur-sm" style="--d: 0ms">
            <span class="size-1.5 rounded-full bg-[#E5C9AE]" aria-hidden="true" />
            Cafe operating system
          </p>
          <h1 class="hero-in mt-6 font-display text-[38px] font-bold leading-[1.08] tracking-tight sm:text-[52px] lg:text-[58px]" style="--d: 60ms">
            Every great cup starts with great management.
          </h1>
          <p class="hero-in mx-auto mt-5 max-w-xl text-[17px] leading-relaxed text-[#F1E4D8]" style="--d: 120ms">
            Run your POS, tables and reservations, menu, cashier shifts and branch reports from one place.
          </p>
          <div class="hero-in mt-8 flex flex-col justify-center gap-3 sm:flex-row" style="--d: 180ms">
            <button
              type="button"
              class="btn-primary h-12 px-6 text-[15px] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
              @click="isAuthenticated && role ? goDashboard() : goRegister()"
            >
              {{ isAuthenticated && role ? 'Go to dashboard' : 'Create account' }}
              <Icon name="heroicons:arrow-right-20-solid" class="size-4" />
            </button>
            <a
              href="#how-it-works"
              class="press inline-flex h-12 items-center justify-center rounded-xl border border-white/40 bg-white/5 px-6 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/15"
            >See how it works</a>
          </div>

          <!-- Same three highlights as the sign-in and registration pages, as slim pills -->
          <ul class="hero-in mt-10 flex flex-wrap justify-center gap-2" style="--d: 240ms">
            <li
              v-for="chip in [{ icon: 'heroicons:shopping-bag', label: 'POS & Inventory' }, { icon: 'heroicons:calendar-days', label: 'Reservations' }, { icon: 'heroicons:chart-bar', label: 'Sales Analytics' }]"
              :key="chip.label"
              class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#65463D]/35 px-3.5 py-1.5 text-[13px] font-medium text-white backdrop-blur-sm"
            >
              <Icon :name="chip.icon" class="size-4 text-[#E5C9AE]" />
              {{ chip.label }}
            </li>
          </ul>
        </div>
      </section>

      <!-- ── Features ─────────────────────────────────────────────────── -->
      <section id="features" class="section border-t border-[#F5ECE0]">
        <div class="mx-auto max-w-6xl">
          <div class="reveal max-w-2xl">
            <p class="eyebrow">Features</p>
            <h2 class="section-title">Everything the counter needs. Nothing it doesn't.</h2>
            <p class="section-lead">The tools a cafe uses every day, kept simple enough to learn in one shift.</p>
          </div>

          <div class="reveal mt-14 grid overflow-hidden rounded-3xl border border-[#EEDFC4] bg-[#EEDFC4] sm:grid-cols-2 lg:grid-cols-3" style="gap: 1px;">
            <div v-for="f in features" :key="f.title" class="bg-[#FFFEFD] p-7 sm:p-8">
              <div class="grid size-10 place-items-center rounded-xl bg-[#FAF4ED] text-[#8B6656]">
                <Icon :name="f.icon" class="size-5" />
              </div>
              <h3 class="mt-5 font-display text-lg font-semibold">{{ f.title }}</h3>
              <p class="mt-2 text-[15px] leading-relaxed text-[#5C3C32]">{{ f.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── How it works ─────────────────────────────────────────────── -->
      <section id="how-it-works" class="section bg-[#FAF4ED]">
        <div class="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div class="reveal lg:sticky lg:top-28 lg:self-start">
            <p class="eyebrow">How it works</p>
            <h2 class="section-title">From sign-up to your dashboard.</h2>
            <p class="section-lead">Five steps from sign-up to running your cafe on BrewSpot. Here is exactly what happens.</p>
            <button type="button" class="btn-primary mt-8 h-12 px-6 text-[15px]" @click="goRegister">
              Create account
              <Icon name="heroicons:arrow-right-20-solid" class="size-4" />
            </button>
          </div>

          <ol class="reveal relative">
            <li v-for="(s, i) in steps" :key="s.title" class="relative grid grid-cols-[48px_1fr] gap-5 pb-10 last:pb-0">
              <!-- connector line -->
              <span v-if="i < steps.length - 1" class="absolute bottom-0 left-6 top-12 w-px -translate-x-1/2 bg-[#D9C7B6]" aria-hidden="true" />
              <span class="relative z-10 grid size-12 place-items-center rounded-full border border-[#D9C7B6] bg-[#FFF8EA] text-[#8B6656]">
                <Icon :name="s.icon" class="size-5" />
              </span>
              <div class="pt-1.5">
                <p class="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8A6E64]">Step {{ i + 1 }}</p>
                <h3 class="mt-1 font-display text-xl font-semibold">{{ s.title }}</h3>
                <p class="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5C3C32]">{{ s.description }}</p>
                <p class="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-[#8B6656]">
                  <Icon name="heroicons:clock" class="size-4" />{{ s.meta }}
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <!-- ── Roles ────────────────────────────────────────────────────── -->
      <section id="roles" class="section">
        <div class="mx-auto max-w-6xl">
          <div class="reveal max-w-2xl">
            <p class="eyebrow">Who it's for</p>
            <h2 class="section-title">One system, a view for everyone.</h2>
            <p class="section-lead">Each person on your team gets a screen made for their job.</p>
          </div>

          <div class="reveal mt-14 grid gap-5 md:grid-cols-3">
            <div v-for="r in roles" :key="r.title" class="rounded-3xl border border-[#EEDFC4] bg-[#FFFEFD] p-7 sm:p-8">
              <Icon :name="r.icon" class="size-6 text-[#8B6656]" />
              <h3 class="mt-5 font-display text-xl font-semibold">{{ r.title }}</h3>
              <ul class="mt-4 space-y-2.5">
                <li v-for="p in r.points" :key="p" class="flex items-start gap-2.5 text-[15px] text-[#5C3C32]">
                  <Icon name="heroicons:check-20-solid" class="mt-0.5 size-4 shrink-0 text-[#8B6656]" />{{ p }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- ── FAQ ──────────────────────────────────────────────────────── -->
      <section id="faq" class="section border-t border-[#F5ECE0]">
        <div class="mx-auto max-w-3xl">
          <div class="reveal text-center">
            <p class="eyebrow">FAQ</p>
            <h2 class="section-title">Common questions</h2>
          </div>

          <ul class="reveal mt-12 space-y-3">
            <li
              v-for="(faq, index) in faqs"
              :key="faq.question"
              class="rounded-2xl border transition-colors duration-200"
              :class="openFaqIndex === index ? 'border-[#D9C7B6] bg-white' : 'border-[#EEDFC4] bg-[#FFFEFD] hover:border-[#D9C7B6]'"
            >
              <button
                type="button"
                :id="`faq-q-${index}`"
                :aria-expanded="openFaqIndex === index"
                :aria-controls="`faq-a-${index}`"
                class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                @click="toggleFaq(index)"
              >
                <span class="text-[16px] font-semibold">{{ faq.question }}</span>
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-200"
                  :class="openFaqIndex === index ? 'bg-[#8B6656] text-white' : 'bg-[#FAF4ED] text-[#8B6656]'"
                >
                  <Icon :name="openFaqIndex === index ? 'heroicons:minus-20-solid' : 'heroicons:plus-20-solid'" class="size-4" />
                </span>
              </button>
              <div
                v-show="openFaqIndex === index"
                :id="`faq-a-${index}`"
                role="region"
                :aria-labelledby="`faq-q-${index}`"
                class="px-5 pb-5 pr-16 text-[15px] leading-relaxed text-[#5C3C32] sm:px-6"
              >
                {{ faq.answer }}
              </div>
            </li>
          </ul>

          <p class="reveal mt-8 text-center text-sm text-[#5C3C32]">
            Still have questions? Read our
            <button type="button" class="font-semibold text-[#8B6656] underline-offset-4 hover:underline" @click="openPolicy('terms')">Terms</button>
            and
            <button type="button" class="font-semibold text-[#8B6656] underline-offset-4 hover:underline" @click="openPolicy('privacy')">Privacy Policy</button>.
          </p>
        </div>
      </section>

      <!-- ── Final call to action ─────────────────────────────────────── -->
      <section class="px-4 pb-24 sm:px-6">
        <div class="reveal mx-auto max-w-6xl rounded-[32px] bg-[#7B5A50] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
          <h2 class="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-[44px] sm:leading-[1.1]">Ready when your counter is.</h2>
          <p class="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/85">Create your account today. We'll guide you through the rest.</p>
          <div class="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" class="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-[#8B6656] transition-colors hover:bg-[#FFF8EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#7B5A50]" @click="goRegister">
              Create account
              <Icon name="heroicons:arrow-right-20-solid" class="size-4" />
            </button>
            <button type="button" class="inline-flex h-12 items-center justify-center rounded-xl border border-white/40 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white" @click="goLogin">
              Sign in
            </button>
          </div>
        </div>
      </section>
    </main>

    <!-- ── Footer ─────────────────────────────────────────────────────── -->
    <footer class="border-t border-[#EEDFC4] px-4 py-12 sm:px-6">
      <div class="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div class="max-w-xs">
          <div class="flex items-center gap-2.5">
            <img :src="logoIcon" alt="" class="h-8 w-8 rounded-lg" />
            <span class="font-display text-lg font-bold tracking-tight">BrewSpot</span>
          </div>
          <p class="mt-4 text-sm leading-relaxed text-[#5C3C32]">The operating system for coffee shops and cafes.</p>
        </div>
        <div class="grid grid-cols-2 gap-10 text-sm sm:grid-cols-3">
          <div>
            <p class="font-semibold">Product</p>
            <ul class="mt-3 space-y-2 text-[#5C3C32]">
              <li v-for="l in navLinks" :key="l.href"><a :href="l.href" class="hover:text-[#2D201B]">{{ l.label }}</a></li>
            </ul>
          </div>
          <div>
            <p class="font-semibold">Account</p>
            <ul class="mt-3 space-y-2 text-[#5C3C32]">
              <li><NuxtLink to="/login" class="hover:text-[#2D201B]">Sign in</NuxtLink></li>
              <li><NuxtLink to="/register" class="hover:text-[#2D201B]">Create account</NuxtLink></li>
            </ul>
          </div>
          <div>
            <p class="font-semibold">Legal</p>
            <ul class="mt-3 space-y-2 text-[#5C3C32]">
              <li><button type="button" class="hover:text-[#2D201B]" @click="openPolicy('privacy')">Privacy Policy</button></li>
              <li><button type="button" class="hover:text-[#2D201B]" @click="openPolicy('terms')">Terms of Service</button></li>
              <li><button type="button" class="hover:text-[#2D201B]" @click="openPolicy('refund')">Refund Policy</button></li>
              <li><button type="button" class="hover:text-[#2D201B]" @click="openPolicy('cookies')">Cookie Policy</button></li>
            </ul>
          </div>
        </div>
      </div>
      <p class="mx-auto mt-10 max-w-6xl border-t border-[#F5ECE0] pt-6 text-[13px] text-[#8A6E64]">© {{ year }} BrewSpot. All rights reserved.</p>
    </footer>

    <LegalPolicyModal
      :open="isPolicyModalOpen"
      :initial-tab="activePolicyTab"
      @close="isPolicyModalOpen = false"
    />
  </div>
</template>

<style>
html { scroll-behavior: smooth; }
</style>

<style scoped>
.eyebrow {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8B6656;
}
.section {
  scroll-margin-top: 5.5rem;
  padding: 6rem 1rem;
}
@media (min-width: 640px) {
  .section { padding: 7.5rem 1.5rem; }
}
.section-title {
  margin-top: 0.75rem;
  font-family: Outfit, sans-serif;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
@media (min-width: 640px) {
  .section-title { font-size: 44px; }
}
.section-lead {
  margin-top: 1rem;
  font-size: 17px;
  line-height: 1.65;
  color: #5C3C32;
}

.btn-primary,
.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, transform 140ms ease;
}
.btn-primary { background: #8B6656; color: #FFFFFF; }
.btn-primary:hover { background: #74533F; }
.btn-ghost { border: 1px solid #D9C7B6; color: #2D201B; background: transparent; }
.btn-ghost:hover { background: #FAF4ED; border-color: #D9C7B6; }
.btn-primary:active,
.btn-ghost:active { transform: scale(0.97); }
.btn-primary:focus-visible,
.btn-ghost:focus-visible,
a:focus-visible,
button:focus-visible {
  outline: 2px solid #8B6656;
  outline-offset: 2px;
}

/* Floating nav: colour/blur changes ease in, never snap */
.nav-shell {
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: background-color 240ms cubic-bezier(0.23, 1, 0.32, 1), border-color 240ms cubic-bezier(0.23, 1, 0.32, 1), color 240ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 240ms cubic-bezier(0.23, 1, 0.32, 1);
}
.nav-link { transition: background-color 160ms ease, color 160ms ease; }

/* Press feedback on anything tappable */
.press { transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1), background-color 200ms ease, color 200ms ease; }
.press:active { transform: scale(0.97); }

/* Hero entrance: small rise + fade, staggered */
.hero-in {
  animation: hero-in 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--d, 0ms);
}
@keyframes hero-in {
  from { opacity: 0; transform: translateY(10px); }
}

.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 600ms cubic-bezier(0.16, 1, 0.3, 1), transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.is-revealed {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal { opacity: 1; transform: none; transition: none; }
  .hero-in { animation: none; }
  .press:active { transform: none; }
}
</style>
