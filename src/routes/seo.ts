import { Hono } from 'hono'

const seo = new Hono<{ Bindings: any }>()

// This endpoint simulates serving the product page with SEO tags
// In a real deployment, this would likely intercept the route for the frontend
// Intercept /product/:id
seo.get('/product/:id', async (c) => {
  const id = c.req.param('id')

  // 1. Fetch Product Details
  const item = await c.env.DB.prepare(`
        SELECT name, description, primary_image_r2_key, price, currency 
        FROM inventory_items WHERE id = ?
    `).bind(id).first()

  if (!item) {
    // If product not found, let the frontend handle the 404 by serving the default index.html
    // or return a 404 page directly. For SPA, usually better to serve index.html and let React show "Not Found".
    // But for SEO, a 404 status is better.
    // Let's try to serve index.html but with 404 status if possible, or just fall through.
    // For now, let's return text to be clear, or fall through to next handler?
    // Hono doesn't easily "fall through" from a matched route unless we call next(), but we are in a sub-app.
    // Let's just return 404 text for bots, and redirect humans?
    // Actually, best to just serve index.html without injection.
    // We can fetch index.html and serve it.
  }

  // 2. Fetch the base index.html from ASSETS
  // We construct a request to the root URL to get index.html
  const indexUrl = new URL(c.req.url)
  indexUrl.pathname = '/index.html'
  const indexResponse = await c.env.ASSETS.fetch(indexUrl.toString())

  if (!indexResponse.ok) {
    return c.text('Failed to load application', 500)
  }

  let html = await indexResponse.text()

  // 3. Construct Meta Tags
  if (item) {
    const title = `${item.name} | WorkBench`
    const description = item.description ? item.description.substring(0, 160) : `Buy ${item.name} on WorkBench`
    // Use a public R2 URL or a worker proxy URL for the image
    // Assuming we have a public domain for images or using the worker to serve them
    // For this demo, we'll assume a placeholder or the presigned URL pattern if public
    // Ideally, we should have a public bucket domain.
    const image = item.primary_image_r2_key
      ? `https://pub-840623668b9b4097945d73500350720b.r2.dev/${item.primary_image_r2_key}`
      : 'https://workbench-inventory.randunun.workers.dev/assets/og-placeholder.png'

    // Inject Title
    html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`)

    // Inject Meta Tags (Prepend to <head>)
    const metaTags = `
        <meta name="description" content="${description}" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="${title}" />
        <meta property="twitter:description" content="${description}" />
        <meta property="twitter:image" content="${image}" />
        `
    html = html.replace('<head>', `<head>${metaTags}`)

    // Inject Initial Data to avoid double-fetch on client (Optional, requires frontend support)
    // html = html.replace('<div id="root"></div>', `<div id="root"></div><script>window.__INITIAL_DATA__ = ${JSON.stringify(item)}</script>`)
  }

  return c.html(html)
})

export default seo
