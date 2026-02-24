import 'dotenv/config';
import express, { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const AUTH_PORT = process.env.PORT || '3002';

// Configuration paths - expecting secrets folder at project root
const SECRETS_DIR = path.resolve(__dirname, '../secrets');
const CLIENT_SECRET_FILE = path.join(SECRETS_DIR, 'client_id.json');

// In-memory token store (Zero Persistence)
let activeAccessToken: string | null = null;
let tokenExpiry = 0;

// Helper to get Google Auth Client config
function getGoogleConfig() {
    if (!fs.existsSync(CLIENT_SECRET_FILE)) {
        throw new Error('client_id.json not found in secrets directory');
    }
    const content = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf-8'));
    // Support both "web" and "installed" types
    const config = content.web || content.installed;
    if (!config) throw new Error('Invalid client_id.json format');
    return config;
}

// 1. Start Auth Flow - Returns the URL to redirect the user to
router.get('/auth/url', (req, res) => {
    try {
        const config = getGoogleConfig();
        const redirectUri = `http://localhost:${AUTH_PORT}/auth/callback`; // Dynamic port from .env
        const scope = 'https://www.googleapis.com/auth/youtube.upload';

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${config.client_id}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scope)}&` +
            `access_type=online&` + // No refresh token needed for temp access
            `prompt=consent`; // Force consent to ensure we get a fresh token

        res.json({ url: authUrl });
    } catch (error: any) {
        console.error('Auth Init Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2. Auth Callback - Exchange code for token
router.get('/auth/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) {
        return res.status(400).send('Missing authorization code');
    }

    try {
        const config = getGoogleConfig();
        const redirectUri = `http://localhost:${AUTH_PORT}/auth/callback`;

        const tokenUrl = 'https://oauth2.googleapis.com/token';
        const params = new URLSearchParams();
        params.append('code', code);
        params.append('client_id', config.client_id);
        params.append('client_secret', config.client_secret);
        params.append('redirect_uri', redirectUri);
        params.append('grant_type', 'authorization_code');

        const response = await fetch(tokenUrl, {
            method: 'POST',
            body: params
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Token exchange failed: ${errorText}`);
        }

        const data: any = await response.json();

        // Save to memory
        activeAccessToken = data.access_token;
        tokenExpiry = Date.now() + (data.expires_in * 1000);

        console.log('✅ OAuth Success! Access Token received (in-memory only).');

        // Simple success page
        res.send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: green;">Authorization Successful!</h1>
                    <p>You can now close this window and return to the Delivery Console.</p>
                    <script>
                        // Notify parent window if opened in popup
                        if (window.opener) {
                            window.opener.postMessage({ type: 'youtube-auth-success' }, '*');
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `);

    } catch (error: any) {
        console.error('Token Exchange Error:', error.message);
        res.status(500).send(`Authentication Failed: ${error.message}`);
    }
});

// 3. Check Token Status
router.get('/auth/status', (req, res) => {
    const isValid = activeAccessToken && Date.now() < tokenExpiry;
    res.json({
        authenticated: isValid,
        expiresIn: isValid ? Math.floor((tokenExpiry - Date.now()) / 1000) : 0
    });
});

// 4. Upload Endpoint (Stub)
import { google } from 'googleapis';

// ... imports

