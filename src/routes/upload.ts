import { Hono } from 'hono'
import { authMiddleware } from '../auth'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const upload = new Hono<{ Bindings: any, Variables: { user: any } }>()

// Remove global auth middleware
// upload.use('*', authMiddleware)

upload.post('/presigned-url', authMiddleware, async (c) => {
    const user = c.get('user')
    const { contentType, isPrivate } = await c.req.json()

    // We need R2 credentials from env vars for the S3 client
    // These are NOT the bindings, but actual secrets
    const accessKeyId = c.env.R2_ACCESS_KEY_ID
    const secretAccessKey = c.env.R2_SECRET_ACCESS_KEY
    const accountId = c.env.R2_ACCOUNT_ID

    if (!accessKeyId || !secretAccessKey || !accountId) {
        return c.json({ error: 'R2 configuration missing' }, 500)
    }

    const S3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    })

    const bucketName = isPrivate ? 'workbench-private' : 'workbench-public'
    const key = `${user.uid}/${uuidv4()}` // Simple folder structure

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
    })

    try {
        const url = await getSignedUrl(S3, command, { expiresIn: 3600 })
        return c.json({ url, key })
    } catch (e: any) {
        return c.json({ error: 'Failed to generate presigned URL', details: e.message }, 500)
    }
})

upload.post('/proxy', authMiddleware, async (c) => {
    const user = c.get('user')
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
        return c.json({ error: 'File required' }, 400)
    }

    const isPrivate = body['isPrivate'] === 'true'
    const isDatasheet = body['isDatasheet'] === 'true' // New parameter
    const bucket = isPrivate ? c.env.PRIVATE_BUCKET : c.env.PUBLIC_BUCKET
    const key = `${user.uid}/${uuidv4()}`

    try {
        // Upload file to R2
        await bucket.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            }
        })

        let extractedSpecs = null

        // If it's a datasheet image, extract specs using vision AI
        if (isDatasheet && file.type.startsWith('image/')) {
            try {
                console.log('Extracting specs from datasheet image...')

                // Fetch the uploaded image
                const imageObj = await bucket.get(key)
                if (imageObj) {
                    const imageData = await imageObj.arrayBuffer()
                    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageData)))

                    // Use vision AI to extract specs as structured data
                    const visionResponse = await c.env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
                        messages: [
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Extract technical specifications from this datasheet and return ONLY a JSON object with these fields:
- part_number: string
- type: string (component type)
- voltage_rating: string
- current_rating: string
- power_rating: string
- key_parameters: array of strings
- applications: array of strings
- manufacturer: string (if visible)

Return ONLY valid JSON, no markdown, no explanation.`
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: `data:image/jpeg;base64,${base64Image}`
                                    }
                                ]
                            }
                        ]
                    })

                    const responseText = visionResponse.response || ''
                    console.log('Vision AI response:', responseText)

                    // Try to parse JSON from response
                    try {
                        // Extract JSON if wrapped in markdown code blocks
                        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
                        if (jsonMatch) {
                            extractedSpecs = JSON.parse(jsonMatch[0])
                            console.log('Extracted specs:', extractedSpecs)
                        }
                    } catch (parseError) {
                        console.error('Failed to parse vision AI JSON:', parseError)
                        // Store as text if JSON parsing fails
                        extractedSpecs = { raw_text: responseText }
                    }
                }
            } catch (visionError) {
                console.error('Vision AI extraction error:', visionError)
                // Continue without specs if extraction fails
            }
        }

        return c.json({ key, extractedSpecs })
    } catch (e: any) {
        console.error('Proxy upload error:', e)
        return c.json({ error: 'Failed to upload file', details: e.message }, 500)
    }
})

// Public Guest Upload
upload.post('/guest', async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || !(file instanceof File)) {
        return c.json({ error: 'File required' }, 400)
    }

    const bucket = c.env.PUBLIC_BUCKET
    const key = `guests/${uuidv4()}`

    try {
        await bucket.put(key, file.stream(), {
            httpMetadata: {
                contentType: file.type,
            }
        })
        return c.json({ key })
    } catch (e: any) {
        console.error('Guest upload error:', e)
        return c.json({ error: 'Failed to upload file', details: e.message }, 500)
    }
})

export default upload
