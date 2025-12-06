<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="show" class="shared-modal-overlay" @click="handleOverlayClick">
        <div class="shared-modal" @click.stop>
          <div class="shared-modal-header">
            <h3>{{ title }}</h3>
            <button class="shared-modal-close" aria-label="إغلاق" @click="close">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="shared-modal-body">
            <slot></slot>
          </div>

          <div v-if="$slots.footer" class="shared-modal-footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Modal Title'
  },
  closable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'update:show'])

const close = () => {
  if (props.closable) {
    emit('update:show', false)
    emit('close')
  }
}

const handleOverlayClick = () => {
  if (props.closable) {
    close()
  }
}
</script>

<style scoped>
/* Modal styles are in main.css */
</style>