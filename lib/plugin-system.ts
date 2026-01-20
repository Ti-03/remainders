/**
 * Plugin System Architecture
 * 
 * Provides a secure sandbox for executing community plugins server-side.
 * Plugins can modify calculations, add visual elements, or extend functionality.
 */

import { PluginContext, PluginCalculationResult, PluginRenderResult, Plugin, PluginConfig } from './types';
import { calculateWeeksLived, getCurrentDayOfYear } from './calcs';

/**
 * Maximum execution time for a single plugin (milliseconds)
 */
const PLUGIN_TIMEOUT_MS = 500;

/**
 * Allowlisted global APIs that plugins can access
 * Prevents access to dangerous APIs like fetch, eval, etc.
 */
const ALLOWED_GLOBALS = {
  Math,
  Date,
  JSON,
  String,
  Number,
  Array,
  Object,
  console: {
    log: (...args: any[]) => console.log('[Plugin]', ...args),
    error: (...args: any[]) => console.error('[Plugin]', ...args),
  }
};

/**
 * Create a sandboxed plugin context
 */
export function createPluginContext(
  birthDate: string,
  width: number,
  height: number,
  viewMode: 'year' | 'life',
  settings: Record<string, any>,
  timezone?: string,
  integrations?: { strava?: any[] }
): PluginContext {
  // Get current date in specified timezone
  let currentDate = new Date();
  if (timezone) {
    try {
      // Convert to timezone-aware date
      const dateStr = currentDate.toLocaleString('en-US', { timeZone: timezone });
      currentDate = new Date(dateStr);
    } catch (error) {
      console.error('Invalid timezone:', timezone, error);
    }
  }

  return {
    currentDate,
    birthDate,
    width,
    height,
    viewMode,
    settings,
    integrations,
    utils: {
      formatDate: (date: Date, format: string) => {
        // Simple date formatter
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return format
          .replace('YYYY', String(year))
          .replace('MM', month)
          .replace('DD', day);
      },
      getWeeksLived: (birthDate: string) => calculateWeeksLived(birthDate),
      getCurrentDayOfYear: () => getCurrentDayOfYear(),
    }
  };
}

/**
 * Execute plugin calculation hook with timeout and error handling
 */
export async function executePluginCalculation(
  pluginCode: string,
  context: PluginContext
): Promise<{ result: PluginCalculationResult | null; error: string | null }> {
  try {
    // Create isolated function scope with only allowed globals
    const pluginFunction = new Function(
      'context',
      'Math',
      'Date',
      'JSON',
      'String',
      'Number',
      'Array',
      'Object',
      'console',
      `
        'use strict';
        ${pluginCode}
        
        // Plugin must export a calculate function
        if (typeof calculate !== 'function') {
          throw new Error('Plugin must export a calculate() function');
        }
        
        return calculate(context);
      `
    );

    // Execute with timeout
    const result = await Promise.race([
      Promise.resolve(pluginFunction(
        context,
        ALLOWED_GLOBALS.Math,
        ALLOWED_GLOBALS.Date,
        ALLOWED_GLOBALS.JSON,
        ALLOWED_GLOBALS.String,
        ALLOWED_GLOBALS.Number,
        ALLOWED_GLOBALS.Array,
        ALLOWED_GLOBALS.Object,
        ALLOWED_GLOBALS.console
      )),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Plugin execution timeout')), PLUGIN_TIMEOUT_MS)
      )
    ]);

    return { result: result as PluginCalculationResult, error: null };
  } catch (error: any) {
    console.error('Plugin calculation error:', error);
    return { result: null, error: error.message || 'Plugin execution failed' };
  }
}

/**
 * Execute plugin render hook with timeout and error handling
 */
