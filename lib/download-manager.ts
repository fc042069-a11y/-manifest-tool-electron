import { HttpsProxyAgent } from "https-proxy-agent";
import AdmZip from "adm-zip";
import SteamUser from "steam-user";
import Flags from "steam-user/enums/EDepotFileFlag.js";
import pLimit from "p-limit";
import fs from "fs-extra";
import fsPromises from "fs/promises";
import axios, { AxiosInstance } from "axios";
import path from "path";
import { broadcastProgress, broadcastAllProgress } from "./socket-server";

const SETTINGS_PATH = path.join(process.cwd(), "data", "settings.json");

export type AppSettings = {
    theme: string;
    gameCardSize: string;
    downloadPath: string;
    proxy?: string;
    ryuuApiKey?: string;
};

const defaultSettings: AppSettings = {
    theme: "dark",
    gameCardSize: "75%",
    downloadPath: "G:\\SteamCracked\\",
    proxy: "",
    ryuuApiKey: ""
};

async function readSettings(): Promise<AppSettings> {
    try {
        const content = await fs.readFile(SETTINGS_PATH, "utf-8");
        return { ...defaultSettings, ...JSON.parse(content) };
    } catch {
        return defaultSettings;
    }
}

function sanitizeInstallDir(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\.+$/, "").trim();
}

export interface DownloadProgress {
    appid: string;
    status: "pending" | "downloading" | "completed" | "error" | "cancelled";
    progress: number;
    speed: number;
    eta: number;
    error?: string;
    fileName?: string;
    totalSize?: number;
    downloadedSize?: number;
    gameName?: string;
    currentDepot?: string;
    raw?: unknown;
}

type ProgressListener = (progress: DownloadProgress) => void;

type ProgressEvent =
    | { type: "game-name"; appId: string; gameName: string }
    | {
        type: "depot-progress";
        appId: string;
        depotId: string;
        fileName: string;
        downloadedBytes: number;
        totalBytes: number;
        percentage: number;
        speed: number;
        eta: number;
        raw: unknown;
    }
    | { type: "depot-complete"; appId: string; depotId: string }
    | { type: "complete"; appId: string }
    | { type: "error"; appId: string; error: Error; raw?: unknown };

class DownloadManager {
    private downloads: Map<string, DownloadProgress> = new Map();
    private listeners: Set<ProgressListener> = new Set();
    private activeDownloads: Map<string, AbortController> = new Map();

    addListener(listener: ProgressListener): () => void {
        this.listeners.add(listener);
        for (const p of this.downloads.values()) listener(p);
        return () => this.listeners.delete(listener);
    }

    private notify(p: DownloadProgress): void {
        for (const l of this.listeners) try { l(p); } catch { }
        
        // Broadcast via Socket.io
        try {
            broadcastProgress(p.appid, p);
        } catch (error) {
            // Socket.io may not be initialized yet, silently fail
        }
    }

    getProgress(appid: string): DownloadProgress | undefined {
        return this.downloads.get(appid);
    }

    getAllProgress(): DownloadProgress[] {
        return Array.from(this.downloads.values());
    }

