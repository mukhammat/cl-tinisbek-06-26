import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

// Fills index.html's title/meta/canonical and emits robots.txt/sitemap.xml from one place, so
// the SEO copy and the site origin aren't repeated across the static files.
const SEO = {
  lang: 'ru',
  origin: 'https://nadeck.net',
  title: 'Купить пептиды с доставкой по Казахстану и СНГ &mdash; Nadeck',
  ogTitle: 'Купить пептиды с доставкой по Казахстану и СНГ',
  description: 'Пептиды и аминокислоты высочайшего качества для вашего здоровья и научного прогресса. Доставка по Казахстану и странам СНГ от 24 часов. Точный калькулятор дозировки.',
  ogLocale: 'ru_RU',
  siteName: 'nadeck.net',
} as const;

function seoHtmlPlugin(): Plugin {
  const seo = SEO;
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
    name: 'seo-html',
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

    // robots.txt/sitemap.xml are generated so they always name the same origin as the canonical URL.
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
    plugins: [react(), tailwindcss(), seoHtmlPlugin()],
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
