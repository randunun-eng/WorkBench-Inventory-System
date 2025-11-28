# AI Datasheet Reader - Feature Documentation

## Overview

The public AI chatbot can now **read and analyze datasheets** automatically when searching for products. This allows users to get technical specifications directly from datasheet images without manual data entry.

## How It Works

### User Flow

1. User asks chatbot: *"Tell me about the 2SC3866 transistor"*
2. Chatbot searches the catalog and finds product
3. System detects product has a datasheet attached
4. **Automatically fetches datasheet image from R2**
5. **Uses Cloudflare AI Vision model to extract technical specs**
6. AI provides natural language answer with technical details
7. User can expand "View Technical Specs" to see full datasheet analysis

### Technical Architecture

```
User Query
    ↓
Llama 3.8B (Text) → Detect SEARCH intent
    ↓
Database FTS Search → Find products with datasheets
    ↓
For each product with datasheet:
    ↓
Fetch image from R2 (PUBLIC_BUCKET)
    ↓
Llama 3.2 11B Vision → Extract specs from image
    ↓
Llama 3.8B (Text) → Natural language response
    ↓
Display to user with expandable details
```

## Implementation Details

### Backend: `/src/routes/ai.ts`

#### New Function: `analyzeDatasheet()`
```typescript
async function analyzeDatasheet(
    datasheetKey: string,
    publicBucket: R2Bucket,
    aiBinding: AI
): Promise<string>
```

**Process:**
1. Fetch image from R2 using datasheet key
2. Convert to base64 for AI processing
3. Call Llama 3.2 11B Vision model
4. Prompt: "Extract all technical specifications, part numbers, ratings, and key parameters"
5. Return extracted text

#### Updated `/chat` Endpoint

**Key Changes:**
- Added `c.id` to search results (to track which product)
- Loop through results with datasheets
- Call `analyzeDatasheet()` for each
- Store analysis in `item.datasheet_analysis`
- Include all analysis in AI context message
- **Focus on description and datasheet data** instead of raw JSON specs

**AI Context Message Format:**
```
Search Results for "query":

Products found:
- Name: 2SC3866
- Description: NPN Silicon Transistor
- Price: LKR 25
- Stock: 20 units
- Shop: Component Shop

Datasheet analysis for 2SC3866:
[Extracted technical specifications from vision model]

Using this information, provide a helpful, natural response...
Focus on the description and datasheet technical data rather than raw specifications JSON.
```

### Frontend: `/frontend/src/pages/dashboard/Chatbot.tsx`

#### Updated Search Results Display

**New Features:**
1. **Description Display** - Shows product description prominently
2. **Shop Name** - Shows which shop has the product
3. **Price Formatting** - Properly formats currency (LKR/USD)
4. **Datasheet Analysis** - Collapsible section with full extracted specs

**UI Structure:**
```tsx
<div className="search-result">
  <h4>Product Name</h4>
  <span>Stock Badge</span>

  {description && <p>Description text</p>}

  <div>Price | Datasheet Link | Shop Name</div>

  {datasheet_analysis && (
    <details>
      <summary>View Technical Specs from Datasheet</summary>
      <div>Extracted specifications...</div>
    </details>
  )}
</div>
```

## AI Models Used

### 1. Llama 3.8B Instruct (Text)
**Purpose:** Intent detection and natural language responses
**Usage:**
- Detect user wants to search (SEARCH command)
- Generate helpful responses with context
- Handle general questions

### 2. Llama 3.2 11B Vision Instruct (Vision)
**Purpose:** Datasheet image analysis
**Usage:**
- Read technical datasheets (images/PDFs)
- Extract specifications, ratings, part numbers
- OCR text from datasheet images

**Input Format:**
```javascript
{
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Extract all technical specs...' },
      { type: 'image_url', image_url: 'data:image/jpeg;base64,...' }
    ]
  }]
}
```

## Example Usage

### Example 1: Transistor Lookup

**User:** *"What are the specs of the 2SC3866?"*

