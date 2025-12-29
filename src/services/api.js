// MODULAR API ARCHITECTURE - Aggregation Layer

import { authService } from './authService.js'
import { userService } from './userService.js'
import { subscriptionService } from './subscriptionService.js'
import { adminService } from './adminService.js'
import { dashboardService } from './dashboardService.js'
import { archiveService } from './archiveService.js'
import { paymentService } from './paymentService.js'
import { generalService } from './generalService.js'
import { apiInterceptor } from './apiInterceptor.js'

// Unified API object (maintains backward compatibility)
const api = {
  auth: authService,
  user: userService,
  subscriptions: subscriptionService,
  dashboard: dashboardService,
  admin: adminService,
  archive: archiveService,
  payment: paymentService,
  general: generalService
}

export { apiInterceptor };

export default api
