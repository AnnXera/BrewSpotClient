<!-- BrewSpot Landing Page -->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'
import logoIcon from '~/assets/images/logo-icon.svg'
import { getRedirectForRole } from '~/utils/roleRedirects'

import LegalPolicyModal, { type PolicyTab } from '~/components/common/LegalPolicyModal.vue'

// Auth state check
const authStore = useAuthStore()
const authTokenCookie = useCookie<string | null>('auth_token')
const userRoleCookie = useCookie<string | null>('user_role')

// Only authenticated if a valid auth_token cookie actually exists
const isAuthenticated = computed(() => !!authTokenCookie.value && !!(authStore.role || userRoleCookie.value))
const role = computed(() => isAuthenticated.value ? (authStore.role || userRoleCookie.value) : null)

// Legal Policy Modal state
const isPolicyModalOpen = ref(false)
const activePolicyTab = ref<PolicyTab>('privacy')

function openPolicy(tab: PolicyTab) {
  activePolicyTab.value = tab
  isPolicyModalOpen.value = true
}

// Enable smooth scrolling for anchor links & set page metadata
useHead({
  title: 'BrewSpot - Modern Coffee Shop OS & Barista POS Platform',
  meta: [
    { name: 'description', content: 'All-in-one coffee shop operating system: Touchscreen Barista POS, interactive drag-and-drop floor plan designer, automated recipe inventory, cashier shift balancing, and multi-branch analytics.' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=5' },
    { name: 'theme-color', content: '#7D5A50' },
  ],
  htmlAttrs: {
    class: 'scroll-smooth'
  }
})

// Scroll tracking state for dynamic navbar transparency
const isScrolled = ref(false)

function handleScroll() {
  isScrolled.value = window.scrollY > 40
}

function checkHash() {
  if (import.meta.client) {
    const hash = window.location.hash.replace('#', '').toLowerCase()
    if (['privacy', 'terms', 'refund', 'cookies'].includes(hash)) {
      openPolicy(hash as PolicyTab)
    }
  }
}

onMounted(() => {
  if (!authTokenCookie.value) {
    authStore.clear()
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('hashchange', checkHash)
  handleScroll()
  checkHash()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('hashchange', checkHash)
})

// Navigation state for mobile menu
const isMobileMenuOpen = ref(false)

// Chat Widget state
const isChatOpen = ref(false)

// Active preview tab for interactive demo (matches Admin Dashboard navigation)
const activeTab = ref<'approvals' | 'owners' | 'subscriptions' | 'sales'>('sales')

// FAQ Accordion state
const openFaqIndex = ref<number | null>(0)
function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? null : index
}

// Navigation helpers
function goLogin() {
  navigateTo('/login')
}

function goRegister() {
  navigateTo('/register')
}

function goDashboard() {
  if (isAuthenticated.value && role.value) {
    navigateTo(getRedirectForRole(role.value))
  } else {
    navigateTo('/login')
  }
}

// Café Owner Benefits & Features (SaaS Platform Capabilities)
const features = [
  {
    icon: 'heroicons:shopping-bag',
    title: 'Touchscreen Barista POS & Shift Audits',
    description: 'Rapid rush-hour order taking with custom milk alternatives, syrup modifiers, extra espresso shots, multi-channel payments (Cash, E-Wallet, Card), and automated cash drawer shift balancing.'
  },
  {
    icon: 'heroicons:calendar-days',
    title: 'Visual Floor Plan & Table Management',
    description: 'Design custom seating layouts with drag-and-drop tables, chairs, walls, pan/zoom navigation, grid snapping, and live occupancy tracking (Available, Occupied, Reserved, Cleaning).'
  },
  {
    icon: 'heroicons:chart-bar',
    title: 'Multi-Branch & Centralized Analytics',
    description: 'Consolidate daily gross revenue, peak hourly sales curves, top-performing brew blends, and employee shift logs across one or multiple cafe branches from your central owner portal.'
  },
  {
    icon: 'heroicons:cube',
    title: 'Automated Ingredient & Stock Tracking',
    description: 'Automatically deduct espresso beans, milk, syrups, and packaging per transaction. Receive instant low-stock threshold alerts before running out of essential barista supplies.'
  },
  {
    icon: 'heroicons:building-storefront',
    title: 'Dynamic Menu & Recipe Modifiers',
    description: 'Easily manage hot and iced coffee categories, cup sizes, pastry stocks, recipe ingredient formulas, and real-time item availability toggles across POS terminals.'
  },
  {
    icon: 'heroicons:user-group',
    title: 'Role-Based Access & Staff Walkthroughs',
    description: 'Tailored permissions for Super Admin, Cafe Owners, Store Managers, and Cashiers, complete with interactive onboarding tours and mission checklists.'
  }
]

// Workflow steps
const steps = [
  {
    number: '01',
    title: 'Register & Verify Your Cafe',
    description: 'Create your business profile, submit store credentials for quick approval, and access your secure owner dashboard.',
    icon: 'heroicons:user-plus'
  },
  {
    number: '02',
    title: 'Design Floor Plan & Configure Menu',
    description: 'Build your table layout with the visual editor, configure beverage categories, recipe modifiers, and assign store staff.',
    icon: 'heroicons:cog-6-tooth'
  },
  {
    number: '03',
    title: 'Launch POS & Track Real-Time Sales',
    description: 'Install the POS app directly to desktop or tablet, process counter orders with ease, balance cash drawers, and monitor live revenues.',
    icon: 'heroicons:sparkles'
  }
]

// Testimonials data
const testimonials = [
  {
    quote: "The drag-and-drop floor plan designer and instant POS ticket queue cut our morning table turnover and order fulfillment times in half.",
    author: "Elena Rostova",
    role: "Owner, Velvet Roast Cafe",
    rating: 5,
    avatarBg: "bg-[#7D5A50]"
  },
  {
    quote: "Cashier shift balancing and automated recipe ingredient deduction stopped end-of-day discrepancy headaches completely.",
    author: "Marcus Vance",
    role: "Head Roaster, Artisan Brew Co.",
    rating: 5,
    avatarBg: "bg-[#B4846C]"
  },
  {
    quote: "Overseeing 3 branches with BrewSpot's centralized owner analytics and guided staff walkthrough made multi-location scaling simple.",
    author: "Sophia Lin",
    role: "Operations Director, Daily Grind Labs",
    rating: 5,
    avatarBg: "bg-[#65463D]"
  }
]

// FAQ Items (Comprehensive including Refund, Cookie, Privacy & Terms)
const faqs = [
  {
    question: "How does BrewSpot streamline daily coffee shop operations?",
    answer: "BrewSpot provides an end-to-end operating system combining a dedicated Barista POS, cashier cash drawer shift tracking, an interactive visual floor plan editor with live table occupancy, recipe-level inventory tracking, and centralized multi-branch revenue analytics."
  },
  {
    question: "Can the Barista POS be installed as a standalone desktop app?",
    answer: "Yes! BrewSpot's Barista POS is built as a Progressive Web App (PWA). You can install it directly to your Windows desktop, Mac, or tablet with one click for a dedicated, full-screen touch terminal experience."
  },
  {
    question: "How does the interactive floor plan designer work?",
    answer: "Store managers can visually design their cafe layout using drag-and-drop tables, chairs, counters, and walls with snap-to-grid alignment. Cashiers can then assign orders to specific tables directly from the POS while monitoring live statuses: Available, Occupied, Reserved, or Cleaning."
  },
  {
    question: "What staff roles does BrewSpot support?",
    answer: "BrewSpot provides distinct role-based experiences: Super Admin for system oversight and owner verification, Cafe Owners for business financials and branch scaling, Store Managers for floor plans, menu configuration, and inventory, and Cashiers/Baristas for high-speed POS order taking and drawer audits."
  },
  {
    question: "How does cashier shift balancing and drawer reconciliation work?",
    answer: "Cashiers clock in with an opening cash float. Throughout the shift, the system tracks cash, card, and digital wallet transactions. At shift end, the cashier inputs actual cash counted to automatically calculate expected totals, overages, or shortages, storing an audit log for store managers."
  },
  {
    question: "What happens if a user forgets their password?",
    answer: "BrewSpot features an automated self-service password recovery flow that sends secure, temporary reset links directly to the user's verified Gmail address, ensuring quick and secure account recovery anytime."
  },
  {
    question: "How are cafe recipes, inventory, and financial records protected?",
    answer: "All store records—custom beverage formulas, ingredient stock levels, cashier drawer audits, and revenue reports—are encrypted at rest and transmitted over secure TLS 1.3 channels, adhering to enterprise security standards and the Philippine Data Privacy Act (RA 10173)."
  },
  {
    question: "Can I manage multiple cafe locations from a single account?",
    answer: "Yes. BrewSpot is built for multi-branch operations. Owners can monitor consolidated gross sales, compare individual branch performance, manage staff assignments, and scale from a single espresso bar to multiple roasteries seamlessly."
  }
]

// Setup Intersection Observer for scroll animations
let observer: IntersectionObserver | null = null

onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed')
      }
    })
  }, {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  })

  // Observe all elements with 'reveal-on-scroll'
  document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
    observer?.observe(el)
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

