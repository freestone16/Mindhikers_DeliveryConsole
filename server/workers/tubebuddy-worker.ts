import path from 'path';
import type { TubeBuddyScore } from '../../src/types';

export class TubeBuddyWorker {
    private context: any = null;
    private page: any = null;
    private extensionPath: string;
    private profileDir: string;
    private isInitialized: boolean = false;
    private playwrightAvailable: boolean = false;

    constructor() {
        this.extensionPath = process.env.TUBEBUDDY_EXTENSION_PATH || '';
        this.profileDir = process.env.TUBEBUDDY_PROFILE_DIR || path.join(process.env.HOME || '', '.tubebuddy-chrome-profile');
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        if (!this.extensionPath) {
            console.warn('[TubeBuddy] TUBEBUDDY_EXTENSION_PATH not configured, using mock mode');
            this.isInitialized = true;
            return;
        }

        try {
            const playwright = await import('playwright');
            this.playwrightAvailable = true;

            this.context = await playwright.chromium.launchPersistentContext(this.profileDir, {
                headless: false,
                args: [
                    `--disable-extensions-except=${this.extensionPath}`,
                    `--load-extension=${this.extensionPath}`
                ]
            });

            const pages = this.context.pages();
            this.page = pages[0] || await this.context.newPage();
            this.isInitialized = true;
            
            console.log('[TubeBuddy] Worker initialized with extension');
        } catch (error: any) {
            if (error.code === 'MODULE_NOT_FOUND') {
                console.warn('[TubeBuddy] Playwright not installed, using mock mode');
            } else {
                console.error('[TubeBuddy] Failed to initialize:', error.message);
            }
            this.isInitialized = true;
        }
    }

    async scoreKeyword(keyword: string): Promise<TubeBuddyScore> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.playwrightAvailable || !this.page) {
            return this.generateMockScore(keyword);
        }

        try {
            console.log(`[TubeBuddy] Scoring keyword: ${keyword}`);
            return this.generateMockScore(keyword);
        } catch (error) {
            console.error(`[TubeBuddy] Error scoring ${keyword}:`, error);
            return this.generateMockScore(keyword);
        }
    }

    private generateMockScore(keyword: string): TubeBuddyScore {
        const seed = keyword.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const rand = (min: number, max: number) => Math.floor((seed * 17 + min) % (max - min) + min);

        return {
            overallScore: rand(60, 95),
            weightedScore: rand(55, 92),
            metrics: {
                searchVolume: rand(40, 90),
                competition: rand(30, 80),
                optimization: rand(50, 95),
                relevance: rand(60, 100)
            },
            rawMetrics: {
                monthlySearches: rand(1000, 500000),
                competitionLevel: seed % 3 === 0 ? 'low' : seed % 3 === 1 ? 'medium' : 'high'
            }
        };
    }

    async close(): Promise<void> {
        if (this.context) {
            await this.context.close();
            this.context = null;
            this.page = null;
            this.isInitialized = false;
            this.playwrightAvailable = false;
        }
    }
}

let workerInstance: TubeBuddyWorker | null = null;

export async function getTubeBuddyWorker(): Promise<TubeBuddyWorker> {
    if (!workerInstance) {
        workerInstance = new TubeBuddyWorker();
        await workerInstance.initialize();
    }
    return workerInstance;
}

export async function closeTubeBuddyWorker(): Promise<void> {
    if (workerInstance) {
        await workerInstance.close();
        workerInstance = null;
    }
}
