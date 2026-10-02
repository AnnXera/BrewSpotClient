<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import ItemBranchesPanel from '~/components/menu/ItemBranchesPanel.vue'
import ItemModal from '~/components/menu/ItemModal.vue'
import MenuBreadcrumbs from '~/components/menu/MenuBreadcrumbs.vue'

definePageMeta({
  role: 'Cafe Owner',
})

const links = [
  { label: 'Dashboard', to: '/owner/dashboard', icon: 'squares-2x2' },
  { label: 'Cafe Management', to: '/owner/cafes', icon: 'building-storefront' },
  { label: 'Menu Management', to: '/owner/menu-management', icon: 'book-open' },
  { label: 'Subscription', to: '/owner/subscription', icon: 'credit-card' },
]

const route = useRoute()
const menuService = useMenuService()

const itemUuid = computed(() => route.params.uuid as string)
// Set when the item was opened from a category page; otherwise it came from Menu Items.
const fromCategory = computed(() => (route.query.category as string | undefined) || null)

const item = ref<any | null>(null)
const categories = ref<any[]>([])
const isLoading = ref(true)
const errorMessage = ref('')
const isEditOpen = ref(false)
// Bumped after an edit so the branches panel reloads against the saved item.
const branchesKey = ref(0)

const breadcrumbs = computed(() => {
  const trail: { label: string; to?: string }[] = [
    { label: 'Menu Management', to: '/owner/menu-management' },
  ]

  if (fromCategory.value) {
    const categoryLabel = fromCategory.value === 'uncategorized'
      ? 'Uncategorized'
      : (item.value?.category_name || 'Category')
    trail.push({ label: categoryLabel, to: `/owner/menu-management/category/${fromCategory.value}` })
  } else {
    trail.push({ label: 'Menu Items', to: '/owner/menu-management/items' })
  }

  trail.push({ label: item.value?.menu_name || 'Item' })
  return trail
})

function formatPrice(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—'
  return `₱${Number(value).toFixed(2)}`
}

async function fetchItem() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const res = await menuService.getMenuItem(itemUuid.value)
    if (res.success && res.item) {
      item.value = res.item
    } else {
      errorMessage.value = res.message || 'Item not found.'
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.message || 'Failed to load item.'
  } finally {
    isLoading.value = false
  }
}

async function openEdit() {
  if (categories.value.length === 0) {
    try {
      const res = await menuService.getMenuCategories()
      categories.value = (res.categories as any)?.data || res.categories || []
    } catch (error) {
      console.error('Failed to fetch categories', error)
    }
  }
  isEditOpen.value = true
}

async function onItemSaved() {
  await fetchItem()
  branchesKey.value++
}

onMounted(fetchItem)
</script>

<template>
  <div class="flex flex-col md:flex-row min-h-screen bg-[#FFF8EA]">
    <NavBar :links="links" />
    <main class="flex-1 p-6 sm:p-8 lg:p-12 font-display min-w-0">
      <!-- Breadcrumbs -->
      <MenuBreadcrumbs :items="breadcrumbs" />

      <div v-if="isLoading" class="flex justify-center items-center py-16">
        <Icon name="heroicons:arrow-path" class="w-8 h-8 animate-spin text-[#7D5A50]" />
      </div>

      <div v-else-if="errorMessage" class="mt-4 bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 flex items-center gap-3">
        <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
        <span class="text-sm font-medium">{{ errorMessage }}</span>
        <button class="ml-auto text-sm font-bold underline hover:text-red-900" @click="fetchItem">Retry</button>
      </div>

      <template v-else-if="item">
        <!-- Title + Edit -->
        <div class="mt-3 flex flex-wrap items-center justify-between gap-4">
          <h1 class="text-[28px] sm:text-[36px] leading-[39px] font-bold text-[#3D2B24] break-words min-w-0">
            {{ item.menu_name }}
          </h1>
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-3 rounded-[10px] border border-[#7D5A50] text-sm font-semibold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors shrink-0"
            @click="openEdit"
          >
            <img src="/images/edit-item.svg" alt="" width="16" height="16" />
            Edit Item
          </button>
        </div>

        <div class="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
          <!-- Item Information -->
          <section class="bg-white border border-[#F4E6DE] rounded-2xl p-6 flex flex-col gap-5">
            <h2 class="text-2xl font-bold text-[#3D2B24]">Item Information</h2>

            <div class="flex flex-col gap-3">
              <div class="flex flex-col sm:flex-row items-start gap-4">
                <img
                  v-if="item.picture"
                  :src="item.picture"
                  :alt="item.menu_name"
                  class="w-full sm:w-[212px] h-[137px] rounded-md object-cover shrink-0"
                />
                <div v-else class="w-full sm:w-[212px] h-[137px] rounded-md bg-[#FBF2E1] flex items-center justify-center shrink-0">
                  <Icon name="heroicons:photo" class="w-10 h-10 text-[#B4846C]/50" />
                </div>

                <div class="flex-1 min-w-0 w-full flex flex-col gap-3">
                  <div class="flex flex-col gap-1">
                    <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Item Name</p>
                    <p class="text-base font-medium text-[#3D2B24] break-words">{{ item.menu_name }}</p>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="flex flex-col gap-1 min-w-0">
                      <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Category</p>
                      <p class="text-base font-medium text-[#3D2B24] break-words">{{ item.category_name || 'Uncategorized' }}</p>
                    </div>
                    <div class="flex flex-col gap-1">
                      <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Price</p>
                      <p class="text-base font-medium text-[#3D2B24]">{{ formatPrice(item.base_price) }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-1">
                <p class="text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">Description</p>
                <p class="text-base font-medium text-[#3D2B24] break-words">{{ item.description || 'No description provided' }}</p>
              </div>
            </div>
          </section>

          <!-- Branches -->
          <ItemBranchesPanel :key="branchesKey" :item-uuid="itemUuid" />
        </div>

        <!-- Recipe -->
        <section class="mt-5 bg-white border border-[#F4E6DE] rounded-2xl p-6 flex flex-col gap-5">
          <h2 class="text-2xl font-bold text-[#3D2B24]">Recipe</h2>

          <div v-if="item.recipes?.length" class="flex flex-col">
            <div class="flex items-center justify-between gap-4 py-3 text-sm font-bold text-[#9E7060] uppercase tracking-[0.1px]">
              <p>Name</p>
              <div class="flex items-center shrink-0 w-[180px] sm:w-[249px] text-center">
                <p class="flex-1">Quantity</p>
                <p class="w-[95px]">Unit</p>
              </div>
            </div>
            <hr class="border-t border-[#EDD8CC]" />
            <div
              v-for="recipe in item.recipes"
              :key="recipe.uuid"
              class="flex items-center justify-between gap-4 py-3 text-base font-medium text-[#3D2B24]"
            >
              <p class="min-w-0 break-words">{{ recipe.ingredient_name }}</p>
              <div class="flex items-center shrink-0 w-[180px] sm:w-[249px] text-center">
                <p class="flex-1">{{ Number(recipe.quantity) }}</p>
                <p class="w-[95px]">{{ recipe.unit }}</p>
              </div>
            </div>
          </div>

          <p v-else class="text-sm text-[#9E7060]">No recipe added for this item.</p>
        </section>
      </template>
    </main>

    <ItemModal
      :show="isEditOpen"
      :item="item"
      :categories="categories"
      @close="isEditOpen = false"
      @saved="onItemSaved"
    />
  </div>
</template>
