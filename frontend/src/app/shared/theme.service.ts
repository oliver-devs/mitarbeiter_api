import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorTheme =
    | 'azure' | 'navy' | 'teal' | 'forest' | 'olive'
    | 'rose' | 'lavender' | 'coral' | 'magenta' | 'peach';

export const MODE_OPTIONS = [
    { value: 'light' as ThemeMode, label: 'Hell', icon: 'light_mode' },
    { value: 'dark' as ThemeMode, label: 'Dunkel', icon: 'dark_mode' },
    { value: 'system' as ThemeMode, label: 'System', icon: 'desktop_windows' },
];

export const COLOR_THEMES = [
    { id: 'azure' as ColorTheme, label: 'Azure', preview: '#0078d4' },
    { id: 'rose' as ColorTheme, label: 'Rosé', preview: '#e91e63' },
    { id: 'navy' as ColorTheme, label: 'Navy', preview: '#6b8db5' },
    { id: 'lavender' as ColorTheme, label: 'Lavendel', preview: '#9b8ec4' },
    { id: 'teal' as ColorTheme, label: 'Teal', preview: '#6ba8a0' },
    { id: 'coral' as ColorTheme, label: 'Coral', preview: '#c47e7a' },
    { id: 'forest' as ColorTheme, label: 'Forest', preview: '#7ba882' },
    { id: 'magenta' as ColorTheme, label: 'Magenta', preview: '#b07aaf' },
    { id: 'olive' as ColorTheme, label: 'Olive', preview: '#8a9b6e' },
    { id: 'peach' as ColorTheme, label: 'Peach', preview: '#d4a76a' },
];

const GENDER_DEFAULT_COLOR: Record<string, ColorTheme> = {
    male: 'azure',
    female: 'rose',
    diverse: 'lavender',
};

const ALL_COLOR_IDS = COLOR_THEMES.map((t) => t.id);
const STORAGE_ACTIVE_USER = 'theme-active-user';
const DEFAULT_MODE: ThemeMode = 'system';
const DEFAULT_COLOR: ColorTheme = 'azure';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    readonly mode = signal<ThemeMode>(DEFAULT_MODE);
    readonly colorTheme = signal<ColorTheme>(DEFAULT_COLOR);

    private currentUsername: string | null = null;
    private readonly systemPrefersDark = signal(window.matchMedia('(prefers-color-scheme: dark)').matches);

    readonly isDarkMode = computed(() => {
        const m = this.mode();
        if (m === 'system') return this.systemPrefersDark();
        return m === 'dark';
    });

    constructor() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            this.systemPrefersDark.set(e.matches);
        });

        // Beim Start: letzten aktiven User laden (vermeidet Theme-Flash bei Page-Refresh)
        const lastUser = localStorage.getItem(STORAGE_ACTIVE_USER);
        if (lastUser) {
            this.currentUsername = lastUser;
            this.mode.set(this.loadUserSetting(lastUser, 'mode', DEFAULT_MODE));
            this.colorTheme.set(this.loadUserSetting(lastUser, 'color', DEFAULT_COLOR));
        }

        effect(() => {
            const dark = this.isDarkMode();
            const color = this.colorTheme();
            const html = document.documentElement;

            html.classList.toggle('dark', dark);

            for (const id of ALL_COLOR_IDS) {
                html.classList.toggle(`theme-${id}`, id === color);
            }
        });
    }

    activateForUser(username: string, gender?: string): void {
        this.currentUsername = username;
        localStorage.setItem(STORAGE_ACTIVE_USER, username);
        const colorDefault = GENDER_DEFAULT_COLOR[gender ?? ''] ?? DEFAULT_COLOR;
        this.mode.set(this.loadUserSetting(username, 'mode', DEFAULT_MODE));
        this.colorTheme.set(this.loadUserSetting(username, 'color', colorDefault));
    }

    resetToDefaults(): void {
        this.currentUsername = null;
        localStorage.removeItem(STORAGE_ACTIVE_USER);
        this.mode.set(DEFAULT_MODE);
        this.colorTheme.set(DEFAULT_COLOR);
    }

    setMode(mode: ThemeMode): void {
        this.mode.set(mode);
        if (this.currentUsername) {
            localStorage.setItem(`theme-mode-${this.currentUsername}`, mode);
        }
    }

    setColor(color: ColorTheme): void {
        this.colorTheme.set(color);
        if (this.currentUsername) {
            localStorage.setItem(`theme-color-${this.currentUsername}`, color);
        }
    }

    private loadUserSetting<T extends string>(username: string, key: string, fallback: T): T {
        const saved = localStorage.getItem(`theme-${key}-${username}`);
        if (!saved) return fallback;
        if (key === 'color' && !ALL_COLOR_IDS.includes(saved as ColorTheme)) return fallback;
        return saved as T;
    }
}
