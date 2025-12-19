<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="show" class="shared-modal-overlay" @click="handleOverlayClick">
        <div class="shared-modal" @click.stop>
          <div class="shared-modal-header">
            <h3>{{ title }}</h3>
            <button class="shared-modal-close btn btn--icon" aria-label="إغلاق" @click="close">
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
.shared-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-modal);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
  transition: opacity 0.3s ease;
}

.shared-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0,0,0,0.2);
  transition: transform 0.3s ease;
  transform: scale(0.95);
}

.shared-modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--gray-100);
}

.shared-modal-header h3 {
  margin: 0;
  color: var(--primary);
  font-size: 1.3rem;
}

.shared-modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--gray-600);
}

.shared-modal-body { 
  padding: 20px; 
}

.shared-modal-footer { 
  padding: 20px; 
  border-top: 1px solid #eee; 
  text-align: right; 
  background: var(--gray-50);
}

/* Vue Transition classes */
.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-to, .modal-leave-from {
  opacity: 1;
}

.modal-enter-active .shared-modal,
.modal-leave-active .shared-modal {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.modal-enter-from .shared-modal,
.modal-leave-to .shared-modal {
  transform: scale(0.9) translateY(10px);
}
</style>