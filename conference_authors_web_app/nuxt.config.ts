export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {}
    }
  },
  // Portal pages require client-side Auth state (Supabase session is in the browser).
  // Disabling SSR for /portal/** prevents Hydration Mismatches and tab-switch data-load issues.
  routeRules: {
    '/portal/**': { ssr: false },
    '/auth/**':   { ssr: false },
  },
  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    }
  },
  app: {
    head: {
      title: 'BRICC Festival 2026 — The 9th Buriram Rajabhat Conference',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'ระบบจัดการบทความสำหรับผู้เขียน BRICC Festival 2026' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&family=Sarabun:wght@300;400;500;600;700;800&display=swap'
        }
      ]
    }
  }
});