    async startDownload(appid: string): Promise<DownloadProgress> {
        this.cancelDownload(appid);

        const settings: AppSettings = await readSettings();

        const finalProxy: string | undefined = settings.proxy || undefined;
        const finalRyuuApiKey: string = settings.ryuuApiKey || "";

        console.log("[DownloadManager] settings loaded");
        console.log("[DownloadManager] proxy:", finalProxy ?? "none");

        const controller: AbortController = new AbortController();
        this.activeDownloads.set(appid, controller);

        const initial: DownloadProgress = {
            appid,
            status: "pending",
            progress: 0,
            speed: 0,
            eta: 0
        };

        this.downloads.set(appid, initial);
        this.notify(initial);

        let signalReady!: () => void;
        const ready = new Promise<void>((resolve) => { signalReady = resolve; });
        let readyFired = false;

        const downloadPromise = this.downloadSteamGame({
            appId: appid,
            ryuuApiKey: finalRyuuApiKey,
            downloadBaseDir: settings.downloadPath,
            proxy: finalProxy,
            concurrency: 1,
            signal: controller.signal,
            onProgress: (e: any) => {
                const cur = this.downloads.get(appid);
                if (!cur) return;
                if (cur.status === "cancelled") return;

                if (e.type === "game-name") {
                    cur.gameName = e.gameName;
                    cur.fileName = e.gameName;
                }

                if (e.type === "depot-progress") {
                    cur.status = "downloading";
                    cur.progress = e.percentage;
                    cur.currentDepot = e.depotId;
                    cur.fileName = e.fileName;
                    cur.downloadedSize = e.downloadedBytes;
                    cur.totalSize = e.totalBytes;
                    cur.speed = e.speed;
                    cur.eta = e.eta;
                    cur.raw = e.raw;
                    if (!readyFired) { readyFired = true; signalReady(); }
                }

                if (e.type === "depot-complete") cur.progress = 100;

                if (e.type === "complete") {
                    cur.status = "completed";
                    cur.progress = 100;
                    cur.speed = 0;
                    cur.eta = 0;
                    if (!readyFired) { readyFired = true; signalReady(); }
                }

                if (e.type === "error") {
                    cur.status = "error";
                    cur.error = e.error?.message ?? "Unknown error";
                    cur.raw = e.raw;
                    if (!readyFired) { readyFired = true; signalReady(); }
                }

                this.notify({ ...cur });
            }
        });

        // Let the download keep running in the background after we return
        downloadPromise.catch((err: Error) => {
            const cur = this.downloads.get(appid);
            if (!cur) return;
            cur.status = "error";
            cur.error = err.message;
            this.notify({ ...cur });
            if (!readyFired) { readyFired = true; signalReady(); }
        });

        // Block until we have real progress (or an early error/complete)
        await ready;

        return this.downloads.get(appid) ?? initial;
    }

    cancelDownload(appid: string): boolean {
        const c = this.activeDownloads.get(appid);
        if (c) {
            c.abort();
            this.activeDownloads.delete(appid);
        }

        const p = this.downloads.get(appid);
        if (p && (p.status === "pending" || p.status === "downloading")) {
            p.status = "cancelled";
            p.speed = 0;
            p.eta = 0;
            this.notify(p);
            return true;
        }

        return false;
    }

    clearCompleted(appid: string): void {
        const p = this.downloads.get(appid);
        if (p && (p.status === "completed" || p.status === "error" || p.status === "cancelled")) {
            this.downloads.delete(appid);
        }
    }

    private async downloadSteamGame(params: {
        appId: string;
        ryuuApiKey: string;
        downloadBaseDir: string;
        proxy?: string;
        concurrency: number;
        signal: AbortSignal;
        onProgress: (e: ProgressEvent) => void;
    }): Promise<void> {
        const { appId, ryuuApiKey, downloadBaseDir, proxy, concurrency, signal, onProgress } = params;

        const httpsAgent = proxy ? new HttpsProxyAgent(proxy) : undefined;
        const client: AxiosInstance = axios.create({
            httpsAgent,
            headers: { "User-Agent": "Mozilla/5.0" }
        });

        const infoRes = await client.get(`https://generator.ryuu.lol/manifestinfo/${appId}`, { signal });
        const data: any = infoRes.data;

        if (!data || data.error) throw new Error("Manifest not found");

        const base: string = path.join(process.cwd(), "manifests");
        await fs.ensureDir(base);

        const extract: string = path.join(base, appId);
        await fs.ensureDir(extract);

        const zipPath: string = path.join(base, `${appId}.zip`);

        const zipRes = await client.get(
            `https://generator.ryuu.lol/secure_download?appid=${appId}&auth_code=${ryuuApiKey}&ryuuApiKey=GreenLumaDownloader`,
            { responseType: "arraybuffer", signal }
        );

        await fs.writeFile(zipPath, zipRes.data);

        const zip: AdmZip = new AdmZip(zipPath);
        zip.extractAllTo(extract, true);
        await fs.remove(zipPath);

        const files: string[] = await fs.readdir(extract);

        let lua: string = "";
        const manifests: Record<string, string> = {};

        for (const f of files) {
            const full: string = path.join(extract, f);

            if (f.endsWith(".manifest")) {
                const m = f.match(/^(\d+)_/);
                if (m) manifests[m[1]] = full;
            }

            if (f.endsWith(".lua")) lua = await fs.readFile(full, "utf-8");
        }

        const depots: Record<string, string> = {};

        const re: RegExp = /addappid\((\d+)(?:,0,"([a-f0-9]+)")?\)/g;

        for (const m of lua.matchAll(re)) {
            const [, id, key] = m;
            if (key) depots[id] = key;
        }

        const gameName: string | null = await this.getGameName(appId, httpsAgent);
        const safe: string = gameName ? sanitizeInstallDir(gameName) : appId;
        const gameOutputDir: string = path.join(downloadBaseDir, safe);

        onProgress({ type: "game-name", appId, gameName: safe });

        for (const [depotId, key] of Object.entries(depots)) {
            if (signal.aborted) throw new Error("Cancelled");

            const manifestFile: string | undefined = manifests[depotId];
            if (!manifestFile) continue;

            await this.downloadDepot({
                appId,
                depotId,
                manifestFile,
                decryptionKey: key,
                outputDirectory: gameOutputDir,
                proxy,
                concurrency,
                signal,
                onProgress
            });
        }

        onProgress({ type: "complete", appId });
    }

