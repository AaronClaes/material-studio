import { GOOGLE_API_KEY } from '@/features/google-drive/lib/config'

interface NanoBananaParams {
  prompt: string
  model: string
  aspectRatio: string
  imageSize: string
}

/**
 * Calls the Gemini image generation API with an input image and prompt.
 * Returns the generated image as a data URL.
 */
export async function processNanoBananaNode(
  inputDataUrl: string,
  params: NanoBananaParams,
): Promise<string> {
  if (!params.prompt.trim()) {
    throw new Error('Prompt is required')
  }

  // Parse the input data URL into mime type + base64
  const match = inputDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error('Invalid input image data URL')
  }
  const [, mimeType, base64Data] = match

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent`

  const body = {
    contents: [
      {
        parts: [
          { text: params.prompt },
          { inlineData: { mimeType, data: base64Data } },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: params.aspectRatio,
        imageSize: params.imageSize,
      },
    },
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GOOGLE_API_KEY,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Nano Banana API error (${response.status}): ${errorText}`)
  }

  const result = await response.json()

  // Extract the image from the response
  const candidates = result.candidates
  if (!candidates?.length) {
    throw new Error('No candidates returned from Nano Banana API')
  }

  const parts = candidates[0].content?.parts
  if (!parts?.length) {
    throw new Error('No parts in Nano Banana API response')
  }

  // The API returns camelCase keys (inlineData, mimeType)
  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData,
  )
  if (!imagePart?.inlineData) {
    throw new Error('No image returned from Nano Banana API')
  }

  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}
