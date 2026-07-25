import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// index.html itself (title/meta/lang) is static markup shared by both market builds - without
// this it stays hardcoded to Russian even on the ar.nadeck.net bundle (visible in the browser
// tab before React mounts, and in what search engines/social previews see).
const SEO_BY_MARKET = {
  main: {
    lang: 'ru',
    title: 'Купить пептиды с доставкой по Казахстану и СНГ &mdash; Nadeck',
    ogTitle: 'Купить пептиды с доставкой по Казахстану и СНГ',
    description: 'Пептиды и аминокислоты высочайшего качества для вашего здоровья и научного прогресса. Доставка по Казахстану и странам СНГ от 24 часов. Точный калькулятор дозировки.',
    canonicalUrl: 'https://nadeck.net/',
    ogLocale: 'ru_RU',
    siteName: 'nadeck.net',
  },
  ar: {
    lang: 'ar',
    title: 'اشترِ الببتيدات مع التوصيل إلى كازاخستان ودول رابطة الدول المستقلة &mdash; Nadeck',
    ogTitle: 'اشترِ الببتيدات مع التوصيل إلى كازاخستان ودول رابطة الدول المستقلة',
    description: 'ببتيدات وأحماض أمينية بأعلى جودة لصحتك وتقدمك العلمي. التوصيل إلى كازاخستان ودول رابطة الدول المستقلة خلال 24 ساعة. حاسبة دقيقة للجرعات.',
    canonicalUrl: 'https://ar.nadeck.net/',
    ogLocale: 'ar_AR',
    siteName: 'ar.nadeck.net',
  },
} as const;

function marketHtmlPlugin(): Plugin {
  const seo = SEO_BY_MARKET[process.env.VITE_MARKET === 'ar' ? 'ar' : 'main'];
  return {
    name: 'market-html',
    transformIndexHtml(html) {
      return html
        .replace('<html lang="ru">', `<html lang="${seo.lang}">`)
        .replace(/<title>.*<\/title>/, `<title>${seo.title}</title>`)
        .replace(/name="description"(\s+)content="[^"]*"/, `name="description"$1content="${seo.description}"`)
        .replace(/rel="canonical" href="[^"]*"/, `rel="canonical" href="${seo.canonicalUrl}"`)
        .replace(/property="og:url" content="[^"]*"/, `property="og:url" content="${seo.canonicalUrl}"`)
        .replace(/property="og:locale" content="[^"]*"/, `property="og:locale" content="${seo.ogLocale}"`)
        .replace(/property="og:site_name" content="[^"]*"/, `property="og:site_name" content="${seo.siteName}"`)
        .replace(/property="og:title" content="[^"]*"/, `property="og:title" content="${seo.ogTitle}"`)
        .replace(/property="og:description"(\s+)content="[^"]*"/, `property="og:description"$1content="${seo.description}"`)
        .replace(/name="twitter:title" content="[^"]*"/, `name="twitter:title" content="${seo.ogTitle}"`)
        .replace(/name="twitter:description"(\s+)content="[^"]*"/, `name="twitter:description"$1content="${seo.description}"`);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), marketHtmlPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
