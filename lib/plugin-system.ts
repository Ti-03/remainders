/**
 * Plugin System Architecture
 *
 * Provides a secure sandbox for executing community plugins server-side.
 * Uses isolated-vm to run plugin code in a separate V8 isolate with its own
 * heap — no shared references to the host process, no prototype chain escapes.
 * AST validation via acorn acts as a fast pre-filter to reject obviously
 * dangerous code before paying the isolate creation cost.
 */

import { PluginContext, PluginCalculationResult, PluginRenderResult, Plugin, PluginConfig } from './types';
import { calculateWeeksLived, getCurrentDayOfYear } from './calcs';
import * as acorn from 'acorn';
import ivm from 'isolated-vm';

/**
 * Maximum execution time for a single plugin (milliseconds)
 */
const PLUGIN_TIMEOUT_MS = 500;

/**
 * Memory limit per isolate in MB
 */
const ISOLATE_MEMORY_MB = 8;

/**
 * Create a sandboxed plugin context
 */
export function createPluginContext(
  birthDate: string,
  width: number,
  height: number,
  viewMode: 'year' | 'life',
  settings: Record<string, any>,
  timezone?: string
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
 * Serialize a PluginContext into a plain JSON-safe object for transfer into the isolate.
 * Date objects become ISO strings; the utils namespace is rebuilt inside the isolate.
 */
function serializeContext(context: PluginContext): Record<string, any> {
  return {
    currentDate: context.currentDate.toISOString(),
    birthDate: context.birthDate,
    width: context.width,
    height: context.height,
    viewMode: context.viewMode,
    settings: context.settings,
  };
}

/**
 * Run arbitrary JS inside an isolated-vm isolate.
 * Returns the JSON-serialized result or throws on timeout / error.
 */
async function runInIsolate(code: string, contextJson: string): Promise<any> {
  const isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
  try {
    const ivmContext = await isolate.createContext();
    const jail = ivmContext.global;

    // Expose a minimal log function (fire-and-forget, no return value)
    await jail.set('__log', new ivm.Callback((...args: any[]) => {
      console.log('[Plugin]', ...args);
    }));

    // Bootstrap: inject context and shim console/utils inside the isolate
    const bootstrap = `
      const __ctx = JSON.parse(${JSON.stringify(contextJson)});
      __ctx.currentDate = new Date(__ctx.currentDate);
      __ctx.utils = {
        formatDate: function(date, format) {
          var y = date.getFullYear();
          var m = String(date.getMonth() + 1).padStart(2, '0');
          var d = String(date.getDate()).padStart(2, '0');
          return format.replace('YYYY', String(y)).replace('MM', m).replace('DD', d);
        },
        getWeeksLived: function(birthDate) {
          var birth = new Date(birthDate);
          var now = new Date();
          return Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000));
        },
        getCurrentDayOfYear: function() {
          var now = new Date();
          var start = new Date(now.getFullYear(), 0, 0);
          return Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
        }
      };
      var console = { log: __log, error: __log };
    `;

    const script = await isolate.compileScript(
      bootstrap + '\n' + code
    );

    const raw = await script.run(ivmContext, { timeout: PLUGIN_TIMEOUT_MS });
    return raw;
  } finally {
    isolate.dispose();
  }
}

/**
 * Execute plugin calculation hook inside an isolated V8 instance.
 */
export async function executePluginCalculation(
  pluginCode: string,
  context: PluginContext
): Promise<{ result: PluginCalculationResult | null; error: string | null }> {
  try {
    const validation = validatePluginCode(pluginCode);
    if (!validation.valid) {
      return { result: null, error: `Plugin validation failed: ${validation.errors.join(', ')}` };
    }

    const contextJson = JSON.stringify(serializeContext(context));
    const wrapper = `
      ${pluginCode}

      if (typeof calculate !== 'function') {
        throw new Error('Plugin must export a calculate() function');
      }
      JSON.stringify(calculate(__ctx));
    `;

    const raw = await runInIsolate(wrapper, contextJson);
    const result = raw ? JSON.parse(raw) : null;

    // Rehydrate Date if the plugin returned one
    if (result?.currentDate) {
      result.currentDate = new Date(result.currentDate);
    }

    return { result, error: null };
  } catch (error: any) {
    console.error('Plugin calculation error:', error);
    return { result: null, error: error.message || 'Plugin execution failed' };
  }
}

/**
 * Execute plugin render hook inside an isolated V8 instance.
 */
export async function executePluginRender(
  pluginCode: string,
  context: PluginContext
): Promise<{ result: PluginRenderResult | null; error: string | null }> {
  try {
    const validation = validatePluginCode(pluginCode);
    if (!validation.valid) {
      return { result: null, error: `Plugin validation failed: ${validation.errors.join(', ')}` };
    }

    const contextJson = JSON.stringify(serializeContext(context));
    const wrapper = `
      ${pluginCode}

      if (typeof render !== 'function') {
        throw new Error('Plugin must export a render() function');
      }
      JSON.stringify(render(__ctx));
    `;

    const raw = await runInIsolate(wrapper, contextJson);
    const result = raw ? JSON.parse(raw) : null;
    return { result, error: null };
  } catch (error: any) {
    console.error('Plugin render error:', error);
    return { result: null, error: error.message || 'Plugin execution failed' };
  }
}

/**
 * Execute a plugin's top-level code inside an isolate and return the exported
 * plugin object. Used by the [username] route to load user-defined plugins
 * from Firestore safely.
 */
export async function loadPluginFromCode(
  code: string
): Promise<{ plugin: Plugin | null; error: string | null }> {
  try {
    const validation = validatePluginCode(code);
    if (!validation.valid) {
      return { plugin: null, error: `Plugin validation failed: ${validation.errors.join(', ')}` };
    }

    const isolate = new ivm.Isolate({ memoryLimit: ISOLATE_MEMORY_MB });
    try {
      const ivmContext = await isolate.createContext();
      const jail = ivmContext.global;

      await jail.set('__log', new ivm.Callback((...args: any[]) => {
        console.log('[Plugin]', ...args);
      }));

      const script = await isolate.compileScript(`
        var console = { log: __log, error: __log };
        ${code};
        typeof plugin !== 'undefined' ? JSON.stringify(plugin) : 'null';
      `);

      const raw = await script.run(ivmContext, { timeout: PLUGIN_TIMEOUT_MS });
      const pluginObj = raw ? JSON.parse(raw as string) : null;
      return { plugin: pluginObj, error: null };
    } finally {
      isolate.dispose();
    }
  } catch (error: any) {
    console.error('Plugin load error:', error);
    return { plugin: null, error: error.message || 'Failed to load plugin' };
  }
}

// ---------------------------------------------------------------------------
// AST-based pre-validation (fast filter before isolate creation)
// ---------------------------------------------------------------------------

/**
 * Dangerous identifiers that plugins must not reference.
 * Checked via AST walking to reject code early, before paying isolate cost.
 */
const BLOCKED_IDENTIFIERS = new Set([
  'eval', 'Function', 'require', 'import', 'fetch',
  'XMLHttpRequest', 'process', 'global', 'globalThis',
  'self', 'window', '__dirname', '__filename',
  'Proxy', 'Reflect', 'WebSocket', 'Worker',
  'SharedArrayBuffer', 'Atomics',
]);

/**
 * Recursively walk an AST node and call the visitor on every node.
 */
function walkAst(node: any, visitor: (n: any) => void) {
  if (!node || typeof node !== 'object') return;
  visitor(node);
  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => walkAst(c, visitor));
    } else if (child && typeof child === 'object' && child.type) {
      walkAst(child, visitor);
    }
  }
}

