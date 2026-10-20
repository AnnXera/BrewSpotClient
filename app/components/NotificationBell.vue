<!--app/components/NotificationBell.vue-->
<script setup lang="ts">
import { useNotifications, type AppNotification } from '~/composables/useNotifications'

// 'sidebar': panel opens to the right, over the page content.
// 'topbar': panel spans the screen width under the mobile top bar.
withDefaults(defineProps<{
  placement?: 'sidebar' | 'topbar'
}>(), { placement: 'sidebar' })

const router = useRouter()
const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const buttonRef = ref<HTMLButtonElement | null>(null)

const badgeLabel = computed(() => (unreadCount.value > 9 ? '9+' : String(unreadCount.value)))
const buttonLabel = computed(() =>
  unreadCount.value ? `Notifications, ${unreadCount.value} unread` : 'Notifications'
)

function onDocumentClick(event: MouseEvent) {
  if (!rootRef.value?.contains(event.target as Node)) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    buttonRef.value?.focus()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
})

function openNotification(item: AppNotification) {
  markRead(item.id)
  if (item.to) {
    open.value = false
    router.push(item.to)
  }
}

function timeAgo(iso: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div ref="rootRef" class="relative shrink-0">
    <button
      ref="buttonRef"
      type="button"
      class="bell-button relative flex items-center justify-center rounded-lg transition-colors hover:bg-[#8B6656] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFF0D1]/70"
      :class="[
        placement === 'sidebar' ? 'w-10 h-10' : 'w-8 h-8',
        open ? 'bg-[#8B6656]' : ''
      ]"
      :aria-label="buttonLabel"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="open = !open"
    >
      <Icon
        :name="open ? 'heroicons:bell-solid' : 'heroicons:bell'"
        class="text-[#FFF0D1]"
        :class="[placement === 'sidebar' ? 'w-6 h-6' : 'w-[22px] h-[22px]', unreadCount ? 'bell-ring' : '']"
      />
      <span
        v-if="unreadCount"
        class="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#D9534F] ring-2 ring-[#7D5A50] flex items-center justify-center font-sans text-[10px] font-semibold leading-none text-white tabular-nums"
        aria-hidden="true"
      >
        {{ badgeLabel }}
      </span>
    </button>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-1"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        role="dialog"
        aria-label="Notifications"
        class="z-50 bg-[#FFFDF9] rounded-xl border border-[#EEDFC4] shadow-[0_12px_32px_-8px_rgba(59,31,14,0.28)] overflow-hidden flex flex-col"
        :class="placement === 'sidebar'
          ? 'absolute top-[calc(100%+8px)] left-0 w-[360px] max-h-[min(480px,calc(100vh-120px))]'
          : 'fixed top-[64px] left-4 right-4 max-h-[calc(100vh-80px)]'"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 px-4 h-12 border-b border-[#EEDFC4] shrink-0">
          <p class="font-display font-semibold text-base text-[#3B1F0E]">
            Notifications
            <span v-if="unreadCount" class="font-sans font-normal text-xs text-[#7D5A50] ml-1 tabular-nums">{{ unreadCount }} new</span>
          </p>
          <button
            type="button"
            class="font-sans text-xs font-medium text-[#7D5A50] hover:text-[#3B1F0E] disabled:text-[#3B1F0E]/30 disabled:cursor-not-allowed transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4846C]"
            :disabled="!unreadCount"
            @click="markAllRead"
          >
            Mark all as read
          </button>
        </div>

        <!-- List -->
        <ul v-if="notifications.length" class="flex-1 min-h-0 overflow-y-auto panel-scroll divide-y divide-[#F3E8D3]">
          <li v-for="item in notifications" :key="item.id">
            <button
              type="button"
              class="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#FBF2E1] focus-visible:outline-none focus-visible:bg-[#FBF2E1]"
              :class="item.read ? '' : 'bg-[#FFF7E8]'"
              @click="openNotification(item)"
            >
              <span class="w-8 h-8 rounded-full bg-[#F3E3C9] flex items-center justify-center shrink-0 mt-0.5">
                <Icon :name="`heroicons:${item.icon || 'bell'}`" class="w-4 h-4 text-[#7D5A50]" />
              </span>
              <span class="flex-1 min-w-0">
                <span
                  class="block font-sans text-sm text-[#3B1F0E] leading-snug"
                  :class="item.read ? 'font-normal' : 'font-semibold'"
                >
                  {{ item.title }}
                </span>
                <span v-if="item.body" class="block font-sans text-xs text-[#3B1F0E]/70 leading-snug mt-0.5 line-clamp-2">
                  {{ item.body }}
                </span>
                <span class="block font-sans text-[11px] text-[#7D5A50] mt-1 tabular-nums">{{ timeAgo(item.createdAt) }}</span>
              </span>
              <span v-if="!item.read" class="w-2 h-2 rounded-full bg-[#D9534F] shrink-0 mt-2" aria-label="Unread" />
            </button>
          </li>
        </ul>

        <!-- Empty -->
        <div v-else class="flex flex-col items-center text-center px-6 py-10">
          <span class="w-12 h-12 rounded-full bg-[#F3E3C9] flex items-center justify-center mb-3">
            <Icon name="heroicons:bell" class="w-6 h-6 text-[#7D5A50]" />
          </span>
          <p class="font-display font-semibold text-sm text-[#3B1F0E]">You're all caught up</p>
          <p class="font-sans text-xs text-[#3B1F0E]/70 mt-1 max-w-[220px]">New activity across your account will show up here.</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.panel-scroll {
  scrollbar-width: thin;
  scrollbar-color: #D8BFA0 transparent;
}

/* A single short swing when there is something unread, then still. */
.bell-ring {
  transform-origin: 50% 10%;
  animation: bell-ring 900ms cubic-bezier(0.16, 1, 0.3, 1) 1;
}
@keyframes bell-ring {
  0% { transform: rotate(0); }
  15% { transform: rotate(14deg); }
  30% { transform: rotate(-11deg); }
  45% { transform: rotate(7deg); }
  60% { transform: rotate(-4deg); }
  75% { transform: rotate(2deg); }
  100% { transform: rotate(0); }
}
@media (prefers-reduced-motion: reduce) {
  .bell-ring { animation: none; }
}
</style>
