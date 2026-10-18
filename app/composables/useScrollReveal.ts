// app/composables/useScrollReveal.ts
import { nextTick, onMounted, onUnmounted, type Ref, watch } from 'vue'

export function useScrollReveal(triggerData?: Ref<any>) {
  if (import.meta.server) return

  let observer: IntersectionObserver | null = null

  function scanAndObserve() {
    if (typeof window === 'undefined') return
    const elements = document.querySelectorAll<HTMLElement>('.scroll-reveal:not(.is-visible)')
    if (!elements.length) return

    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible')
              observer?.unobserve(entry.target)
            }
          })
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -40px 0px',
        }
      )
    }

    const windowHeight = window.innerHeight || document.documentElement.clientHeight

    elements.forEach((el) => {
      const rect = el.getBoundingClientRect()
      // If the top of the element is already visible inside the viewport on initial load
      if (rect.top <= windowHeight * 0.92 && rect.bottom >= 0) {
        el.classList.add('is-visible')
      } else {
        observer?.observe(el)
      }
    })
  }

  onMounted(() => {
    nextTick(() => {
      setTimeout(scanAndObserve, 80)
    })
  })

  if (triggerData) {
    watch(triggerData, () => {
      nextTick(() => {
        setTimeout(scanAndObserve, 80)
      })
    })
  }

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return {
    scanAndObserve,
  }
}
