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
  const endpointId = getEnvVar('VOLCENGINE_ENDPOINT_ID_IMAGE') || getEnvVar('VOLCENGINE_ENDPOINT_ID');

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

interface VolcVideoResult {
  task_id?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  error?: string;
}

const VOLC_VIDEO_API = 'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

export async function generateVideoWithVolc(
  prompt: string,
  options: {
    model?: string;
    duration?: number;
  } = {}
): Promise<VolcVideoResult> {
  const apiKey = getEnvVar('VOLCENGINE_ACCESS_KEY') || getEnvVar('VOLCENGINE_API_KEY');
  const endpointId = getEnvVar('VOLCENGINE_ENDPOINT_ID_VIDEO');

  if (!apiKey) {
    return { error: 'VOLCENGINE_ACCESS_KEY not configured. Please save your API Key in LLM Config.' };
  }

  if (!endpointId) {
    return { error: 'VOLCENGINE_ENDPOINT_ID_VIDEO not configured.' };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  try {
    console.log(`[Volcengine Video] Generating video with endpoint=${endpointId}, prompt="${prompt.slice(0, 50)}..."`);
    
    const duration = options.duration || 5;
    const enhancedPrompt = `${prompt} --resolution 1080p --duration ${duration}`;
    
    const response = await fetch(VOLC_VIDEO_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: endpointId,
        content: [
          {
            type: 'text',
            text: enhancedPrompt
          }
        ]
      }),
    });

    const responseText = await response.text();
    console.log(`[Volcengine Video] Response status: ${response.status}, body: ${responseText.slice(0, 300)}`);

    if (!response.ok) {
      return { error: `API Error: ${response.status} - ${responseText.slice(0, 300)}` };
    }

    const data = JSON.parse(responseText);

    if (data.task_id || data.id) {
      return { task_id: data.task_id || data.id, status: 'pending' };
    }

    if (data.output?.video_url || data.output?.video?.url || data.data?.video_url || data.data?.video?.url) {
      return { 
        status: 'completed', 
        video_url: data.output?.video_url || data.output?.video?.url || data.data?.video_url || data.data?.video?.url
      };
    }

    return { error: `No task_id or video returned. Response: ${responseText.slice(0, 300)}` };
  } catch (error: any) {
    console.error(`[Volcengine Video] Error: ${error.message}`);
    return { error: error.message };
  }
}

export async function pollVolcVideoResult(taskId: string): Promise<VolcVideoResult> {
  const apiKey = getEnvVar('VOLCENGINE_ACCESS_KEY') || getEnvVar('VOLCENGINE_API_KEY');

  if (!apiKey) {
    return { error: 'VOLCENGINE_ACCESS_KEY not configured' };
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`
  };

  try {
    const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: `API Error: ${error.slice(0, 200)}` };
    }

    const data = await response.json();
    console.log(`[Volcengine Video] Poll response: ${JSON.stringify(data).slice(0, 300)}`);

    const taskStatus = data.task_status || data.status;
    
    if (taskStatus === 'SUCCEEDED' || taskStatus === 'completed') {
      const videoUrl = data.output?.video_url || data.output?.video?.url || data.output?.videos?.[0]?.url || 
                       data.data?.video_url || data.data?.video?.url || data.data?.videos?.[0]?.url;
      if (videoUrl) {
        return { status: 'completed', video_url: videoUrl };
      }
      return { status: 'failed', error: 'Task succeeded but no video URL found' };
    } else if (taskStatus === 'FAILED' || taskStatus === 'failed') {
      return { status: 'failed', error: data.message || data.error?.message || 'Task failed' };
    }

    return { status: 'processing' };
  } catch (error: any) {
    console.error(`[Volcengine Video] Poll error: ${error.message}`);
    return { error: error.message };
  }
}

export async function downloadVideo(videoUrl: string, outputPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Volcengine Video] Downloading from ${videoUrl} to ${outputPath}`);
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      return { success: false, error: `Download failed: ${response.status}` };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    console.log(`[Volcengine Video] Downloaded successfully: ${outputPath} (${buffer.length} bytes)`);
    
    return { success: true };
  } catch (error: any) {
    console.error(`[Volcengine Video] Download error: ${error.message}`);
    return { success: false, error: error.message };
  }
}
