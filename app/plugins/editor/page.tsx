/**
 * Plugin Code Editor/Viewer Page
 * 
 * Allows users to view the source code of all built-in and installed plugins,
 * and edit their configurations.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Plugin {
  id: string;
  name: string;
  description: string;
  source: string;
  isBuiltIn: boolean;
  author?: string;
  version?: string;
  configSchema?: any;
  defaultSettings?: any;
  isPrivate?: boolean;
}

const BUILTIN_PLUGINS: Omit<Plugin, 'source'>[] = [
  {
    id: 'quotes-plugin',
    name: 'Daily Quotes',
    description: 'Display inspirational quotes on your wallpaper',
    isBuiltIn: true,
    version: '1.0.0',
    configSchema: {
      position: {
        type: 'string',
        enum: ['top', 'bottom', 'center'],
        default: 'bottom',
        label: 'Position',
      },
      opacity: {
        type: 'number',
        default: 0.7,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        label: 'Opacity',
      },
    },
    defaultSettings: {
      position: 'bottom',
      opacity: 0.7,
    },
  },
  {
    id: 'moon-phase-plugin',
    name: 'Moon Phase',
    description: 'Display current moon phase',
    isBuiltIn: true,
    version: '1.0.0',
    configSchema: {
      position: {
        type: 'string',
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        default: 'top-left',
        label: 'Position',
      },
    },
    defaultSettings: {
      position: 'top-left',
    },
  },
  {
    id: 'habit-tracker-plugin',
    name: 'Habit Tracker',
    description: 'Track your daily habits',
    isBuiltIn: true,
    version: '1.0.0',
    configSchema: {
      habits: {
        type: 'array',
        default: ['Exercise', 'Read', 'Meditate'],
        label: 'Habits to Track',
      },
      position: {
        type: 'string',
        enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
        default: 'top-right',
        label: 'Position',
      },
    },
    defaultSettings: {
      habits: ['Exercise', 'Read', 'Meditate'],
      position: 'top-right',
    },
  },
];

export default function PluginEditorPage() {
  const router = useRouter();
  
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [editedCode, setEditedCode] = useState('');
  const [loadingPlugins, setLoadingPlugins] = useState(true);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoadingPlugins(true);
    try {
      const builtInWithSource = await Promise.all(
        BUILTIN_PLUGINS.map(async (plugin) => {
          try {
            const response = await fetch(`/api/plugin-source?id=${plugin.id}`);
            const data = await response.json();
            return {
              ...plugin,
              source: data.source || '// Source not available',
            };
          } catch {
            return {
              ...plugin,
              source: '// Failed to load source code',
            };
          }
        })
      );

      setPlugins(builtInWithSource);
      setLoadingPlugins(false);
    } catch (err) {
      console.error('Error loading plugins:', err);
      setLoadingPlugins(false);
    }
  };

  const handleSelectPlugin = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    setEditedCode(plugin.source);
  };

  if (loadingPlugins) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-sm tracking-widest uppercase animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-sm tracking-widest uppercase">My Plugins</h1>
          <p className="text-xs text-neutral-500">Manage, view and edit your plugins</p>
        </div>
        <div className="flex gap-2 sm:gap-4 text-xs">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-neutral-500 hover:text-white uppercase tracking-wider transition-colors whitespace-nowrap"
          >
            Dashboard
          </button>
        </div>
      </header>

      <div className="flex flex-col md:flex-row h-[calc(100vh-73px)]">
        {/* Plugin List Sidebar */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-neutral-800 overflow-y-auto max-h-[40vh] md:max-h-none">
          <div className="p-4 border-b border-neutral-800">
            <h2 className="text-xs uppercase tracking-widest text-neutral-500">Available Plugins</h2>
          </div>
          
          {/* Built-in Plugins */}
          <div className="p-2">
            <div className="px-2 py-1 text-xs uppercase tracking-wider text-neutral-600">
              Built-in
            </div>
            {plugins.filter(p => p.isBuiltIn).map(plugin => (
              <button
                key={plugin.id}
                onClick={() => handleSelectPlugin(plugin)}
                className={`w-full text-left p-3 hover:bg-neutral-900 transition-colors border-l-2 ${
                  selectedPlugin?.id === plugin.id 
                    ? 'border-white bg-neutral-900' 
                    : 'border-transparent'
                }`}
              >
                <div className="text-sm font-medium">{plugin.name}</div>
                <div className="text-xs text-neutral-500 mt-1">{plugin.description}</div>
                {plugin.version && (
                  <div className="text-xs text-neutral-600 mt-1">v{plugin.version}</div>
                )}
              </button>
            ))}
          </div>

        </div>

        {/* Code Viewer */}
        <div className="flex-1 flex flex-col">
          {selectedPlugin ? (
            <>
              <div className="p-4 border-b border-neutral-800">
                <h2 className="text-lg font-medium truncate">{selectedPlugin.name}</h2>
                <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{selectedPlugin.description}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                  Built-in Plugin
                </span>
              </div>

              <div className="flex-1 overflow-hidden">
                <pre className="w-full h-full p-2 sm:p-4 bg-neutral-950 text-white font-mono text-xs sm:text-sm overflow-auto">
                  <code className="block whitespace-pre">{editedCode}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-600">
              <div className="text-center">
                <p className="text-sm uppercase tracking-widest">Select a plugin to view its code</p>
                <p className="text-xs text-neutral-700 mt-2">
                  Choose from the list on the left
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
