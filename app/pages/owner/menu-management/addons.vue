<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import type { MenuAddon } from '~/services/MenuService'
import MenuPageHeader from '~/components/menu/MenuPageHeader.vue'
import MenuToolbar from '~/components/menu/MenuToolbar.vue'
import EmptyState from '~/components/menu/EmptyState.vue'
import AddonModal from '~/components/menu/AddonModal.vue'

definePageMeta({
  layout: 'owner',
})

const route = useRoute()
const router = useRouter()
const menuService = useMenuService()

const addons = ref<MenuAddon[]>([])
const isLoading = ref(true)

const searchQuery = ref('')
const sortBy = ref('name-asc')
const sortOptions = [
  { label: 'Alphabetically: A to Z', value: 'name-asc' },
  { label: 'Alphabetically: Z to A', value: 'name-desc' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
]

// Switched-off add-ons sink to the bottom.
const filteredAndSorted = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  const list = q ? addons.value.filter(a => a.name.toLowerCase().includes(q)) : addons.value

  return [...list].sort((a, b) => {
    if (a.is_available !== b.is_available) return a.is_available ? -1 : 1
    if (sortBy.value === 'name-desc') return b.name.localeCompare(a.name)
    if (sortBy.value === 'price-asc') return Number(a.price) - Number(b.price) || a.name.localeCompare(b.name)
    if (sortBy.value === 'price-desc') return Number(b.price) - Number(a.price) || a.name.localeCompare(b.name)
    return a.name.localeCompare(b.name)
  })
})

async function fetchData() {
  isLoading.value = true
  try {
    const res = await menuService.getAddons()
    addons.value = res.addons ?? []
  } catch (error) {
    console.error('Failed to fetch add-ons', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)

const isModalOpen = computed(() =>
  route.query.action === 'add-addon' || route.query.action === 'edit-addon'
)

const addonToEdit = computed(() => {
  if (route.query.action === 'edit-addon' && route.query.addon) {
    return addons.value.find(a => a.uuid === route.query.addon) || null
  }
  return null
})

function handleAddAction() {
  router.push({ query: { ...route.query, action: 'add-addon' } })
}

function editAddon(uuid: string) {
  router.push({ query: { ...route.query, action: 'edit-addon', addon: uuid } })
}

function closeModal() {
  const newQuery = { ...route.query }
  delete newQuery.action
  delete newQuery.addon
  router.push({ query: newQuery })
}

// Same preview as the item cards' recipe line: up to 4 names, then a +N pill.
const OFFERED_PREVIEW = 4

function offeredOn(addon: MenuAddon) {
  return addon.items.slice(0, OFFERED_PREVIEW).map(i => i.menu_name).join(' • ')
}

const breadcrumbs = [
  { label: 'Menu Management', to: '/owner/menu-management' },
  { label: 'Add-ons' }
]

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#fdf3e7]">
    <NavBar :links="links" />
    <main class="flex-1 p-4 md:p-6 lg:p-10 max-w-7xl mx-auto w-full">
      <MenuPageHeader
        title="Add-ons"
        subtitle="Extras customers can add to a drink, like Oreo crumbles or an extra shot."
        :breadcrumbs="breadcrumbs"
      />

      <div class="bg-white border border-[#EEDFC4] rounded-2xl overflow-hidden flex flex-col shadow-sm">
        <div class="p-4 sm:p-6 border-b border-[#EEDFC4]">
          <MenuToolbar
            searchPlaceholder="Search Add-on"
            addButtonLabel="+ Add Add-on"
            v-model="searchQuery"
            v-model:sortValue="sortBy"
            :sortOptions="sortOptions"
            @add="handleAddAction"
          />
        </div>

        <div class="p-4 sm:p-6">
          <div v-if="isLoading" class="flex justify-center py-20">
            <Icon name="heroicons:arrow-path" class="w-8 h-8 text-[#7D5A50] animate-spin" />
          </div>

          <template v-else>
            <div v-if="filteredAndSorted.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                v-for="addon in filteredAndSorted"
                :key="addon.uuid"
                type="button"
                @click="editAddon(addon.uuid)"
                class="text-left bg-white rounded-2xl border border-[#EEDFC4] flex flex-col hover:shadow-md transition-all p-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#B4846C]/40"
                :class="!addon.is_available ? 'opacity-60' : ''"
              >
                <div class="flex items-center gap-3">
                  <div class="w-11 h-11 shrink-0 rounded-xl bg-[#FBF2E1] text-[#B4846C] flex items-center justify-center">
                    <Icon name="heroicons:plus-circle" class="w-6 h-6" />
                  </div>
                  <h3 class="flex-1 min-w-0 font-display font-bold text-[16px] text-[#3B1F0E] leading-snug line-clamp-2 break-words">
                    {{ addon.name }}
                  </h3>
                  <span class="shrink-0 font-display font-bold text-[16px] text-[#3B1F0E] whitespace-nowrap">
                    +₱{{ Number(addon.price).toFixed(2) }}
                  </span>
                </div>

                <p class="mt-3 text-xs text-[#7D5A50]">
                  Up to {{ addon.max_quantity }} per drink
                  <template v-if="addon.recipes.length">
                    · {{ addon.recipes.map(r => r.ingredient_name).join(', ') }}
                  </template>
                </p>

                <div class="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#EEDFC4]">
                  <p class="font-sans text-xs text-[#757575]/80 leading-snug line-clamp-2">
                    <template v-if="addon.items.length">
                      {{ offeredOn(addon) }}
                      <span v-if="addon.items.length > OFFERED_PREVIEW" class="inline-flex items-center justify-center bg-[#EDEDED] text-[#757575]/70 text-[8px] font-bold px-[5px] py-[2.5px] rounded-full ml-1 align-middle">+{{ addon.items.length - OFFERED_PREVIEW }}</span>
                    </template>
                    <template v-else>Not offered on any item</template>
                  </p>
                  <span
                    v-if="!addon.is_available"
                    class="shrink-0 text-[10px] font-extrabold uppercase tracking-wider text-[#9E7060] bg-[#EDEDED] rounded-full px-2 py-0.5"
                  >
                    Off
                  </span>
                </div>
              </button>
            </div>

            <p v-else-if="searchQuery.trim()" class="text-center text-sm text-[#7D5A50] py-20">
              No add-ons match "{{ searchQuery.trim() }}".
            </p>

            <EmptyState
              v-else
              title="No Add-ons Yet"
              message="Add extras like Oreo crumbles or an extra shot, then pick which drinks offer them."
              actionLabel="Add Add-on"
              icon="heroicons:plus-circle"
              @action="handleAddAction"
            />
          </template>
        </div>
      </div>
    </main>

    <AddonModal
      :show="isModalOpen"
      :addon="addonToEdit"
      @close="closeModal"
      @saved="fetchData"
    />
  </div>
</template>
