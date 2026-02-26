import process from 'process';
import fs from 'fs';
import path from 'path';

interface VolcImageResult {
  task_id?: string;
  status?: string;
  image_url?: string;
  error?: string;
}

const VOLC_IMAGE_API = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

function getEnvVar(varName: string): string | undefined {
  if (process.env[varName]) {
    return process.env[varName];
  }

  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(new RegExp(`^${varName}=(.+)$`, 'm'));
    if (match && match[1] && match[1].trim()) {
      const value = match[1].trim();
      process.env[varName] = value;
      return value;
    }
  }

  return undefined;
}

export async function generateImageWithVolc(
  prompt: string,
  options: {
    model?: string;
    size?: string;
  } = {}
): Promise<VolcImageResult> {
  const apiKey = getEnvVar('VOLCENGINE_ACCESS_KEY') || getEnvVar('VOLCENGINE_API_KEY');
  const endpointId = getEnvVar('VOLCENGINE_ENDPOINT_ID');

  if (!apiKey) {
    return { error: 'VOLCENGINE_ACCESS_KEY not configured. Please save your API Key in LLM Config.' };
  }

  // 火山引擎方舟平台必须使用推理接入点 ID (endpoint ID)，不能直接用模型名
  const model = endpointId || options.model || 'ep-20260226142759-xqc82';
  const size = options.size || '1024x1024';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  try {
    console.log(`[Volcengine] Generating image with model=${model}, prompt="${prompt.slice(0, 50)}..."`);
    const response = await fetch(VOLC_IMAGE_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        prompt,
        size,
        num_images: 1
      }),
    });

    const responseText = await response.text();
    console.log(`[Volcengine] Response status: ${response.status}, body: ${responseText.slice(0, 200)}`);

    if (!response.ok) {
      return { error: `API Error: ${response.status} - ${responseText.slice(0, 200)}` };
    }

    const data = JSON.parse(responseText);

    if (data.task_id) {
      return { task_id: data.task_id, status: 'pending' };
    }

    if (data.data?.images?.[0]?.url) {
      return { image_url: data.data.images[0].url };
    }

    return { error: `No task_id or image returned. Response: ${responseText.slice(0, 200)}` };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function pollVolcImageResult(taskId: string): Promise<VolcImageResult> {
  const apiKey = getEnvVar('VOLCENGINE_ACCESS_KEY') || getEnvVar('VOLCENGINE_API_KEY');

  if (!apiKey) {
    return { error: 'VOLCENGINE_ACCESS_KEY not configured' };
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`
  };

  try {
    const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/tasks/${taskId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `API Error: ${error.slice(0, 200)}` };
    }

    const data = await response.json();

    if (data.task_status === 'SUCCEEDED' && data.output?.images?.[0]?.url) {
      return { status: 'completed', image_url: data.output.images[0].url };
    } else if (data.task_status === 'FAILED') {
      return { status: 'failed', error: data.message || 'Task failed' };
    }

    return { status: 'processing' };
  } catch (error: any) {
    return { error: error.message };
  }
}
