<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <h2 class="title">POS QR Code</h2>
      <img :src="qrImage" alt="QR Code" class="qr-img" />
      <p class="url"><a :href="qr.url" target="_blank">{{ qr.url }}</a></p>

      <div class="actions">
        <button @click="printPdf" class="btn">Print PDF</button>
        <button @click="close" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, ref, watch, defineEmits } from 'vue';
import jsPDF from 'jspdf';

const emit = defineEmits(['close']);

const props = defineProps({
  qr: { type: Object, required: true },
});

const qrImage = ref('');
watch(
  () => props.qr,
  (newQr) => {
    if (newQr) qrImage.value = '/' + newQr.path; // storage symlink
  },
  { immediate: true }
);

function close() {
  emit('close');
}

function printPdf() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [400, 500],
  });
  doc.setFontSize(24);
  doc.text('POS QR Code', 200, 40, { align: 'center' });

  const img = new Image();
  img.src = qrImage.value;
  img.onload = () => {
    const w = 300;
    const h = 300;
    doc.addImage(img, 'PNG', 50, 80, w, h);
    doc.save('POS_QR_Code.pdf');
  };
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 340px;
  text-align: center;
}
.title { margin-bottom: 1rem; }
.qr-img { width: 250px; height: 250px; margin: 1rem 0; }
.actions { display: flex; gap: 0.5rem; justify-content: center; }
.btn { background: #7b5a50; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; }
.btn-secondary { background: #aaa; }
</style>