</script>

<template>
  <div class="min-h-screen bg-[#FFF8EA] text-[#2D201B] font-sans antialiased selection:bg-[#7D5A50] selection:text-white overflow-x-hidden">
    <!-- Header / Sticky Navigation (Dynamic Scroll Transparency) -->
    <header
      :class="[
        'fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-[#65463D]',
        isScrolled
          ? 'bg-[#7D5A50]/85 backdrop-blur-md shadow-xl'
          : 'bg-[#7D5A50] shadow-md'
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 group shrink-0">
          <img :src="logoFull" alt="BrewSpot Logo" class="h-8 sm:h-10 lg:h-11 w-auto max-w-[160px] sm:max-w-none transition-transform group-hover:scale-[1.02]" />
        </NuxtLink>

        <!-- Desktop Navigation Links -->
        <nav class="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-[#FFF8EA]">
          <a href="#hero" class="px-3 py-1.5 rounded-lg hover:bg-[#65463D]/70 hover:text-[#FCDEC0] transition-all">Home</a>
          <a href="#demo" class="px-3 py-1.5 rounded-lg hover:bg-[#65463D]/70 hover:text-[#FCDEC0] transition-all">Platform Demo</a>
          <a href="#features" class="px-3 py-1.5 rounded-lg hover:bg-[#65463D]/70 hover:text-[#FCDEC0] transition-all">Features</a>
          <a href="#how-it-works" class="px-3 py-1.5 rounded-lg hover:bg-[#65463D]/70 hover:text-[#FCDEC0] transition-all">How It Works</a>
          <a href="#testimonials" class="px-3 py-1.5 rounded-lg hover:bg-[#65463D]/70 hover:text-[#FCDEC0] transition-all">Testimonials</a>
          <a href="#faq" class="px-3 py-1.5 rounded-lg hover:bg-[#65463D]/70 hover:text-[#FCDEC0] transition-all">FAQ</a>
        </nav>

        <!-- Desktop Action Buttons -->
        <div class="hidden md:flex items-center gap-3 shrink-0">
          <template v-if="isAuthenticated && role">
            <button
              @click="goDashboard"
              class="h-10 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          </template>
          <template v-else>
            <button
              @click="goLogin"
              class="h-10 px-4 rounded-xl text-[#FFF8EA] hover:bg-[#65463D]/70 font-semibold text-sm transition flex items-center justify-center gap-2 border border-[#FFF8EA]/30 hover:border-[#FCDEC0] hover:text-[#FCDEC0] cursor-pointer"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 text-[#FCDEC0]" />
              <span>Sign In</span>
            </button>
            <button
              @click="goRegister"
              class="h-10 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <Icon name="heroicons:user-plus" class="w-4 h-4 text-[#7D5A50]" />
              <span>Create Account</span>
            </button>
          </template>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="inline-flex items-center justify-center lg:hidden p-2 rounded-xl text-[#FFF8EA] hover:bg-[#FFF8EA]/10 focus:outline-none"
          aria-label="Toggle menu"
        >
          <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      </div>

      <!-- Mobile Navigation Drawer -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-4"
      >
        <div v-if="isMobileMenuOpen" class="lg:hidden bg-[#65463D] text-[#FFF8EA] border-b border-[#52372F] px-4 py-5 sm:px-6 sm:py-6 space-y-4 shadow-2xl">
          <nav class="flex flex-col space-y-1 sm:space-y-2 font-semibold text-sm text-[#FFF8EA]/90">
            <a href="#hero" @click="isMobileMenuOpen = false" class="py-2.5 px-3 rounded-lg hover:bg-[#7D5A50] transition">Home</a>
            <a href="#demo" @click="isMobileMenuOpen = false" class="py-2.5 px-3 rounded-lg hover:bg-[#7D5A50] transition">Platform Demo</a>
            <a href="#features" @click="isMobileMenuOpen = false" class="py-2.5 px-3 rounded-lg hover:bg-[#7D5A50] transition">Features</a>
            <a href="#how-it-works" @click="isMobileMenuOpen = false" class="py-2.5 px-3 rounded-lg hover:bg-[#7D5A50] transition">How It Works</a>
            <a href="#testimonials" @click="isMobileMenuOpen = false" class="py-2.5 px-3 rounded-lg hover:bg-[#7D5A50] transition">Testimonials</a>
            <a href="#faq" @click="isMobileMenuOpen = false" class="py-2.5 px-3 rounded-lg hover:bg-[#7D5A50] transition">FAQ</a>
          </nav>
          <div class="pt-3 border-t border-[#FFF8EA]/20 flex flex-col gap-2.5 sm:gap-3">
            <template v-if="isAuthenticated && role">
              <button
                @click="goDashboard(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </template>
            <template v-else>
              <button
                @click="goLogin(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-xl border border-[#FFF8EA]/40 text-[#FFF8EA] font-semibold text-sm hover:bg-[#7D5A50] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 text-[#FCDEC0]" />
                <span>Sign In</span>
              </button>
              <button
                @click="goRegister(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Icon name="heroicons:user-plus" class="w-4 h-4 text-[#7D5A50]" />
                <span>Create Account</span>
              </button>
            </template>
          </div>
        </div>
      </transition>
    </header>

    <!-- SECTION 1: HERO SECTION -->
    <section id="hero" class="min-h-screen min-h-[100dvh] relative flex flex-col justify-center items-center overflow-hidden bg-[#2D201B] text-[#FFF8EA] pt-20 sm:pt-24 pb-12 sm:pb-16">
      <!-- Background Image with Rich Palette Dark Overlay -->
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style="background-image: url('/images/hero-coffee-bg.png');"
      ></div>
      <!-- Multi-layer Brand Overlay -->
      <div class="absolute inset-0 bg-gradient-to-r from-[#000000]/90 via-[#7D5A50]/85 to-[#000000]/90 backdrop-blur-[1px]"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-[#000000]/60 via-transparent to-[#7D5A50]"></div>

      <!-- Hero Main Content Box -->
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col items-center justify-center text-center">
        <div class="space-y-6 sm:space-y-8 flex flex-col items-center text-center w-full">
          <!-- Top Badge Pill -->
          <div class="inline-flex items-center gap-2 sm:gap-3 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-[#FCDEC0]/20 border border-[#FCDEC0]/40 text-[#FCDEC0] text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md shadow-xl text-center max-w-full">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#E5B299] animate-pulse shrink-0"></span>
            <span class="truncate sm:whitespace-normal">Complete Coffee Shop & Cafe Operating System</span>
          </div>

          <!-- Main Hero Headline -->
          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.18] sm:leading-[1.15] text-center">
            Every Great Cup Starts With <br class="hidden sm:inline" />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#FCDEC0] via-[#E5B299] to-[#B4846C]">Intelligent Management</span>
          </h1>

          <!-- Subtitle -->
          <p class="text-sm sm:text-base lg:text-xl text-[#FFF8EA]/95 leading-relaxed font-normal max-w-2xl text-center mx-auto px-2">
            Unify your touchscreen Barista POS, interactive table floor plans, recipe inventory, cashier shift balancing, and multi-branch analytics into one seamless coffee shop platform.
          </p>

          <!-- Call to Action Buttons -->
          <div class="pt-2 sm:pt-4 flex items-center justify-center w-full sm:w-auto">
            <button
              @click="goRegister"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 rounded-xl bg-[#7D5A50] text-[#FFF8EA] font-bold text-sm sm:text-base hover:bg-[#65463D] transition flex items-center justify-center gap-2.5 shadow-xl transform hover:-translate-y-0.5 border border-[#B4846C] cursor-pointer"
            >
              <span>Create Account</span>
              <Icon name="heroicons:arrow-right" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
            </button>
          </div>

          <!-- Trust Sub-indicators -->
          <div class="pt-4 sm:pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 lg:gap-8 text-xs sm:text-sm text-[#FCDEC0] font-medium text-center">
            <span class="flex items-center gap-1.5 sm:gap-2">
              <Icon name="heroicons:check-circle" class="w-4 h-4 sm:w-5 sm:h-5 text-[#E5B299] shrink-0" />
              <span>Fast Business Verification</span>
            </span>
            <span class="flex items-center gap-1.5 sm:gap-2">
              <Icon name="heroicons:check-circle" class="w-4 h-4 sm:w-5 sm:h-5 text-[#E5B299] shrink-0" />
              <span>PWA Desktop & Tablet Ready</span>
            </span>
            <span class="flex items-center gap-1.5 sm:gap-2">
              <Icon name="heroicons:check-circle" class="w-4 h-4 sm:w-5 sm:h-5 text-[#E5B299] shrink-0" />
              <span>Multi-Branch & Shift Audits</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- KEY METRICS STRIP -->
    <section class="relative z-10 bg-[#7D5A50] text-[#FFF8EA] py-6 sm:py-8 lg:py-10 border-b border-[#65463D] shadow-md reveal-on-scroll">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-center">
          <div class="text-center space-y-1">
            <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FCDEC0]">500+</p>
            <p class="text-[11px] sm:text-xs lg:text-sm text-[#FFF8EA]/85 font-medium leading-tight">Active Cafes & Roasteries</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FCDEC0]">1.5M+</p>
            <p class="text-[11px] sm:text-xs lg:text-sm text-[#FFF8EA]/85 font-medium leading-tight">Orders & Espresso Cups Served</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FCDEC0]">100%</p>
            <p class="text-[11px] sm:text-xs lg:text-sm text-[#FFF8EA]/85 font-medium leading-tight">Cashier Shift & Drawer Balancing</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#FCDEC0]">4.9 / 5</p>
            <p class="text-[11px] sm:text-xs lg:text-sm text-[#FFF8EA]/85 font-medium leading-tight">Specialty Cafe Owner Rating</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: PLATFORM DEMO SUITE -->
    <section id="demo" class="py-16 sm:py-20 lg:py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden reveal-on-scroll">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 sm:space-y-10">
        <div class="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#E5B299]">Live Operations Suite</span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D201B]">Experience BrewSpot Live</h2>
          <p class="text-xs sm:text-sm md:text-base text-[#7D5A50]">Explore the real management portals used by coffee shop owners, store managers, and system administrators.</p>
        </div>

        <!-- Window Mockup Container -->
        <div class="max-w-5xl mx-auto rounded-2xl border border-[#E5B299] bg-white shadow-2xl overflow-hidden">
          <!-- Window Top Bar -->
          <div class="bg-[#7D5A50] text-[#FFF8EA] px-3.5 py-3 sm:px-6 sm:py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 border-b border-[#65463D]">
            <div class="flex items-center justify-between md:justify-start gap-2">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-[#E5B299] inline-block"></span>
                <span class="w-3 h-3 rounded-full bg-[#FCDEC0] inline-block"></span>
                <span class="w-3 h-3 rounded-full bg-[#B4846C] inline-block"></span>
              </div>
              <span class="text-xs font-semibold text-[#FCDEC0] tracking-wide ml-2">BrewSpot Operations Portal</span>
            </div>

            <!-- Dashboard Navigation Tabs with Smooth Horizontal Scroll -->
            <div class="flex items-center gap-1.5 bg-[#65463D] p-1 sm:p-1.5 rounded-xl overflow-x-auto no-scrollbar scroll-smooth w-full md:w-auto">
              <button
                @click="activeTab = 'sales'"
                :class="[activeTab === 'sales' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer']"
              >
                <Icon name="heroicons:squares-2x2" class="w-4 h-4 shrink-0" />
                <span>POS & Shift Register</span>
              </button>

              <button
                @click="activeTab = 'approvals'"
                :class="[activeTab === 'approvals' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer']"
              >
                <Icon name="heroicons:check-circle" class="w-4 h-4 shrink-0" />
                <span>Approvals</span>
              </button>

              <button
                @click="activeTab = 'owners'"
                :class="[activeTab === 'owners' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer']"
              >
                <Icon name="heroicons:users" class="w-4 h-4 shrink-0" />
                <span>Owners</span>
              </button>

              <button
                @click="activeTab = 'subscriptions'"
                :class="[activeTab === 'subscriptions' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer']"
              >
                <Icon name="heroicons:credit-card" class="w-4 h-4 shrink-0" />
                <span>Subscriptions</span>
              </button>
            </div>
          </div>

          <!-- Showcase Content Area -->
          <div class="p-4 sm:p-6 lg:p-8 bg-[#FFF8EA] min-h-[380px]">
            
            <!-- TAB 1: POS & Live Sales -->
            <div v-if="activeTab === 'sales'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCDEC0] pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-bold text-[#2D201B]">Live Barista Queue & POS Shift Register</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Real-time order ticket queue, table occupancy assignment, coffee modifier options, and shift drawer balance.</p>
                </div>
                <span class="self-start sm:self-auto px-3.5 py-1.5 bg-[#E5B299]/30 text-[#7D5A50] text-xs font-semibold rounded-full flex items-center gap-2 border border-[#E5B299] shrink-0">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#7D5A50] animate-pulse"></span> Live Sync Active
                </span>
              </header>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Barista Order Queue -->
                <div class="md:col-span-2 space-y-3">
                  <p class="text-xs font-bold text-[#7D5A50] uppercase tracking-wider">Active Order Queue</p>

                  <div class="p-3.5 sm:p-4 bg-white rounded-xl border border-emerald-400 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-bold text-sm text-[#2D201B]">Order #1042 · Table 04</span>
                        <span class="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[0.68rem] font-bold rounded">Preparing</span>
                      </div>
                      <p class="text-xs text-[#7D5A50] mt-1 break-words">1x Spanish Latte (Oat Milk + Extra Shot), 1x Butter Croissant</p>
                    </div>
                    <p class="font-bold text-sm sm:text-base text-[#7D5A50] self-end sm:self-auto shrink-0">₱235.00</p>
                  </div>

                  <div class="p-3.5 sm:p-4 bg-white rounded-xl border border-[#FCDEC0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-bold text-sm text-[#2D201B]">Order #1041 · Takeout</span>
                        <span class="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[0.68rem] font-bold rounded">Ready for Pickup</span>
                      </div>
                      <p class="text-xs text-[#7D5A50] mt-1 break-words">2x Iced Caramel Macchiato</p>
                    </div>
                    <p class="font-bold text-sm sm:text-base text-[#7D5A50] self-end sm:self-auto shrink-0">₱300.00</p>
                  </div>
                </div>

                <!-- Daily Revenue Box -->
                <div class="bg-white rounded-xl border border-[#E5B299] p-4 sm:p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <p class="text-xs text-[#7D5A50] font-medium">Today's Total Revenue</p>
                    <p class="text-2xl sm:text-3xl font-extrabold text-[#7D5A50] mt-1">₱14,850.00</p>
                    <p class="text-xs text-emerald-700 font-semibold mt-1">112 orders fulfilled today</p>
                  </div>

                  <div class="border-t border-[#FCDEC0] pt-3 space-y-2 text-xs text-[#2D201B]">
                    <div class="flex justify-between">
                      <span>Espresso Beverages</span>
                      <span class="font-semibold text-[#7D5A50]">₱9,840.00</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Pastries & Food</span>
                      <span class="font-semibold text-[#7D5A50]">₱5,010.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 2: Approval Status -->
            <div v-else-if="activeTab === 'approvals'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCDEC0] pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-bold text-[#2D201B]">Cafe Owner Applications</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Review and verify business credentials before approving cafe licenses.</p>
                </div>
                <span class="self-start sm:self-auto text-xs bg-[#7D5A50]/15 text-[#7D5A50] px-3.5 py-1.5 rounded-full font-semibold border border-[#7D5A50]/30 shrink-0">
                  3 Pending Applications
                </span>
              </header>

              <div class="bg-white border border-[#E5B299] rounded-xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto no-scrollbar">
                  <table class="w-full min-w-[560px] text-left text-xs">
                    <thead class="bg-[#FFF8EA] text-[#7D5A50] font-semibold uppercase tracking-wider text-[0.7rem] border-b border-[#FCDEC0]">
                      <tr>
                        <th class="px-4 py-3">Applicant / Owner</th>
                        <th class="px-4 py-3">Café / Business</th>
                        <th class="px-4 py-3">Documents</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#FCDEC0] text-[#2D201B]">
                      <tr class="hover:bg-[#FFF8EA] transition-colors">
                        <td class="px-4 py-3 font-medium">
                          <p class="font-bold text-[#2D201B]">Jaime Banani</p>
                          <p class="text-[0.68rem] text-[#7D5A50]">jakimabdil22@gmail.com</p>
                        </td>
                        <td class="px-4 py-3">
                          <p class="font-semibold text-[#2D201B]">BrewSpot Davao</p>
                          <p class="text-[0.68rem] text-[#7D5A50]">Main Branch · Davao City</p>
                        </td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded font-semibold text-[0.68rem]">
                            ✓ 4 Documents Verified
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[0.68rem] inline-flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Review
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button class="px-4 py-2 rounded-lg bg-[#7D5A50] text-white font-semibold hover:bg-[#65463D] transition text-[0.7rem] shadow-sm cursor-pointer">
                            Review Application
                          </button>
                        </td>
                      </tr>

                      <tr class="hover:bg-[#FFF8EA] transition-colors">
                        <td class="px-4 py-3 font-medium">
                          <p class="font-bold text-[#2D201B]">Elena Rostova</p>
                          <p class="text-[0.68rem] text-[#7D5A50]">elena@velvetroast.com</p>
                        </td>
                        <td class="px-4 py-3">
                          <p class="font-semibold text-[#2D201B]">Velvet Roast Cafe</p>
                          <p class="text-[0.68rem] text-[#7D5A50]">Poblacion District</p>
                        </td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded font-semibold text-[0.68rem]">
                            ✓ All Verified
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[0.68rem]">
                            ✓ Approved
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button class="px-4 py-2 rounded-lg border border-[#7D5A50] text-[#7D5A50] font-semibold hover:bg-[#7D5A50]/10 transition text-[0.7rem] cursor-pointer">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- TAB 3: Owner Directory -->
            <div v-else-if="activeTab === 'owners'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCDEC0] pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-bold text-[#2D201B]">Owner Directory</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Centralized directory of registered coffee shop owners and branch licenses.</p>
                </div>
                <button class="self-start sm:self-auto px-4 py-2 sm:px-5 sm:py-2 rounded-lg bg-[#7D5A50] text-white text-xs font-semibold hover:bg-[#65463D] transition flex items-center gap-2 shadow cursor-pointer shrink-0">
                  <Icon name="heroicons:user-plus" class="w-4 h-4" />
                  <span>Add New Owner</span>
                </button>
              </header>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 sm:p-5 bg-white rounded-xl border border-[#E5B299] space-y-3 shadow-sm hover:border-[#7D5A50] transition-colors">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl bg-[#7D5A50] text-white font-bold flex items-center justify-center text-sm shadow shrink-0">
                        DR
                      </div>
                      <div class="min-w-0">
                        <h4 class="font-bold text-sm text-[#2D201B] truncate">Daily Grind Roastery</h4>
                        <p class="text-xs text-[#7D5A50] truncate">Owner: Sophia Lin</p>
                      </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold shrink-0">Active Owner</span>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-[#FCDEC0] text-[#2D201B] gap-2">
                    <span class="truncate">3 Branches (Bajada, Matina, Toril)</span>
                    <span class="font-semibold text-[#7D5A50] shrink-0">Pro Tier</span>
                  </div>
                </div>

                <div class="p-4 sm:p-5 bg-white rounded-xl border border-[#E5B299] space-y-3 shadow-sm hover:border-[#7D5A50] transition-colors">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl bg-[#B4846C] text-white font-bold flex items-center justify-center text-sm shadow shrink-0">
                        EL
                      </div>
                      <div class="min-w-0">
                        <h4 class="font-bold text-sm text-[#2D201B] truncate">Espresso Lab Davao</h4>
                        <p class="text-xs text-[#7D5A50] truncate">Owner: Rafael Santos</p>
                      </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold shrink-0">Active Owner</span>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-[#FCDEC0] text-[#2D201B] gap-2">
                    <span class="truncate">1 Main Branch (Obrero)</span>
                    <span class="font-semibold text-[#7D5A50] shrink-0">Standard Tier</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 4: Subscriptions -->
            <div v-else-if="activeTab === 'subscriptions'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCDEC0] pb-4">
                <div>
                  <h3 class="text-lg sm:text-xl font-bold text-[#2D201B]">Subscriptions & Billing</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Track active plans, renewal schedules, and monthly recurring revenue.</p>
                </div>
                <span class="self-start sm:self-auto text-xs bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-full font-semibold shrink-0">
                  MRR: ₱185,000.00 (+14.2%)
                </span>
              </header>

              <div class="bg-white border border-[#E5B299] rounded-xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto no-scrollbar">
                  <table class="w-full min-w-[540px] text-left text-xs">
                    <thead class="bg-[#FFF8EA] text-[#7D5A50] font-semibold uppercase tracking-wider text-[0.7rem] border-b border-[#FCDEC0]">
                      <tr>
                        <th class="px-4 py-3">Cafe Name</th>
                        <th class="px-4 py-3">Plan Tier</th>
                        <th class="px-4 py-3">Next Renewal</th>
                        <th class="px-4 py-3">Billing Status</th>
                        <th class="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#FCDEC0] text-[#2D201B]">
                      <tr class="hover:bg-[#FFF8EA] transition-colors">
                        <td class="px-4 py-3 font-bold text-[#2D201B]">Velvet Roast Cafe</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-0.5 rounded bg-[#7D5A50]/10 text-[#7D5A50] font-semibold text-[0.68rem]">Pro Multi-Branch</span>
                        </td>
                        <td class="px-4 py-3 text-gray-600">Oct 15, 2026</td>
                        <td class="px-4 py-3">
                          <span class="text-emerald-800 font-bold text-[0.68rem]">✓ Active / Paid</span>
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-[#7D5A50]">₱4,999.00 / mo</td>
                      </tr>

                      <tr class="hover:bg-[#FFF8EA] transition-colors">
                        <td class="px-4 py-3 font-bold text-[#2D201B]">Artisan Brew Co.</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-0.5 rounded bg-[#7D5A50]/10 text-[#7D5A50] font-semibold text-[0.68rem]">Pro Single Branch</span>
                        </td>
                        <td class="px-4 py-3 text-gray-600">Oct 10, 2026</td>
                        <td class="px-4 py-3">
                          <span class="text-emerald-800 font-bold text-[0.68rem]">✓ Active / Paid</span>
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-[#7D5A50]">₱2,999.00 / mo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 3: CAFÉ OWNER FEATURES & BENEFITS -->
    <section id="features" class="py-16 sm:py-20 lg:py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden reveal-on-scroll">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10 sm:space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#E5B299]">Owner & Manager Platform Features</span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D201B]">Everything Your Coffee Business Needs to Scale</h2>
          <p class="text-xs sm:text-sm md:text-base text-[#7D5A50]">From rush-hour counter sales and custom table layouts to ingredient tracking, cashier shift balancing, and multi-branch control.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          <div
            v-for="(feature, idx) in features"
            :key="idx"
            class="p-6 sm:p-8 rounded-2xl bg-white border border-[#FCDEC0] hover:border-[#7D5A50] transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1 group flex flex-col justify-between"
          >
            <div class="space-y-3 sm:space-y-4">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#FCDEC0] text-[#7D5A50] group-hover:bg-[#7D5A50] group-hover:text-white transition-colors flex items-center justify-center shadow">
                <Icon :name="feature.icon" class="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 class="text-lg sm:text-xl font-bold text-[#2D201B] leading-snug">{{ feature.title }}</h3>
              <p class="text-xs sm:text-sm text-[#7D5A50] leading-relaxed">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 4: HOW IT WORKS -->
    <section id="how-it-works" class="py-16 sm:py-20 lg:py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden reveal-on-scroll">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10 sm:space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#E5B299]">Streamlined 3-Step Onboarding</span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D201B]">From Signup to Serving in Minutes</h2>
          <p class="text-xs sm:text-sm md:text-base text-[#7D5A50]">Launch your cafe operations with ease on your existing tablets, laptops, and touchscreens—no proprietary hardware required.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5B299] relative overflow-hidden flex flex-col justify-between space-y-5 sm:space-y-6 shadow-lg"
          >
            <span class="text-5xl sm:text-6xl font-black text-[#E5B299]/40 absolute top-4 right-4 pointer-events-none select-none">{{ step.number }}</span>
            <div class="space-y-3 sm:space-y-4 relative z-10">
              <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#7D5A50] text-[#FFF8EA] flex items-center justify-center shadow-lg">
                <Icon :name="step.icon" class="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 class="text-lg sm:text-xl font-bold text-[#2D201B]">{{ step.title }}</h3>
              <p class="text-xs sm:text-sm text-[#7D5A50] leading-relaxed">{{ step.description }}</p>
            </div>
          </div>
        </div>

        <div class="pt-4 sm:pt-6 text-center flex justify-center">
          <button
            @click="goRegister"
            class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 rounded-xl bg-[#7D5A50] text-[#FFF8EA] font-bold text-sm sm:text-base hover:bg-[#65463D] transition flex items-center justify-center gap-2.5 shadow-xl border border-[#B4846C] cursor-pointer"
          >
            <span>Register Your Cafe Now</span>
            <Icon name="heroicons:arrow-right" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 5: TESTIMONIALS -->
    <section id="testimonials" class="py-16 sm:py-20 lg:py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden reveal-on-scroll">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-10 sm:space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#E5B299]">Trusted by Specialty Cafes</span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D201B]">What Cafe Owners & Roasters Say</h2>
          <p class="text-xs sm:text-sm md:text-base text-[#7D5A50]">Hear directly from specialty coffee founders, head roasters, and managers operating with BrewSpot daily.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="p-6 sm:p-8 rounded-2xl bg-white border border-[#E5B299] shadow-lg space-y-5 sm:space-y-6 flex flex-col justify-between"
          >
            <div class="space-y-3 sm:space-y-4">
              <div class="flex items-center gap-1 text-amber-500">
                <Icon v-for="s in t.rating" :key="s" name="heroicons:star" class="w-4 h-4 sm:w-5 sm:h-5 fill-amber-400 text-amber-400" />
              </div>
              <p class="text-xs sm:text-sm text-[#2D201B] italic leading-relaxed">"{{ t.quote }}"</p>
            </div>

            <div class="flex items-center gap-3 pt-3 sm:pt-4 border-t border-[#FCDEC0]">
              <div :class="[t.avatarBg, 'w-10 h-10 sm:w-11 sm:h-11 rounded-full text-white font-bold flex items-center justify-center text-sm shadow shrink-0']">
                {{ t.author.charAt(0) }}
              </div>
              <div class="min-w-0">
                <p class="font-bold text-sm text-[#2D201B] truncate">{{ t.author }}</p>
                <p class="text-xs text-[#7D5A50] truncate">{{ t.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 6: FAQ SECTION -->
    <section id="faq" class="py-16 sm:py-20 lg:py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden reveal-on-scroll">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 sm:space-y-10">
        <div class="text-center max-w-2xl mx-auto space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-[#E5B299]">Platform Knowledge & Policies</span>
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#2D201B]">Frequently Asked Questions</h2>
          <p class="text-xs sm:text-sm text-[#7D5A50]">
            Everything you need to know about our cafe operating system, touchscreen POS, shift balancing, data privacy, and policies.
          </p>

          <!-- Quick Policy Direct Access Pills -->
          <div class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-2">
            <button
              type="button"
              @click="openPolicy('refund')"
              class="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white border border-[#E5B299] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF8EA] hover:border-[#7D5A50] transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Icon name="heroicons:arrow-path-rounded-square" class="w-3.5 h-3.5" />
              <span>Refund Policy</span>
            </button>
            <button
              type="button"
              @click="openPolicy('cookies')"
              class="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white border border-[#E5B299] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF8EA] hover:border-[#7D5A50] transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Icon name="heroicons:circle-stack" class="w-3.5 h-3.5" />
              <span>Cookie Policy</span>
            </button>
            <button
              type="button"
              @click="openPolicy('privacy')"
              class="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white border border-[#E5B299] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF8EA] hover:border-[#7D5A50] transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Icon name="heroicons:lock-closed" class="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
            <button
              type="button"
              @click="openPolicy('terms')"
              class="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold bg-white border border-[#E5B299] text-[#7D5A50] hover:bg-[#7D5A50] hover:text-[#FFF8EA] hover:border-[#7D5A50] transition shadow-2xs cursor-pointer active:scale-95"
            >
              <Icon name="heroicons:document-text" class="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
          </div>
        </div>

        <div class="space-y-3 sm:space-y-4">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="rounded-xl border border-[#E5B299] bg-white overflow-hidden transition-all shadow-sm"
          >
            <button
              @click="toggleFaq(index)"
              class="w-full px-4 py-4 sm:px-6 sm:py-5 text-left font-semibold text-sm sm:text-base text-[#2D201B] flex items-center justify-between gap-3 hover:text-[#7D5A50] transition-colors cursor-pointer"
            >
              <span>{{ faq.question }}</span>
              <Icon
                :name="openFaqIndex === index ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                class="w-5 h-5 text-[#7D5A50] shrink-0"
              />
            </button>
            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-2"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-2"
            >
              <div v-if="openFaqIndex === index" class="px-4 pb-4 sm:px-6 sm:pb-5 text-xs sm:text-sm text-[#7D5A50] leading-relaxed border-t border-[#FCDEC0] pt-3 sm:pt-4">
                {{ faq.answer }}
              </div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 7: CALL TO ACTION -->
    <section id="cta" class="pt-16 sm:pt-20 lg:pt-24 flex flex-col justify-between bg-[#FFF8EA] text-[#2D201B] relative overflow-hidden reveal-on-scroll">
      <!-- Main CTA Box -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full mb-16 sm:mb-20 lg:mb-24">
        <div class="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#7D5A50] via-[#B4846C] to-[#7D5A50] text-[#FFF8EA] p-6 sm:p-10 lg:p-12 text-center space-y-5 sm:space-y-6 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-12 -left-12 w-64 h-64 bg-[#FCDEC0]/20 rounded-full blur-3xl pointer-events-none"></div>

          <div class="max-w-2xl mx-auto space-y-2.5 sm:space-y-3 relative z-10">
            <h2 class="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">Ready to Elevate Your Coffee Shop Operations?</h2>
            <p class="text-sm sm:text-base lg:text-lg text-[#FFF8EA]/90 font-normal">Join top specialty cafes and roasteries using BrewSpot to streamline barista workflows, maximize table turnover, and scale multi-branch revenue.</p>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 relative z-10">
            <button
              @click="goRegister"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm sm:text-base hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2.5 shadow-xl cursor-pointer"
            >
              <Icon name="heroicons:user-plus" class="w-4 h-4 sm:w-5 sm:h-5 text-[#7D5A50]" />
              <span>Create Free Account</span>
            </button>
            <button
              @click="goLogin"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl border border-[#FFF8EA]/50 text-[#FFF8EA] font-semibold text-sm sm:text-base hover:bg-[#FFF8EA]/10 transition flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
              <span>Sign In to Account</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-[#7D5A50] text-[#FFF8EA] py-8 sm:py-12 border-t border-[#65463D] w-full mt-auto">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
          <div class="flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-3">
              <img :src="logoIcon" alt="BrewSpot Icon" class="h-9 sm:h-10 w-auto brightness-200" />
              <span class="text-xl sm:text-2xl font-extrabold tracking-wider text-[#FFF8EA]">BrewSpot</span>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 text-sm sm:text-base font-medium text-[#FFF8EA]/90">
              <a href="#hero" class="hover:text-[#FCDEC0] transition">Home</a>
              <a href="#demo" class="hover:text-[#FCDEC0] transition">Demo</a>
              <a href="#features" class="hover:text-[#FCDEC0] transition">Features</a>
              <a href="#how-it-works" class="hover:text-[#FCDEC0] transition">How It Works</a>
              <a href="#faq" class="hover:text-[#FCDEC0] transition">FAQ</a>
              <NuxtLink to="/login" class="hover:text-[#FCDEC0] transition">Sign In</NuxtLink>
              <NuxtLink to="/register" class="hover:text-[#FCDEC0] transition">Register</NuxtLink>
            </div>
          </div>

          <div class="pt-6 border-t border-[#65463D] flex flex-col md:flex-row items-center justify-between text-xs sm:text-sm text-[#FFF8EA]/80 gap-4 text-center md:text-left">
            <p>© {{ new Date().getFullYear() }} BrewSpot Systems Inc. All rights reserved.</p>
            <div class="flex flex-wrap items-center justify-center md:justify-end gap-x-4 sm:gap-x-5 gap-y-2 font-medium">
              <button
                type="button"
                @click="openPolicy('privacy')"
                class="hover:text-[#FCDEC0] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span class="text-[#FFF8EA]/40 hidden sm:inline">•</span>
              <button
                type="button"
                @click="openPolicy('terms')"
                class="hover:text-[#FCDEC0] transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span class="text-[#FFF8EA]/40 hidden sm:inline">•</span>
              <button
                type="button"
                @click="openPolicy('refund')"
                class="hover:text-[#FCDEC0] transition-colors cursor-pointer"
              >
                Refund Policy
              </button>
              <span class="text-[#FFF8EA]/40 hidden sm:inline">•</span>
              <button
                type="button"
                @click="openPolicy('cookies')"
                class="hover:text-[#FCDEC0] transition-colors cursor-pointer"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </footer>
    </section>

    <!-- Floating Customer Agent / Chat Widget -->
    <div class="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end max-w-[calc(100vw-2rem)]">
      <!-- Chat Window -->
      <transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-8 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-8 scale-95"
      >
        <div v-if="isChatOpen" class="w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-[#E5B299] overflow-hidden mb-3 sm:mb-4 flex flex-col">
          <!-- Header -->
          <div class="bg-[#7D5A50] p-4 text-[#FFF8EA] flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-[#FCDEC0] flex items-center justify-center text-[#7D5A50] shrink-0">
                <Icon name="heroicons:chat-bubble-left-ellipsis-solid" class="w-6 h-6" />
              </div>
              <div class="min-w-0">
                <h3 class="font-bold text-sm truncate">BrewSpot Operations Support</h3>
                <p class="text-xs text-[#FFF8EA]/80 truncate">Online to assist cafe owners & managers</p>
              </div>
            </div>
            <button @click="isChatOpen = false" class="text-[#FFF8EA] hover:text-[#FCDEC0] transition cursor-pointer p-1">
              <Icon name="heroicons:x-mark" class="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
          <!-- Body -->
          <div class="p-4 sm:p-5 bg-[#FFF8EA]/30">
            <form @submit.prevent="" class="space-y-3 sm:space-y-4">
              <div class="space-y-1">
                <label for="chat-name" class="block text-xs font-semibold text-[#2D201B]">Name</label>
                <input type="text" id="chat-name" placeholder="Your name" class="w-full px-3 py-2 text-sm rounded-lg border border-[#E5B299] focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent outline-none transition bg-white">
              </div>
              <div class="space-y-1">
                <label for="chat-email" class="block text-xs font-semibold text-[#2D201B]">Email</label>
                <input type="email" id="chat-email" placeholder="you@example.com" class="w-full px-3 py-2 text-sm rounded-lg border border-[#E5B299] focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent outline-none transition bg-white">
              </div>
              <div class="space-y-1">
                <label for="chat-message" class="block text-xs font-semibold text-[#2D201B]">Message</label>
                <textarea id="chat-message" rows="3" placeholder="How can we help?" class="w-full px-3 py-2 text-sm rounded-lg border border-[#E5B299] focus:ring-2 focus:ring-[#7D5A50] focus:border-transparent outline-none transition bg-white resize-none"></textarea>
              </div>
              <button type="submit" class="w-full h-10 rounded-lg bg-[#7D5A50] text-[#FFF8EA] font-bold text-sm hover:bg-[#65463D] transition shadow-md flex items-center justify-center gap-2 cursor-pointer">
                <span>Send Inquiry</span>
                <Icon name="heroicons:paper-airplane" class="w-4 h-4 text-[#FCDEC0]" />
              </button>
            </form>
          </div>
        </div>
      </transition>
      
      <!-- Toggle Button -->
      <button 
        @click="isChatOpen = !isChatOpen"
        :class="[
          'w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-300 hover:scale-105 active:scale-95 z-50 cursor-pointer',
          isChatOpen ? 'bg-[#2D201B] text-[#FFF8EA]' : 'bg-[#7D5A50] text-[#FFF8EA]'
        ]"
        aria-label="Toggle live support chat"
      >
        <Icon :name="isChatOpen ? 'heroicons:chevron-down' : 'heroicons:chat-bubble-oval-left-ellipsis-solid'" class="w-6 h-6 sm:w-7 sm:h-7" />
      </button>
    </div>

    <!-- Legal Policy Modal (Privacy Policy, Terms of Service, Refund Policy, Cookie Policy) -->
    <LegalPolicyModal
      :open="isPolicyModalOpen"
      :initial-tab="activePolicyTab"
      @close="isPolicyModalOpen = false"
    />
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}

/* Hide scrollbars while preserving full scrollability for sleek mobile tabs */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

<style scoped>
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
}
.reveal-on-scroll.is-revealed {
  opacity: 1;
  transform: translateY(0);
}
</style>
