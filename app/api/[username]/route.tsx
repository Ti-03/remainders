/**
 * Username-based Wallpaper API Route
 * 
 * Handles requests to /api/[username] and generates wallpapers
 * using user's saved configuration and enabled plugins from Firestore.
 * 
 * Example: /api/john -> Fetches john's config and generates wallpaper
 */

import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';
import { readConfigByUsername } from '@/lib/storage';
import { Plugin, UserConfig } from '@/lib/types';
import LifeView from '../wallpaper/life-view-enhanced';
import YearView from '../wallpaper/year-view-enhanced';

// Import plugins directly for server-side execution
import { quotesPlugin } from '@/lib/plugins/quotes-plugin';
import { habitTrackerPlugin } from '@/lib/plugins/habit-tracker-plugin';
import { moonPhasePlugin } from '@/lib/plugins/moon-phase-plugin';

export const runtime = 'nodejs';

/**
 * Get current date in the specified timezone
 */
function getDateInTimezone(timezone: string = 'UTC'): Date {
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const dateParts: Record<string, string> = {};
  
  parts.forEach(({ type, value }) => {
    dateParts[type] = value;
  });
  
  return new Date(
    `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}:${dateParts.second}`
  );
}

// Rate limiting map (in-memory, resets on Edge function restart)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 100; // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(username: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(username);

  if (!record || now > record.resetTime) {
    // Create new window
    rateLimitMap.set(username, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  record.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await params;
    const username = rawUsername?.toLowerCase() || '';
    
    if (!username) {
      return new Response('Username is required', { status: 400 });
    }

    // Check rate limit
    if (!checkRateLimit(username)) {
      return new Response('Rate limit exceeded. Please try again later.', {
        status: 429,
        headers: { 'Retry-After': '60' }
      });
    }

    // Fetch user configuration from local storage
    const { data: configData, error: configError } = await readConfigByUsername(username);

    if (configError || !configData) {
      return new Response(`User configuration not found. Please complete your setup at ${request.nextUrl.origin}/dashboard`, { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const config = configData as UserConfig;
    
    // Apply default values for optional fields to ensure robustness
    config.colors = config.colors || {
      background: '#1a1a1a',
      past: '#FFFFFF',
      current: '#FF6B35',
      future: '#404040',
      text: '#888888',
    };
    
    // Ensure nested color properties exist
    if (config.colors) {
      config.colors.background = config.colors.background || '#1a1a1a';
      config.colors.past = config.colors.past || '#FFFFFF';
      config.colors.current = config.colors.current || '#FF6B35';
      config.colors.future = config.colors.future || '#404040';
      config.colors.text = config.colors.text || '#888888';
    }
    
    config.typography = config.typography || {
      fontFamily: 'monospace',
      fontSize: 0.035,
      statsVisible: true,
    };
    
    // Ensure nested typography properties exist
    if (config.typography) {
      config.typography.fontFamily = config.typography.fontFamily || 'monospace';
      config.typography.fontSize = config.typography.fontSize ?? 0.035;
      config.typography.statsVisible = config.typography.statsVisible ?? true;
    }
    
    config.layout = config.layout || {
      topPadding: 0.25,
      bottomPadding: 0.15,
      sidePadding: 0.18,
      dotSpacing: 0.7,
    };
    
    // Ensure nested layout properties exist
    if (config.layout) {
      config.layout.topPadding = config.layout.topPadding ?? 0.25;
      config.layout.bottomPadding = config.layout.bottomPadding ?? 0.15;
      config.layout.sidePadding = config.layout.sidePadding ?? 0.18;
      config.layout.dotSpacing = config.layout.dotSpacing ?? 0.7;
    }
    
    config.textElements = config.textElements || [];
    config.plugins = config.plugins || [];
    
    console.log('Config after defaults - colors:', config.colors);
    
    // Validate required fields
    if (!config.birthDate && config.viewMode === 'life') {
      return new Response('Birthdate is required for Life View. Please configure in dashboard.', { status: 400 });
    }
    
    if (!config.device || !config.device.width || !config.device.height) {
      return new Response('Device configuration is required. Please configure in dashboard.', { status: 400 });
    }

    // Map of available built-in plugins
    const availablePlugins = new Map<string, Plugin>([
      [quotesPlugin.id, quotesPlugin],
      [habitTrackerPlugin.id, habitTrackerPlugin],
      [moonPhasePlugin.id, moonPhasePlugin],
    ]);

    // Get current date in user's timezone
    const userTimezone = config.timezone || 'UTC';
    const currentDate = getDateInTimezone(userTimezone);

    // Execute plugins and collect render elements
    const pluginRenderElements: any[] = [];
    console.log('Executing plugins, config.plugins count:', config.plugins?.length || 0);
    
    for (const pluginConfig of config.plugins || []) {
      if (!pluginConfig.enabled) {
        console.log(`Plugin ${pluginConfig.pluginId}: disabled, skipping`);
        continue;
      }
      
      // Try to get built-in plugin
      const plugin = availablePlugins.get(pluginConfig.pluginId);
      
      if (!plugin) {
        console.log(`Plugin ${pluginConfig.pluginId}: not found`);
        continue;
      }
      
      if (!plugin.execute) {
        console.log(`Plugin ${pluginConfig.pluginId}: no execute function`);
        continue;
      }
      
      try {
        console.log(`Executing plugin ${pluginConfig.pluginId}`);
        const elements = plugin.execute({
          config: pluginConfig.config || {},
          width: config.device.width,
          height: config.device.height,
          colors: config.colors,
          typography: config.typography,
          birthDate: config.birthDate,
          viewMode: config.viewMode,
          timezone: userTimezone,
          currentDate: currentDate,
        });
        
        console.log(`Plugin ${pluginConfig.pluginId} returned ${elements?.length || 0} elements`);
        if (Array.isArray(elements)) {
          pluginRenderElements.push(...elements);
        }
      } catch (error: any) {
        console.error(`Plugin ${pluginConfig.pluginId} execution error:`, error);
      }
    }
    
    console.log('Total plugin render elements:', pluginRenderElements.length);
    console.log('Sample plugin elements:', JSON.stringify(pluginRenderElements.slice(0, 3), null, 2));

    // Prepare view props
    const viewProps = {
      width: config.device.width,
      height: config.device.height,
      colors: config.colors,
      typography: config.typography,
      layout: config.layout,
      textElements: config.textElements,
      pluginElements: pluginRenderElements,
      currentDate: currentDate,
    };

    let view;
    if (config.viewMode === 'life') {
      view = LifeView({
        ...viewProps,
        birthDate: config.birthDate,
      });
    } else {
      view = YearView({
        ...viewProps,
        isMondayFirst: config.isMondayFirst || false,
        yearViewLayout: config.yearViewLayout || 'months',
        daysLayoutMode: config.daysLayoutMode || 'continuous',
        timezone: userTimezone,
      });
    }

    return new ImageResponse(view, {
      width: config.device.width,
      height: config.device.height,
    });

  } catch (error: any) {
    console.error('Error generating wallpaper:', error);
    return new Response('Internal server error: ' + error.message, { status: 500 });
  }
}
