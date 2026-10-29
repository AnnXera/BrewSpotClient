<script setup lang="ts">
import { useMenuService } from '~/composables/useMenuService'
import ItemBranchesPanel from '~/components/menu/ItemBranchesPanel.vue'
import ItemModal from '~/components/menu/ItemModal.vue'
import MenuBreadcrumbs from '~/components/menu/MenuBreadcrumbs.vue'
import { formatQuantity } from '~/utils/fraction'

definePageMeta({
  role: 'Cafe Owner',
})

const links = OWNER_NAV_LINKS

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

function formatAmount(recipe: any) {
  return `${formatQuantity(recipe.quantity, 0.01) || Number(recipe.quantity)} ${recipe.unit}`
}

// One row per ingredient. A row with no size is used by every size, so it
// spans all the size columns; otherwise each size shows its own amount.
const recipeRows = computed(() => {
  type RecipeRow = { name: string; all: any | null; bySize: Record<string, any> }
  const rows = new Map<string, RecipeRow>()
  for (const recipe of item.value?.recipes ?? []) {
    const key = recipe.ingredient_uuid ?? recipe.ingredient_name.toLowerCase()
    const row: RecipeRow = rows.get(key) ?? { name: recipe.ingredient_name, all: null, bySize: {} }
    if (recipe.size_uuid) row.bySize[recipe.size_uuid] = recipe
    else row.all = recipe
    rows.set(key, row)
  }
  return [...rows.values()]
})

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
        <!-- Header: what the item is -->
        <header class="mt-5 flex flex-col sm:flex-row gap-5 sm:gap-6">
          <img
            v-if="item.picture"
            :src="item.picture"
            :alt="item.menu_name"
            class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl object-cover shrink-0 border border-[#F4E6DE]"
          />
          <div v-else class="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl bg-[#FBF2E1] border border-[#F4E6DE] flex items-center justify-center shrink-0">
            <Icon name="heroicons:photo" class="w-10 h-10 text-[#B4846C]/50" />
          </div>

          <div class="flex-1 min-w-0 flex flex-col gap-3">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="min-w-0">
                <h1 class="text-[28px] sm:text-[36px] leading-tight font-bold text-[#3D2B24] break-words">
                  {{ item.menu_name }}
                </h1>
                <div class="mt-2 flex flex-wrap items-center gap-2 font-sans text-sm">
                  <span class="inline-flex items-center rounded-full bg-[#FBF2E1] px-3 py-1 font-semibold text-[#7D5A50]">
                    {{ item.category_name || 'Uncategorized' }}
                  </span>
                  <span v-if="item.sizes?.length" class="inline-flex items-center rounded-full border border-[#EEDFC4] px-3 py-1 font-medium text-[#7D5A50]">
                    {{ item.sizes.length }} sizes
                  </span>
                  <span v-if="item.is_hot_and_iced" class="inline-flex items-center rounded-full border border-[#EEDFC4] px-3 py-1 font-medium text-[#7D5A50]">
                    Hot and iced
                  </span>
                  <span v-if="!item.is_available" class="inline-flex items-center rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
                    Unavailable
                  </span>
                </div>
              </div>
              <button
                type="button"
                class="inline-flex items-center gap-2 px-4 py-3 rounded-[10px] border border-[#7D5A50] text-sm font-semibold text-[#7D5A50] hover:bg-[#FBF2E1] transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7D5A50]"
                @click="openEdit"
              >
                <img src="/images/edit-item.svg" alt="" width="16" height="16" />
                Edit Item
              </button>
            </div>
            <p :class="['font-sans text-base max-w-[65ch] break-words', item.description ? 'text-[#3D2B24]' : 'text-[#9E7060]']">
              {{ item.description || 'No description provided' }}
            </p>
          </div>
        </header>

        <div class="mt-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <!-- Main column: what it sells for and what goes into it -->
          <div class="flex flex-col gap-5 min-w-0">

            <!-- Pricing -->
            <section class="bg-white border border-[#F4E6DE] rounded-2xl p-6" aria-labelledby="pricing-title">
              <h2 id="pricing-title" class="text-xl font-bold text-[#3D2B24]">Pricing</h2>

              <!-- One price -->
              <p v-if="!item.sizes?.length && !item.is_hot_and_iced" class="mt-3 text-[28px] font-bold text-[#3D2B24] tabular-nums">
                {{ formatPrice(item.base_price) }}
              </p>

              <!-- Hot and iced, no sizes -->
              <dl v-else-if="!item.sizes?.length" class="mt-4 grid grid-cols-2 sm:grid-cols-[repeat(2,minmax(0,12rem))] gap-3">
                <div class="rounded-xl bg-[#FDF8F3] border border-[#F4E6DE] px-4 py-3">
                  <dt class="font-sans text-sm font-semibold text-[#9E7060]">Hot</dt>
                  <dd class="text-2xl font-bold text-[#3D2B24] tabular-nums">{{ formatPrice(item.base_price) }}</dd>
                </div>
                <div class="rounded-xl bg-[#FDF8F3] border border-[#F4E6DE] px-4 py-3">
                  <dt class="font-sans text-sm font-semibold text-[#9E7060]">Iced</dt>
                  <dd class="text-2xl font-bold text-[#3D2B24] tabular-nums">{{ formatPrice(item.iced_price) }}</dd>
                </div>
              </dl>

              <!-- Per size -->
              <div v-else class="mt-3 overflow-x-auto">
                <table class="w-full font-sans text-left">
                  <thead>
                    <tr class="border-b border-[#EDD8CC]">
                      <th scope="col" class="py-3 pr-4 text-xs font-bold text-[#9E7060] uppercase tracking-wider">Size</th>
                      <th scope="col" class="py-3 pr-4 text-xs font-bold text-[#9E7060] uppercase tracking-wider">{{ item.is_hot_and_iced ? 'Hot' : 'Price' }}</th>
                      <th v-if="item.is_hot_and_iced" scope="col" class="py-3 text-xs font-bold text-[#9E7060] uppercase tracking-wider">Iced</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#F6EBDD]">
                    <tr v-for="size in item.sizes" :key="size.uuid" class="text-base text-[#3D2B24]">
                      <th scope="row" class="py-3 pr-4 font-semibold">{{ size.name }}</th>
                      <td class="py-3 pr-4 tabular-nums">{{ formatPrice(size.price) }}</td>
                      <td v-if="item.is_hot_and_iced" class="py-3 tabular-nums">{{ formatPrice(size.iced_price) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Recipe -->
            <section class="bg-white border border-[#F4E6DE] rounded-2xl p-6" aria-labelledby="recipe-title">
              <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="recipe-title" class="text-xl font-bold text-[#3D2B24]">Recipe</h2>
                <p class="font-sans text-sm text-[#9E7060]">
                  One serving<template v-if="item.is_hot_and_iced">, hot or iced</template>
                </p>
              </div>

              <div v-if="recipeRows.length" class="mt-3 overflow-x-auto">
                <table class="w-full font-sans text-left">
                  <thead>
                    <tr class="border-b border-[#EDD8CC]">
                      <th scope="col" class="py-3 pr-4 text-xs font-bold text-[#9E7060] uppercase tracking-wider">Ingredient</th>
                      <template v-if="item.sizes?.length">
                        <th v-for="size in item.sizes" :key="size.uuid" scope="col" class="py-3 pr-4 text-xs font-bold text-[#9E7060] uppercase tracking-wider whitespace-nowrap">{{ size.name }}</th>
                      </template>
                      <th v-else scope="col" class="py-3 text-xs font-bold text-[#9E7060] uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-[#F6EBDD]">
                    <tr v-for="row in recipeRows" :key="row.name" class="text-base text-[#3D2B24]">
                      <th scope="row" class="py-3 pr-4 font-semibold break-words">{{ row.name }}</th>
                      <template v-if="item.sizes?.length">
                        <!-- Same amount for every size: one cell across the size columns -->
                        <td v-if="row.all" :colspan="item.sizes.length" class="py-3 pr-4 tabular-nums">
                          {{ formatAmount(row.all) }}
                          <span class="ml-1 text-sm text-[#9E7060]">all sizes</span>
                        </td>
                        <template v-else>
                          <td v-for="size in item.sizes" :key="size.uuid" class="py-3 pr-4 tabular-nums whitespace-nowrap">
                            {{ row.bySize[size.uuid] ? formatAmount(row.bySize[size.uuid]) : '—' }}
                          </td>
                        </template>
                      </template>
                      <td v-else class="py-3 tabular-nums">{{ row.all ? formatAmount(row.all) : '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p v-else class="mt-3 font-sans text-sm text-[#9E7060]">No recipe added for this item.</p>
            </section>

            <!-- Add-ons -->
            <section class="bg-white border border-[#F4E6DE] rounded-2xl p-6" aria-labelledby="addons-title">
              <h2 id="addons-title" class="text-xl font-bold text-[#3D2B24]">Add-ons</h2>
              <ul v-if="item.addons?.length" class="mt-4 flex flex-wrap gap-2 font-sans">
                <li
                  v-for="addon in item.addons"
                  :key="addon.uuid"
                  class="inline-flex items-center gap-2 rounded-xl border border-[#EEDFC4] bg-[#FDF8F3] px-3.5 py-2 text-sm font-semibold text-[#3D2B24]"
                >
                  {{ addon.name }}
                  <span class="text-[#B4846C] tabular-nums">+{{ formatPrice(addon.price) }}</span>
                  <span v-if="!addon.is_available" class="text-xs font-normal text-[#9E7060]">(off)</span>
                </li>
              </ul>
              <p v-else class="mt-3 font-sans text-sm text-[#9E7060]">No add-ons. Pick them with Edit Item.</p>
            </section>
          </div>

          <!-- Side column: where it is sold -->
          <div class="lg:sticky lg:top-6">
            <ItemBranchesPanel :key="branchesKey" :item-uuid="itemUuid" />
          </div>
        </div>
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
