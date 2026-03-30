import fs from 'fs';
import path from 'path';

interface GoogleGeminiImageResult {
  image_url?: string;
  error?: string;
}

const getEnvVar = (varName: string): string | undefined => {
  if (process.env[varName]) return process.env[varName];

  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return undefined;

  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(new RegExp(`^${varName}=(.+)$`, 'm'));
  if (!match?.[1]?.trim()) return undefined;

  const value = match[1].trim();
  process.env[varName] = value;
  return value;
};

const getImageExtension = (mimeType?: string | null) => {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    default:
      return '.png';
  }
};

export async function generateImageWithGoogleGemini(
  prompt: string,
  options: {
    model: string;
    taskKey?: string;
    outputDir?: string;
  }
): Promise<GoogleGeminiImageResult> {
  const apiKey = getEnvVar('GOOGLE_API_KEY');
  if (!apiKey) {
    return { error: 'GOOGLE_API_KEY not configured. Please save your Google key in LLM Config.' };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    console.log(`[Google Image] Generating image with model=${options.model}, prompt="${prompt.slice(0, 50)}..."`);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    const responseText = await response.text();
    console.log(`[Google Image] Response status: ${response.status}, body: ${responseText.slice(0, 300)}`);

    if (!response.ok) {
      return { error: `API Error: ${response.status} - ${responseText.slice(0, 300)}` };
    }

    const data = JSON.parse(responseText);
    const parts = data.candidates?.flatMap((candidate: any) => candidate.content?.parts || []) || [];
    const inlineData = parts.find((part: any) => part.inlineData?.data)?.inlineData;

    if (!inlineData?.data) {
      return { error: `No image payload returned. Response: ${responseText.slice(0, 300)}` };
    }

    const outputDir = options.outputDir || path.join(process.cwd(), 'temp_images');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const ext = getImageExtension(inlineData.mimeType);
    const safeTaskKey = (options.taskKey || `google-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `gemini_${safeTaskKey}${ext}`;
    const localPath = path.join(outputDir, fileName);

    fs.writeFileSync(localPath, Buffer.from(inlineData.data, 'base64'));
    const httpUrl = `http://localhost:3005/temp_images/${path.basename(localPath)}`;
    console.log(`[Google Image] Saved image to ${localPath} → ${httpUrl}`);

    return { image_url: httpUrl };
  } catch (error: any) {
    return { error: error.message };
  }
}