**System Process:**
1. Search finds: "2SC3866" transistor
2. Datasheet: `621a3dfd.../bd319177...`
3. Vision AI extracts:
   ```
   Part Number: 2SC3866
   Type: NPN Silicon Transistor
   VCE(max): 50V
   IC(max): 2A
   PC(max): 30W
   hFE: 60-320
   fT: 100 MHz
   Application: Audio/Power amplifier
   ```
4. AI responds: *"I found the 2SC3866 transistor. It's an NPN silicon transistor rated for 50V collector-emitter voltage and 2A collector current. It has a power dissipation of 30W and is commonly used in audio and power amplifier applications."*

### Example 2: MOSFET Inquiry

**User:** *"Do you have any MOSFETs in stock?"*

**System Process:**
1. Search finds: "NCEP 15T14" MOSFET
2. Datasheet: `621a3dfd.../2bee6bdb...`
3. Vision AI extracts specs
4. AI responds with technical details from datasheet

## Data Flow

### Without Datasheet Analysis (Old)
```
User Query → Search DB → Return JSON → AI Response
Time: ~2 seconds
Info: Only database fields (name, description, price)
```

### With Datasheet Analysis (New)
```
User Query → Search DB → Fetch Datasheet(s) → Vision AI → Combine → AI Response
Time: ~5-8 seconds (depending on number of datasheets)
Info: Database fields + Full technical specs from images
```

## Performance Considerations

### Optimization Strategies

1. **Limit to 5 results** - Only analyze top 5 search results
2. **Parallel analysis** - Process multiple datasheets concurrently (future)
3. **Caching** - Store extracted specs in database (future enhancement)
4. **Progressive loading** - Show results immediately, add analysis when ready (future)

### Current Performance
- Text search: ~1-2 seconds
- Datasheet fetch + vision analysis: ~3-5 seconds per item
- Total: ~5-10 seconds for search with 2 datasheets

## Benefits

### For Users
1. **No manual spec entry** - AI extracts everything from images
2. **Rich technical data** - Get detailed specs beyond what's in database
3. **Natural language** - Ask questions, get conversational answers
4. **Verified info** - Data comes directly from manufacturer datasheets

### For Shop Owners
1. **Time saving** - Don't need to type all specifications
2. **Accuracy** - Specs extracted directly from datasheets
3. **Consistency** - Same datasheet shared across all shops
4. **Easy updates** - Replace datasheet, specs auto-update

## Limitations

### Current Constraints

1. **Image Quality** - Vision AI requires clear, readable images
2. **Processing Time** - Takes 3-5 seconds per datasheet
3. **Language** - Best with English datasheets
4. **Format** - Works best with standard datasheet layouts

### Unsupported
- Multi-page PDFs (only first page analyzed)
- Extremely low-resolution images
- Handwritten specifications
- Non-standard formats

## Future Enhancements

### Planned Features

1. **Pre-processing**
   - Analyze datasheets on upload
   - Store extracted specs in database
   - Instant results (no wait time)

2. **Enhanced Analysis**
   - Multi-page PDF support
   - Extract graphs and charts
   - Compare multiple datasheets

3. **Smart Caching**
   - Cache vision model results
   - Update only when datasheet changes
   - Share cache across all shops

4. **Interactive Features**
   - Ask follow-up questions about specs
   - "Compare 2SC3866 vs 2N3904"
   - Generate spec comparison tables

5. **Quality Improvements**
   - Validate extracted data
   - Flag inconsistencies
   - Suggest corrections

## API Reference

