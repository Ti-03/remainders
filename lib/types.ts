/**
 * Core TypeScript types for Remainders wallpaper generator
 * 
 * This file defines all shared interfaces and types used throughout the application.
 * Keeping types in a central location ensures consistency and makes the codebase
 * easier to maintain and understand.
 */

/**
 * Represents information about a specific phone model
 * Used to generate wallpapers with the correct dimensions for each device
 */
export interface DeviceModel {
  /** Brand name (e.g., "Apple", "Samsung", "Google") */
  brand: string;
  
  /** Full model name (e.g., "iPhone 15 Pro", "Galaxy S24 Ultra") */
  model: string;
  
  /** Screen width in pixels */
  width: number;
  
  /** Screen height in pixels */
  height: number;
}

/**
 * View mode for the wallpaper visualization
 * - 'year': Shows only the current year (52 weeks)
 * - 'life': Shows entire life span (4160 weeks for 80 years)
 */
export type ViewMode = 'year' | 'life';

/**
 * Days layout mode for year view
 * - 'calendar': Follows week structure (Sun-Sat or Mon-Sun), respects isMondayFirst
 * - 'continuous': Lists all days continuously without week alignment
 */
export type DaysLayoutMode = 'calendar' | 'continuous';

/**
 * User's profile data stored in localStorage
 * Contains all information needed to generate a personalized wallpaper
 */
export interface UserProfile {
  /** Birth date in YYYY-MM-DD format (ISO 8601 date string) */
  birthDate: string;
  
  /** Theme color in hex format (e.g., "#FF6B35") */
  themeColor: string;
  
  /** Selected phone device information */
  device: {
    /** Device brand (e.g., "Apple", "Samsung") */
    brand: string;
    
    /** Full model name matching DeviceModel.model */
    modelName: string;
    
    /** Screen width in pixels */
    width: number;
    
    /** Screen height in pixels */
    height: number;
  };
  
  /** Visualization mode: year or life view */
  viewMode: ViewMode;
  
  /** Monday as first day of week (for year view) */
  isMondayFirst?: boolean;
  
  /** Days layout mode: 'calendar' (week-aligned) or 'continuous' (no alignment) */
  daysLayoutMode?: DaysLayoutMode;
}

/**
 * Parameters passed to the wallpaper generation API
 * These are extracted from UserProfile and sent as URL parameters
 */
export interface WallpaperParams {
  /** Birth date in YYYY-MM-DD format */
  birthDate: string;
  
  /** Theme color in hex format (without # symbol for URL encoding) */
  themeColor: string;
  
  /** Wallpaper width in pixels */
  width: number;
  
  /** Wallpaper height in pixels */
  height: number;
  
  /** View mode: 'year' or 'life' */
  viewMode: ViewMode;
  
  /** Monday as first day of week (for year view) */
  isMondayFirst?: boolean;
  
  /** Days layout mode: 'calendar' (week-aligned) or 'continuous' (no alignment) */
  daysLayoutMode?: DaysLayoutMode;
}

/**
 * Text element that can be added to wallpaper
 */
export interface TextElement {
  /** Unique identifier for the text element */
  id: string;
  
  /** Text content to display */
  content: string;
  
  /** Position X (percentage 0-100) */
  x: number;
  
  /** Position Y (percentage 0-100) */
  y: number;
  
  /** Font size in pixels */
  fontSize: number;
  
  /** Font family name */
  fontFamily: string;
  
  /** Text color in hex format */
  color: string;
  
  /** Text alignment */
  align: 'left' | 'center' | 'right';
  
  /** Whether element is visible */
  visible: boolean;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfig {
  /** Plugin ID reference */
  pluginId: string;
  
  /** Whether plugin is enabled */
  enabled: boolean;
  
  /** Plugin-specific configuration (JSON object) */
  config: Record<string, any>;
}

/**
 * Complete user configuration stored in Firestore
 */
export interface UserConfig {
  /** User ID from Firebase Auth */
  userId: string;
  
  /** Unique username (lowercase) */
  username: string;
  
  /** Birth date in YYYY-MM-DD format */
  birthDate: string;
  
  /** View mode: year or life */
  viewMode: ViewMode;
  
  /** Device dimensions */
  device: {
    brand: string;
    modelName: string;
    width: number;
    height: number;
  };
  
  /** Visual customization */
  colors: {
    background: string;
    past: string;
    current: string;
    future: string;
    text: string;
  };
  
  /** Typography settings */
  typography: {
    fontFamily: string;
    fontSize: number;
    statsVisible: boolean;
  };
  
  /** Custom text elements */
  textElements: TextElement[];
  
  /** Layout preferences */
  layout: {
    topPadding: number;
    bottomPadding: number;
    sidePadding: number;
    dotSpacing: number;
  };
  
  /** Enabled plugins */
  plugins: PluginConfig[];
  
