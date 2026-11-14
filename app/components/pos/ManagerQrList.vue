<template>
  <div class="manager-qr-list">
    <h3>Generated QR Codes</h3>
    <table v-if="codes.length">
      <thead>
        <tr><th>Owner</th><th>URL</th><th>QR</th></tr>
      </thead>
      <tbody>
        <tr v-for="c in codes" :key="c.id">
          <td>{{ c.owner.firstname }} {{ c.owner.lastname }}</td>
          <td><a :href="c.url" target="_blank">{{ c.url }}</a></td>
          <td><img :src="'/' + c.path" alt="QR" width="100"/></td>
        </tr>
      </tbody>
    </table>
    <p v-else>No QR codes yet.</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const codes = ref([]);

onMounted(async () => {
  const res = await axios.get('/api/qr');
  codes.value = res.data;
});
</script>

<style scoped>
.manager-qr-list table { width: 100%; border-collapse: collapse; }
.manager-qr-list th, .manager-qr-list td { border: 1px solid #ccc; padding: 0.5rem; }
</style>
