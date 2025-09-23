// ========== مدير الأداء والمراقبة ========== //

// قياس الأداء
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoad: null,
      apiRequests: [],
      domOperations: [],
      renderTimes: [],
      memoryUsage: [],
      navigationTiming: {}
    };
    this.thresholds = {
      apiResponseTime: 2000, // 2 ثواني
      renderTime: 100, // 100 ميلي ثانية
      memoryUsage: 50 * 1024 * 1024, // 50 ميجابايت
      firstPaint: 1000, // 1 ثانية
      interactiveTime: 3000 // 3 ثواني
    };
    this.initialize();
  }

  // التهيئة
  initialize() {
    // قياس وقت تحميل الصفحة
    window.addEventListener('load', () => {
      this.measurePageLoad();
    });

    // قياس عمليات DOM
    const observer = new MutationObserver((mutations) => {
      const startTime = performance.now();

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.metrics.domOperations.push({
            type: 'dom-insert',
            nodeCount: mutation.addedNodes.length,
            timestamp: Date.now()
          });
        }
      });

      const endTime = performance.now();
      this.metrics.renderTimes.push({
        duration: endTime - startTime,
        timestamp: Date.now()
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // قياس استخدام الذاكرة
    if (window.performance && window.performance.memory) {
      setInterval(() => {
        const memory = window.performance.memory;
        this.metrics.memoryUsage.push({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });

        // التحقق من استخدام الذاكرة
        if (memory.usedJSHeapSize > this.thresholds.memoryUsage) {
          this.logPerformanceError('memory_usage', memory.usedJSHeapSize, this.thresholds.memoryUsage);
        }
      }, 5000); // كل 5 ثواني
    }

    // قياس وقت التفاعل
    window.addEventListener('click', () => {
      const now = performance.now();
      if (this.metrics.navigationTiming.firstContentfulPaint) {
        const interactionTime = now - this.metrics.navigationTiming.firstContentfulPaint;

        if (interactionTime > this.thresholds.interactiveTime) {
          this.logPerformanceError('interaction_time', interactionTime, this.thresholds.interactiveTime);
        }
      }
    });
  }

  // قياس وقت تحميل الصفحة
  measurePageLoad() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');

    this.metrics.navigationTiming = {
      domainLookupEnd: navigation.domainLookupEnd - navigation.domainLookupStart,
      connectEnd: navigation.connectEnd - navigation.connectStart,
      domInteractive: navigation.domInteractive - navigation.fetchStart,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      loadEventEnd: navigation.loadEventEnd - navigation.fetchStart
    };

    // التحقق من عتبات الأداء
    if (this.metrics.navigationTiming.firstContentfulPaint > this.thresholds.firstPaint) {
      this.logPerformanceError('first_paint', this.metrics.navigationTiming.firstContentfulPaint, this.thresholds.firstPaint);
    }

    if (this.metrics.navigationTiming.loadEventEnd > this.thresholds.apiResponseTime) {
      this.logPerformanceError('page_load', this.metrics.navigationTiming.loadEventEnd, this.thresholds.apiResponseTime);
    }
  }

  // تسجيل طلب API
  trackApiRequest(endpoint, startTime, endTime, success = true) {
    const duration = endTime - startTime;

    this.metrics.apiRequests.push({
      endpoint,
      duration,
      success,
      timestamp: Date.now()
    });

    // التحقق من عتبات الأداء
    if (duration > this.thresholds.apiResponseTime) {
      this.logPerformanceError('api_response', duration, this.thresholds.apiResponseTime, { endpoint });
    }
  }

  // تسجيل عملية عرض
  trackRender(component, startTime, endTime) {
    const duration = endTime - startTime;

    this.metrics.renderTimes.push({
      component,
      duration,
      timestamp: Date.now()
    });

    // التحقق من عتبات الأداء
    if (duration > this.thresholds.renderTime) {
      this.logPerformanceError('render_time', duration, this.thresholds.renderTime, { component });
    }
  }

  // تسجيل خطأ في الأداء
  async logPerformanceError(metric, value, threshold, context = {}) {
    const error = new Error(`مشكلة في الأداء: ${metric}`);
    await logPerformanceError(metric, value, threshold, context);
  }

  // الحصول على إحصائيات الأداء
  getStats() {
    const stats = {
      apiRequests: {
        count: this.metrics.apiRequests.length,
        average: this.metrics.apiRequests.reduce((sum, req) => sum + req.duration, 0) / this.metrics.apiRequests.length || 0,
        max: Math.max(...this.metrics.apiRequests.map(req => req.duration), 0),
        min: Math.min(...this.metrics.apiRequests.map(req => req.duration), 0)
      },
      domOperations: {
        count: this.metrics.domOperations.length
      },
      renderTimes: {
        count: this.metrics.renderTimes.length,
        average: this.metrics.renderTimes.reduce((sum, render) => sum + render.duration, 0) / this.metrics.renderTimes.length || 0,
        max: Math.max(...this.metrics.renderTimes.map(render => render.duration), 0),
        min: Math.min(...this.metrics.renderTimes.map(render => render.duration), 0)
      },
      memoryUsage: {
        current: this.metrics.memoryUsage.length > 0 ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1].used : 0,
        average: this.metrics.memoryUsage.reduce((sum, mem) => sum + mem.used, 0) / this.metrics.memoryUsage.length || 0,
        max: Math.max(...this.metrics.memoryUsage.map(mem => mem.used), 0)
      },
      navigationTiming: this.metrics.navigationTiming
    };

    return stats;
  }

  // تصدير تقرير الأداء
  exportReport() {
    const stats = this.getStats();
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      thresholds: this.thresholds,
      metrics: this.metrics
    };

    // تحويل التقرير إلى نص JSON
    const reportContent = JSON.stringify(report, null, 2);

    // إنشاء تنزيل للتقرير
    const blob = new Blob([reportContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return report;
  }
}

