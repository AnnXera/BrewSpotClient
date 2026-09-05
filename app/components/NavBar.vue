<!--app/components/NavBar.vue-->
<script setup lang="ts">
import logoFull from '~/assets/images/logo.svg'
import logoIcon from '~/assets/images/logo-icon.svg'

interface NavLink {
  label: string
  to: string
  icon: string
}

const props = defineProps<{
  links: NavLink[]
}>()

const route = useRoute()
const authStore = useAuthStore()
const logout = useLogout()

const isExpanded = ref(false)   // desktop hover-expand
const mobileOpen = ref(false)   // mobile drawer
const dropdownOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)
const mobileProfileRef = ref<HTMLElement | null>(null)

function isActive(link: NavLink) {
  return route.path === link.to || route.path.startsWith(link.to + '/')
}

function iconName(link: NavLink) {
  return `heroicons:${link.icon}`
}

const initials = computed(() => {
  const name = authStore.user?.firstname ?? 'N'
  return name.charAt(0).toUpperCase()
})

const displayName = computed(() => authStore.user?.firstname ?? 'Name')
const displayRole = computed(() => authStore.role ?? 'Super Admin')

function closeDropdown(event: MouseEvent) {
  const target = event.target as Node
  const clickedInsideDesktop = profileRef.value?.contains(target)
  const clickedInsideMobile = mobileProfileRef.value?.contains(target)

  if (!clickedInsideDesktop && !clickedInsideMobile) {
    dropdownOpen.value = false
  }
}

async function handleLogout() {
  dropdownOpen.value = false
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

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
  document.body.style.overflow = ''
})
</script>

<template>
  <!-- ============ DESKTOP SIDEBAR (md and up) ============ -->
  <aside
    class="hidden md:flex h-screen sticky top-0 bg-[#7D5A50] flex-col p-6 transition-all duration-300 ease-in-out overflow-hidden"
    :class="isExpanded ? 'w-[289px]' : 'w-[88px]'"
    @mouseenter="isExpanded = true"
    @mouseleave="isExpanded = false"
  >
    <!-- Logo -->
    <div class="h-12 flex items-center" :class="isExpanded ? 'justify-start' : 'justify-center'">
      <img v-if="isExpanded" :src="logoFull" alt="Brewspot" class="h-auto w-full max-w-[195px]" />
      <img v-else :src="logoIcon" alt="Brewspot" class="w-12 h-12 shrink-0" />
    </div>

    <!-- Divider (logo → nav) -->
    <div class="h-px bg-[#B4846C] mt-6" />

    <!-- Nav items -->
    <nav class="flex flex-col gap-2 mt-6">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="h-12 rounded-xl flex items-center transition-colors"
        :class="[
          isActive(link) ? 'bg-[#B4846C]' : 'hover:bg-[#8B6656]',
          isExpanded ? 'w-[241px] px-3 py-3 gap-[9px]' : 'w-12 justify-center'
        ]"
      >
        <Icon :name="iconName(link)" class="w-6 h-6 text-[#FFF0D1] shrink-0" />
        <span
          v-if="isExpanded"
          class="font-display text-base text-[#FFF0D1] whitespace-nowrap"
          :class="isActive(link) ? 'font-semibold' : 'font-normal'"
        >
          {{ link.label }}
        </span>
      </NuxtLink>
    </nav>

    <!-- Spacer pushes profile to bottom -->
    <div class="flex-1" />

    <!-- Divider (nav → profile) -->
    <div class="h-px bg-[#B4846C] mb-6" />

    <!-- Profile -->
    <div ref="profileRef" class="relative">
      <!-- Dropdown -->
      <div
        v-if="dropdownOpen"
        class="absolute bottom-[calc(100%+8px)] left-0 w-[200px] bg-[#FFFDF9] rounded-xl shadow-lg border border-[#EEDFC4] overflow-hidden py-1 z-50"
        :class="isExpanded ? '' : '-left-2'"
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
        class="flex items-center w-full"
        :class="isExpanded ? 'gap-3' : 'justify-center'"
        @click="dropdownOpen = !dropdownOpen"
      >
        <div class="w-12 h-12 rounded-full bg-[#3B1F0E] flex items-center justify-center shrink-0">
          <span class="font-display font-semibold text-[#FFF0D1]" style="font-size: 19.69px">
            {{ initials }}
          </span>
        </div>

        <template v-if="isExpanded">
          <div class="flex flex-col items-start min-w-0">
            <span class="font-display font-semibold text-base text-[#FFF0D1] truncate">
              {{ displayName }}
            </span>
            <span class="font-sans font-normal text-xs text-[#FFF0D1] truncate">
              {{ displayRole }}
            </span>
          </div>

          <Icon
            name="heroicons:chevron-down"
            class="w-6 h-6 text-[#B4846C] ml-auto shrink-0 transition-transform"
            :class="dropdownOpen ? 'rotate-180' : ''"
          />
        </template>
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
      <button type="button" class="flex items-center justify-center" @click="dropdownOpen = !dropdownOpen">
        <div class="w-8 h-8 rounded-full bg-[#3B1F0E] flex items-center justify-center shrink-0">
          <span class="font-display font-semibold text-[#FFF0D1] text-sm">
            {{ initials }}
          </span>
        </div>
      </button>

      <div
        v-if="dropdownOpen"
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
            class="h-full w-[280px] bg-[#7D5A50] flex flex-col p-6 overflow-y-auto"
          >
            <!-- Header: logo + close -->
            <div class="flex items-center justify-between h-12 mb-6">
              <img :src="logoFull" alt="Brewspot" class="h-auto w-full max-w-[160px]" />
              <button
                type="button"
                class="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#8B6656] transition-colors shrink-0"
                @click="mobileOpen = false"
              >
                <Icon name="heroicons:x-mark" class="w-6 h-6 text-[#FFF0D1]" />
              </button>
            </div>

            <div class="h-px bg-[#B4846C] mb-6" />

            <!-- Nav items -->
            <nav class="flex flex-col gap-2">
              <NuxtLink
                v-for="link in links"
                :key="link.to"
                :to="link.to"
                class="h-12 w-full rounded-xl flex items-center px-3 py-3 gap-[9px] transition-colors"
                :class="isActive(link) ? 'bg-[#B4846C]' : 'hover:bg-[#8B6656]'"
                @click="mobileOpen = false"
              >
                <Icon :name="iconName(link)" class="w-6 h-6 text-[#FFF0D1] shrink-0" />
                <span
                  class="font-display text-base text-[#FFF0D1] whitespace-nowrap"
                  :class="isActive(link) ? 'font-semibold' : 'font-normal'"
                >
                  {{ link.label }}
                </span>
              </NuxtLink>
            </nav>

            <div class="flex-1" />

            <div class="h-px bg-[#B4846C] mb-6" />

            <!-- Profile + logout -->
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 rounded-full bg-[#3B1F0E] flex items-center justify-center shrink-0">
                <span class="font-display font-semibold text-[#FFF0D1]" style="font-size: 19.69px">
                  {{ initials }}
                </span>
              </div>
              <div class="flex flex-col items-start min-w-0">
                <span class="font-display font-semibold text-base text-[#FFF0D1] truncate">
                  {{ displayName }}
                </span>
                <span class="font-sans font-normal text-xs text-[#FFF0D1] truncate">
                  {{ displayRole }}
                </span>
              </div>
            </div>

            <button
              class="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#8B6656] transition-colors"
              @click="handleLogout"
            >
              <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-5 h-5 text-[#FDE8E8] shrink-0" />
              <span class="font-sans text-sm font-medium text-[#FDE8E8]">Logout</span>
            </button>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>