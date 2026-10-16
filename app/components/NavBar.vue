<!--app/components/NavBar.vue-->
<script setup lang="ts">
import logoFull from '~/assets/images/logo.svg'
import logoIcon from '~/assets/images/logo-icon.svg'
import { useNavCategories } from '~/composables/useNavCategories'

interface NavLink {
  label: string
  to: string
  icon?: string // icon is optional for children
  isDropdown?: boolean
  children?: NavLink[]
  isHeader?: boolean
  isCategory?: boolean // a menu category, listed in its own scrolling box
}

// Past this many categories, their list scrolls instead of growing the sidebar.
const CATEGORIES_BEFORE_SCROLL = 3

const staticChildren = (link: NavLink) => (link.children ?? []).filter(c => !c.isCategory)
const categoryChildren = (link: NavLink) => (link.children ?? []).filter(c => c.isCategory)

const props = defineProps<{
  links: NavLink[]
}>()

const route = useRoute()
const authStore = useAuthStore()
const logout = useLogout()
const { categories: navCategories, refresh: refreshNavCategories } = useNavCategories()

const mobileOpen = ref(false)   // mobile drawer
const profileDropdownOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)
const mobileProfileRef = ref<HTMLElement | null>(null)

// State for open navigation dropdowns
const openNavDropdowns = ref<Record<string, boolean>>({})

// Clone links to allow dynamic injection of categories
const dynamicLinks = ref<NavLink[]>(JSON.parse(JSON.stringify(props.links)))

onMounted(async () => {
  document.addEventListener('click', closeProfileDropdown)
  
  // Fetch menu categories if "Menu Management" is in the links
  const menuIndex = dynamicLinks.value.findIndex(l => l.label === 'Menu Management')
  if (menuIndex !== -1) {
    // Open by default if we are on a menu route
    if (route.path.startsWith('/owner/menu')) {
        openNavDropdowns.value['Menu Management'] = true
    }

    dynamicLinks.value[menuIndex].isDropdown = true

    // Rebuilt whenever a page adds, renames or deletes a category (useNavCategories().refresh()).
    watch(navCategories, (categories) => {
      dynamicLinks.value[menuIndex].children = [
        ...baseMenuChildren,
        ...categories.map(cat => ({ label: cat.name, to: `/owner/menu-management/category/${cat.uuid}`, isCategory: true }))
      ]
    }, { immediate: true })

    await refreshNavCategories()
  }
})

const baseMenuChildren: NavLink[] = [
  { label: 'Menu Items', to: '/owner/menu-management/items' },
  { label: 'Ingredients', to: '/owner/menu-management/ingredients' },
  { label: 'Add-ons', to: '/owner/menu-management/addons' },
  { label: 'CATEGORIES', to: '', isHeader: true }
]

function isActive(link: NavLink) {
  if (link.isHeader) return false
  
  // If the link itself has a query string, check if the path and query match
  if (link.to && link.to.includes('?')) {
    const [path, query] = link.to.split('?')
    if (route.path !== path) return false
    
    const queryParams = new URLSearchParams(query)
    for (const [key, val] of queryParams) {
      if (route.query[key] !== val) return false
    }
    return true
  }

  // Exact match or prefix match for normal links
  if (route.path === link.to) return true
  if (link.to && link.to !== '/' && route.path.startsWith(link.to + '/')) return true
  
  // Check children for query match
  if (link.children) {
    return link.children.some(child => isActive(child))
  }
  return false
}

function iconName(link: NavLink) {
  return isActive(link) ? `heroicons:${link.icon}-solid` : `heroicons:${link.icon}`
}

const initials = computed(() => {
  const name = authStore.user?.firstname ?? 'N'
  return name.charAt(0).toUpperCase()
})

const displayName = computed(() => authStore.user?.firstname ?? 'Name')
const displayRole = computed(() => authStore.role ?? 'Super Admin')

function closeProfileDropdown(event: MouseEvent) {
  const target = event.target as Node
  const clickedInsideDesktop = profileRef.value?.contains(target)
  const clickedInsideMobile = mobileProfileRef.value?.contains(target)

  if (!clickedInsideDesktop && !clickedInsideMobile) {
    profileDropdownOpen.value = false
  }
}

async function handleLogout() {
  profileDropdownOpen.value = false
  mobileOpen.value = false
  await logout()
}

// Close the mobile drawer whenever the route changes (link tap, back button, etc.)
watch(() => route.path, () => {
  mobileOpen.value = false
})

