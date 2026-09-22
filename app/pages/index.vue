<!-- BrewSpot Landing Page -->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'
import logoIcon from '~/assets/images/logo-icon.svg'
import { getRedirectForRole } from '~/utils/roleRedirects'

// Auth state check
const authStore = useAuthStore()
const userRoleCookie = useCookie<string | null>('user_role')
const role = computed(() => authStore.role || userRoleCookie.value)

// Enable smooth scrolling for anchor links & set page metadata
useHead({
  title: 'BrewSpot - Next-Gen Coffee Shop & Cafe Operating System',
  meta: [
    { name: 'description', content: 'Streamline your cafe operations with BrewSpot: Barista POS, table management, live analytics, and inventory control built for specialty coffee shops.' }
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

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Navigation state for mobile menu
const isMobileMenuOpen = ref(false)

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
  if (role.value) {
    navigateTo(getRedirectForRole(role.value))
  } else {
    navigateTo('/login')
  }
}

// Café Owner Benefits & Features (SaaS Platform Capabilities)
const features = [
  {
    icon: 'heroicons:shopping-bag',
    title: 'Smart Barista POS',
    description: 'Speed up rush-hour order entry with custom milk alternatives, syrup modifiers, and extra espresso shot presets built for high-volume cafes.'
  },
  {
    icon: 'heroicons:calendar-days',
    title: 'Interactive Table & Floor Map',
    description: 'Manage walk-ins and advance table bookings on a real-time digital floor map to maximize seating capacity and eliminate guest wait times.'
  },
  {
    icon: 'heroicons:chart-bar',
    title: 'Real-Time Revenue Analytics',
    description: 'Track peak hourly sales, daily espresso cup counts, popular brew blends, and barista efficiency from your centralized owner dashboard.'
  },
  {
    icon: 'heroicons:cube',
    title: 'Recipe & Inventory Automation',
    description: 'Automatically track espresso beans, milk, and syrup consumption per transaction, flagging low-stock items before they run out.'
  },
  {
    icon: 'heroicons:building-storefront',
    title: 'Multi-Location Management',
    description: 'Seamlessly scale from a single boutique coffee bar to a multi-city chain of roasteries with centralized multi-branch control.'
  },
  {
    icon: 'heroicons:user-group',
    title: 'Role-Based Staff Access',
    description: 'Assign tailored access permissions for cashiers, baristas, and managers to keep sensitive financial and store data completely secure.'
  }
]

// Workflow steps
const steps = [
  {
    number: '01',
    title: 'Create Your Account',
    description: 'Register your coffee shop details and business credentials in under 3 minutes.',
    icon: 'heroicons:user-plus'
  },
  {
    number: '02',
    title: 'Configure Menu & Tables',
    description: 'Set up your drink menu, pricing options, table layout, and invite your barista team.',
    icon: 'heroicons:cog-6-tooth'
  },
  {
    number: '03',
    title: 'Serve & Multiply Sales',
    description: 'Start processing orders with ease while monitoring live analytics from anywhere.',
    icon: 'heroicons:sparkles'
  }
]

// Testimonials data
const testimonials = [
  {
    quote: "BrewSpot transformed our morning rush! Orders flow seamlessly from POS to the barista station, cutting order times by half.",
    author: "Elena Rostova",
    role: "Owner, Velvet Roast Cafe",
    rating: 5,
    avatarBg: "bg-[#7D5A50]"
  },
  {
    quote: "The table reservation system and real-time inventory alerts saved us hundreds of dollars in wasted milk and beans every month.",
    author: "Marcus Vance",
    role: "Head Roaster, Artisan Brew Co.",
    rating: 5,
    avatarBg: "bg-[#B4846C]"
  },
  {
    quote: "Managing 3 cafe locations used to be overwhelming. BrewSpot's centralized dashboard lets me view total sales in real time.",
    author: "Sophia Lin",
    role: "Operations Director, Daily Grind Labs",
    rating: 5,
    avatarBg: "bg-[#65463D]"
  }
]

// FAQ Items
const faqs = [
  {
    question: "How fast can I set up my coffee shop on BrewSpot?",
    answer: "You can create your account and have your initial menu and tables configured in less than 5 minutes. Our step-by-step registration wizard guides you effortlessly through the process."
  },
  {
    question: "Is BrewSpot designed specifically for coffee shops and cafes?",
    answer: "Yes! BrewSpot is custom-engineered for cafes, coffee roasters, espresso bars, and bakeries. It supports customizable coffee modifiers (milk alternatives, extra shots, temperature, sweetness levels) and table management out of the box."
  },
  {
    question: "Can I manage multiple cafe branches from one account?",
    answer: "Absolutely. BrewSpot supports multi-branch operations, allowing owners and management teams to view consolidated or branch-specific sales analytics and inventory levels."
  },
  {
    question: "What roles and permissions are supported?",
    answer: "BrewSpot provides tailored interfaces and security permissions for System Admins, Cafe Owners, Cashiers, and Baristas."
  },
  {
    question: "What do I need to register my business?",
    answer: "During registration, you will need your business details (Cafe Name, Branch Address, Contact Info) and basic verification documents (such as DTI/SEC registration and Mayor's Permit)."
  }
]
</script>

<template>
  <div class="min-h-screen bg-[#FFF8EA] text-[#2D201B] font-sans antialiased selection:bg-[#7D5A50] selection:text-white overflow-x-hidden">
    <!-- Header / Sticky Navigation (Dynamic Scroll Transparency) -->
    <header
      :class="[
        'fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b border-[#65463D]',
        isScrolled
          ? 'bg-[#7D5A50]/80 backdrop-blur-md shadow-xl'
          : 'bg-[#7D5A50] shadow-md'
      ]"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 group shrink-0">
          <img :src="logoFull" alt="BrewSpot Logo" class="h-10 sm:h-11 w-auto transition-transform group-hover:scale-[1.02]" />
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
          <template v-if="role">
            <button
              @click="goDashboard"
              class="h-10 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2 shadow-md"
            >
              <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          </template>
          <template v-else>
            <button
              @click="goRegister"
              class="h-10 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2 shadow-md"
            >
              <Icon name="heroicons:user-plus" class="w-4 h-4 text-[#7D5A50]" />
              <span>Create Account</span>
            </button>
          </template>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="lg:hidden p-2.5 rounded-xl text-[#FFF8EA] hover:bg-[#FFF8EA]/10 focus:outline-none"
          aria-label="Toggle menu"
        >
          <Icon :name="isMobileMenuOpen ? 'heroicons:x-mark' : 'heroicons:bars-3'" class="w-7 h-7" />
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
        <div v-if="isMobileMenuOpen" class="lg:hidden bg-[#65463D] text-[#FFF8EA] border-b border-[#52372F] px-6 py-6 space-y-4 shadow-2xl">
          <nav class="flex flex-col space-y-2 font-semibold text-sm text-[#FFF8EA]/90">
            <a href="#hero" @click="isMobileMenuOpen = false" class="py-2 px-3 rounded-lg hover:bg-[#7D5A50]">Home</a>
            <a href="#demo" @click="isMobileMenuOpen = false" class="py-2 px-3 rounded-lg hover:bg-[#7D5A50]">Platform Demo</a>
            <a href="#features" @click="isMobileMenuOpen = false" class="py-2 px-3 rounded-lg hover:bg-[#7D5A50]">Features</a>
            <a href="#how-it-works" @click="isMobileMenuOpen = false" class="py-2 px-3 rounded-lg hover:bg-[#7D5A50]">How It Works</a>
            <a href="#testimonials" @click="isMobileMenuOpen = false" class="py-2 px-3 rounded-lg hover:bg-[#7D5A50]">Testimonials</a>
            <a href="#faq" @click="isMobileMenuOpen = false" class="py-2 px-3 rounded-lg hover:bg-[#7D5A50]">FAQ</a>
          </nav>
          <div class="pt-4 border-t border-[#FFF8EA]/20 flex flex-col gap-3">
            <template v-if="role">
              <button
                @click="goDashboard(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2"
              >
                <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </template>
            <template v-else>
              <button
                @click="goRegister(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2"
              >
                <Icon name="heroicons:user-plus" class="w-4 h-4 text-[#7D5A50]" />
                <span>Create Account</span>
              </button>
            </template>
          </div>
        </div>
      </transition>
    </header>

    <!-- SECTION 1: HERO SECTION (PERFECTLY CENTERED) -->
    <section id="hero" class="min-h-screen relative flex flex-col justify-between items-center overflow-hidden bg-[#FFF8EA] text-[#2D201B] pt-28 pb-10 border-b border-[#E5B299]/40">
      <!-- Background Image with Rich Palette Dark Overlay -->
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style="background-image: url('/images/hero-coffee-bg.png');"
      ></div>
      <!-- Multi-layer Brand Overlay using #000000 and #7D5A50 for contrast -->
      <div class="absolute inset-0 bg-gradient-to-r from-[#000000]/90 via-[#7D5A50]/85 to-[#000000]/90 backdrop-blur-[1px]"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-[#000000]/60 via-transparent to-[#7D5A50]/95"></div>

      <!-- Hero Main Content Box (Centered Layout) -->
      <div class="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10 my-auto w-full py-12 flex flex-col items-center justify-center text-center">
        <div class="space-y-8 flex flex-col items-center text-center">
          <!-- Top Badge Pill -->
          <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-[#FCDEC0]/20 border border-[#FCDEC0]/40 text-[#FCDEC0] text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md shadow-xl text-center">
            <span class="w-3 h-3 rounded-full bg-[#E5B299] animate-pulse"></span>
            <span>Next-Gen Coffee Shop & Cafe Operating System</span>
          </div>

          <!-- Main Hero Headline (Centered) -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15] text-center">
            Every Great Cup Starts With <br class="hidden sm:inline" />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#FCDEC0] via-[#E5B299] to-[#B4846C]">Smart Management</span>
          </h1>

          <!-- Subtitle (Centered) -->
          <p class="text-base sm:text-lg lg:text-xl text-[#FFF8EA]/95 leading-relaxed font-normal max-w-2xl text-center mx-auto">
            Unify your barista POS, table reservations, bean inventory, and live revenue analytics into one effortless coffee shop platform.
          </p>

          <!-- Call to Action Buttons (Sleek & Balanced Dimensions) -->
          <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <button
              @click="goRegister"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#7D5A50] text-[#FFF8EA] font-bold text-sm sm:text-base hover:bg-[#65463D] transition flex items-center justify-center gap-2.5 shadow-xl transform hover:-translate-y-0.5 border border-[#B4846C]"
            >
              <span>Create Account</span>
              <Icon name="heroicons:arrow-right" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
            </button>
            <button
              @click="goLogin"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#000000]/40 text-[#FFF8EA] border border-[#FCDEC0]/50 hover:border-[#FCDEC0] font-semibold text-sm sm:text-base hover:bg-[#000000]/60 backdrop-blur-md transition flex items-center justify-center gap-2.5 shadow-lg"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
              <span>Sign In</span>
            </button>
          </div>

          <!-- Trust Sub-indicators (Centered) -->
          <div class="pt-6 flex flex-wrap items-center justify-center gap-8 text-xs sm:text-sm text-[#FCDEC0] font-medium text-center">
            <span class="flex items-center gap-2">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#E5B299]" />
              Free Registration
            </span>
            <span class="flex items-center gap-2">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#E5B299]" />
              Fast 3-Min Setup
            </span>
            <span class="flex items-center gap-2">
              <Icon name="heroicons:check-circle" class="w-5 h-5 text-[#E5B299]" />
              Multi-Branch Support
            </span>
          </div>
        </div>
      </div>

      <!-- Hero Bottom Key Metrics Strip (Centered Grid) -->
      <div class="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 sm:p-8 rounded-2xl bg-[#7D5A50]/90 border border-[#B4846C]/40 text-[#FFF8EA] backdrop-blur-md shadow-2xl text-center">
          <div class="text-center space-y-1">
            <p class="text-3xl sm:text-4xl font-extrabold text-[#FCDEC0]">500+</p>
            <p class="text-xs sm:text-sm text-[#FFF8EA]/85 font-medium">Active Cafes & Roasteries</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-3xl sm:text-4xl font-extrabold text-[#FCDEC0]">1.5M+</p>
            <p class="text-xs sm:text-sm text-[#FFF8EA]/85 font-medium">Espresso Cups Served</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-3xl sm:text-4xl font-extrabold text-[#FCDEC0]">99.9%</p>
            <p class="text-xs sm:text-sm text-[#FFF8EA]/85 font-medium">System Uptime Guarantee</p>
          </div>
          <div class="text-center space-y-1">
            <p class="text-3xl sm:text-4xl font-extrabold text-[#FCDEC0]">4.9 / 5</p>
            <p class="text-xs sm:text-sm text-[#FFF8EA]/85 font-medium">Cafe Owner Rating</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 2: PLATFORM DEMO SUITE -->
    <section id="demo" class="min-h-screen py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full space-y-10">
        <div class="text-center max-w-2xl mx-auto space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-4 py-2 rounded-full border border-[#E5B299]">Interactive Suite</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-[#2D201B]">Experience BrewSpot Live</h2>
          <p class="text-sm sm:text-base text-[#7D5A50]">Explore the exact management portal used by top coffee shop owners and administrators.</p>
        </div>

        <!-- Window Mockup Container -->
        <div class="max-w-5xl mx-auto rounded-2xl border border-[#E5B299] bg-white shadow-2xl overflow-hidden">
          <!-- Window Top Bar -->
          <div class="bg-[#7D5A50] text-[#FFF8EA] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#65463D]">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-[#E5B299] inline-block"></span>
                <span class="w-3 h-3 rounded-full bg-[#FCDEC0] inline-block"></span>
                <span class="w-3 h-3 rounded-full bg-[#B4846C] inline-block"></span>
              </div>
              <span class="text-xs font-semibold text-[#FCDEC0] tracking-wide ml-2 hidden sm:inline">BrewSpot Admin Portal — Control Suite</span>
            </div>

            <!-- Dashboard Navigation Tabs -->
            <div class="flex items-center gap-1.5 bg-[#65463D] p-1.5 rounded-xl">
              <button
                @click="activeTab = 'sales'"
                :class="[activeTab === 'sales' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2']"
              >
                <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
                <span>POS & Live Sales</span>
              </button>

              <button
                @click="activeTab = 'approvals'"
                :class="[activeTab === 'approvals' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2']"
              >
                <Icon name="heroicons:check-circle" class="w-4 h-4" />
                <span>Approvals</span>
              </button>

              <button
                @click="activeTab = 'owners'"
                :class="[activeTab === 'owners' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2']"
              >
                <Icon name="heroicons:users" class="w-4 h-4" />
                <span>Owners</span>
              </button>

              <button
                @click="activeTab = 'subscriptions'"
                :class="[activeTab === 'subscriptions' ? 'bg-[#B4846C] text-white font-semibold shadow' : 'text-[#FCDEC0] hover:text-white', 'px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2']"
              >
                <Icon name="heroicons:credit-card" class="w-4 h-4" />
                <span>Subscriptions</span>
              </button>
            </div>
          </div>

          <!-- Showcase Content Area -->
          <div class="p-6 sm:p-8 bg-[#FFF8EA] min-h-[400px]">
            
            <!-- TAB 1: POS & Live Sales -->
            <div v-if="activeTab === 'sales'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCDEC0] pb-4">
                <div>
                  <h3 class="text-xl font-bold text-[#2D201B]">Live Barista Queue & POS Register</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Real-time order processing, barista station queue, and daily revenue counters.</p>
                </div>
                <span class="px-3.5 py-1.5 bg-[#E5B299]/30 text-[#7D5A50] text-xs font-semibold rounded-full flex items-center gap-2 border border-[#E5B299]">
                  <span class="w-2.5 h-2.5 rounded-full bg-[#7D5A50] animate-pulse"></span> Live Sync Active
                </span>
              </header>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Barista Order Queue -->
                <div class="md:col-span-2 space-y-3">
                  <p class="text-xs font-bold text-[#7D5A50] uppercase tracking-wider">Active Order Queue</p>

                  <div class="p-4 bg-white rounded-xl border border-emerald-400 shadow-sm flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-sm text-[#2D201B]">Order #1042 · Table 04</span>
                        <span class="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[0.68rem] font-bold rounded">Preparing</span>
                      </div>
                      <p class="text-xs text-[#7D5A50] mt-1">1x Spanish Latte (Oat Milk + Extra Shot), 1x Butter Croissant</p>
                    </div>
                    <p class="font-bold text-sm text-[#7D5A50]">₱235.00</p>
                  </div>

                  <div class="p-4 bg-white rounded-xl border border-[#FCDEC0] shadow-sm flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-sm text-[#2D201B]">Order #1041 · Takeout</span>
                        <span class="px-2.5 py-1 bg-amber-100 text-amber-800 text-[0.68rem] font-bold rounded">Ready for Pickup</span>
                      </div>
                      <p class="text-xs text-[#7D5A50] mt-1">2x Iced Caramel Macchiato</p>
                    </div>
                    <p class="font-bold text-sm text-[#7D5A50]">₱300.00</p>
                  </div>
                </div>

                <!-- Daily Revenue Box -->
                <div class="bg-white rounded-xl border border-[#E5B299] p-5 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <p class="text-xs text-[#7D5A50] font-medium">Today's Total Revenue</p>
                    <p class="text-3xl font-extrabold text-[#7D5A50] mt-1">₱14,850.00</p>
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
                  <h3 class="text-xl font-bold text-[#2D201B]">Cafe Owner Applications</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Review and verify business credentials before approving cafe licenses.</p>
                </div>
                <span class="self-start sm:self-auto text-xs bg-[#7D5A50]/15 text-[#7D5A50] px-3.5 py-1.5 rounded-full font-semibold border border-[#7D5A50]/30">
                  3 Pending Applications
                </span>
              </header>

              <div class="bg-white border border-[#E5B299] rounded-xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
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
                          <button class="px-4 py-2 rounded-lg bg-[#7D5A50] text-white font-semibold hover:bg-[#65463D] transition text-[0.7rem] shadow-sm">
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
                          <button class="px-4 py-2 rounded-lg border border-[#7D5A50] text-[#7D5A50] font-semibold hover:bg-[#7D5A50]/10 transition text-[0.7rem]">
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
                  <h3 class="text-xl font-bold text-[#2D201B]">Owner Directory</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Centralized directory of registered coffee shop owners and branch licenses.</p>
                </div>
                <button class="self-start sm:self-auto px-5 py-2 rounded-lg bg-[#7D5A50] text-white text-xs font-semibold hover:bg-[#65463D] transition flex items-center gap-2 shadow">
                  <Icon name="heroicons:user-plus" class="w-4 h-4" />
                  <span>Add New Owner</span>
                </button>
              </header>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-5 bg-white rounded-xl border border-[#E5B299] space-y-3 shadow-sm hover:border-[#7D5A50] transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-[#7D5A50] text-white font-bold flex items-center justify-center text-sm shadow">
                        DR
                      </div>
                      <div>
                        <h4 class="font-bold text-sm text-[#2D201B]">Daily Grind Roastery</h4>
                        <p class="text-xs text-[#7D5A50]">Owner: Sophia Lin</p>
                      </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold">Active Owner</span>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-[#FCDEC0] text-[#2D201B]">
                    <span>3 Branches (Bajada, Matina, Toril)</span>
                    <span class="font-semibold text-[#7D5A50]">Pro Tier</span>
                  </div>
                </div>

                <div class="p-5 bg-white rounded-xl border border-[#E5B299] space-y-3 shadow-sm hover:border-[#7D5A50] transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-[#B4846C] text-white font-bold flex items-center justify-center text-sm shadow">
                        EL
                      </div>
                      <div>
                        <h4 class="font-bold text-sm text-[#2D201B]">Espresso Lab Davao</h4>
                        <p class="text-xs text-[#7D5A50]">Owner: Rafael Santos</p>
                      </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold">Active Owner</span>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-[#FCDEC0] text-[#2D201B]">
                    <span>1 Main Branch (Obrero)</span>
                    <span class="font-semibold text-[#7D5A50]">Standard Tier</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 4: Subscriptions -->
            <div v-else-if="activeTab === 'subscriptions'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCDEC0] pb-4">
                <div>
                  <h3 class="text-xl font-bold text-[#2D201B]">Subscriptions & Billing</h3>
                  <p class="text-xs text-[#7D5A50] mt-0.5">Track active plans, renewal schedules, and monthly recurring revenue.</p>
                </div>
                <span class="text-xs bg-emerald-100 text-emerald-800 px-3.5 py-1.5 rounded-full font-semibold">
                  MRR: ₱185,000.00 (+14.2%)
                </span>
              </header>

              <div class="bg-white border border-[#E5B299] rounded-xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
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
    <section id="features" class="min-h-screen py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-4 py-2 rounded-full border border-[#E5B299]">Owner Platform Features</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-[#2D201B]">Everything Your Café Needs to Succeed</h2>
          <p class="text-sm sm:text-base text-[#7D5A50]">Powerful tools built specifically for coffee shop owners to streamline daily operations, seat guests faster, and scale profitability.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="(feature, idx) in features"
            :key="idx"
            class="p-8 rounded-2xl bg-white border border-[#FCDEC0] hover:border-[#7D5A50] transition-all duration-300 shadow-md hover:shadow-2xl hover:-translate-y-1 group flex flex-col justify-between"
          >
            <div class="space-y-4">
              <div class="w-14 h-14 rounded-2xl bg-[#FCDEC0] text-[#7D5A50] group-hover:bg-[#7D5A50] group-hover:text-white transition-colors flex items-center justify-center shadow">
                <Icon :name="feature.icon" class="w-7 h-7" />
              </div>
              <h3 class="text-xl font-bold text-[#2D201B] leading-snug">{{ feature.title }}</h3>
              <p class="text-sm text-[#7D5A50] leading-relaxed">{{ feature.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 4: HOW IT WORKS -->
    <section id="how-it-works" class="min-h-screen py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-4 py-2 rounded-full border border-[#E5B299]">Streamlined Onboarding</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-[#2D201B]">Get Started in 3 Simple Steps</h2>
          <p class="text-sm sm:text-base text-[#7D5A50]">Launch your cafe operations effortlessly without expensive proprietary hardware.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="p-8 rounded-2xl bg-white border border-[#E5B299] relative overflow-hidden flex flex-col justify-between space-y-6 shadow-lg"
          >
            <span class="text-6xl font-black text-[#E5B299]/40 absolute top-4 right-4 pointer-events-none">{{ step.number }}</span>
            <div class="space-y-4 relative z-10">
              <div class="w-14 h-14 rounded-2xl bg-[#7D5A50] text-[#FFF8EA] flex items-center justify-center shadow-lg">
                <Icon :name="step.icon" class="w-7 h-7" />
              </div>
              <h3 class="text-xl font-bold text-[#2D201B]">{{ step.title }}</h3>
              <p class="text-sm text-[#7D5A50] leading-relaxed">{{ step.description }}</p>
            </div>
          </div>
        </div>

        <div class="pt-6 text-center flex justify-center">
          <button
            @click="goRegister"
            class="h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#7D5A50] text-[#FFF8EA] font-bold text-sm sm:text-base hover:bg-[#65463D] transition flex items-center justify-center gap-2.5 shadow-xl border border-[#B4846C]"
          >
            <span>Register Your Cafe Now</span>
            <Icon name="heroicons:arrow-right" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
          </button>
        </div>
      </div>
    </section>

    <!-- SECTION 5: TESTIMONIALS -->
    <section id="testimonials" class="min-h-screen py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-4 py-2 rounded-full border border-[#E5B299]">Trusted Leaders</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-[#2D201B]">What Cafe Owners Say</h2>
          <p class="text-sm sm:text-base text-[#7D5A50]">Hear directly from specialty roasters and cafe operators using BrewSpot daily.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="p-8 rounded-2xl bg-white border border-[#E5B299] shadow-lg space-y-6 flex flex-col justify-between"
          >
            <div class="space-y-4">
              <div class="flex items-center gap-1 text-amber-500">
                <Icon v-for="s in t.rating" :key="s" name="heroicons:star" class="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <p class="text-sm text-[#2D201B] italic leading-relaxed">"{{ t.quote }}"</p>
            </div>

            <div class="flex items-center gap-3 pt-4 border-t border-[#FCDEC0]">
              <div :class="[t.avatarBg, 'w-11 h-11 rounded-full text-white font-bold flex items-center justify-center text-sm shadow']">
                {{ t.author.charAt(0) }}
              </div>
              <div>
                <p class="font-bold text-sm text-[#2D201B]">{{ t.author }}</p>
                <p class="text-xs text-[#7D5A50]">{{ t.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 6: FAQ SECTION -->
    <section id="faq" class="min-h-screen py-24 flex flex-col justify-center bg-[#FFF8EA] text-[#2D201B] border-b border-[#E5B299]/50 relative overflow-hidden">
      <div class="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 w-full space-y-12">
        <div class="text-center max-w-2xl mx-auto space-y-3">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7D5A50] bg-[#E5B299]/30 px-4 py-2 rounded-full border border-[#E5B299]">Clear Answers</span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-[#2D201B]">Frequently Asked Questions</h2>
        </div>

        <div class="space-y-4">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="rounded-xl border border-[#E5B299] bg-white overflow-hidden transition-all shadow-sm"
          >
            <button
              @click="toggleFaq(index)"
              class="w-full px-6 py-5 text-left font-semibold text-base text-[#2D201B] flex items-center justify-between gap-4 hover:text-[#7D5A50] transition-colors"
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
              <div v-if="openFaqIndex === index" class="px-6 pb-5 text-sm text-[#7D5A50] leading-relaxed border-t border-[#FCDEC0] pt-4">
                {{ faq.answer }}
              </div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- SECTION 7: CALL TO ACTION & FOOTER -->
    <section id="cta" class="min-h-screen py-20 flex flex-col justify-between bg-[#FFF8EA] text-[#2D201B] relative overflow-hidden">
      <!-- Main CTA Box -->
      <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 w-full my-auto">
        <div class="rounded-3xl bg-gradient-to-r from-[#7D5A50] via-[#B4846C] to-[#7D5A50] text-[#FFF8EA] p-12 sm:p-16 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div class="absolute -bottom-12 -left-12 w-64 h-64 bg-[#FCDEC0]/20 rounded-full blur-3xl"></div>

          <div class="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">Ready to Transform Your Coffee Shop?</h2>
            <p class="text-base sm:text-lg text-[#FFF8EA]/90 font-normal">Join hundreds of successful cafes using BrewSpot to boost daily orders, seat guests faster, and increase profitability.</p>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button
              @click="goRegister"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-[#FFF8EA] text-[#7D5A50] font-bold text-sm sm:text-base hover:bg-[#FCDEC0] transition flex items-center justify-center gap-2.5 shadow-xl"
            >
              <Icon name="heroicons:user-plus" class="w-4 h-4 sm:w-5 sm:h-5 text-[#7D5A50]" />
              <span>Create Free Account</span>
            </button>
            <button
              @click="goLogin"
              class="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl border border-[#FFF8EA]/50 text-[#FFF8EA] font-semibold text-sm sm:text-base hover:bg-[#FFF8EA]/10 transition flex items-center justify-center gap-2.5"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 sm:w-5 sm:h-5 text-[#FCDEC0]" />
              <span>Sign In to Account</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <footer class="bg-[#7D5A50] text-[#FFF8EA] py-12 border-t border-[#65463D] w-full mt-auto">
        <div class="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 space-y-6">
          <div class="flex flex-col md:flex-row items-center justify-between gap-6">
            <div class="flex items-center gap-3">
              <img :src="logoIcon" alt="BrewSpot Icon" class="h-10 w-auto brightness-200" />
              <span class="text-2xl font-extrabold tracking-wider text-[#FFF8EA]">BrewSpot</span>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-8 text-base font-medium text-[#FFF8EA]/90">
              <a href="#hero" class="hover:text-[#FCDEC0] transition">Home</a>
              <a href="#demo" class="hover:text-[#FCDEC0] transition">Demo</a>
              <a href="#features" class="hover:text-[#FCDEC0] transition">Features</a>
              <a href="#how-it-works" class="hover:text-[#FCDEC0] transition">How It Works</a>
              <NuxtLink to="/login" class="hover:text-[#FCDEC0] transition">Sign In</NuxtLink>
              <NuxtLink to="/register" class="hover:text-[#FCDEC0] transition">Register</NuxtLink>
            </div>
          </div>

          <div class="pt-6 border-t border-[#65463D] flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-[#FFF8EA]/70 gap-4">
            <p>© {{ new Date().getFullYear() }} BrewSpot Systems Inc. All rights reserved.</p>
            <div class="flex items-center gap-5">
              <a href="#" class="hover:text-[#FCDEC0]">Privacy Policy</a>
              <span>•</span>
              <a href="#" class="hover:text-[#FCDEC0]">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </section>
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>