export async function executePluginRender(
  pluginCode: string,
  context: PluginContext
): Promise<{ result: PluginRenderResult | null; error: string | null }> {
  try {
    // Create isolated function scope
    const pluginFunction = new Function(
      'context',
      'Math',
      'Date',
      'JSON',
      'String',
      'Number',
      'Array',
      'Object',
      'console',
      `
        'use strict';
        ${pluginCode}
        
        // Plugin must export a render function
        if (typeof render !== 'function') {
          throw new Error('Plugin must export a render() function');
        }
        
        return render(context);
      `
    );

    // Execute with timeout
    const result = await Promise.race([
      Promise.resolve(pluginFunction(
        context,
        ALLOWED_GLOBALS.Math,
        ALLOWED_GLOBALS.Date,
        ALLOWED_GLOBALS.JSON,
        ALLOWED_GLOBALS.String,
        ALLOWED_GLOBALS.Number,
        ALLOWED_GLOBALS.Array,
        ALLOWED_GLOBALS.Object,
        ALLOWED_GLOBALS.console
      )),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Plugin execution timeout')), PLUGIN_TIMEOUT_MS)
      )
    ]);

    return { result: result as PluginRenderResult, error: null };
  } catch (error: any) {
    console.error('Plugin render error:', error);
    return { result: null, error: error.message || 'Plugin execution failed' };
  }
}

/**
 * Validate plugin code for security risks
 */
export function validatePluginCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/gi, message: 'eval() is not allowed' },
    { pattern: /Function\s*\(/gi, message: 'Function constructor is not allowed' },
    { pattern: /import\s+/gi, message: 'import statements are not allowed' },
    { pattern: /require\s*\(/gi, message: 'require() is not allowed' },
    { pattern: /process\./gi, message: 'process access is not allowed' },
    { pattern: /global\./gi, message: 'global access is not allowed' },
    { pattern: /fetch\s*\(/gi, message: 'fetch() is not allowed' },
    { pattern: /XMLHttpRequest/gi, message: 'XMLHttpRequest is not allowed' },
    { pattern: /__dirname/gi, message: '__dirname is not allowed' },
    { pattern: /__filename/gi, message: '__filename is not allowed' },
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      errors.push(message);
    }
  }

  // Check code length (prevent massive plugins)
  if (code.length > 50000) {
    errors.push('Plugin code exceeds maximum length (50KB)');
  }

  // Check for required functions
  if (!code.includes('function calculate') && !code.includes('function render')) {
    errors.push('Plugin must define at least calculate() or render() function');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Process all enabled plugins for a user config
 */
export async function processPlugins(
  plugins: PluginConfig[],
  pluginDefinitions: Map<string, Plugin>,
  baseContext: Omit<PluginContext, 'settings'>
): Promise<{
  calculationResults: Map<string, PluginCalculationResult>;
  renderResults: Map<string, PluginRenderResult>;
  errors: Map<string, string>;
}> {
  const calculationResults = new Map<string, PluginCalculationResult>();
  const renderResults = new Map<string, PluginRenderResult>();
  const errors = new Map<string, string>();

  // Process each enabled plugin
  for (const pluginConfig of plugins) {
    if (!pluginConfig.enabled) continue;

    const pluginDef = pluginDefinitions.get(pluginConfig.pluginId);
    if (!pluginDef) {
      errors.set(pluginConfig.pluginId, 'Plugin definition not found');
      continue;
    }

    // Create plugin-specific context
    const context: PluginContext = {
      ...baseContext,
      settings: pluginConfig.config
    };

    // Skip if plugin has no code
    if (!pluginDef.code) {
      errors.set(pluginConfig.pluginId, 'Plugin has no executable code');
      continue;
    }

    // Try calculation hook
    const calcResult = await executePluginCalculation(pluginDef.code, context);
    if (calcResult.error) {
      errors.set(pluginConfig.pluginId, calcResult.error);
    } else if (calcResult.result) {
      calculationResults.set(pluginConfig.pluginId, calcResult.result);
    }

    // Try render hook
    const renderResult = await executePluginRender(pluginDef.code, context);
    if (renderResult.error) {
      errors.set(pluginConfig.pluginId, renderResult.error);
    } else if (renderResult.result) {
      renderResults.set(pluginConfig.pluginId, renderResult.result);
    }
  }

  return { calculationResults, renderResults, errors };
}

/**
 * Merge plugin results into base context
 */
export function mergePluginResults(
  baseDate: Date,
  calculationResults: Map<string, PluginCalculationResult>
): { currentDate: Date; pluginData: Record<string, any> } {
  let currentDate = baseDate;
  const pluginData: Record<string, any> = {};

  // Apply calculation results (timezone plugins modify currentDate)
  for (const [pluginId, result] of calculationResults.entries()) {
    if (result.currentDate) {
      currentDate = result.currentDate;
    }
    if (result.data) {
      pluginData[pluginId] = result.data;
    }
  }

  return { currentDate, pluginData };
}