### POST `/api/ai/chat`

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Find transistors" }
  ]
}
```

**Response:**
```json
{
  "response": "I found 2 transistors...",
  "searchPerformed": true,
  "results": [
    {
      "id": "...",
      "name": "2SC3866",
      "description": "NPN Silicon Transistor",
      "datasheet_r2_key": "621a.../bd31...",
      "datasheet_analysis": "Part Number: 2SC3866\nType: NPN...",
      "stock_qty": 20,
      "price": 25,
      "currency": "LKR",
      "shop_name": "Component Shop"
    }
  ]
}
```

## Testing

### Manual Test Cases

#### Test 1: Product with Datasheet
1. Go to https://workbench-inventory.randunun.workers.dev
2. Open Chatbot tab
3. Type: "Tell me about 2SC3866"
4. Verify:
   - ✅ Product found
   - ✅ Description displayed
   - ✅ Datasheet link shown
   - ✅ "View Technical Specs" expandable present
   - ✅ Technical specs extracted from datasheet

#### Test 2: Product without Datasheet
1. Search for product without datasheet
2. Verify:
   - ✅ Product found
   - ✅ Description shown
   - ❌ No "View Technical Specs" section

#### Test 3: Multiple Products
1. Search: "transistor"
2. Verify:
   - ✅ Multiple results shown
   - ✅ Each has separate datasheet analysis
   - ✅ All expandable sections work

### Example Test URL
https://workbench-inventory.randunun.workers.dev/api/images/621a3dfd-787a-4c3f-ae18-28820a6c4abf/bd319177-5b79-46df-9849-2c816e4f2dad

**Expected:** Datasheet image for 2SC3866 transistor

## Deployment

**Status:** ✅ Deployed
**URL:** https://workbench-inventory.randunun.workers.dev
**Version:** v4-with-datasheet-analysis
**Date:** November 27, 2025

### Deployed Components
- ✅ Backend: `/src/routes/ai.ts` with vision analysis
- ✅ Frontend: Updated Chatbot.tsx with expandable specs
- ✅ Database: Shared catalog with datasheets
- ✅ R2: Datasheet storage (PUBLIC_BUCKET)

## Monitoring

### Health Checks
- Vision model availability: Check AI binding
- R2 bucket access: Test datasheet fetch
- Response times: Monitor for >10s responses
- Error rates: Track vision model failures

### Debug Headers
- `X-Debug-Version: v4-with-datasheet-analysis` - Indicates new version

### Logs to Monitor
```javascript
console.log('Raw AI Response:', content)
console.log('Parsed Command:', command)
console.log('Search Results:', searchResults)
console.log(`Analyzing datasheet for ${item.name}...`)
console.error('Datasheet analysis error:', e)
```

## Troubleshooting

### Issue: Datasheet not analyzing

**Check:**
1. R2 bucket has file: `wrangler r2 object get workbench-public <key>`
2. Vision model available: Check Cloudflare AI dashboard
3. Image format supported: JPG, PNG (not multi-page PDF)

### Issue: Slow responses

**Solutions:**
1. Reduce search limit (currently 5)
2. Skip analysis for items without datasheets
3. Consider pre-processing (future)

### Issue: Incorrect specs extracted

**Solutions:**
1. Improve image quality
2. Use standard datasheet format
3. Verify image is right-side up
4. Check language is English

## Security

### Public Access
- ✅ Datasheets in PUBLIC_BUCKET - accessible without auth
- ✅ Chatbot endpoint - no authentication required
- ✅ Vision model - rate limited by Cloudflare

### Rate Limiting
- Cloudflare Workers: 100,000 requests/day (free tier)
- AI model: Subject to Cloudflare AI limits

## Cost Estimate

### Cloudflare AI Pricing (Free Tier)
- Llama 3.8B: 10,000 neurons/day
- Llama 3.2 Vision: 10,000 neurons/day
- Estimated: ~1,000 datasheet analyses/day within free tier

### R2 Storage (Free Tier)
- Storage: 10 GB free
- Operations: 1M reads/month free
- Bandwidth: Unlimited from Workers

## Support

### Common Questions

**Q: How long does datasheet analysis take?**
A: 3-5 seconds per datasheet, up to 5 datasheets per search.

**Q: Can it read multi-page PDFs?**
A: Currently only single images. Multi-page support planned.

**Q: What if the datasheet is blurry?**
A: Vision AI requires clear, readable images. Re-upload higher quality.

**Q: Can I disable datasheet analysis?**
A: Yes, remove datasheet_r2_key or modify backend to skip vision call.

---

**Feature Status:** ✅ Production Ready
**Documentation Version:** 1.0
**Last Updated:** November 27, 2025
