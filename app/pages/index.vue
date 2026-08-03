<!--index page-->
<script setup lang="ts">
import { getRedirectForRole } from '~/utils/roleRedirects';

const authStore = useAuthStore()
const userRole = useCookie<string | null>('user_role')
const role = authStore.role || userRole.value

if (role) {
  await navigateTo(getRedirectForRole(role))
} else {
  await navigateTo('/login')
}
</script>

<template>
  <div />
</template>