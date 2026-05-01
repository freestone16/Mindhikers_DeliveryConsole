/**
 * tubebuddy-worker.ts  — Sprint 3: Real Playwright DOM Interaction
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  scoreKeyword(keyword, script)                               │
 *   │    └─ RateLimiter.waitForNext()                             │
 *   │    └─ CredentialManager.resetTimer()                        │
 *   │    └─ TubeBuddyWebWorker.scoreOnWebDashboard() [Playwright] │
 *   │         └─ throws typed errors if Playwright/TubeBuddy unavailable │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Selector strategy:
 *   TB_SELECTORS contains arrays of CSS selectors tried in order.
 *   Update this object when TubeBuddy changes their DOM structure.
 */

import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import type { TubeBuddyScore } from '../../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─── Configurable DOM Selectors ───────────────────────────────────────────────
// Update these when TubeBuddy changes their UI.  Arrays = tried in order.

export const TB_SELECTORS = {
    webDashboard: {
        url: 'https://studio.youtube.com',
        searchInput: [
            '#tb-keyword-explorer-input',
            'input[placeholder*="Search"]',
            'input[placeholder*="keyword"]',
            'input[placeholder*="Enter"]',
            'input[type="text"]',
            '.keyword-search input',
            '#keyword-search',
            '[data-testid="keyword-input"]',
        ],
        searchButton: [
            '#tb-keyword-explorer-explore',
            'button[type="submit"]',
            'button:has-text("Search")',
            '.search-btn',
            '[data-testid="search-button"]',
        ],
        // Indicator that the results are loaded
        scoreContainer: [
            '#tb-keyword-explorer-keyword-score-container',
            '#tb-keyword-explorer-weighted-score-container',
            '.keyword-score',
            '.score-container',
            '.keyword-results',
            '[data-testid="keyword-score"]',
            '.tb-score-widget',
        ],
        overallScore: [
            '#tb-keyword-explorer-total-score',
            '.keyword-score .score-number',
            '.overall-score .value',
            '[data-metric="overall"] .value',
            '.score-overview .number',
            '.total-score',
        ],
        searchVolume: [
            '#tb-keyword-explorer-search-volume',
            '[data-metric="search-volume"] .value',
            '.search-volume .score',
            '.volume-score .number',
            '.metric-search-volume .value',
        ],
        competition: [
            '#tb-tag-weighted-competition',
            '#tb-keyword-explorer-unweighted-competition',
            '[data-metric="competition"] .value',
            '.competition .score',
            '.competition-score .number',
            '.metric-competition .value',
        ],
        optimization: [
            '.tb-keyword-explorer-keyword-count',
            '[data-metric="optimization"] .value',
            '.optimization .score',
            '.optimization-score .number',
            '.metric-optimization .value',
        ],
        relevance: [
            '[data-metric="relevance"] .value',
            '.relevance .score',
            '.relevance-score .number',
            '.metric-relevance .value',
        ],
        // TubeBuddy session detection. Do not use YouTube account selectors here:
        // YouTube login and TubeBuddy Studio authorization are different states.
        isLoggedIn: [
            '.tb-main-portal-container',
            '.tb-main-content-header-brand.tb-menu-channel-title',
            '.tb-menu-license-name',
        ],
        loginPage: [
            'input[type="email"]',
            'input[name="email"]',
            '[data-testid="login-form"]',
            '#login-email',
        ],
    },
} as const;

function findTubeBuddyExtensionPath(): string | null {
    if (process.env.TUBEBUDDY_EXTENSION_PATH && fs.existsSync(process.env.TUBEBUDDY_EXTENSION_PATH)) {
        return process.env.TUBEBUDDY_EXTENSION_PATH;
    }

    const home = process.env.HOME || '';
    const roots = [
        path.join(home, 'Library/Application Support/Google/Chrome'),
        path.join(home, 'Library/Application Support/Comet'),
    ];

    for (const root of roots) {
        if (!fs.existsSync(root)) continue;
        const profileNames = fs.readdirSync(root).filter((name) =>
            name === 'Default' || name.startsWith('Profile ')
        );

        for (const profileName of profileNames) {
            const extensionsDir = path.join(root, profileName, 'Extensions');
            if (!fs.existsSync(extensionsDir)) continue;
            const extensionIds = fs.readdirSync(extensionsDir);

            for (const extensionId of extensionIds) {
                const extensionDir = path.join(extensionsDir, extensionId);
                if (!fs.statSync(extensionDir).isDirectory()) continue;
                const versions = fs.readdirSync(extensionDir).sort().reverse();

                for (const version of versions) {
                    const versionDir = path.join(extensionDir, version);
                    const manifestPath = path.join(versionDir, 'manifest.json');
                    if (!fs.existsSync(manifestPath)) continue;

                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        const name = `${manifest.name || ''} ${manifest.short_name || ''}`;
                        const homepage = manifest.homepage_url || '';
                        if (/TubeBuddy/i.test(name) || /tubebuddy/i.test(homepage)) {
                            return versionDir;
                        }
                    } catch {
                        /* ignore invalid manifest */
                    }
                }
            }
        }
    }

    return null;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

class RateLimiter {
    private readonly baseDelayMs: number;
    private readonly jitterMaxMs: number;
    private lastRequestTime: number = 0;
    private requestCount: number = 0;
    private readonly maxPerSession: number;
    private sessionStartTime: number = Date.now();
    private readonly sessionCooldownMs: number;

    constructor(
        baseDelayMs = 3000,
        jitterMaxMs = 1500,
        maxPerSession = 30,
        sessionCooldownMs = 120_000
    ) {
        this.baseDelayMs = baseDelayMs;
        this.jitterMaxMs = jitterMaxMs;
        this.maxPerSession = maxPerSession;
        this.sessionCooldownMs = sessionCooldownMs;
    }

    async waitForNext(): Promise<void> {
        // Session cooldown check
        if (this.requestCount >= this.maxPerSession) {
            const sessionElapsed = Date.now() - this.sessionStartTime;
            if (sessionElapsed < this.sessionCooldownMs) {
                const wait = this.sessionCooldownMs - sessionElapsed;
                console.log(`[TubeBuddy] Session limit reached, cooling down for ${Math.round(wait / 1000)}s`);
                await sleep(wait);
            }
            this.requestCount = 0;
            this.sessionStartTime = Date.now();
        }

        // Per-request delay
        const elapsed = Date.now() - this.lastRequestTime;
        const jitter = Math.random() * this.jitterMaxMs;
        const requiredDelay = this.baseDelayMs + jitter;

        if (elapsed < requiredDelay) {
            await sleep(requiredDelay - elapsed);
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;
    }

    reset(): void {
        this.requestCount = 0;
        this.sessionStartTime = Date.now();
        this.lastRequestTime = 0;
    }
}

// ─── Credential Manager ───────────────────────────────────────────────────────

class CredentialManager {
    private inactivityTimer: NodeJS.Timeout | null = null;
    private readonly TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    readonly profileDir: string;
    private clearCallback: (() => Promise<void>) | null = null;

    constructor(profileDir: string) {
        this.profileDir = profileDir;
    }

    onClear(cb: () => Promise<void>): void {
        this.clearCallback = cb;
    }

    resetTimer(): void {
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        this.inactivityTimer = setTimeout(
            () => this.clearCredentials('inactivity timeout'),
            this.TIMEOUT_MS
        );
    }

