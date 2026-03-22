import fs from 'fs';
import { google } from 'googleapis';
import { resolveProjectPath } from '../project-paths';
import { requireYoutubeAccessToken } from '../youtube-oauth-service';
import type { DistributionPlatformResult, DistributionTask } from '../distribution-types';

function buildYoutubeUrl(videoId: string, platform: string) {
  if (platform === 'youtube_shorts') {
    return `https://youtube.com/shorts/${videoId}`;
  }

  return `https://youtube.com/watch?v=${videoId}`;
}

export async function publishToYoutube(
  task: DistributionTask,
  platform: string
): Promise<DistributionPlatformResult> {
  const accessToken = requireYoutubeAccessToken();
  const absoluteMediaPath = resolveProjectPath(task.projectId, task.assets.mediaUrl);

  if (!fs.existsSync(absoluteMediaPath)) {
    throw new Error(`Media file not found: ${absoluteMediaPath}`);
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const publishAt = task.scheduleTime ? new Date(task.scheduleTime).toISOString() : undefined;
  const isShorts = platform === 'youtube_shorts';
  const visibility = task.assets.visibility || 'private';

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: task.assets.title,
        description: task.assets.textDraft,
        tags: task.assets.tags,
        categoryId: '27',
      },
      status: {
        privacyStatus: publishAt ? 'private' : visibility,
        publishAt,
        selfDeclaredMadeForKids: false,
        containsSyntheticMedia: false,
      },
    },
    media: {
      body: fs.createReadStream(absoluteMediaPath),
    },
  });

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error('YouTube upload succeeded but no video id was returned.');
  }

  return {
    platform,
    status: 'success',
    remoteId: videoId,
    url: buildYoutubeUrl(videoId, platform),
    publishedAt: new Date().toISOString(),
    message: isShorts
      ? `YouTube Shorts upload completed (${publishAt ? 'scheduled private' : visibility}).`
      : `YouTube upload completed (${publishAt ? 'scheduled private' : visibility}).`,
  };
}
