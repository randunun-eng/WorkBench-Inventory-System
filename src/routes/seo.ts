import { Hono } from 'hono'

const seo = new Hono<{ Bindings: any }>()

// --- helpers ---------------------------------------------------------------

// Escape text for use inside an HTML attribute (meta content) and collapse
// whitespace/newlines (datasheet descriptions are multi-line).
function escapeAttr(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\s+/g, ' ')
    .trim()
}

// Escape text for XML node content (sitemap URLs).
function escapeXml(s: any): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Serialize a JSON-LD object safely for embedding in a <script> tag.
function jsonLd(obj: any): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c')
}

// --- robots.txt ------------------------------------------------------------

seo.get('/robots.txt', (c) => {
  const origin = new URL(c.req.url).origin
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /auth/',
    'Disallow: /dashboard',
    'Disallow: /login',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')
  return c.text(body, 200, { 'Content-Type': 'text/plain; charset=utf-8' })
})

// --- sitemap.xml -----------------------------------------------------------

seo.get('/sitemap.xml', async (c) => {
  const origin = new URL(c.req.url).origin

  type Url = { loc: string; lastmod?: string; changefreq: string; priority: string }
  const urls: Url[] = [
    { loc: `${origin}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${origin}/join`, changefreq: 'monthly', priority: '0.5' },
  ]

  try {
    const products = await c.env.DB.prepare(
      `SELECT id, updated_at FROM catalog_items WHERE is_public = 1 ORDER BY updated_at DESC LIMIT 5000`
    ).all()

    for (const p of products.results || []) {
      // updated_at looks like "2025-11-29 16:25:55"; sitemaps want W3C date.
      const datePart = String((p as any).updated_at || '').split(' ')[0]
      const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : undefined
      urls.push({
        loc: `${origin}/product/${(p as any).id}`,
        lastmod,
        changefreq: 'weekly',
        priority: '0.8',
      })
    }
  } catch (e) {
    console.error('sitemap product query failed:', e)
  }

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n` +
          `    <loc>${escapeXml(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
          `    <changefreq>${u.changefreq}</changefreq>\n` +
          `    <priority>${u.priority}</priority>\n` +
          `  </url>`
      )
      .join('\n') +
    `\n</urlset>\n`

  return c.body(body, 200, { 'Content-Type': 'application/xml; charset=utf-8' })
})

// --- product pages: inject SEO meta + structured data ----------------------

// Intercept /product/:id so crawlers and social scrapers get per-product
// title/description/OpenGraph + Product structured data. The React app
// (BrowserRouter) renders the actual page client-side from the same HTML.
seo.get('/product/:id', async (c) => {
  const id = c.req.param('id')
  const origin = new URL(c.req.url).origin

  // Fetch from the shared catalog (the inventory_items table was replaced by
  // catalog_items + shop_inventory in migration 0007). Pull the lowest listed
  // price and total stock across shops for the Offer.
  const item = await c.env.DB.prepare(
    `SELECT
        c.name,
        c.description,
        c.primary_image_r2_key,
        (SELECT MIN(price) FROM shop_inventory WHERE catalog_item_id = c.id AND price IS NOT NULL) AS price,
        (SELECT currency FROM shop_inventory WHERE catalog_item_id = c.id AND price IS NOT NULL ORDER BY price ASC LIMIT 1) AS currency,
        (SELECT COALESCE(SUM(stock_qty), 0) FROM shop_inventory WHERE catalog_item_id = c.id) AS total_stock
     FROM catalog_items c
     WHERE c.id = ? AND c.is_public = 1`
  ).bind(id).first()

  // Fetch base index.html from ASSETS
  const indexUrl = new URL(c.req.url)
  indexUrl.pathname = '/index.html'
  const indexResponse = await c.env.ASSETS.fetch(indexUrl.toString())
  if (!indexResponse.ok) {
    return c.text('Failed to load application', 500)
  }
  let html = await indexResponse.text()

  if (item) {
    const name = String(item.name)
    const currency = (item.currency as string) || 'LKR'
    const rawDesc = item.description
      ? String(item.description)
      : `Buy ${name} in Sri Lanka. Check live stock and price at electronics shops on WorkBench.`
    const title = `${name} – Buy in Sri Lanka | WorkBench`
    const description = escapeAttr(rawDesc).substring(0, 200)
    const canonical = `${origin}/product/${id}`
    const image = item.primary_image_r2_key
      ? `https://pub-840623668b9b4097945d73500350720b.r2.dev/${item.primary_image_r2_key}`
      : `${origin}/og-image.png`

    // Product structured data
    const productLd: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description: rawDesc.replace(/\s+/g, ' ').trim().substring(0, 500),
      image,
      url: canonical,
      category: 'Electronic Components',
      areaServed: { '@type': 'Country', name: 'Sri Lanka' },
    }
    if (item.price != null) {
      productLd.offers = {
        '@type': 'Offer',
        price: Number(item.price),
        priceCurrency: currency,
        availability:
          Number(item.total_stock) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        url: canonical,
        areaServed: { '@type': 'Country', name: 'Sri Lanka' },
      }
    }

    const safeTitle = escapeAttr(title)

    // Override the homepage tags the static index.html declares so the product
    // page doesn't end up with duplicate/conflicting OG/Twitter values.
    html = html
      .replace(/<title>.*?<\/title>/, `<title>${safeTitle}</title>`)
      .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${description}" />`)
      .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="product" />`)
      .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${safeTitle}" />`)
      .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${description}" />`)
      .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${canonical}" />`)
      .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeAttr(image)}" />`)
      .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${safeTitle}" />`)
      .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${description}" />`)
      .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeAttr(image)}" />`)

    // Append product structured data (in addition to the site-level Store/WebSite graph)
    html = html.replace('</head>', `    <script type="application/ld+json">${jsonLd(productLd)}</script>\n  </head>`)
  }

  return c.html(html)
})

export default seo