    stopTimer(): void {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    async clearCredentials(reason = 'manual'): Promise<void> {
        console.log(`[TubeBuddy] Clearing credentials — reason: ${reason}`);
        this.stopTimer();

        const targets = [
            path.join(this.profileDir, 'Default', 'Cookies'),
            path.join(this.profileDir, 'Default', 'Session Storage'),
            path.join(this.profileDir, 'Default', 'Local Storage'),
        ];

        for (const p of targets) {
            try {
                await fsPromises.rm(p, { recursive: true, force: true });
                console.log(`[TubeBuddy] Cleared: ${path.basename(p)}`);
            } catch {
                /* ignore */
            }
        }

        if (this.clearCallback) {
            await this.clearCallback();
        }
    }

    hasCookies(): boolean {
        const cookiePath = path.join(this.profileDir, 'Default', 'Cookies');
        return fs.existsSync(cookiePath);
    }
}

// ─── Session Status ───────────────────────────────────────────────────────────

export interface TubeBuddySessionStatus {
    playwrightAvailable: boolean;
    browserInitialized: boolean;
    hasCookies: boolean;
    isLoggedIn: boolean | null; // null = not checked yet
    profileDir: string;
    extensionPath?: string | null;
    lastError: string | null;
    requestCount: number;
}

// ─── Main Worker ──────────────────────────────────────────────────────────────

export class TubeBuddyWorker {
    private context: any = null;
    private page: any = null;
    private isInitialized = false;
    private playwrightAvailable = false;
    private lastError: string | null = null;
    private isLoggedIn: boolean | null = null;
    private _requestCount = 0;
    private initializePromise: Promise<void> | null = null;
    private readonly extensionPath: string | null;

    readonly credentialManager: CredentialManager;
    private readonly rateLimiter: RateLimiter;

    constructor() {
        const profileDir =
            process.env.TUBEBUDDY_PROFILE_DIR ||
            path.join(process.env.HOME || '', '.tubebuddy-chrome-profile');

        this.credentialManager = new CredentialManager(profileDir);
        this.rateLimiter = new RateLimiter();
        this.extensionPath = findTubeBuddyExtensionPath();

        // When credentials are cleared, also close the browser context
        this.credentialManager.onClear(async () => {
            await this.closeBrowser();
            this.isLoggedIn = null;
        });
    }

    // ── Initialization ────────────────────────────────────────────────────────

    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (this.initializePromise) {
            await this.initializePromise;
            return;
        }

        this.initializePromise = this.initializeInternal();
        try {
            await this.initializePromise;
        } finally {
            this.initializePromise = null;
        }
    }

