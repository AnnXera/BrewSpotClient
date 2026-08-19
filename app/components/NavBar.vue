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

const isExpanded = ref(false)
const dropdownOpen = ref(false)
const profileRef = ref<HTMLElement | null>(null)

function isActive(link: NavLink) {
  return route.path === link.to || route.path.startsWith(link.to + '/')
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

function closeDropdown(event: MouseEvent) {
  if (profileRef.value && !profileRef.value.contains(event.target as Node)) {
    dropdownOpen.value = false
  }
}

async function handleLogout() {
  dropdownOpen.value = false
  await logout()
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeDropdown)
})
</script>

<template>
  <aside
    class="h-screen sticky top-0 bg-[#7D5A50] flex flex-col p-6 transition-all duration-300 ease-in-out overflow-hidden"
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
          <Icon name="heroicons:arrow-right-start-on-rectangle" class="w-5 h-5 text-[#D9534F] shrink-0" />
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
</template>