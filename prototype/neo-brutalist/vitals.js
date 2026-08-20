/* E6：轻量 Web Vitals —— 仅用 PerformanceObserver，无外部依赖、无 PII。
   默认输出到控制台；如需上报分析后端，在此处接上报逻辑即可。 */
(function () {
  'use strict';
  if (!('PerformanceObserver' in window)) return;
  try {
    var v = { lcp: null, cls: 0 };
    var po = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (e) {
        if (e.entryType === 'largest-contentful-paint') {
          v.lcp = e.renderTime || e.loadTime;
        } else if (e.entryType === 'layout-shift' && !e.hadRecentInput) {
          v.cls += e.value;
        }
      });
    });
    po.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
    window.addEventListener('load', function () {
      setTimeout(function () {
        var lcp = v.lcp ? Math.round(v.lcp) + 'ms' : 'n/a';
        console.info('[WebVitals] LCP=' + lcp + ' CLS=' + v.cls.toFixed(3));
      }, 1000);
    });
  } catch (e) { /* 忽略不支持的环境 */ }
})();