    private async initializeInternal(): Promise<void> {
        try {
            this.lastError = null;
            const playwright = await import('playwright').catch(() => null);
            if (!playwright) {
                this.lastError = 'Playwright 未安装，无法执行真实 TubeBuddy 评分';
                console.warn('[TubeBuddy] playwright not installed — real scoring unavailable. Run: npm install playwright && npx playwright install chromium');
                this.isInitialized = true;
                return;
            }

            this.playwrightAvailable = true;

            // Ensure profile directory exists
            await fsPromises.mkdir(this.credentialManager.profileDir, { recursive: true });

            const args = [
                '--no-sandbox',
                '--disable-blink-features=AutomationControlled',
            ];

            if (this.extensionPath) {
                args.push(`--disable-extensions-except=${this.extensionPath}`);
                args.push(`--load-extension=${this.extensionPath}`);
            } else {
                console.warn('[TubeBuddy] TubeBuddy extension not found. Set TUBEBUDDY_EXTENSION_PATH to enable real scoring.');
            }

            this.context = await playwright.chromium.launchPersistentContext(
                this.credentialManager.profileDir,
                {
                    headless: false, // Visible browser — looks like a real user
                    args,
                    viewport: { width: 1280, height: 800 },
                    userAgent:
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                }
            );

            const pages = this.context.pages();
            this.page = pages[0] || (await this.context.newPage());

            // Anti-detection: override navigator.webdriver
            await this.page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => false });
                // @ts-ignore
                delete window.__playwright;
            });

            this.isInitialized = true;
            console.log(`[TubeBuddy] Browser initialized at ${this.credentialManager.profileDir}`);
            console.log(`[TubeBuddy] Extension path: ${this.extensionPath || '(not found)'}`);
        } catch (err: any) {
            this.lastError = err.message;
            console.error('[TubeBuddy] Failed to initialize:', err.message);
            this.isInitialized = false;
            this.playwrightAvailable = false;
            this.page = null;
            this.context = null;
        }
    }

    // ── Public: Score Keyword ─────────────────────────────────────────────────

    async scoreKeyword(
        keyword: string,
        variantScript: 'simplified' | 'traditional' = 'simplified'
    ): Promise<TubeBuddyScore> {
        if (!this.isInitialized) await this.initialize();

        if (!this.playwrightAvailable || !this.page) {
            const error: any = new Error(
                this.lastError || 'TubeBuddy 真实评分不可用：Playwright 浏览器未初始化'
            );
            error.type = 'tubebuddy_unavailable';
            error.retryable = false;
            throw error;
        }

        // Reset inactivity timer on each request
        this.credentialManager.resetTimer();

        // Enforce rate limiting (serial, human-paced)
        await this.rateLimiter.waitForNext();
        this._requestCount++;

        return await this.scoreWithRetry(keyword, 3);
    }

    // ── Private: Retry Logic ──────────────────────────────────────────────────

    private async scoreWithRetry(keyword: string, maxAttempts: number): Promise<TubeBuddyScore> {
        let lastError: any = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await this.scoreOnWebDashboard(keyword);
            } catch (err: any) {
                lastError = err;

                // Session errors: don't retry, bubble up
                if (err.type === 'session_expired') {
                    this.isLoggedIn = false;
                    throw err;
                }

                // Rate limit hit: wait longer
                if (err.type === 'rate_limited') {
                    const wait = Math.pow(2, attempt) * 5000;
                    console.warn(`[TubeBuddy] Rate limited, waiting ${wait}ms before retry ${attempt}`);
                    await sleep(wait);
                    continue;
                }

                // Transient errors: exponential backoff
                const backoff = Math.pow(2, attempt) * 3000;
                console.warn(`[TubeBuddy] Attempt ${attempt}/${maxAttempts} failed: ${err.message}. Retrying in ${backoff}ms`);
                await sleep(backoff);
            }
        }

        throw lastError;
    }

    // ── Private: Web Dashboard Scraping ──────────────────────────────────────

    private async scoreOnWebDashboard(keyword: string): Promise<TubeBuddyScore> {
        const page = this.page!;
        const sel = TB_SELECTORS.webDashboard;

        console.log(`[TubeBuddy] Navigating to keyword explorer for: "${keyword}"`);

        await this.openKeywordExplorer(keyword);

        const keywordExplorerOpen = await this.isKeywordExplorerOpen(this.page);
        const loggedIn = keywordExplorerOpen || await this.checkIsLoggedIn(this.page);
        this.isLoggedIn = loggedIn;

        if (!loggedIn) {
            const error: any = new Error('TubeBuddy 扩展需要授权：请在自动化窗口完成 TubeBuddy 登录/授权后重试评分');
            error.type = 'session_expired';
            throw error;
        }

        // Find search input
        const searchInput = await this.findFirstElement(this.page, sel.searchInput);
        if (!searchInput) {
            const error: any = new Error('Search input not found — TB_SELECTORS.webDashboard.searchInput may need updating');
            error.type = 'selector_not_found';
            throw error;
        }

        // Type keyword like a human
        await searchInput.click();
        await searchInput.fill('');
        for (const char of keyword) {
            await searchInput.type(char, { delay: 60 + Math.random() * 80 });
        }

        // Submit
        const searchButton = await this.findFirstElement(this.page, sel.searchButton);
        if (searchButton) {
            await searchButton.click();
        } else {
            await this.page.keyboard.press('Enter');
        }

        // Wait for score results to appear and contain a real numeric total.
        const resultsLoaded = await this.waitForKeywordScoreResults(this.page, 45_000);
        if (!resultsLoaded) {
            const error: any = new Error('Score results did not load (timeout 45s) — TubeBuddy 页面可能变更或网络超时');
            error.type = 'timeout';
            throw error;
        }

        // Extract scores
        const overall = await this.extractScoreFromSelectors(this.page, sel.overallScore);
        const searchVolume =
            await this.extractScoreFromSelectors(this.page, sel.searchVolume) ??
            await this.extractScoreFromChart(this.page, '#tb-keyword-explorer-search-volume-chart');
        const competition =
            await this.extractScoreFromChart(this.page, '#tb-keyword-explorer-weighted-competition-chart') ??
            await this.extractScoreFromChart(this.page, '#tb-keyword-explorer-competition-chart');
        const optimization = await this.extractScoreFromChart(this.page, '#tb-keyword-explorer-keyword-count-chart');
        const relevance = await this.extractScoreFromSelectors(this.page, sel.relevance);
        const searchVolumeLabel = await this.extractMetricLabel(this.page, '#tb-keyword-explorer-search-volume');
        const competitionLabel =
            await this.extractMetricLabel(this.page, '#tb-tag-weighted-competition') ??
            await this.extractMetricLabel(this.page, '#tb-keyword-explorer-unweighted-competition');
        const optimizationLabel = await this.extractMetricLabel(this.page, '.tb-keyword-explorer-keyword-count');

        console.log(`[TubeBuddy] Scored "${keyword}": overall=${overall}, vol=${searchVolume}, comp=${competition}, opt=${optimization}, rel=${relevance}`);

        const missingMetrics = [
            ['overall', overall],
            ['searchVolume', searchVolume],
        ].filter(([, value]) => value === null).map(([name]) => name);

        if (missingMetrics.length > 0) {
            const error: any = new Error(
                `TubeBuddy 页面已加载，但未能读取真实评分字段: ${missingMetrics.join(', ')}`
            );
            error.type = 'selector_not_found';
            error.retryable = true;
            throw error;
        }

        return {
            overall: overall!,
            searchVolume: searchVolume!,
            ...(competition !== null ? { competition } : {}),
            ...(optimization !== null ? { optimization } : {}),
            ...(relevance !== null ? { relevance } : {}),
            ...(searchVolumeLabel ? { searchVolumeLabel } : {}),
            ...(competitionLabel ? { competitionLabel } : {}),
            ...(optimizationLabel ? { optimizationLabel } : {}),
        };
    }

    // ── Private: DOM Helpers ──────────────────────────────────────────────────

    async openKeywordExplorerForDebug(keyword = '黄金精神'): Promise<Record<string, unknown>> {
        if (!this.isInitialized) await this.initialize();
        if (!this.page) {
            const error: any = new Error('TubeBuddy browser page is not initialized');
            error.type = 'tubebuddy_unavailable';
            throw error;
        }

        await this.openKeywordExplorer(keyword);
        const isLoggedIn = await this.checkIsLoggedIn(this.page);
        const keywordExplorerOpen = await this.isKeywordExplorerOpen(this.page);

        return {
            title: await this.page.title().catch(() => ''),
            url: this.page.url(),
            isLoggedIn,
            keywordExplorerOpen,
            pages: await this.getPageSummaries(),
            bodyText: await this.page.locator('body').innerText().then((text: string) => text.slice(0, 1200)).catch(() => ''),
        };
    }

    private async openKeywordExplorer(keyword: string): Promise<void> {
        if (!this.page) return;

        this.page = await this.findStudioPageOrOpen() || this.page;
        const page = this.page;
        await page.bringToFront().catch(() => undefined);
        await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        await this.waitForTubeBuddyStudioShell(page, 15_000);

        if (await this.isKeywordExplorerOpen(this.page)) {
            return;
        }

        const shortcutResult = await this.openKeywordExplorerFromStudioShortcut(this.page);
        if (shortcutResult.clicked) {
            await this.page.waitForFunction(
                `document.body && /Keyword Explorer|Your keywords|Overall Score|${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i.test(document.body.innerText)`,
                { timeout: 15_000 }
            ).catch(() => undefined);

            if (await this.isKeywordExplorerOpen(this.page)) {
                return;
            }
        } else {
            console.warn('[TubeBuddy] Studio Keyword Explorer shortcut not opened:', shortcutResult);
        }

        if (
            await this.isTubeBuddyWebAuthorizationPage(this.page) ||
            await this.isTubeBuddySignedOutPromptVisible(this.page)
        ) {
            await this.throwTubeBuddyAuthorizationRequired(this.page);
        }

        if (await this.openKeywordExplorerFromExtensionWorld(this.page)) {
            await this.page.waitForSelector('#tb-keyword-explorer-container', { timeout: 15_000 });
            return;
        }

        if (
            await this.isTubeBuddyWebAuthorizationPage(this.page) ||
            await this.isTubeBuddySignedOutPromptVisible(this.page)
        ) {
            await this.throwTubeBuddyAuthorizationRequired(this.page);
        }

        const directShow = await this.page.evaluate(`(() => {
            if (!window.TubeBuddyKeywordExplorer || typeof window.TubeBuddyKeywordExplorer.Show !== 'function') {
                return false;
            }
            window.TubeBuddyKeywordExplorer.Show(null, null, null, null, null, null, 'MarketingMaster');
            return true;
        })()`);

        if (directShow) {
            await this.page.waitForSelector('#tb-keyword-explorer-container', { timeout: 15_000 });
            return;
        }

        await this.throwKeywordExplorerOpenError(this.page);
    }

    private async waitForTubeBuddyStudioShell(page: any, timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const ready = await page.evaluate(`(() => {
                return !!(
                    document.querySelector('.tb-main-portal-container') ||
                    document.querySelector('#tb-root') ||
                    document.querySelector('#tubebuddy_chrome_extension_installed') ||
                    typeof TBGlobal !== 'undefined'
                );
            })()`).catch(() => false);

            if (ready) return;
            await sleep(300);
        }
    }

    private async openKeywordExplorerFromStudioShortcut(page: any): Promise<Record<string, unknown>> {
        const attempts: string[] = [];

        try {
            if (await this.isKeywordExplorerOpen(page)) {
                return { clicked: true, alreadyOpen: true };
            }

            const portal = page.locator('.tb-main-portal-container').first();
            await portal.waitFor({ state: 'visible', timeout: 8_000 });
            const portalBox = await portal.boundingBox();
            if (portalBox) {
                // Match the real user path: click the turquoise TubeBuddy button in the Studio header.
                await page.mouse.click(
                    portalBox.x + Math.max(20, portalBox.width - 30),
                    portalBox.y + portalBox.height / 2
                );
                attempts.push('clicked-tubebuddy-header-button');
            } else {
                await portal.click({ timeout: 5_000, force: true });
                attempts.push('clicked-tubebuddy-portal');
            }

            await page.waitForTimeout(700);

            const visibleMenuClick = await page.evaluate(`(() => {
                const isVisible = (el) => {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                };

                const toolsTab = document.querySelector('#tb-tools-tab');
                if (toolsTab && isVisible(toolsTab) && typeof toolsTab.click === 'function') {
                    toolsTab.click();
                }

                const candidates = Array.from(document.querySelectorAll([
                    'a.tb-menu-extension-open[data-action="QuickLinksMenu_TagExplorer"]',
                    'a.tb-menu-extension-open',
                    '.tb-menu-tools-row',
                    'a',
                    'button',
                    '[role="button"]'
                ].join(',')));

                const target = candidates.find((el) => (
                    /Keyword Explorer/i.test((el.textContent || '').replace(/\\s+/g, ' ').trim()) ||
                    el.getAttribute('data-action') === 'QuickLinksMenu_TagExplorer'
                ) && isVisible(el));

                if (!target) {
                    const hiddenMatches = candidates
                        .filter((el) => /Keyword Explorer/i.test((el.textContent || '').replace(/\\s+/g, ' ').trim()))
                        .slice(0, 5)
                        .map((el) => ({
                            tag: el.tagName.toLowerCase(),
                            className: el.className || null,
                            dataAction: el.getAttribute('data-action'),
                            visible: isVisible(el),
                            text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
                        }));
                    return {
                        clicked: false,
                        reason: 'keyword-explorer-shortcut-not-visible',
                        menuVisible: isVisible(document.querySelector('#tb-menu-container')),
                        hiddenMatches,
                    };
                }

                target.scrollIntoView({ block: 'center', inline: 'center' });
                target.click();
                return {
                    clicked: true,
                    text: (target.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 120),
                    dataAction: target.getAttribute('data-action'),
                };
            })()`);

            if (visibleMenuClick?.clicked) {
                attempts.push('clicked-visible-menu-entry');
            } else {
                attempts.push(`dom-click-failed:${visibleMenuClick?.reason || 'unknown'}`);

                const textLocators = [
                    page.locator('a.tb-menu-extension-open').filter({ hasText: /Keyword Explorer/i }).first(),
                    page.locator('button').filter({ hasText: /Keyword Explorer/i }).first(),
                    page.locator('[role="menuitem"]').filter({ hasText: /Keyword Explorer/i }).first(),
                    page.getByText('Keyword Explorer', { exact: true }).last(),
                ];

                for (const locator of textLocators) {
                    try {
                        await locator.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => undefined);
                        await locator.click({ timeout: 2_000, force: true });
                        attempts.push('clicked-playwright-text-entry');
                        break;
                    } catch {
                        /* Try the next visible/text locator. */
                    }
                }
            }

            await page.waitForTimeout(2_000);
            const pages = this.context?.pages?.() || [];
            const activePage = pages.find((candidate: any) => candidate === page) || pages[pages.length - 1] || page;
            if (activePage && activePage !== this.page) {
                this.page = activePage;
                await this.page.bringToFront().catch(() => undefined);
            }

            return {
                clicked: await this.isKeywordExplorerOpen(this.page),
                attempts,
                menuClick: visibleMenuClick,
            };
        } catch (error: any) {
            return {
                clicked: false,
                attempts,
                reason: error && error.message ? error.message : String(error),
            };
        }
    }

    private async openKeywordExplorerFromExtensionWorld(page: any): Promise<boolean> {
        try {
            const client = await this.context.newCDPSession(page);
            const contexts: Array<{ id: number; name?: string; origin?: string }> = [];
            client.on('Runtime.executionContextCreated', (event: any) => {
                const context = event.context;
                contexts.push({
                    id: context.id,
                    name: context.name,
                    origin: context.origin,
                });
            });
            await client.send('Runtime.enable');
            await sleep(500);

            for (const context of contexts) {
                const result = await client.send('Runtime.evaluate', {
                    contextId: context.id,
                    awaitPromise: true,
                    returnByValue: true,
                    expression: `(() => {
                        try {
                            if (
                                typeof TubeBuddyMenu !== 'undefined' &&
                                typeof TubeBuddyKeywordExplorer !== 'undefined' &&
                                TubeBuddyKeywordExplorer &&
                                typeof TubeBuddyKeywordExplorer.Show === 'function'
                            ) {
                                TubeBuddyMenu.ShowBackgroundSticky();
                                TubeBuddyKeywordExplorer.Show(null, null, null, null, null, null, 'MarketingMaster');
                                return { ok: true, via: 'TubeBuddyKeywordExplorer.Show' };
                            }

                            if (typeof jQuery !== 'undefined') {
                                jQuery('body').trigger('TBGlobalOpenToolBox', [{
                                    activeFeature: 'Keyword Explorer',
                                    isUpload: false,
                                    source: 'MarketingMaster'
                                }]);
                                return { ok: true, via: 'TBGlobalOpenToolBox' };
                            }

                            return { ok: false, via: 'none' };
                        } catch (err) {
                            return { ok: false, error: err && err.message ? err.message : String(err) };
                        }
                    })()`,
                });

                const value = result?.result?.value;
                if (value?.ok) {
                    console.log('[TubeBuddy] Opened Keyword Explorer from extension world:', context);
                    await sleep(2_000);
                    return await this.isKeywordExplorerOpen(page);
                }
            }

            return false;
        } catch (err: any) {
            console.warn('[TubeBuddy] Extension world open failed:', err.message);
            return false;
        }
    }

    private async checkIsLoggedIn(page: any): Promise<boolean> {
        const sel = TB_SELECTORS.webDashboard;
        const currentUrl = page.url();
        const bodyText = await page.locator('body').innerText().catch(() => '');

        if (/studio\.youtube\.com/i.test(currentUrl) && await this.isKeywordExplorerOpen(page)) {
            return true;
        }

        const extensionState = /studio\.youtube\.com/i.test(currentUrl)
            ? await this.getExtensionStateSnapshot(page).catch(() => null)
            : null;
        const tbGlobal = extensionState && typeof extensionState === 'object'
            ? (extensionState as any).tbGlobal
            : null;
        if (tbGlobal?.isAuthenticated === true || tbGlobal?.token?.present || tbGlobal?.profile) {
            return true;
        }

        if (await this.isTubeBuddySignedOutPromptVisible(page)) {
            return false;
        }

        if (/tubebuddy\.com\/account/i.test(currentUrl) && /Sign Out|Launch Extension|License|Pro/i.test(bodyText)) {
            return true;
        }

        if (/studio\.youtube\.com/i.test(currentUrl)) {
            const signedInIndicator = await this.findFirstElement(page, sel.isLoggedIn);
            if (signedInIndicator) return true;

            // If the extension root exists but no TubeBuddy auth indicator is visible yet,
            // treat the state as unauthenticated/settling. The YouTube avatar is not enough.
            return false;
        }

        // Check for login-page indicators
        for (const s of sel.loginPage) {
            try {
                const el = await page.$(s);
                if (el && await this.isVisibleElement(el)) return false;
            } catch { /* ignore */ }
        }

        // Check for user-logged-in indicators
        for (const s of sel.isLoggedIn) {
            try {
                const el = await page.$(s);
                if (el && await this.isVisibleElement(el)) return true;
            } catch { /* ignore */ }
        }

        if (/Sign in with Google|Log in/i.test(bodyText)) {
            return false;
        }

        // Ambiguous pages should not be treated as authenticated because that can
        // silently scrape the public marketing page instead of the real tool.
        return false;
    }

    private async isTubeBuddySignedOutPromptVisible(page: any): Promise<boolean> {
        try {
            return await page.evaluate(`(() => {
                const isVisible = (el) => {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                };

                const prompt = document.querySelector('#tb-pop-out-token-error-id');
                if (prompt && isVisible(prompt)) return true;

                return Array.from(document.querySelectorAll('a, button, label, span, div'))
                    .some((el) => (
                        /Sign in\\s*to\\s*TubeBuddy|Sign in with YouTube|Use your YouTube account to sign in to TubeBuddy/i
                            .test((el.textContent || '').replace(/\\s+/g, ' ').trim()) &&
                        isVisible(el)
                    ));
            })()`);
        } catch {
            return false;
        }
    }

    private async isTubeBuddyWebAuthorizationPage(page: any): Promise<boolean> {
        try {
            const url = page.url();
            const bodyText = await page.locator('body').innerText().catch(() => '');
            return (
                /tubebuddy\.com\/signin/i.test(url) ||
                /accounts\.google\.com|google\.com\/signin/i.test(url) ||
                /Sign In to TubeBuddy/i.test(bodyText) && /Privacy Policy|Terms of Use/i.test(bodyText)
            );
        } catch {
            return false;
        }
    }

    private async throwTubeBuddyAuthorizationRequired(page: any): Promise<never> {
        this.isLoggedIn = false;
        const bodyText = await page.locator('body').innerText().then((text: string) => text.slice(0, 500)).catch(() => '');
        const error: any = new Error('TubeBuddy 扩展需要授权：请在自动化窗口完成 TubeBuddy 登录/授权后重试评分');
        error.type = 'session_expired';
        error.retryable = false;
        error.debug = {
            title: await page.title().catch(() => ''),
            url: page.url(),
            needsUserAction: await this.isTubeBuddyWebAuthorizationPage(page),
            bodyText,
        };
        throw error;
    }

    private async findFirstElement(page: any, selectors: readonly string[]): Promise<any | null> {
        for (const s of selectors) {
            try {
                const el = await page.$(s);
                if (el && await this.isVisibleElement(el)) return el;
            } catch { /* try next */ }
        }
        return null;
    }

    private async isVisibleElement(el: any): Promise<boolean> {
        try {
            return await el.evaluate((node: Element) => {
                const rect = node.getBoundingClientRect();
                const styles = window.getComputedStyle(node);
                return (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    styles.visibility !== 'hidden' &&
                    styles.display !== 'none'
                );
            });
        } catch {
            return false;
        }
    }

    private async waitForAnyElement(
        page: any,
        selectors: readonly string[],
        timeoutMs: number
    ): Promise<boolean> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            for (const s of selectors) {
                try {
                    const el = await page.$(s);
                    if (el && await this.isVisibleElement(el)) return true;
                } catch { /* ignore */ }
            }
            await sleep(300);
        }
        return false;
    }

    private async isKeywordExplorerOpen(page: any): Promise<boolean> {
        try {
            return await page.evaluate(`(() => {
                const container = document.querySelector('#tb-keyword-explorer-container');
                if (!container) return false;
                const rect = container.getBoundingClientRect();
                const style = window.getComputedStyle(container);
                return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
            })()`);
        } catch {
            return false;
        }
    }

    private async throwKeywordExplorerOpenError(page: any): Promise<never> {
        const loggedIn = await this.checkIsLoggedIn(page);
        this.isLoggedIn = loggedIn;

        if (!loggedIn) {
            await this.throwTubeBuddyAuthorizationRequired(page);
        }

        const bodyText = await page.locator('body').innerText().then((text: string) => text.slice(0, 500)).catch(() => '');
        const error: any = new Error('TubeBuddy Keyword Explorer 未真正打开，不能继续读取评分字段');
        error.type = 'selector_not_found';
        error.retryable = true;
        error.debug = {
            title: await page.title().catch(() => ''),
            url: page.url(),
            bodyText,
        };
        throw error;
    }

    private async waitForKeywordScoreResults(page: any, timeoutMs: number): Promise<boolean> {
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const ready = await page.evaluate(`(() => {
                const score = document.querySelector('#tb-keyword-explorer-total-score');
                const scoreText = score ? (score.textContent || '') : '';
                const scoreVisible = !!score && score.getBoundingClientRect().width > 0;
                const loading = document.querySelector('#tb-keyword-explorer-keyword-score-container-loading');
                const loadingVisible = !!loading && window.getComputedStyle(loading).display !== 'none';
                return scoreVisible && /\\d+\\s*\\/\\s*100/.test(scoreText) && !loadingVisible;
            })()`).catch(() => false);

            if (ready) return true;
            await sleep(500);
        }

        return false;
    }

    private async extractScoreFromSelectors(page: any, selectors: readonly string[]): Promise<number | null> {
        for (const s of selectors) {
            try {
                const el = await page.$(s);
                if (!el) continue;
                const raw = await el.evaluate((node: Element) =>
                    node.getAttribute('title') || node.textContent || ''
                );
                if (!raw) continue;
                const num = this.parseTubeBuddyScoreText(raw);
                if (num !== null) return num;
            } catch { /* try next */ }
        }
        return null;
    }

    private async extractMetricLabel(page: any, selector: string): Promise<string | null> {
        try {
            const label = await page.$eval(selector, (node: Element) =>
                (node.textContent || '').replace(/\s+/g, ' ').trim()
            );
            if (!label || /\d/.test(label)) return null;
            return /^(Poor|Fair|Good|Very Good|Excellent)$/i.test(label) ? label : null;
        } catch {
            return null;
        }
    }

    private parseTubeBuddyScoreText(raw: string): number | null {
        const text = raw.replace(/\s+/g, ' ').trim();
        const fraction = text.match(/(\d{1,3})\s*\/\s*100\b/);
        if (fraction) {
            const value = Number(fraction[1]);
            return value >= 0 && value <= 100 ? value : null;
        }

        const number = text.match(/\b(\d{1,3})\b/);
        if (!number) return null;

        const value = Number(number[1]);
        return value >= 0 && value <= 100 ? value : null;
    }

    private async extractScoreFromChart(page: any, chartSelector: string): Promise<number | null> {
        try {
            const score = await page.evaluate((selector: string) => {
                const chart = document.querySelector(selector);
                if (!chart) return null;

                const segments = Array.from(chart.querySelectorAll('.tb-bar-segment')) as HTMLElement[];
                if (segments.length === 0) return null;

                let matchedAnySegment = false;
                const segmentValue = 100 / segments.length;
                const total = segments.reduce((sum, segment) => {
                    const bg =
                        segment.style.getPropertyValue('--kweBarBackground') ||
                        segment.style.background ||
                        '';
                    const matches = Array.from(bg.matchAll(/(-?\d+(?:\.\d+)?)%/g));
                    if (matches.length === 0) return sum;
                    matchedAnySegment = true;
                    const fillPercent = Math.max(0, Math.min(100, Number(matches[0][1])));
                    return sum + (fillPercent / 100) * segmentValue;
                }, 0);

                if (!matchedAnySegment) return null;
                if (!Number.isFinite(total)) return null;
                return Math.max(0, Math.min(100, Math.round(total)));
            }, chartSelector);

            return typeof score === 'number' ? score : null;
        } catch {
            return null;
        }
    }

    // ── Public: Session Status ────────────────────────────────────────────────

    getSessionStatus(): TubeBuddySessionStatus {
        return {
            playwrightAvailable: this.playwrightAvailable,
            browserInitialized: this.isInitialized && !!this.page,
            hasCookies: this.credentialManager.hasCookies(),
            isLoggedIn: this.isLoggedIn,
            profileDir: this.credentialManager.profileDir,
            extensionPath: this.extensionPath,
            lastError: this.lastError,
            requestCount: this._requestCount,
        };
    }

    async takeDebugScreenshot(): Promise<Buffer | null> {
        await this.ensureDebugPageReady();
        if (!this.page) return null;
        try {
            return await this.page.screenshot({ type: 'jpeg', quality: 70 });
        } catch {
            return null;
        }
    }

    async getDebugPageSnapshot(): Promise<Record<string, unknown> | null> {
        await this.ensureDebugPageReady();
        if (!this.page) return null;

        const snapshot = await this.page.evaluate(`(() => {
            const summarizeElement = (el) => {
                const rect = el.getBoundingClientRect();
                const styles = window.getComputedStyle(el);
                return {
                    tag: el.tagName.toLowerCase(),
                    id: el.id || null,
                    className: el.className || null,
                    type: el.getAttribute('type'),
                    name: el.getAttribute('name'),
                    href: el.getAttribute('href'),
                    placeholder: el.getAttribute('placeholder'),
                    ariaLabel: el.getAttribute('aria-label'),
                    checked: typeof el.checked === 'boolean' ? el.checked : null,
                    text: (el.textContent || '').trim().slice(0, 120),
                    visible:
                        rect.width > 0 &&
                        rect.height > 0 &&
                        styles.visibility !== 'hidden' &&
                        styles.display !== 'none',
                    rect: {
                        x: Math.round(rect.x),
                        y: Math.round(rect.y),
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                    },
                };
            };

            return {
                title: document.title,
                url: location.href,
                inputs: Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]'))
                    .map(summarizeElement),
                buttons: Array.from(document.querySelectorAll('button, [role="button"], a'))
                    .slice(0, 30)
                    .map(summarizeElement),
                tubeBuddyElements: Array.from(document.querySelectorAll('[id*="tb"], [class*="tb-"], [class*="tubebuddy"], [id*="tube"], [class*="tube"]'))
                    .slice(0, 80)
                    .map(summarizeElement),
                keywordExplorerMetrics: (() => {
                    const metricSelectors = {
                        overall: '#tb-keyword-explorer-total-score',
                        searchVolume: '#tb-keyword-explorer-search-volume',
                        searchVolumeChart: '#tb-keyword-explorer-search-volume-chart',
                        weightedCompetition: '#tb-tag-weighted-competition',
                        weightedCompetitionChart: '#tb-keyword-explorer-weighted-competition-chart',
                        unweightedCompetition: '#tb-keyword-explorer-unweighted-competition',
                        unweightedCompetitionChart: '#tb-keyword-explorer-competition-chart',
                        optimization: '.tb-keyword-explorer-keyword-count',
                        optimizationChart: '#tb-keyword-explorer-keyword-count-chart',
                    };

                    const summarizeChart = (selector) => {
                        const chart = document.querySelector(selector);
                        if (!chart) return null;

                        return Array.from(chart.querySelectorAll('.tb-bar-segment'))
                            .map((segment) => segment.style.getPropertyValue('--kweBarBackground') || segment.style.background || '');
                    };

                    return Object.fromEntries(Object.entries(metricSelectors).map(([key, selector]) => {
                        const isChart = key.endsWith('Chart');
                        const el = document.querySelector(selector);
                        return [
                            key,
                            isChart
                                ? summarizeChart(selector)
                                : {
                                    text: el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : null,
                                    title: el ? el.getAttribute('title') : null,
                                    visible: el ? summarizeElement(el).visible : false,
                                },
                        ];
                    }));
                })(),
                bodyText: document.body.innerText.slice(0, 2000),
            };
        })()`);

        return {
            ...snapshot,
            pages: await this.getPageSummaries(),
            extensionState: await this.getExtensionStateSnapshot(this.page),
        };
    }

    async startAuthorization(): Promise<Record<string, unknown>> {
        await this.ensureDebugPageReady();
        if (!this.page) {
            const error: any = new Error('TubeBuddy browser page is not initialized');
            error.type = 'tubebuddy_unavailable';
            throw error;
        }

        await this.page.bringToFront().catch(() => undefined);

        const beforeUrl = this.page.url();
        const extensionTokenAuth = await this.startExtensionTokenAuthorization();
        if (extensionTokenAuth.started || extensionTokenAuth.needsUserAction) {
            const pages = this.context?.pages?.() || [];
            return {
                clicked: extensionTokenAuth.started,
                targetText: extensionTokenAuth.targetText,
                beforeUrl,
                afterUrl: this.page.url(),
                pageCount: pages.length,
                pages: await this.getPageSummaries(),
                title: await this.page.title().catch(() => ''),
                needsUserAction: extensionTokenAuth.needsUserAction,
                ...(extensionTokenAuth.needsUserAction
                    ? { userAction: '请在自动化 Chrome 中完成 TubeBuddy 扩展 token 授权；这次目标是写入 tubebuddyToken，不只是登录账号页' }
                    : {}),
                authorizationPanel: extensionTokenAuth,
            };
        }

        const extensionTokenAuthFailure = extensionTokenAuth;
        let webAuthorizationPanel = await this.inspectTubeBuddyWebAuthorizationPage(this.page);
        if (webAuthorizationPanel.needsUserAction) {
            const pages = this.context?.pages?.() || [];
            return {
                clicked: false,
                targetText: webAuthorizationPanel.targetText,
                beforeUrl,
                afterUrl: this.page.url(),
                pageCount: pages.length,
                pages: await this.getPageSummaries(),
                title: await this.page.title().catch(() => ''),
                needsUserAction: true,
                userAction: '请在自动化 Chrome 中勾选 TubeBuddy 的 Privacy Policy / Terms of Use，并完成 TubeBuddy/Google 授权',
                authorizationPanel: webAuthorizationPanel,
                extensionTokenAuthFailure,
            };
        }

        let authorizationPanel = await this.revealStudioTubeBuddyAuthorizationPanel(this.page);
        if (authorizationPanel.needsUserAction) {
            const pages = this.context?.pages?.() || [];
            return {
                clicked: authorizationPanel.clicked,
                targetText: authorizationPanel.targetText,
                beforeUrl,
                afterUrl: this.page.url(),
                pageCount: pages.length,
                pages: await this.getPageSummaries(),
                title: await this.page.title().catch(() => ''),
                needsUserAction: true,
                userAction: '请在自动化 Chrome 的 TubeBuddy 面板里勾选隐私条款，并点击 Sign in with YouTube 完成授权',
                authorizationPanel,
                extensionTokenAuthFailure,
            };
        }

        const newPagePromise = this.context?.waitForEvent('page', { timeout: 8_000 }).catch(() => null) || Promise.resolve(null);
        let clicked = false;
        let targetText: string | null = null;

        try {
            const locator = this.page.locator('#tb-pop-out-token-error-id').first();
            await locator.click({ timeout: 5_000, force: true });
            clicked = true;
            targetText = 'Studio TubeBuddy sign-in prompt';
        } catch {
            const result = await this.page.evaluate(`(() => {
                const exact = document.querySelector('#tb-pop-out-token-error-id');
                const isVisible = (el) => {
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                };
                if (exact) {
                    exact.click();
                    return {
                        clicked: true,
                        targetText: (exact.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 120),
                    };
                }

                const candidates = Array.from(document.querySelectorAll('a, button, [role="button"], span'));
                const target = candidates.find((el) => (
                    /Sign in\\s*to\\s*TubeBuddy|Launch Extension/i.test((el.textContent || '').trim()) ||
                    el.id === 'open-extension-test'
                ) && isVisible(el) && el.getBoundingClientRect().width <= 260 && el.getBoundingClientRect().height <= 120);
                if (!target) return { clicked: false, targetText: null };
                target.click();
                return {
                    clicked: true,
                    targetText: (target.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 120),
                };
            })()`);
            clicked = !!result.clicked;
            targetText = result.targetText || null;
        }

        const newPage = await newPagePromise;
        if (newPage) {
            await newPage.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        }

        await sleep(2_000);
        const pages = this.context?.pages?.() || [];
        const activePage = await this.findAuthorizationPage(pages) || pages[pages.length - 1] || this.page;
        if (activePage && activePage !== this.page) {
            this.page = activePage;
            await this.page.bringToFront().catch(() => undefined);
        }

        webAuthorizationPanel = await this.inspectTubeBuddyWebAuthorizationPage(this.page);
        if (webAuthorizationPanel.needsUserAction) {
            return {
                clicked,
                targetText: targetText || webAuthorizationPanel.targetText,
                beforeUrl,
                afterUrl: this.page.url(),
                pageCount: pages.length,
                pages: await this.getPageSummaries(),
                title: await this.page.title().catch(() => ''),
                needsUserAction: true,
                userAction: '请在自动化 Chrome 中勾选 TubeBuddy 的 Privacy Policy / Terms of Use，并完成 TubeBuddy/Google 授权',
                authorizationPanel: webAuthorizationPanel,
                extensionTokenAuthFailure,
            };
        }

        authorizationPanel = await this.revealStudioTubeBuddyAuthorizationPanel(this.page);

        return {
            clicked,
            targetText,
            beforeUrl,
            afterUrl: this.page.url(),
            pageCount: pages.length,
            pages: await this.getPageSummaries(),
            title: await this.page.title().catch(() => ''),
            needsUserAction: authorizationPanel.needsUserAction,
            ...(authorizationPanel.needsUserAction
                ? { userAction: '请在自动化 Chrome 的 TubeBuddy 面板里勾选隐私条款，并点击 Sign in with YouTube 完成授权' }
                : {}),
            authorizationPanel,
            extensionTokenAuthFailure,
        };
    }

    private async startExtensionTokenAuthorization(): Promise<Record<string, any>> {
        const studioPage = await this.findStudioPageOrOpen();
        if (!studioPage) {
            return { started: false, needsUserAction: false, reason: 'studio-page-unavailable', targetText: null };
        }

        this.page = studioPage;
        await this.page.bringToFront().catch(() => undefined);
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => undefined);
        await this.page.waitForTimeout(1_500);

        const tokenLink = await this.getMissingTokenOAuthLink(this.page);
        if (!tokenLink.href) {
            return {
                started: false,
                needsUserAction: false,
                reason: tokenLink.reason || 'missing-token-oauth-link-not-found',
                targetText: null,
                tokenLink,
            };
        }

        const beforeUrl = this.page.url();
        await this.page.goto(tokenLink.href, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        }).catch(async (error: any) => {
            console.warn('[TubeBuddy] Extension token auth navigation failed:', error.message);
        });

        await this.page.waitForTimeout(4_000);
        const pages = this.context?.pages?.() || [];
        const activePage = await this.findAuthorizationPage(pages) || pages[pages.length - 1] || this.page;
        if (activePage && activePage !== this.page) {
            this.page = activePage;
            await this.page.bringToFront().catch(() => undefined);
        }

        const currentUrl = this.page.url();
        const bodyText = await this.page.locator('body').innerText().then((text: string) => text.slice(0, 500)).catch(() => '');
        const needsUserAction =
            /accounts\.google\.com|google\.com\/signin|signin/i.test(currentUrl) ||
            /Choose an account|Continue|Allow|Sign in|两步验证|confirm/i.test(bodyText);

        return {
            started: true,
            needsUserAction,
            targetText: 'TubeBuddy extension missing-token OAuth link',
            beforeUrl,
            afterUrl: currentUrl,
            tokenLink: {
                found: true,
                text: tokenLink.text,
                hrefHost: tokenLink.hrefHost,
                hrefPath: tokenLink.hrefPath,
            },
            bodyText,
        };
    }

    private async findStudioPageOrOpen(): Promise<any | null> {
        const pages = this.context?.pages?.() || [];
        const studioPage = pages.find((page: any) => /studio\.youtube\.com/i.test(page.url()));
        if (studioPage) return studioPage;

        const page = this.page || pages[0] || await this.context.newPage();
        await page.goto(TB_SELECTORS.webDashboard.url, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        }).catch(() => undefined);
        await page.waitForTimeout(2_000).catch(() => undefined);
        return page;
    }

    private async getMissingTokenOAuthLink(page: any): Promise<Record<string, any>> {
        try {
            const result = await page.evaluate(`(() => {
                const isVisible = (el) => {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                };

                const portal = document.querySelector('.tb-main-portal-container');
                if (portal && isVisible(portal)) {
                    portal.click();
                }

                const signInTab = document.querySelector('.tb-main-content-tabs-signin .tb-main-content-tab')
                    || Array.from(document.querySelectorAll('span, li, a, button')).find((el) => (el.textContent || '').trim() === 'Sign In');
                if (signInTab && typeof signInTab.click === 'function') {
                    signInTab.click();
                }

                const candidates = Array.from(document.querySelectorAll('a.tb-missing-token-oauth-link'));
                const target = candidates.find((el) => typeof el.href === 'string' && /\\/oauth\\/AuthRedirect\\?/i.test(el.href))
                    || candidates.find((el) => typeof el.href === 'string' && el.href.length > 0);
                if (!target) {
                    return {
                        href: null,
                        reason: 'link-not-found',
                        candidateCount: candidates.length,
                        bodyText: (document.body.innerText || '').slice(0, 500),
                    };
                }

                let parsed = null;
                try {
                    parsed = new URL(target.href);
                } catch {
                    parsed = null;
                }

                return {
                    href: target.href,
                    hrefHost: parsed ? parsed.host : null,
                    hrefPath: parsed ? parsed.pathname : null,
                    text: (target.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 120),
                    candidateCount: candidates.length,
                };
            })()`);

            return result || { href: null, reason: 'empty-evaluate-result' };
        } catch (error: any) {
            return {
                href: null,
                reason: error && error.message ? error.message : String(error),
            };
        }
    }

    private async inspectTubeBuddyWebAuthorizationPage(page: any): Promise<Record<string, unknown>> {
        if (!/tubebuddy\.com\/signin|accounts\.google\.com|google\.com\/signin/i.test(page.url())) {
            return { revealed: false, needsUserAction: false, targetText: null };
        }

        const panel = await page.evaluate(`(() => {
            const text = (document.body && document.body.innerText ? document.body.innerText : '').replace(/\\s+/g, ' ').trim();
            const inputs = Array.from(document.querySelectorAll('input')).map((input) => ({
                id: input.id || null,
                type: input.type || null,
                checked: !!input.checked,
                visible: (() => {
                    const rect = input.getBoundingClientRect();
                    const style = window.getComputedStyle(input);
                    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
                })(),
            }));

            return {
                text: text.slice(0, 500),
                inputs,
                hasTerms: /Terms of Use/i.test(text),
                hasPrivacy: /Privacy Policy/i.test(text),
                hasTubeBuddySignIn: /Sign In to TubeBuddy/i.test(text),
                hasGoogleAuth: /Choose an account|Continue|Allow|Sign in with Google|Sign in with YouTube/i.test(text),
            };
        })()`).catch((error: any) => ({
            error: error && error.message ? error.message : String(error),
        }));

        const needsUserAction = !!(
            panel &&
            !panel.error &&
            (panel.hasTerms || panel.hasPrivacy || panel.hasTubeBuddySignIn || panel.hasGoogleAuth)
        );

        return {
            revealed: !!(panel && !panel.error),
            needsUserAction,
            targetText: needsUserAction ? 'TubeBuddy web authorization page' : null,
            panel,
        };
    }

    private async revealStudioTubeBuddyAuthorizationPanel(page: any): Promise<Record<string, unknown>> {
        if (!/studio\.youtube\.com/i.test(page.url())) {
            return { clicked: false, revealed: false, needsUserAction: false, targetText: null };
        }

        const bodyText = await page.locator('body').innerText().catch(() => '');
        if (!/Sign in\s*to\s*TubeBuddy|Sign In|Sign in with YouTube/i.test(bodyText)) {
            return { clicked: false, revealed: false, needsUserAction: false, targetText: null };
        }

        let clicked = false;
        try {
            const portal = page.locator('.tb-main-portal-container').first();
            await portal.click({ timeout: 5_000, force: true });
            clicked = true;
            await page.waitForTimeout(500);
        } catch {
            /* Continue with DOM inspection; the panel may already be open. */
        }

        const panel = await page.evaluate(`(() => {
            const isVisible = (el) => {
                if (!el) return false;
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
            };

            const menu = document.querySelector('#tb-menu-container');
            const signInTab = document.querySelector('.tb-main-content-tabs-signin .tb-main-content-tab')
                || Array.from(document.querySelectorAll('span, li, a, button')).find((el) => (el.textContent || '').trim() === 'Sign In');
            if (signInTab && typeof signInTab.click === 'function') {
                signInTab.click();
            }

            const textRoot = menu || document.body;
            const text = (textRoot.innerText || '').replace(/\\s+/g, ' ').trim();
            const privacy = document.querySelector('#tb-agree-to-privacy');
            const signInWithYouTube = Array.from(document.querySelectorAll('a, button, [role="button"], span'))
                .find((el) => /Sign in with YouTube/i.test((el.textContent || '').trim()));

            return {
                menuVisible: isVisible(menu),
                privacyVisible: isVisible(privacy),
                signInWithYouTubeVisible: isVisible(signInWithYouTube),
                hasPrivacyCheckbox: !!privacy,
                hasSignInWithYouTube: /Sign in with YouTube/i.test(text),
                text: text.slice(0, 500),
            };
        })()`).catch((error: any) => ({
            error: error && error.message ? error.message : String(error),
        }));

        const needsUserAction = !!(
            panel &&
            !panel.error &&
            (panel.privacyVisible || panel.signInWithYouTubeVisible)
        );

        return {
            clicked,
            revealed: !!(panel && !panel.error && panel.menuVisible),
            needsUserAction,
            targetText: needsUserAction ? 'Studio TubeBuddy Sign In panel' : null,
            panel,
        };
    }

    private async findAuthorizationPage(pages: any[]): Promise<any | null> {
        const pageSummaries = await Promise.all(pages.map(async (page: any) => {
            const bodyText = await page.locator('body').innerText().then((text: string) => text.slice(0, 500)).catch(() => '');
            return { page, url: page.url(), bodyText };
        }));

        const studioConsentPage = pageSummaries.find(({ url, bodyText }) =>
            /studio\.youtube\.com/i.test(url) &&
            /Sign in\s*to\s*TubeBuddy|Sign in with YouTube|Use your YouTube account to sign in to TubeBuddy|Privacy Policy|Thanks for installing TubeBuddy/i.test(bodyText)
        );
        if (studioConsentPage) return studioConsentPage.page;

        const googleAuthPage = pageSummaries.find(({ url, bodyText }) =>
            /accounts\.google\.com|google\.com\/signin/i.test(url) ||
            /Sign in with Google|Choose an account|Continue|Allow/i.test(bodyText)
        );
        if (googleAuthPage) return googleAuthPage.page;

        const tubeBuddyAccountPage = pageSummaries.find(({ url, bodyText }) =>
            /tubebuddy\.com/i.test(url) ||
            /TubeBuddy|License|Launch Extension|Sign Out/i.test(bodyText)
        );
        if (tubeBuddyAccountPage) return tubeBuddyAccountPage.page;

        return null;
    }

    private async getPageSummaries(): Promise<Array<Record<string, unknown>>> {
        const pages = this.context?.pages?.() || [];
        return await Promise.all(pages.map(async (page: any, index: number) => ({
            index,
            isCurrent: page === this.page,
            title: await page.title().catch(() => ''),
            url: page.url(),
            bodyText: await page.locator('body').innerText().then((text: string) => text.slice(0, 300)).catch(() => ''),
        })));
    }

    private async getExtensionStateSnapshot(page: any): Promise<Record<string, unknown> | null> {
        try {
            const client = await this.context.newCDPSession(page);
            const contexts: Array<{ id: number; name?: string; origin?: string }> = [];
            client.on('Runtime.executionContextCreated', (event: any) => {
                const context = event.context;
                contexts.push({
                    id: context.id,
                    name: context.name,
                    origin: context.origin,
                });
            });
            await client.send('Runtime.enable');
            await sleep(300);

            const snapshots: Array<Record<string, any>> = [];
            const evaluateErrors: Array<Record<string, unknown>> = [];
            for (const context of contexts) {
                let result: any;
                try {
                    result = await client.send('Runtime.evaluate', {
                        contextId: context.id,
                        awaitPromise: true,
                        returnByValue: true,
                        expression: `(() => {
                        const sanitizeValue = (key, value) => {
                            const sensitive = /token|auth|session|credential|secret/i.test(key);
                            if (sensitive) {
                                const text = value == null ? '' : String(value);
                                return { present: value != null && text.length > 0, type: typeof value, length: text.length };
                            }

                            if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
                                return value;
                            }

                            try {
                                const json = JSON.stringify(value);
                                return json.length > 400 ? { type: typeof value, length: json.length } : value;
                            } catch {
                                return { type: typeof value };
                            }
                        };

                        const sanitizeObject = (obj) => {
                            const output = {};
                            for (const [key, value] of Object.entries(obj || {})) {
                                output[key] = sanitizeValue(key, value);
                            }
                            return output;
                        };

                        const getArea = (area) => new Promise((resolve) => {
                            if (!area || typeof area.get !== 'function') return resolve(null);
                            try {
                                const result = area.get(null);
                                if (result && typeof result.then === 'function') {
                                    result.then((items) => resolve(items || {})).catch((error) => resolve({ __error: error.message }));
                                    return;
                                }

                                area.get(null, (items) => {
                                    const lastError = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.lastError : null;
                                    if (lastError) resolve({ __error: lastError.message });
                                    else resolve(items || {});
                                });
                            } catch (error) {
                                resolve({ __error: error && error.message ? error.message : String(error) });
                            }
                        });

                        const callTBGlobal = (name) => {
                            try {
                                if (typeof TBGlobal === 'undefined' || typeof TBGlobal[name] !== 'function') {
                                    return { available: false };
                                }

                                return { available: true, value: TBGlobal[name]() };
                            } catch (error) {
                                return {
                                    available: true,
                                    error: error && error.message ? error.message : String(error),
                                };
                            }
                        };

                        const summarizeProfile = (profile) => {
                            if (profile == null) return null;

                            const summary = {
                                type: typeof profile,
                                keys: Object.keys(profile).sort().slice(0, 60),
                            };

                            for (const key of [
                                'Id',
                                'ChannelId',
                                'YouTubeChannelId',
                                'ChannelTitle',
                                'Title',
                                'Name',
                                'License',
                                'LicenseLevel',
                                'HasAccessToken',
                            ]) {
                                if (Object.prototype.hasOwnProperty.call(profile, key)) {
                                    summary[key] = sanitizeValue(key, profile[key]);
                                }
                            }

                            return summary;
                        };

                        const getTBGlobalState = () => {
                            const currentChannelId = callTBGlobal('CurrentChannelId');
                            const token = callTBGlobal('GetToken');
                            const profile = callTBGlobal('Profile');
                            const isAuthenticated = callTBGlobal('IsAuthenticated');

                            return {
                                hasTBGlobal: typeof TBGlobal !== 'undefined',
                                hasTubeBuddyMenu: typeof TubeBuddyMenu !== 'undefined',
                                hasKeywordExplorer: typeof TubeBuddyKeywordExplorer !== 'undefined',
                                currentChannelId: currentChannelId.error ? { error: currentChannelId.error } : currentChannelId.value ?? null,
                                token: token.error ? { error: token.error } : sanitizeValue('token', token.value),
                                profile: profile.error ? { error: profile.error } : summarizeProfile(profile.value),
                                isAuthenticated: isAuthenticated.error ? { error: isAuthenticated.error } : isAuthenticated.value ?? null,
                            };
                        };

                        return (async () => {
                            const api = typeof browser !== 'undefined' && browser.storage
                                ? browser
                                : (typeof chrome !== 'undefined' && chrome.storage ? chrome : null);
                            if (!api || !api.storage) return { ok: false, reason: 'storage-api-unavailable' };

                            const sync = await getArea(api.storage.sync);
                            const local = await getArea(api.storage.local);
                            return {
                                ok: true,
                                url: location.href,
                                syncKeys: Object.keys(sync || {}).sort(),
                                localKeys: Object.keys(local || {}).sort(),
                                sync: sanitizeObject(sync),
                                local: sanitizeObject(local),
                                tbGlobal: getTBGlobalState(),
                            };
                        })();
                    })()`,
                    });
                } catch (error: any) {
                    evaluateErrors.push({
                        context,
                        error: error && error.message ? error.message : String(error),
                    });
                    continue;
                }

                const value = result?.result?.value;
                if (value?.ok) {
                    snapshots.push({
                        context,
                        ...value,
                    });
                }
            }

            const currentUrl = page.url();
            const best =
                snapshots.find((snapshot) => snapshot.url === currentUrl) ||
                snapshots.find((snapshot) => /studio\.youtube\.com/i.test(snapshot.url) && snapshot.tbGlobal?.hasTBGlobal) ||
                snapshots.find((snapshot) => /studio\.youtube\.com/i.test(snapshot.url)) ||
                snapshots.find((snapshot) => snapshot.tbGlobal?.hasTBGlobal) ||
                snapshots[0];

            if (best) {
                return {
                    ...best,
                    candidateContexts: snapshots.map((snapshot) => ({
                        context: snapshot.context,
                        url: snapshot.url,
                        syncKeys: snapshot.syncKeys,
                        localKeys: snapshot.localKeys,
                        tbGlobal: snapshot.tbGlobal,
                    })),
                    evaluateErrors,
                };
            }

            return { ok: false, reason: 'extension-storage-context-not-found', contexts, evaluateErrors };
        } catch (err: any) {
            return { ok: false, reason: err.message };
        }
    }

    private async ensureDebugPageReady(): Promise<void> {
        if (!this.isInitialized) await this.initialize();
        if (!this.page) return;

        const currentUrl = this.page.url();
        if (!currentUrl || currentUrl === 'about:blank') {
            await this.page.goto(TB_SELECTORS.webDashboard.url, {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
            });
        }

        this.isLoggedIn = await this.checkIsLoggedIn(this.page);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    private async closeBrowser(): Promise<void> {
        if (this.context) {
            try {
                await this.context.close();
            } catch { /* ignore */ }
            this.context = null;
            this.page = null;
            this.isInitialized = false;
            this.rateLimiter.reset();
        }
    }

    async close(): Promise<void> {
        this.credentialManager.stopTimer();
        await this.closeBrowser();
    }

    /**
     * Call this when user leaves the MarketingMaster module.
     * Clears credentials after 30-min timeout unless called sooner.
     */
    onModuleDeactivate(): void {
        // Don't immediately clear — give 30-min grace period
        this.credentialManager.resetTimer();
    }

    /**
     * Call this when user is actively using MarketingMaster.
     * Resets the 30-min inactivity timeout.
     */
    onModuleActive(): void {
        this.credentialManager.resetTimer();
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

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
