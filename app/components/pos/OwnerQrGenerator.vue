<template>
  <div class="owner-qr">
    <button @click="generate" :disabled="loading">
      {{ loading ? 'Generating…' : 'Generate QR for POS' }}
    </button>
    <div v-if="qr" class="qr-result">
      <img :src="qrImage" alt="QR Code" />
      <p>URL: <a :href="qr.url" target="_blank">{{ qr.url }}</a></p>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue';
import axios from 'axios';

const loading = ref(false);
const qr = ref(null);
const qrImage = ref('');
const emit = defineEmits(['generated']);

async function generate() {
  loading.value = true;
  try {
    const res = await axios.post('/api/qr/generate');
    qr.value = res.data;
    qrImage.value = '/' + res.data.path; // public storage symlink
    emit('generated', res.data);
  } catch (e) {
    alert(e.response?.data?.msg || 'Error generating QR');
  }
  loading.value = false;
}
</script>

<style scoped>
.owner-qr { margin: 1rem; }
.qr-result img { width: 200px; height: 200px; }
</style>
