<!--index page-->
<script setup lang="ts">
import { getRedirectForRole } from '~/utils/roleRedirects';

const authStore = useAuthStore()

if (authStore.role) {
  await navigateTo(getRedirectForRole(authStore.role))
}
</script>

<template>
  <div />
</template>