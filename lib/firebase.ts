/**
 * Config Client
 *
 * Client-side functions for reading/writing wallpaper config via the /api/config route.
 */

import { quotesPlugin } from '@/lib/plugins/quotes-plugin';
import { habitTrackerPlugin } from '@/lib/plugins/habit-tracker-plugin';
import { moonPhasePlugin } from '@/lib/plugins/moon-phase-plugin';

export async function getUserConfigByUsername() {
  try {
    const res = await fetch('/api/config');
    const json = await res.json();
    return { data: json.data, error: json.error };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
}

export async function saveUserConfig(_username: string, config: any) {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const json = await res.json();
    return { success: json.success, error: json.error };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

const builtinPlugins = [quotesPlugin, habitTrackerPlugin, moonPhasePlugin];

export async function getAvailablePlugins() {
  return { data: builtinPlugins, error: null };
}