    private async downloadDepot(params: {
        appId: string;
        depotId: string;
        manifestFile: string;
        decryptionKey: string;
        outputDirectory: string;
        proxy?: string;
        concurrency: number;
        signal: AbortSignal;
        onProgress: (e: ProgressEvent) => void;
    }): Promise<void> {
        const { depotId, manifestFile, decryptionKey, outputDirectory, proxy, concurrency, signal, onProgress } = params;

        const limit = pLimit(Number(concurrency));
        const userOptions: any = {};

        if (proxy) {
            const u = new URL(proxy);
            const p = u.protocol.replace(":", "");
            if (p === "http" || p === "https") userOptions.httpProxy = proxy;
            else userOptions.socksProxy = proxy;
        }

        const user = new SteamUser(userOptions);

        await new Promise<void>((resolve, reject) => {
            user.logOn({ anonymous: true });

            user.once("loggedOn", async () => {
                try {
                    user.getRawManifest = async () => ({ manifest: await fsPromises.readFile(manifestFile) });
                    user.getDepotDecryptionKey = async () => ({ key: Buffer.from(decryptionKey, "hex") });

                    const { manifest }: any = await user.getManifest();

                    const files: any[] = manifest.files.filter((i: any) => !(i.flags & Flags.Directory));

                    const total: number = files.reduce((a: number, f: any) => a + Number(f.size || 0), 0);

                    let done: number = 0;
                    const start: number = Date.now();

                    const tasks = files.map((f: any) =>
                        limit(async () => {
                            if (signal.aborted) throw new Error("Cancelled");

                            const out: string = path.join(outputDirectory, f.filename);
                            await fsPromises.mkdir(path.dirname(out), { recursive: true });

                            await new Promise<void>((res, rej) => {
                                user.downloadFile(null, depotId, f, out, (err: Error, r: any) => {
                                    if (err) return rej(err);

                                    if (r?.type === "complete") {
                                        done += Number(f.size || 0);

                                        const elapsed: number = (Date.now() - start) / 1000;
                                        const speed: number = done / Math.max(elapsed, 1);
                                        const eta: number = (total - done) / Math.max(speed, 1);

                                        onProgress({
                                            type: "depot-progress",
                                            appId: params.appId,
                                            depotId,
                                            fileName: f.filename,
                                            downloadedBytes: done,
                                            totalBytes: total,
                                            percentage: (done / total) * 100,
                                            speed,
                                            eta,
                                            raw: { r, f }
                                        });

                                        res();
                                    }
                                });
                            });
                        })
                    );

                    await Promise.all(tasks);

                    onProgress({ type: "depot-complete", appId: params.appId, depotId });

                    resolve();
                } catch (e) {
                    reject(e);
                }
            });

            user.once("error", reject);
        });
    }

    private async getGameName(appId: string, httpsAgent?: any): Promise<string | null> {
        try {
            const r = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}`, { httpsAgent });
            if (r.data[appId]?.success) return r.data[appId].data.name;
        } catch { }
        return null;
    }
}

export const downloadManager = new DownloadManager();