  /** Monday as first day of week (for year view) */
  isMondayFirst: boolean;
  
  /** Year view layout type: 'months' (default) or 'days' */
  yearViewLayout?: 'months' | 'days';
  
  /** Days layout mode: 'calendar' (week-aligned) or 'continuous' (no alignment) */
  daysLayoutMode?: DaysLayoutMode;
  
  /** User's timezone (IANA format) */
  timezone?: string;
  
  /** Last updated timestamp */
  updatedAt: Date | null;
}

/**
 * Plugin definition stored in Firestore marketplace
 */
export interface Plugin {
  /** Plugin unique ID */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Short description */
  description: string;
  
  /** Plugin author */
  author: string;
  
  /** Version string (semver) */
  version: string;
  
  /** Plugin code (JavaScript string) */
  code?: string;
  
  /** Configuration schema (JSON Schema) */
  configSchema: Record<string, any>;
  
  /** Admin approval status */
  approved?: boolean;
  
  /** Privacy setting - if true, only author can see it */
  isPrivate?: boolean;
  
  /** Author user ID */
  authorId?: string;
  
  /** Download count */
  downloads?: number;
  
  /** Plugin rating */
  rating?: number;
  
  /** Creation timestamp */
  createdAt?: Date;
  
  /** Last update timestamp */
  updatedAt?: Date;
  
  /** Plugin execution function (not stored in Firestore) */
  execute?: (ctx: PluginExecutionContext) => PluginRenderElement[];
}

/**
 * Plugin execution context passed to plugin code
 */
export interface PluginExecutionContext {
  /** Plugin configuration */
  config: Record<string, any>;
  
  /** Full user settings (includes isMondayFirst, device, etc.) */
  settings?: Record<string, any>;
  
  /** Wallpaper width */
  width: number;
  
  /** Wallpaper height */
  height: number;
  
  /** Color scheme */
  colors?: {
    background: string;
    past: string;
    current: string;
    future: string;
    text: string;
  };
  
  /** Typography settings */
  typography?: {
    fontFamily: string;
    fontSize: number;
    statsVisible: boolean;
  };
  
  /** Birth date */
  birthDate?: string;
  
  /** View mode */
  viewMode?: ViewMode;
  
  /** User's timezone (IANA format) */
  timezone?: string;
  
  /** Current date in user's timezone */
  currentDate?: Date;

  /** Connected integrations data */
  integrations?: {
    strava?: any[]; // Array of activities
  };
}

/**
 * Render element returned by plugin
 */
export interface PluginRenderElement {
  /** Element type */
  type: 'text' | 'rect' | 'circle' | 'line' | 'day-color-modifier' | 'legend-data';
  
  /** Element content (for text) */
  content?: string;
  
  /** X position (optional for modifier/legend types) */
  x?: number;
  
  /** Y position (optional for modifier/legend types) */
  y?: number;
  
  /** Width (for rect) */
  width?: number;
  
  /** Height (for rect) */
  height?: number;
  
  /** Radius (for circle) */
  radius?: number;
  
  /** Font size (for text) */
  fontSize?: number;
  
  /** Font family (for text) */
  fontFamily?: string;
  
  /** Color */
  color?: string;
  
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  
  /** Max width for text wrapping */
  maxWidth?: number;
  
  /** Date string for day-color-modifier (YYYY-MM-DD format) */
  date?: string;
  
  /** Legend items for legend-data type */
  items?: { label: string; color: string }[];
}

/**
 * Plugin execution context passed to plugin code (deprecated, use PluginExecutionContext)
 */
export interface PluginContext {
  /** Current date in user's timezone */
  currentDate: Date;
  
  /** User's birthdate */
  birthDate: string;
  
  /** Device dimensions */
  width: number;
  height: number;
  
  /** View mode */
  viewMode: ViewMode;
  
  /** Plugin settings */
  settings: Record<string, any>;
  
  /** Utility functions available to plugin */
  utils: {
    /** Format date according to locale */
    formatDate: (date: Date, format: string) => string;
    
    /** Get weeks lived */
    getWeeksLived: (birthDate: string) => number;
    
    /** Get current day of year */
    getCurrentDayOfYear: () => number;
  };
  
  /** Connected integrations data */
  integrations?: {
    strava?: any[];
  };
}

/**
 * Plugin hook return type for calculation modifiers
 */
export interface PluginCalculationResult {
  /** Modified current date (for timezone plugins) */
  currentDate?: Date;
  
  /** Additional data to pass to rendering */
  data?: Record<string, any>;
}

/**
 * Plugin hook return type for rendering extensions
 */
export interface PluginRenderResult {
  /** Additional SVG/HTML elements to render */
  elements?: string;
  
  /** Modified color palette */
  colors?: Partial<UserConfig['colors']>;
}
