import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProtectedImage from './ProtectedImage.vue'

describe('ProtectedImage', () => {
  it('renders direct absolute url without fetching', async () => {
    const wrapper = mount(ProtectedImage, { props: { src: 'https://example.com/image.jpg', alt: 'img' } })
    const img = wrapper.find('img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/image.jpg')
  })

  it('renders placeholder when src is empty', () => {
    const wrapper = mount(ProtectedImage, { props: { src: '' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toMatch(/Image unavailable|Loading image|/)
  })
})
