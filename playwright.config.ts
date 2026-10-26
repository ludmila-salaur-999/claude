import { defineConfig } from '@playwright/test';

export default defineConfig({

  timeout: 300 * 1000,

  // Можно комбинировать несколько репортеров (например, понятный 'list' для консоли и детальный 'html')
  reporter: [
    ['list'],
    ['html', { 
      outputFolder: 'playwright-report', // Название папки для отчетов (по умолчанию: playwright-report)
      open: 'always'                      // Варианты: 'always', 'never', 'on-failure' (по умолчанию)
    }]
  ]
});
