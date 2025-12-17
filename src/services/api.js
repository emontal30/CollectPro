// MODULAR API ARCHITECTURE - Aggregation Layer
// This file maintains backward compatibility while providing modular structure

import { authService } from './authService.js'
import { userService } from './userService.js'
import { subscriptionService } from './subscriptionService.js'
import { adminService } from './adminService.js'
import { dashboardService } from './dashboardService.js'
import { archiveService } from './archiveService.js'
import { paymentService } from './paymentService.js'
import { generalService } from './generalService.js'

// Export the simplified API interceptor
export { 
  apiInterceptor
} from './apiInterceptor.js'

// Export individual services for direct access
export {
  authService,
  userService,
  subscriptionService,
  adminService,
  dashboardService,
  archiveService,
  paymentService,
  generalService
}

// Legacy compatibility - maintain original API structure
export const auth = authService
export const user = userService
export const subscriptions = subscriptionService
export const admin = adminService

export const dashboard = dashboardService
export const archive = archiveService
export const payment = paymentService
export const general = generalService

// Export supabase client for direct access
export { supabase } from '@/supabase.js'

// Unified API object (maintains backward compatibility)
const api = {
  auth,
  user,
  subscriptions,
  dashboard,
  admin,
  archive,
  payment,
  general
}

export default api