// 4. Upload Endpoint - Real Implementation
router.post('/shorts/upload', async (req, res) => {
    if (!activeAccessToken || Date.now() > tokenExpiry) {
        return res.status(401).json({ error: 'No active access token. Please authorize again.' });
    }

    try {
        const PROJECT_NAME = process.env.PROJECT_NAME || 'CSET-SP3';
        const PROJECTS_BASE = process.env.PROJECTS_BASE || path.resolve(__dirname, '../../Projects');
        const PROJECT_ROOT = path.resolve(PROJECTS_BASE, PROJECT_NAME);
        const DELIVERY_FILE = path.join(PROJECT_ROOT, 'delivery_store.json');

        if (!fs.existsSync(DELIVERY_FILE)) {
            return res.status(404).json({ error: 'Delivery store not found' });
        }

        const data = JSON.parse(fs.readFileSync(DELIVERY_FILE, 'utf-8'));
        const shortsModule = data.modules.shorts;

        if (!shortsModule || !shortsModule.items) {
            return res.json({ message: 'No shorts module found', count: 0 });
        }

        const targetId = req.body.id;
        let scheduledItems = shortsModule.items.filter((item: any) => item.status === 'scheduled');

        if (targetId) {
            // Allow approved items to be force uploaded if targeting a specific ID
            scheduledItems = shortsModule.items.filter((item: any) =>
                (item.status === 'scheduled' || item.status === 'approved') && item.id === targetId
            );
        }

        if (scheduledItems.length === 0) {
            return res.json({ message: 'No items scheduled (or approved) for upload', count: 0 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: activeAccessToken });

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const results = [];

        for (const item of scheduledItems) {
            try {
                if (!item.videoPath || !fs.existsSync(item.videoPath)) {
                    throw new Error(`Video file not found: ${item.videoPath}`);
                }

                // Construct publish time (Assume CST +08:00 for simplicity as per user context)
                let publishAt = undefined;
                if (item.scheduledDate && item.scheduledTime) {
                    const dt = new Date(`${item.scheduledDate}T${item.scheduledTime}:00+08:00`);
                    publishAt = dt.toISOString();
                }

                console.log(`Uploading ${item.id}: ${item.title}`);

                const response = await youtube.videos.insert({
                    part: ['snippet', 'status'],
                    requestBody: {
                        snippet: {
                            title: item.title,
                            description: item.description,
                            tags: item.tags,
                            categoryId: item.categoryId || '27' // Default: Education
                        },
                        status: {
                            privacyStatus: item.privacyStatus || 'private', // Default to Private if not set
                            publishAt: publishAt, // If set, it becomes "Scheduled"
                            selfDeclaredMadeForKids: item.madeForKids || false,
                            containsSyntheticMedia: item.aiDisclosure || false
                        }
                    },
                    media: {
                        body: fs.createReadStream(item.videoPath)
                    }
                });

                const uploadedVideo = response.data;
                console.log(`Upload success: ${uploadedVideo.id}`);

                // Update Item
                item.status = 'published'; // Or 'scheduled' if it was a scheduled upload? 
                // Actually if publishAt is set, YouTube considers it "private" until that time, but logically we can call it "published" or keep "scheduled"
                // Let's mark it 'published' in our system to indicate "Handed off to YouTube"
                item.youtubeVideoId = uploadedVideo.id;
                item.youtubeUrl = `https://youtube.com/shorts/${uploadedVideo.id}`;
                item.reviewHistory.push({
                    timestamp: new Date().toISOString(),
                    stage: 'render', // or 'upload'
                    action: 'approve',
                    comment: `Uploaded to YouTube. ID: ${uploadedVideo.id}`
                });

                results.push({ id: item.id, status: 'success', videoId: uploadedVideo.id });

            } catch (err: any) {
                console.error(`Failed to upload ${item.id}:`, err.message);
                results.push({ id: item.id, status: 'failed', error: err.message });
            }
        }

        // Save Data
        data.lastUpdated = new Date().toISOString();

        // Add to history
        shortsModule.uploadHistory.push({
            timestamp: new Date().toISOString(),
            videoCount: scheduledItems.length,
            successCount: results.filter(r => r.status === 'success').length,
            failedIds: results.filter(r => r.status === 'failed').map(r => r.id)
        });

        fs.writeFileSync(DELIVERY_FILE, JSON.stringify(data, null, 2));

        res.json({
            message: 'Upload batch completed',
            results,
            uploadSession: shortsModule.uploadHistory[shortsModule.uploadHistory.length - 1]
        });

    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