/**
 * Validate plugin code for security risks using AST analysis.
 * Acts as a fast pre-filter — even though isolated-vm provides true isolation,
 * rejecting known-bad patterns early avoids wasting isolate creation time and
 * provides clear error messages to plugin authors.
 */
export function validatePluginCode(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check code length (prevent massive plugins)
  if (code.length > 50000) {
    errors.push('Plugin code exceeds maximum length (50KB)');
  }

  // Parse with acorn — reject unparseable code
  let ast: acorn.Program;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2020, sourceType: 'script' });
  } catch (e: any) {
    errors.push(`Plugin code has syntax errors: ${e.message}`);
    return { valid: false, errors };
  }

  // Walk the AST and flag dangerous patterns
  walkAst(ast, (node: any) => {
    // Block dangerous identifiers used anywhere
    if (node.type === 'Identifier' && BLOCKED_IDENTIFIERS.has(node.name)) {
      errors.push(`Access to '${node.name}' is not allowed`);
    }

    // Block import declarations and dynamic import()
    if (node.type === 'ImportDeclaration') {
      errors.push('import declarations are not allowed');
    }
    if (node.type === 'ImportExpression') {
      errors.push('dynamic import() is not allowed');
    }

    // Block computed member access on dangerous targets (e.g. this["eval"])
    if (
      node.type === 'MemberExpression' &&
      node.computed &&
      node.object?.type === 'ThisExpression'
    ) {
      errors.push('Computed property access on "this" is not allowed');
    }
  });

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
