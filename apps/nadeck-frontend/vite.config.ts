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
    origin: 'https://nadeck.net',
    title: 'Купить пептиды с доставкой по Казахстану и СНГ &mdash; Nadeck',
    ogTitle: 'Купить пептиды с доставкой по Казахстану и СНГ',
    description: 'Пептиды и аминокислоты высочайшего качества для вашего здоровья и научного прогресса. Доставка по Казахстану и странам СНГ от 24 часов. Точный калькулятор дозировки.',
    ogLocale: 'ru_RU',
    siteName: 'nadeck.net',
  },
  ar: {
    lang: 'ar',
    origin: 'https://ar.nadeck.net',
    title: 'اشترِ الببتيدات مع التوصيل إلى كازاخستان ودول رابطة الدول المستقلة &mdash; Nadeck',
    ogTitle: 'اشترِ الببتيدات مع التوصيل إلى كازاخستان ودول رابطة الدول المستقلة',
    description: 'ببتيدات وأحماض أمينية بأعلى جودة لصحتك وتقدمك العلمي. التوصيل إلى كازاخستان ودول رابطة الدول المستقلة خلال 24 ساعة. حاسبة دقيقة للجرعات.',
    ogLocale: 'ar_AR',
    siteName: 'ar.nadeck.net',
  },
} as const;

function marketHtmlPlugin(): Plugin {
  const seo = SEO_BY_MARKET[process.env.VITE_MARKET === 'ar' ? 'ar' : 'main'];
  const canonicalUrl = `${seo.origin}/`;
  const ogImage = `${seo.origin}/og-image.png`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nadeck',
    url: canonicalUrl,
    logo: ogImage,
    description: seo.description,
  };

  return {
    name: 'market-html',
    transformIndexHtml(html) {
      return html
        .replace('<html lang="ru">', `<html lang="${seo.lang}">`)
        .replace(/<title>.*<\/title>/, `<title>${seo.title}</title>`)
        .replace(/name="description"(\s+)content="[^"]*"/, `name="description"$1content="${seo.description}"`)
        .replace(/rel="canonical" href="[^"]*"/, `rel="canonical" href="${canonicalUrl}"`)
        .replace(/property="og:url" content="[^"]*"/, `property="og:url" content="${canonicalUrl}"`)
        .replace(/property="og:locale" content="[^"]*"/, `property="og:locale" content="${seo.ogLocale}"`)
        .replace(/property="og:site_name" content="[^"]*"/, `property="og:site_name" content="${seo.siteName}"`)
        .replace(/property="og:title" content="[^"]*"/, `property="og:title" content="${seo.ogTitle}"`)
        .replace(/property="og:description"(\s+)content="[^"]*"/, `property="og:description"$1content="${seo.description}"`)
        .replace(/property="og:image" content="[^"]*"/, `property="og:image" content="${ogImage}"`)
        .replace(/name="twitter:title" content="[^"]*"/, `name="twitter:title" content="${seo.ogTitle}"`)
        .replace(/name="twitter:description"(\s+)content="[^"]*"/, `name="twitter:description"$1content="${seo.description}"`)
        .replace(/name="twitter:image" content="[^"]*"/, `name="twitter:image" content="${ogImage}"`)
        .replace(
          /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
          `<script type="application/ld+json">\n${JSON.stringify(structuredData, null, 2)}\n    </script>`,
        );
    },

    // robots.txt/sitemap.xml can't live in public/ - that directory is copied verbatim into both
    // market bundles, so ar.nadeck.net used to serve nadeck.net's sitemap (zero URLs of its own,
    // which is why Google had no way to discover the Arabic site at all).
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${seo.origin}/sitemap.xml\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${canonicalUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`,
      });
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