// إنشاء مثيل من مدير الأداء
const performanceMonitor = new PerformanceMonitor();

// نظام تتبع الأحداث
class EventTracker {
  constructor() {
    this.events = [];
    this.maxEvents = 1000; // الحد الأقصى لعدد الأحداث المحفوظة
  }

  // تسجيل حدث
  trackEvent(eventName, data = {}) {
    const event = {
      name: eventName,
      data: data,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    this.events.push(event);

    // الحفاظ على الحد الأقصى لعدد الأحداث
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    return event;
  }

  // الحصول على الأحداث
  getEvents(filter = {}) {
    let filteredEvents = [...this.events];

    // تطبيق الفلاتر
    if (filter.name) {
      filteredEvents = filteredEvents.filter(event => event.name === filter.name);
    }

    if (filter.from) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= filter.from);
    }

    if (filter.to) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= filter.to);
    }

    return filteredEvents;
  }

  // تصدير الأحداث
  exportEvents() {
    const eventsContent = JSON.stringify(this.events, null, 2);

    // إنشاء تنزيل للأحداث
    const blob = new Blob([eventsContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return this.events;
  }
}

// إنشاء مثيل من تتبع الأحداث
const eventTracker = new EventTracker();

// تصدير وحدات المراقبة
window.PerformanceMonitor = {
  monitor: performanceMonitor,
  eventTracker: eventTracker
};

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // تتبع تحميل الموارد
  window.addEventListener('load', () => {
    const resources = performance.getEntriesByType('resource');

    resources.forEach(resource => {
      eventTracker.trackEvent('resource_loaded', {
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize
      });
    });
  });

  // تتبع الأخطاء
  window.addEventListener('error', (event) => {
    eventTracker.trackEvent('error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });

  // تتبع الأحداث غير الملتقمة
  window.addEventListener('unhandledrejection', (event) => {
    eventTracker.trackEvent('promise_rejection', {
      reason: event.reason?.message || String(event.reason),
      stack: event.reason?.stack
    });
  });
});
