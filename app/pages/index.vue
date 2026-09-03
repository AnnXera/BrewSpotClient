<!-- BrewSpot Landing Page -->
<script setup lang="ts">
import logoFull from '~/assets/images/logo-with-tag.svg'
import logoIcon from '~/assets/images/logo-icon.svg'
import { getRedirectForRole } from '~/utils/roleRedirects'

// Auth state check
const authStore = useAuthStore()
const userRoleCookie = useCookie<string | null>('user_role')
const role = computed(() => authStore.role || userRoleCookie.value)

// Enable smooth scrolling for anchor links
useHead({
  htmlAttrs: {
    class: 'scroll-smooth'
  }
})

// Navigation state for mobile menu
const isMobileMenuOpen = ref(false)

// Active preview tab for interactive demo (matches Admin Dashboard navigation)
const activeTab = ref<'approvals' | 'owners' | 'subscriptions' | 'sales'>('approvals')

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

// Features list data
const features = [
  {
    icon: 'heroicons:shopping-bag',
    title: 'Smart Barista POS',
    description: 'Lightning-fast order entry built for high-volume coffee rush hours with custom milk, syrup, and roast modifiers.'
  },
  {
    icon: 'heroicons:calendar-days',
    title: 'Table & Reservation Desk',
    description: 'Manage guest seating, pre-bookings, and table turn times efficiently to eliminate customer wait times.'
  },
  {
    icon: 'heroicons:chart-bar',
    title: 'Real-Time Sales Analytics',
    description: 'Track hourly revenue peaks, daily espresso cup counts, popular brew blends, and staff efficiency metrics.'
  },
  {
    icon: 'heroicons:cube',
    title: 'Bean & Stock Tracking',
    description: 'Monitor espresso bean batches, dairy supplies, syrup inventory, and get automated low-stock warnings.'
  },
  {
    icon: 'heroicons:user-group',
    title: 'Role-Based Staff Access',
    description: 'Granular role security for Admins, Cafe Owners, Cashiers, and Baristas to maintain data safety.'
  },
  {
    icon: 'heroicons:building-storefront',
    title: 'Multi-Location Support',
    description: 'Seamlessly scale from a single boutique coffee cart to a multi-city chain of roasteries with central control.'
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
    avatarBg: "bg-[#7B5A50]"
  },
  {
    quote: "The table reservation system and real-time inventory alerts saved us hundreds of dollars in wasted milk and beans every month.",
    author: "Marcus Vance",
    role: "Head Roaster, Artisan Brew Co.",
    rating: 5,
    avatarBg: "bg-[#65463d]"
  },
  {
    quote: "Managing 3 cafe locations used to be overwhelming. BrewSpot's centralized dashboard lets me view total sales in real time.",
    author: "Sophia Lin",
    role: "Operations Director, Daily Grind Labs",
    rating: 5,
    avatarBg: "bg-[#8C685C]"
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
  <div class="min-h-screen bg-[#FDFBF7] text-[#2d201b] font-sans antialiased selection:bg-[#7B5A50] selection:text-white">
    <!-- Header / Sticky Navigation -->
    <header class="sticky top-0 z-50 backdrop-blur-md bg-[#7B5A50]/95 border-b border-[#65463d] shadow-md transition-all">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center gap-3 group">
          <img :src="logoFull" alt="BrewSpot Logo" class="h-10 sm:h-12 w-auto transition-transform group-hover:scale-[1.02]" />
        </NuxtLink>

        <!-- Desktop Navigation Links -->
        <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
          <a href="#features" class="hover:text-amber-200 transition-colors">Features</a>
          <a href="#demo" class="hover:text-amber-200 transition-colors">Platform Demo</a>
          <a href="#how-it-works" class="hover:text-amber-200 transition-colors">How It Works</a>
          <a href="#testimonials" class="hover:text-amber-200 transition-colors">Testimonials</a>
          <a href="#faq" class="hover:text-amber-200 transition-colors">FAQ</a>
        </nav>

        <!-- Desktop Action Buttons -->
        <div class="hidden md:flex items-center gap-3">
          <template v-if="role">
            <button
              @click="goDashboard"
              class="h-11 px-5 rounded-md bg-white text-[#7B5A50] font-medium text-sm hover:bg-[#FFF8EA] transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
              <span>Go to Dashboard</span>
            </button>
          </template>
          <template v-else>
            <button
              @click="goLogin"
              class="h-11 px-5 rounded-md text-white border border-white/40 hover:border-white font-medium text-sm hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              @click="goRegister"
              class="h-11 px-5 rounded-md bg-white text-[#7B5A50] font-medium text-sm hover:bg-[#FFF8EA] transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="heroicons:user-plus" class="w-4 h-4" />
              <span>Create Account</span>
            </button>
          </template>
        </div>

        <!-- Mobile Menu Toggle Button -->
        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="md:hidden p-2 rounded-md text-white hover:bg-white/10 focus:outline-none"
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
        <div v-if="isMobileMenuOpen" class="md:hidden bg-[#65463d] text-white border-b border-[#5C3F37] px-6 py-6 space-y-4 shadow-xl">
          <nav class="flex flex-col space-y-3 font-medium text-white/90">
            <a href="#features" @click="isMobileMenuOpen = false" class="py-2 hover:text-amber-200">Features</a>
            <a href="#demo" @click="isMobileMenuOpen = false" class="py-2 hover:text-amber-200">Platform Demo</a>
            <a href="#how-it-works" @click="isMobileMenuOpen = false" class="py-2 hover:text-amber-200">How It Works</a>
            <a href="#testimonials" @click="isMobileMenuOpen = false" class="py-2 hover:text-amber-200">Testimonials</a>
            <a href="#faq" @click="isMobileMenuOpen = false" class="py-2 hover:text-amber-200">FAQ</a>
          </nav>
          <div class="pt-4 border-t border-white/20 flex flex-col gap-3">
            <template v-if="role">
              <button
                @click="goDashboard(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-md bg-white text-[#7B5A50] font-medium text-sm hover:bg-[#FFF8EA] transition flex items-center justify-center gap-2"
              >
                <Icon name="heroicons:squares-2x2" class="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            </template>
            <template v-else>
              <button
                @click="goLogin(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-md text-white border border-white/40 font-medium text-sm hover:bg-white/10 transition flex items-center justify-center gap-2"
              >
                <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4" />
                <span>Sign In</span>
              </button>
              <button
                @click="goRegister(); isMobileMenuOpen = false"
                class="w-full h-11 px-5 rounded-md bg-white text-[#7B5A50] font-medium text-sm hover:bg-[#FFF8EA] transition flex items-center justify-center gap-2"
              >
                <Icon name="heroicons:user-plus" class="w-4 h-4" />
                <span>Create Account</span>
              </button>
            </template>
          </div>
        </div>
      </transition>
    </header>

    <!-- Hero Section -->
    <section class="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-[#FFF8EA] via-[#FDFBF7] to-[#FFF8EA]">
      <!-- Decorative Background Glows -->
      <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7B5A50]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute top-1/3 right-10 w-[300px] h-[300px] bg-[#D97706]/10 rounded-full blur-2xl pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div class="text-center max-w-3xl mx-auto space-y-6">
          <!-- Top Badge Pill -->
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#7B5A50]/10 border border-[#7B5A50]/20 text-[#7B5A50] text-xs sm:text-sm font-semibold tracking-wide shadow-sm">
            <span class="w-2 h-2 rounded-full bg-[#7B5A50] animate-ping"></span>
            <span>Next-Gen Coffee Shop & Cafe Operating System</span>
          </div>

          <!-- Main Hero Headline -->
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#2d201b] leading-[1.15]">
            Every Great Cup Starts With <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7B5A50] via-[#8C685C] to-[#5C3F37]">Smart Management</span>
          </h1>

          <!-- Subtitle -->
          <p class="text-base sm:text-lg lg:text-xl text-[#5A4841] leading-relaxed max-w-2xl mx-auto font-normal">
            Unify your barista POS, table reservations, inventory tracking, and real-time sales reporting into one effortless coffee shop platform.
          </p>

          <!-- Call to Action Buttons -->
          <div class="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              @click="goRegister"
              class="w-full sm:w-auto h-11 px-6 rounded-md bg-[#7B5A50] text-white font-medium text-sm hover:bg-[#65463d] transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
            >
              <span>Create Account</span>
              <Icon name="heroicons:arrow-right" class="w-4 h-4" />
            </button>
            <button
              @click="goLogin"
              class="w-full sm:w-auto h-11 px-6 rounded-md bg-white text-[#2d201b] border border-gray-300 hover:border-[#7B5A50] font-medium text-sm hover:bg-[#FFF8EA] transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4 text-[#7B5A50]" />
              <span>Sign In</span>
            </button>
          </div>

          <!-- Trust Sub-indicators -->
          <div class="pt-4 flex items-center justify-center gap-6 text-xs sm:text-sm text-[#7A6760]">
            <span class="flex items-center gap-1.5">
              <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
              Free Registration
            </span>
            <span class="flex items-center gap-1.5">
              <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
              Fast 3-Min Setup
            </span>
            <span class="flex items-center gap-1.5">
              <Icon name="heroicons:check-circle" class="w-4 h-4 text-emerald-600" />
              Multi-Branch Support
            </span>
          </div>
        </div>

        <!-- Platform Demo Section (Modeled after BrewSpot Admin & Owner Dashboard) -->
        <div id="demo" class="scroll-mt-24 mt-16 max-w-5xl mx-auto rounded-3xl border border-[#EEDFC4] bg-[#FDF3E7] shadow-2xl overflow-hidden">
          <!-- Window Top Bar -->
          <div class="bg-[#3D2B24] text-[#FDF3E7] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#2d201b]">
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                <span class="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span class="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
              </div>
              <span class="text-xs font-semibold text-[#FDF3E7]/90 tracking-wide ml-2 hidden sm:inline">BrewSpot Admin Portal — Control Suite</span>
            </div>

            <!-- Dashboard Navigation Tabs (Matching /admin/dashboard, /admin/approvals, /admin/owners, /admin/subscriptions) -->
            <div class="flex items-center gap-1 bg-[#2d201b]/80 p-1 rounded-xl">
              <button
                @click="activeTab = 'approvals'"
                :class="[activeTab === 'approvals' ? 'bg-[#7D5A50] text-white font-semibold' : 'text-[#FDF3E7]/80 hover:text-white', 'px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5']"
              >
                <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
                <span>Approval Status</span>
              </button>

              <button
                @click="activeTab = 'owners'"
                :class="[activeTab === 'owners' ? 'bg-[#7D5A50] text-white font-semibold' : 'text-[#FDF3E7]/80 hover:text-white', 'px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5']"
              >
                <Icon name="heroicons:users" class="w-3.5 h-3.5" />
                <span>Owner Management</span>
              </button>

              <button
                @click="activeTab = 'subscriptions'"
                :class="[activeTab === 'subscriptions' ? 'bg-[#7D5A50] text-white font-semibold' : 'text-[#FDF3E7]/80 hover:text-white', 'px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5']"
              >
                <Icon name="heroicons:credit-card" class="w-3.5 h-3.5" />
                <span>Subscriptions</span>
              </button>

              <button
                @click="activeTab = 'sales'"
                :class="[activeTab === 'sales' ? 'bg-[#7D5A50] text-white font-semibold' : 'text-[#FDF3E7]/80 hover:text-white', 'px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1.5']"
              >
                <Icon name="heroicons:squares-2x2" class="w-3.5 h-3.5" />
                <span>Cafe Sales & POS</span>
              </button>
            </div>
          </div>

          <!-- Showcase Main Area (Matches Admin Dashboard layout & styling) -->
          <div class="p-6 sm:p-8 bg-[#FDF3E7] min-h-[420px]">
            
            <!-- TAB 1: Approval Status (Matching /admin/approvals) -->
            <div v-if="activeTab === 'approvals'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEDFC4] pb-4">
                <div>
                  <h3 class="font-display text-xl font-bold text-[#3D2B24]">Approval Status</h3>
                  <p class="font-sans text-xs text-[#9E7060] mt-0.5">Review and manage owner applications by approval status.</p>
                </div>
                <span class="self-start sm:self-auto text-xs bg-[#7D5A50]/15 text-[#7D5A50] px-3 py-1 rounded-full font-semibold">
                  3 Pending Applications
                </span>
              </header>

              <!-- Registration Subtabs & Search Bar (Identical to approvals.vue) -->
              <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm space-y-0">
                <!-- Search + Status Filter Pills Bar -->
                <div class="flex flex-col md:flex-row items-center gap-4 p-4 border-b border-[#F3E7D2] bg-white">
                  <!-- Search Bar -->
                  <div class="relative flex-1 w-full">
                    <Icon name="heroicons:magnifying-glass" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E7060]" />
                    <input
                      type="text"
                      placeholder="Search owner or cafe name..."
                      value="BrewSpot Davao"
                      readonly
                      class="w-full rounded-xl border border-[#EEDFC4] bg-[#FFFBF3] pl-10 pr-4 py-2 text-xs text-[#3B1F0E] placeholder:text-[#B4846C] focus:outline-none"
                    />
                  </div>

                  <!-- Status Filter Pills -->
                  <div class="inline-flex items-center bg-white border border-[#EDD8CC] rounded-xl gap-1 p-1 text-xs font-medium">
                    <span class="px-3 py-1.5 rounded-lg bg-[#7D5A50] text-[#FDF3E7] font-semibold cursor-pointer">General (12)</span>
                    <span class="px-3 py-1.5 rounded-lg text-[#7D5A50] hover:bg-[#FBF2E1] cursor-pointer">Pending (3)</span>
                    <span class="px-3 py-1.5 rounded-lg text-[#7D5A50] hover:bg-[#FBF2E1] cursor-pointer">Approved (8)</span>
                  </div>
                </div>

                <!-- Live Applications Table -->
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-[#FFFBF3] text-[#3B1F0E] font-semibold uppercase tracking-wider text-[0.7rem] border-b border-[#F3E7D2]">
                      <tr>
                        <th class="px-4 py-3">Applicant / Owner</th>
                        <th class="px-4 py-3">Café / Business</th>
                        <th class="px-4 py-3">Documents</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#F3E7D2] text-[#3D2B24]">
                      <tr class="hover:bg-[#FFFBF3]/70 transition-colors">
                        <td class="px-4 py-3 font-medium">
                          <p class="font-bold text-[#3B1F0E]">Jaime Banani</p>
                          <p class="text-[0.68rem] text-[#9E7060]">jakimabdil22@gmail.com</p>
                        </td>
                        <td class="px-4 py-3">
                          <p class="font-semibold">BrewSpot Davao</p>
                          <p class="text-[0.68rem] text-gray-500">Main Branch · Davao City</p>
                        </td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[0.68rem]">
                            ✓ 4 Documents Verified
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[0.68rem] inline-flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Review
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button class="px-3 py-1.5 rounded-lg bg-[#7D5A50] text-white font-medium hover:bg-[#65463d] transition text-[0.7rem]">
                            Review Application
                          </button>
                        </td>
                      </tr>

                      <tr class="hover:bg-[#FFFBF3]/70 transition-colors">
                        <td class="px-4 py-3 font-medium">
                          <p class="font-bold text-[#3B1F0E]">Elena Rostova</p>
                          <p class="text-[0.68rem] text-[#9E7060]">elena@velvetroast.com</p>
                        </td>
                        <td class="px-4 py-3">
                          <p class="font-semibold">Velvet Roast Cafe</p>
                          <p class="text-[0.68rem] text-gray-500">Poblacion District</p>
                        </td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[0.68rem]">
                            ✓ All Verified
                          </span>
                        </td>
                        <td class="px-4 py-3">
                          <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[0.68rem]">
                            ✓ Approved
                          </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                          <button class="px-3 py-1.5 rounded-lg border border-[#7D5A50] text-[#7D5A50] font-medium hover:bg-[#7D5A50]/10 transition text-[0.7rem]">
                            View Profile
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- TAB 2: Owner Management (Matching /admin/owners) -->
            <div v-else-if="activeTab === 'owners'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEDFC4] pb-4">
                <div>
                  <h3 class="font-display text-xl font-bold text-[#3D2B24]">Owner Management</h3>
                  <p class="font-sans text-xs text-[#9E7060] mt-0.5">Centralized directory of registered coffee shop owners and branch licenses.</p>
                </div>
                <button class="self-start sm:self-auto px-4 py-1.5 rounded-xl bg-[#7D5A50] text-white text-xs font-semibold hover:bg-[#65463d] transition flex items-center gap-1.5 shadow-sm">
                  <Icon name="heroicons:user-plus" class="w-4 h-4" />
                  <span>Add New Owner</span>
                </button>
              </header>

              <!-- Stats KPI Strip -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="p-4 bg-white rounded-2xl border border-[#EEDFC4] space-y-1 shadow-sm">
                  <p class="text-xs text-[#9E7060] font-medium">Total Registered Owners</p>
                  <p class="text-2xl font-bold text-[#3B1F0E]">24 Owners</p>
                  <p class="text-[0.68rem] text-emerald-700 font-semibold">+3 this month</p>
                </div>

                <div class="p-4 bg-white rounded-2xl border border-[#EEDFC4] space-y-1 shadow-sm">
                  <p class="text-xs text-[#9E7060] font-medium">Active Cafe Branches</p>
                  <p class="text-2xl font-bold text-[#3B1F0E]">38 Branches</p>
                  <p class="text-[0.68rem] text-emerald-700 font-semibold">100% License Compliance</p>
                </div>

                <div class="p-4 bg-white rounded-2xl border border-[#EEDFC4] space-y-1 shadow-sm">
                  <p class="text-xs text-[#9E7060] font-medium">Average Branch Count</p>
                  <p class="text-2xl font-bold text-[#3B1F0E]">1.6 / Owner</p>
                  <p class="text-[0.68rem] text-[#7D5A50] font-semibold">Multi-location enabled</p>
                </div>
              </div>

              <!-- Owner Directory Cards Grid -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-white rounded-2xl border border-[#EEDFC4] space-y-3 shadow-sm hover:border-[#7D5A50] transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-[#7D5A50] text-white font-bold flex items-center justify-center text-sm shadow">
                        DR
                      </div>
                      <div>
                        <h4 class="font-bold text-sm text-[#3B1F0E]">Daily Grind Roastery</h4>
                        <p class="text-xs text-[#9E7060]">Owner: Sophia Lin</p>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold">Active Owner</span>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-[#F3E7D2] text-[#3D2B24]">
                    <span>3 Branches (Bajada, Matina, Toril)</span>
                    <span class="font-semibold text-[#7D5A50]">Pro Tier</span>
                  </div>
                </div>

                <div class="p-4 bg-white rounded-2xl border border-[#EEDFC4] space-y-3 shadow-sm hover:border-[#7D5A50] transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-[#65463d] text-white font-bold flex items-center justify-center text-sm shadow">
                        EL
                      </div>
                      <div>
                        <h4 class="font-bold text-sm text-[#3B1F0E]">Espresso Lab Davao</h4>
                        <p class="text-xs text-[#9E7060]">Owner: Rafael Santos</p>
                      </div>
                    </div>
                    <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold">Active Owner</span>
                  </div>

                  <div class="flex items-center justify-between text-xs pt-2 border-t border-[#F3E7D2] text-[#3D2B24]">
                    <span>1 Main Branch (Obrero)</span>
                    <span class="font-semibold text-[#7D5A50]">Standard Tier</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- TAB 3: Subscriptions (Matching /admin/subscriptions) -->
            <div v-else-if="activeTab === 'subscriptions'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEDFC4] pb-4">
                <div>
                  <h3 class="font-display text-xl font-bold text-[#3D2B24]">Subscriptions & Billing</h3>
                  <p class="font-sans text-xs text-[#9E7060] mt-0.5">Track active plans, renewal schedules, and monthly recurring revenue.</p>
                </div>
                <span class="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold">
                  MRR: ₱185,000.00 (+14.2%)
                </span>
              </header>

              <!-- Billing Table -->
              <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-[#FFFBF3] text-[#3B1F0E] font-semibold uppercase tracking-wider text-[0.7rem] border-b border-[#F3E7D2]">
                      <tr>
                        <th class="px-4 py-3">Cafe Name</th>
                        <th class="px-4 py-3">Plan Tier</th>
                        <th class="px-4 py-3">Next Renewal</th>
                        <th class="px-4 py-3">Billing Status</th>
                        <th class="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-[#F3E7D2] text-[#3D2B24]">
                      <tr class="hover:bg-[#FFFBF3]/70 transition-colors">
                        <td class="px-4 py-3 font-bold text-[#3B1F0E]">Velvet Roast Cafe</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-0.5 rounded bg-[#7D5A50]/10 text-[#7D5A50] font-semibold text-[0.68rem]">Pro Multi-Branch</span>
                        </td>
                        <td class="px-4 py-3 text-gray-600">Oct 15, 2026</td>
                        <td class="px-4 py-3">
                          <span class="text-emerald-700 font-bold text-[0.68rem]">✓ Active / Paid</span>
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-[#7D5A50]">₱4,999.00 / mo</td>
                      </tr>

                      <tr class="hover:bg-[#FFFBF3]/70 transition-colors">
                        <td class="px-4 py-3 font-bold text-[#3B1F0E]">Artisan Brew Co.</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-0.5 rounded bg-[#7D5A50]/10 text-[#7D5A50] font-semibold text-[0.68rem]">Pro Single Branch</span>
                        </td>
                        <td class="px-4 py-3 text-gray-600">Oct 10, 2026</td>
                        <td class="px-4 py-3">
                          <span class="text-emerald-700 font-bold text-[0.68rem]">✓ Active / Paid</span>
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-[#7D5A50]">₱2,999.00 / mo</td>
                      </tr>

                      <tr class="hover:bg-[#FFFBF3]/70 transition-colors">
                        <td class="px-4 py-3 font-bold text-[#3B1F0E]">Daily Grind Labs</td>
                        <td class="px-4 py-3">
                          <span class="px-2 py-0.5 rounded bg-[#3B1F0E] text-white font-semibold text-[0.68rem]">Enterprise Chain</span>
                        </td>
                        <td class="px-4 py-3 text-gray-600">Nov 01, 2026</td>
                        <td class="px-4 py-3">
                          <span class="text-emerald-700 font-bold text-[0.68rem]">✓ Active / Paid</span>
                        </td>
                        <td class="px-4 py-3 text-right font-bold text-[#7D5A50]">₱9,999.00 / mo</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- TAB 4: Cafe Sales & POS Register -->
            <div v-else-if="activeTab === 'sales'" class="space-y-6">
              <header class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEDFC4] pb-4">
                <div>
                  <h3 class="font-display text-xl font-bold text-[#3D2B24]">Live Cafe Sales & POS Terminal</h3>
                  <p class="font-sans text-xs text-[#9E7060] mt-0.5">Real-time order processing, barista station queue, and revenue counters.</p>
                </div>
                <span class="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full flex items-center gap-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live Sync Enabled
                </span>
              </header>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Barista Order Queue -->
                <div class="md:col-span-2 space-y-3">
                  <p class="text-xs font-bold text-[#3B1F0E] uppercase tracking-wider">Active Order Queue</p>

                  <div class="p-3.5 bg-white rounded-xl border border-emerald-400 bg-emerald-50/10 shadow-sm flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-xs text-[#3B1F0E]">Order #1042 · Table 04</span>
                        <span class="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[0.65rem] font-bold rounded">Preparing</span>
                      </div>
                      <p class="text-xs text-[#7D5A50] mt-1">1x Spanish Latte (Oat Milk + Extra Shot), 1x Butter Croissant</p>
                    </div>
                    <p class="font-bold text-xs text-[#7D5A50]">₱235.00</p>
                  </div>

                  <div class="p-3.5 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-xs text-[#3B1F0E]">Order #1041 · Takeout</span>
                        <span class="px-2 py-0.5 bg-amber-100 text-amber-800 text-[0.65rem] font-bold rounded">Ready for Pickup</span>
                      </div>
                      <p class="text-xs text-[#7D5A50] mt-1">2x Iced Caramel Macchiato</p>
                    </div>
                    <p class="font-bold text-xs text-[#7D5A50]">₱300.00</p>
                  </div>
                </div>

                <!-- Daily Revenue Box -->
                <div class="bg-white rounded-xl border border-[#EEDFC4] p-4 space-y-4 shadow-sm flex flex-col justify-between">
                  <div>
                    <p class="text-xs text-[#9E7060] font-medium">Today's Total Revenue</p>
                    <p class="text-2xl font-bold text-[#7D5A50] mt-1">₱14,850.00</p>
                    <p class="text-xs text-emerald-700 font-semibold mt-1">112 orders fulfilled</p>
                  </div>

                  <div class="border-t border-[#F3E7D2] pt-3 space-y-1.5 text-xs text-[#3D2B24]">
                    <div class="flex justify-between">
                      <span>Espresso Beverages</span>
                      <span class="font-semibold">₱9,840.00</span>
                    </div>
                    <div class="flex justify-between">
                      <span>Pastries & Food</span>
                      <span class="font-semibold">₱5,010.00</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>

    <!-- Key Metrics Strip -->
    <section class="bg-[#F4EBDC] text-[#2d201b] py-12 border-y border-[#7B5A50]/20">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div class="space-y-1">
            <p class="text-3xl sm:text-4xl font-bold text-[#7B5A50]">500+</p>
            <p class="text-xs sm:text-sm text-[#5A4841] font-medium">Active Cafes & Roasteries</p>
          </div>
          <div class="space-y-1">
            <p class="text-3xl sm:text-4xl font-bold text-[#7B5A50]">1.5M+</p>
            <p class="text-xs sm:text-sm text-[#5A4841] font-medium">Espresso Cups Served</p>
          </div>
          <div class="space-y-1">
            <p class="text-3xl sm:text-4xl font-bold text-[#7B5A50]">99.9%</p>
            <p class="text-xs sm:text-sm text-[#5A4841] font-medium">System Uptime Guarantee</p>
          </div>
          <div class="space-y-1">
            <p class="text-3xl sm:text-4xl font-bold text-[#7B5A50]">4.9 / 5</p>
            <p class="text-xs sm:text-sm text-[#5A4841] font-medium">Cafe Owner Rating</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Core Features Grid -->
    <section id="features" class="scroll-mt-24 py-20 lg:py-28 bg-[#FFF8EA] border-b border-[#7B5A50]/10 relative">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7B5A50] bg-[#7B5A50]/10 px-3 py-1 rounded-full">Designed for Modern Coffee Shops</span>
          <h2 class="text-3xl sm:text-4xl font-bold text-[#2d201b]">Everything Your Cafe Needs in One Place</h2>
          <p class="text-base text-[#5A4841]">Stop juggling disconnected POS apps, spreadsheet inventories, and paper reservation books.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div
            v-for="(feature, idx) in features"
            :key="idx"
            class="p-8 rounded-2xl bg-white border border-[#7B5A50]/15 hover:border-[#7B5A50] transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 group"
          >
            <div class="w-12 h-12 rounded-xl bg-[#7B5A50]/10 text-[#7B5A50] group-hover:bg-[#7B5A50] group-hover:text-white transition-colors flex items-center justify-center mb-6">
              <Icon v-if="idx === 0" name="heroicons:shopping-bag" class="w-6 h-6" />
              <Icon v-else-if="idx === 1" name="heroicons:calendar-days" class="w-6 h-6" />
              <Icon v-else-if="idx === 2" name="heroicons:chart-bar" class="w-6 h-6" />
              <Icon v-else-if="idx === 3" name="heroicons:cube" class="w-6 h-6" />
              <Icon v-else-if="idx === 4" name="heroicons:user-group" class="w-6 h-6" />
              <Icon v-else-if="idx === 5" name="heroicons:building-storefront" class="w-6 h-6" />
            </div>
            <h3 class="text-xl font-bold text-[#2d201b] mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-[#5A4841] leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section id="how-it-works" class="scroll-mt-24 py-20 lg:py-28 bg-[#FDFBF7] border-b border-[#7B5A50]/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7B5A50] bg-[#7B5A50]/10 px-3 py-1 rounded-full">Streamlined Onboarding</span>
          <h2 class="text-3xl sm:text-4xl font-bold text-[#2d201b]">Get Started in 3 Simple Steps</h2>
          <p class="text-base text-[#5A4841]">Launch your cafe operations effortlessly without complex hardware installations.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="p-8 rounded-2xl bg-[#FDFBF7] border border-[#7B5A50]/15 relative overflow-hidden flex flex-col justify-between"
          >
            <span class="text-5xl font-extrabold text-[#7B5A50]/15 absolute top-4 right-4">{{ step.number }}</span>
            <div class="space-y-4 relative z-10">
              <div class="w-12 h-12 rounded-xl bg-[#7B5A50] text-white flex items-center justify-center shadow-md">
                <Icon :name="step.icon" class="w-6 h-6" />
              </div>
              <h3 class="text-xl font-bold text-[#2d201b]">{{ step.title }}</h3>
              <p class="text-sm text-[#5A4841] leading-relaxed">{{ step.description }}</p>
            </div>
          </div>
        </div>

        <!-- Middle Action Banner -->
        <div class="mt-12 text-center flex justify-center">
          <button
            @click="goRegister"
            class="h-11 px-6 rounded-md bg-[#7B5A50] text-white font-medium text-sm hover:bg-[#65463d] transition flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <span>Register Your Cafe Now</span>
            <Icon name="heroicons:arrow-right" class="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>

    <!-- Testimonials Section -->
    <section id="testimonials" class="scroll-mt-24 py-20 lg:py-28 bg-[#F5EBE0] border-b border-[#7B5A50]/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7B5A50] bg-[#7B5A50]/10 px-3 py-1 rounded-full">Trusted by Cafe Leaders</span>
          <h2 class="text-3xl sm:text-4xl font-bold text-[#2d201b]">What Cafe Owners Are Saying</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div
            v-for="(t, idx) in testimonials"
            :key="idx"
            class="p-8 rounded-2xl bg-white border border-[#7B5A50]/15 shadow-sm space-y-6 flex flex-col justify-between"
          >
            <div class="space-y-4">
              <!-- Rating Stars -->
              <div class="flex items-center gap-1 text-amber-500">
                <Icon v-for="s in t.rating" :key="s" name="heroicons:star" class="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <p class="text-sm text-[#4A3731] italic leading-relaxed">"{{ t.quote }}"</p>
            </div>

            <div class="flex items-center gap-3 pt-4 border-t border-gray-100">
              <div :class="[t.avatarBg, 'w-10 h-10 rounded-full text-white font-bold flex items-center justify-center text-sm shadow']">
                {{ t.author.charAt(0) }}
              </div>
              <div>
                <p class="font-bold text-sm text-[#2d201b]">{{ t.author }}</p>
                <p class="text-xs text-gray-500">{{ t.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="scroll-mt-24 py-20 lg:py-28 bg-[#FFF8EA] border-b border-[#7B5A50]/10">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center space-y-4 mb-16">
          <span class="text-xs font-bold uppercase tracking-wider text-[#7B5A50] bg-[#7B5A50]/10 px-3 py-1 rounded-full">Got Questions?</span>
          <h2 class="text-3xl sm:text-4xl font-bold text-[#2d201b]">Frequently Asked Questions</h2>
        </div>

        <div class="space-y-4">
          <div
            v-for="(faq, index) in faqs"
            :key="index"
            class="rounded-xl border border-[#7B5A50]/20 bg-[#FDFBF7] overflow-hidden transition-all"
          >
            <button
              @click="toggleFaq(index)"
              class="w-full px-6 py-5 text-left font-semibold text-base text-[#2d201b] flex items-center justify-between gap-4 hover:text-[#7B5A50] transition-colors"
            >
              <span>{{ faq.question }}</span>
              <Icon
                :name="openFaqIndex === index ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                class="w-5 h-5 text-[#7B5A50] shrink-0"
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
              <div v-if="openFaqIndex === index" class="px-6 pb-5 text-sm text-[#5A4841] leading-relaxed border-t border-[#7B5A50]/10 pt-4">
                {{ faq.answer }}
              </div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- Bottom Call To Action Banner -->
    <section class="py-16 bg-[#FDFBF7]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="rounded-3xl bg-gradient-to-r from-[#7B5A50] via-[#65463d] to-[#5C3F37] text-white p-10 sm:p-16 text-center space-y-8 shadow-2xl relative overflow-hidden">
          <!-- Background Accent Shapes -->
          <div class="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl"></div>
          <div class="absolute -bottom-12 -left-12 w-64 h-64 bg-amber-500/20 rounded-full blur-2xl"></div>

          <div class="max-w-2xl mx-auto space-y-4 relative z-10">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">Ready to Transform Your Coffee Business?</h2>
            <p class="text-base sm:text-lg text-white/90 font-light">Join hundreds of successful cafes using BrewSpot to boost daily orders, seat guests faster, and increase profitability.</p>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <button
              @click="goRegister"
              class="w-full sm:w-auto h-11 px-6 rounded-md bg-white text-[#7B5A50] font-medium text-sm hover:bg-[#FFF8EA] transition flex items-center justify-center gap-2 shadow-md"
            >
              <Icon name="heroicons:user-plus" class="w-4 h-4" />
              <span>Create Account</span>
            </button>
            <button
              @click="goLogin"
              class="w-full sm:w-auto h-11 px-6 rounded-md border border-white/40 text-white font-medium text-sm hover:bg-white/10 transition flex items-center justify-center gap-2"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-4 h-4" />
              <span>Sign In to Account</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-[#2d201b] text-white py-12 border-t border-[#4A3731]">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6">
          <div class="flex items-center gap-3">
            <img :src="logoIcon" alt="BrewSpot Icon" class="h-9 w-auto brightness-200" />
            <span class="text-xl font-bold tracking-wider text-amber-100">BrewSpot</span>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-300">
            <a href="#features" class="hover:text-white transition">Features</a>
            <a href="#demo" class="hover:text-white transition">Demo</a>
            <a href="#how-it-works" class="hover:text-white transition">How It Works</a>
            <NuxtLink to="/login" class="hover:text-white transition">Sign In</NuxtLink>
            <NuxtLink to="/register" class="hover:text-white transition">Register</NuxtLink>
          </div>
        </div>

        <div class="pt-8 border-t border-[#4A3731] flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© {{ new Date().getFullYear() }} BrewSpot Systems Inc. All rights reserved.</p>
          <div class="flex items-center gap-4">
            <a href="#" class="hover:text-gray-200">Privacy Policy</a>
            <span>•</span>
            <a href="#" class="hover:text-gray-200">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>