// Lock body scroll while the mobile drawer is open
watch(mobileOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = open ? 'hidden' : ''
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeProfileDropdown)
  document.body.style.overflow = ''
})

function toggleDropdown(link: NavLink) {
  openNavDropdowns.value[link.label] = !openNavDropdowns.value[link.label]
  if (link.to) {
    useRouter().push(link.to)
  }
}
</script>

<template>
  <!-- ============ DESKTOP SIDEBAR (md and up) ============ -->
  <!-- Removed hover expansion, permanently expanded width: 289px -->
  <aside
    class="hidden md:flex h-screen sticky top-0 bg-[#7D5A50] flex-col p-6 w-[289px] shrink-0"
  >
    <!-- Logo (stays put; only the nav below scrolls) -->
    <div class="h-12 flex items-center justify-start shrink-0">
      <img :src="logoFull" alt="Brewspot" class="h-auto w-full max-w-[195px]" />
    </div>

    <!-- Divider (logo → nav) -->
    <div class="h-px bg-[#B4846C] mt-6 shrink-0" />

    <!-- Nav items: fills the space between logo and profile, scrolls if taller -->
    <nav class="flex-1 min-h-0 overflow-y-auto nav-scroll flex flex-col gap-2 mt-6 -mx-2 px-2">
      <template v-for="link in dynamicLinks" :key="link.to">
        <!-- Parent Link / Dropdown Toggle -->
        <div v-if="link.isDropdown" class="flex flex-col">
          <button
            class="h-12 rounded-xl flex items-center transition-colors w-full px-3 py-3 gap-[9px] text-left"
            :class="isActive(link) ? 'bg-[#B4846C]' : 'hover:bg-[#8B6656]'"
            @click="toggleDropdown(link)"
          >
            <Icon v-if="link.icon" :name="iconName(link)" class="w-6 h-6 text-[#FFF0D1] shrink-0" />
            <span
              class="font-display text-base text-[#FFF0D1] whitespace-nowrap flex-1"
              :class="isActive(link) ? 'font-semibold' : 'font-normal'"
            >
              {{ link.label }}
            </span>
            <Icon
              name="heroicons:chevron-down"
              class="w-5 h-5 text-[#FFF0D1] shrink-0 transition-transform"
              :class="openNavDropdowns[link.label] ? 'rotate-180' : ''"
            />
          </button>
          
          <!-- Dropdown Children -->
          <div v-if="openNavDropdowns[link.label]" class="flex flex-col mt-2 pl-[42px] gap-2">
            <template v-for="child in staticChildren(link)" :key="child.label">
              <!-- Header style -->
              <span v-if="child.isHeader" class="text-[10px] tracking-wider font-semibold text-[#FFF0D1]/70 uppercase mt-2 mb-1">
                {{ child.label }}
              </span>
              <!-- Normal child link -->
              <NuxtLink
                v-else
                :to="child.to"
                class="rounded-lg flex items-center transition-colors px-3 py-2 text-sm"
                :class="isActive(child) ? 'text-white font-semibold' : 'text-[#FFF0D1]/80 hover:text-white'"
              >
                {{ child.label }}
              </NuxtLink>
            </template>

            <!-- Categories: past 3 they scroll in a box about 3 rows tall -->
            <div
              v-if="categoryChildren(link).length"
              class="flex flex-col gap-2"
              :class="categoryChildren(link).length > CATEGORIES_BEFORE_SCROLL ? 'max-h-[124px] overflow-y-auto nav-scroll pr-1' : ''"
            >
              <NuxtLink
                v-for="child in categoryChildren(link)"
                :key="child.to"
                :to="child.to"
                class="rounded-lg flex items-center transition-colors px-3 py-2 text-sm shrink-0"
                :class="isActive(child) ? 'text-white font-semibold' : 'text-[#FFF0D1]/80 hover:text-white'"
              >
                <span class="truncate">{{ child.label }}</span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Standard Link -->
        <NuxtLink
          v-else
          :to="link.to"
          class="h-12 rounded-xl flex items-center transition-colors w-full px-3 py-3 gap-[9px]"
          :class="isActive(link) ? 'bg-[#B4846C]' : 'hover:bg-[#8B6656]'"
        >
          <Icon v-if="link.icon" :name="iconName(link)" class="w-6 h-6 text-[#FFF0D1] shrink-0" />
          <span
            class="font-display text-base text-[#FFF0D1] whitespace-nowrap"
            :class="isActive(link) ? 'font-semibold' : 'font-normal'"
          >
            {{ link.label }}
          </span>
        </NuxtLink>
      </template>
    </nav>

    <!-- Divider (nav → profile) -->
    <div class="h-px bg-[#B4846C] my-6 shrink-0" />

    <!-- Profile (stays put at the bottom) -->
    <div ref="profileRef" class="relative shrink-0">
      <!-- Dropdown -->
      <div
        v-if="profileDropdownOpen"
        class="absolute bottom-[calc(100%+8px)] left-0 w-[200px] bg-[#FFFDF9] rounded-xl shadow-lg border border-[#EEDFC4] overflow-hidden py-1 z-50"
      >
        <button
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FBF2E1] transition-colors text-left"
          @click="handleLogout"
        >
          <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5 text-[#D9534F] shrink-0" />
          <span class="font-sans text-sm font-medium text-[#D9534F]">Logout</span>
        </button>
      </div>

      <button
        class="flex items-center w-full gap-3 text-left"
        @click="profileDropdownOpen = !profileDropdownOpen"
      >
        <div class="w-12 h-12 rounded-full bg-[#3B1F0E] flex items-center justify-center shrink-0">
          <span class="font-display font-semibold text-[#FFF0D1]" style="font-size: 19.69px">
            {{ initials }}
          </span>
        </div>

        <div class="flex flex-col items-start min-w-0 flex-1">
          <span class="font-display font-semibold text-base text-[#FFF0D1] truncate">
            {{ displayName }}
          </span>
          <span class="font-sans font-normal text-xs text-[#FFF0D1] truncate">
            {{ displayRole }}
          </span>
        </div>

        <Icon
          name="heroicons:chevron-down"
          class="w-6 h-6 text-[#B4846C] shrink-0 transition-transform"
          :class="profileDropdownOpen ? 'rotate-180' : ''"
        />
      </button>
    </div>
  </aside>

  <!-- ============ MOBILE TOP BAR (below md) ============ -->
  <div class="md:hidden sticky top-0 z-30 flex items-center justify-between h-[56px] px-4 bg-[#7D5A50] shrink-0">
    <button
      type="button"
      class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#8B6656] transition-colors"
      @click="mobileOpen = true"
    >
      <Icon name="heroicons:bars-3" class="w-6 h-6 text-[#FFF0D1]" />
    </button>

    <img :src="logoFull" alt="Brewspot" class="h-6 w-auto shrink-0" />

    <div ref="mobileProfileRef" class="relative">
      <button type="button" class="flex items-center justify-center" @click="profileDropdownOpen = !profileDropdownOpen">
        <div class="w-8 h-8 rounded-full bg-[#3B1F0E] flex items-center justify-center shrink-0">
          <span class="font-display font-semibold text-[#FFF0D1] text-sm">
            {{ initials }}
          </span>
        </div>
      </button>

      <div
        v-if="profileDropdownOpen"
        class="absolute top-[calc(100%+8px)] right-0 w-[200px] bg-[#FFFDF9] rounded-xl shadow-lg border border-[#EEDFC4] overflow-hidden py-1 z-50"
      >
        <div class="px-4 py-3 border-b border-[#EEDFC4]">
          <p class="font-display font-semibold text-sm text-[#3B1F0E] truncate">{{ displayName }}</p>
          <p class="font-sans text-xs text-[#3B1F0E]/60 truncate">{{ displayRole }}</p>
        </div>
        <button
          class="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FBF2E1] transition-colors text-left"
          @click="handleLogout"
        >
          <Icon name="heroicons:arrow-right-on-rectangle" class="w-5 h-5 text-[#D9534F] shrink-0" />
          <span class="font-sans text-sm font-medium text-[#D9534F]">Logout</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ============ MOBILE DRAWER ============ -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileOpen"
        class="md:hidden fixed inset-0 z-50 bg-[#3B1F0E]/40 backdrop-blur-sm"
        @click.self="mobileOpen = false"
      >
        <Transition
          enter-active-class="transition-transform duration-300 ease-out"
          leave-active-class="transition-transform duration-200 ease-in"
          enter-from-class="-translate-x-full"
          leave-to-class="-translate-x-full"
        >
          <aside
            v-if="mobileOpen"
            class="h-full w-[280px] bg-[#7D5A50] flex flex-col p-6"
          >
            <!-- Header: logo + close (stays put; only the nav scrolls) -->
            <div class="flex items-center justify-between h-12 mb-6 shrink-0">
              <img :src="logoFull" alt="Brewspot" class="h-auto w-full max-w-[160px]" />
              <button
                type="button"
                class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#8B6656] transition-colors shrink-0"
                @click="mobileOpen = false"
              >
                <Icon name="heroicons:x-mark" class="w-6 h-6 text-[#FFF0D1]" />
              </button>
            </div>

            <div class="h-px bg-[#B4846C] mb-6 shrink-0" />

            <!-- Nav items -->
            <nav class="flex-1 min-h-0 overflow-y-auto nav-scroll flex flex-col gap-2 -mx-2 px-2">
              <template v-for="link in dynamicLinks" :key="link.to">
                <div v-if="link.isDropdown" class="flex flex-col">
                  <button
                    class="h-12 rounded-xl flex items-center transition-colors w-full px-3 py-3 gap-[9px] text-left"
                    :class="isActive(link) ? 'bg-[#B4846C]' : 'hover:bg-[#8B6656]'"
                    @click="toggleDropdown(link)"
                  >
                    <Icon v-if="link.icon" :name="iconName(link)" class="w-6 h-6 text-[#FFF0D1] shrink-0" />
                    <span
                      class="font-display text-base text-[#FFF0D1] whitespace-nowrap flex-1"
                      :class="isActive(link) ? 'font-semibold' : 'font-normal'"
                    >
                      {{ link.label }}
                    </span>
                    <Icon
                      name="heroicons:chevron-down"
                      class="w-5 h-5 text-[#FFF0D1] shrink-0 transition-transform"
                      :class="openNavDropdowns[link.label] ? 'rotate-180' : ''"
                    />
                  </button>
                  
                  <div v-if="openNavDropdowns[link.label]" class="flex flex-col mt-2 pl-[42px] gap-2">
                    <template v-for="child in staticChildren(link)" :key="child.label">
                      <span v-if="child.isHeader" class="text-[10px] tracking-wider font-semibold text-[#FFF0D1]/70 uppercase mt-2 mb-1">
                        {{ child.label }}
                      </span>
                      <NuxtLink
                        v-else
                        :to="child.to"
                        class="rounded-lg flex items-center transition-colors px-3 py-2 text-sm"
                        :class="isActive(child) ? 'text-white font-semibold' : 'text-[#FFF0D1]/80 hover:text-white'"
                        @click="mobileOpen = false"
                      >
                        {{ child.label }}
                      </NuxtLink>
                    </template>

                    <div
                      v-if="categoryChildren(link).length"
                      class="flex flex-col gap-2"
                      :class="categoryChildren(link).length > CATEGORIES_BEFORE_SCROLL ? 'max-h-[124px] overflow-y-auto nav-scroll pr-1' : ''"
                    >
                      <NuxtLink
                        v-for="child in categoryChildren(link)"
                        :key="child.to"
                        :to="child.to"
                        class="rounded-lg flex items-center transition-colors px-3 py-2 text-sm shrink-0"
                        :class="isActive(child) ? 'text-white font-semibold' : 'text-[#FFF0D1]/80 hover:text-white'"
                        @click="mobileOpen = false"
                      >
                        <span class="truncate">{{ child.label }}</span>
                      </NuxtLink>
                    </div>
                  </div>
                </div>

                <NuxtLink
                  v-else
                  :to="link.to"
                  class="h-12 w-full rounded-xl flex items-center px-3 py-3 gap-[9px] transition-colors"
                  :class="isActive(link) ? 'bg-[#B4846C]' : 'hover:bg-[#8B6656]'"
                  @click="mobileOpen = false"
                >
                  <Icon v-if="link.icon" :name="iconName(link)" class="w-6 h-6 text-[#FFF0D1] shrink-0" />
                  <span
                    class="font-display text-base text-[#FFF0D1] whitespace-nowrap"
                    :class="isActive(link) ? 'font-semibold' : 'font-normal'"
                  >
                    {{ link.label }}
                  </span>
                </NuxtLink>
              </template>
            </nav>
            <!-- Profile and logout live in the top bar's avatar menu on mobile. -->
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Thin scrollbar in the sidebar's colors */
.nav-scroll {
  scrollbar-width: thin;
  scrollbar-color: #B4846C transparent;
}
.nav-scroll::-webkit-scrollbar {
  width: 6px;
}
.nav-scroll::-webkit-scrollbar-thumb {
  background: #B4846C;
  border-radius: 9999px;
}
.nav-scroll::-webkit-scrollbar-track {
  background: transparent;
}
</style>
