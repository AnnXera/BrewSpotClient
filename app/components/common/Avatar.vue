<!-- app/components/common/Avatar.vue -->
<template>
  <div
    class="rounded-full flex items-center justify-center shrink-0 p-[10px]"
    :style="{ backgroundColor: avatarColor(index), width: `${size}px`, height: `${size}px` }"
  >
    <span class="font-display font-semibold tracking-[0.77%] text-[#FFF0D1]" :style="{ fontSize: `${fontSize}px` }">
      {{ initials }}
    </span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  // Preferred for detail views where first/last are already split
  firstname?: string | null
  lastname?: string | null
  // Preferred for list views where only a full name is available
  name?: string | null
  // Used to rotate through the palette in a list (row index)
  index?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  firstname: null,
  lastname: null,
  name: null,
  index: 0,
  size: 36,
})

const avatarColors = ['#B4846C', '#8B6656', '#5C3A28', '#2C1609', '#7D5A50']

function avatarColor(index: number) {
  return avatarColors[index % avatarColors.length]
}

const initials = computed(() => {
  if (props.firstname || props.lastname) {
    return `${props.firstname?.[0] ?? ''}${props.lastname?.[0] ?? ''}`.toUpperCase() || '?'
  }

  const parts = (props.name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (first + last).toUpperCase()
})

const fontSize = computed(() => Math.round(props.size * 0.4))
</script>