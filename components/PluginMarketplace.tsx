/**
 * Plugin Marketplace Component
 * 
 * Displays available plugins, allows installation/uninstallation,
 * and manages plugin settings.
 */

'use client';

import { useEffect, useState } from 'react';
import { getAvailablePlugins } from '@/lib/firebase';
import { Plugin, PluginConfig } from '@/lib/types';

interface PluginMarketplaceProps {
  installedPlugins: PluginConfig[];
  onInstall: (plugin: Plugin) => void;
  onUninstall: (pluginId: string) => void;
  onToggle: (pluginId: string, enabled: boolean) => void;
  onConfigure: (pluginId: string, settings: Record<string, any>) => void;
}

export default function PluginMarketplace({
  installedPlugins,
  onInstall,
  onUninstall,
  onToggle,
  onConfigure,
}: PluginMarketplaceProps) {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsValues, setSettingsValues] = useState<Record<string, any>>({});
  const [showCommunityPlugins, setShowCommunityPlugins] = useState(false);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    const { data } = await getAvailablePlugins();
    if (data) {
      setPlugins(data as Plugin[]);
    }
    setLoading(false);
  };

  const isInstalled = (pluginId: string) => {
    return installedPlugins.some(p => p.pluginId === pluginId);
  };

  const getInstalledPlugin = (pluginId: string) => {
    return installedPlugins.find(p => p.pluginId === pluginId);
  };

  const handleOpenSettings = (plugin: Plugin) => {
    setSelectedPlugin(plugin);
    const installed = getInstalledPlugin(plugin.id);
    setSettingsValues(installed?.config || {});
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    if (selectedPlugin) {
      onConfigure(selectedPlugin.id, settingsValues);
      setShowSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-neutral-500 text-sm tracking-widest uppercase animate-pulse">
          Loading plugins...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Installed Plugins Section */}
      {installedPlugins.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-neutral-400">My Plugins</h3>
          <div className="space-y-3">
            {installedPlugins.map((pluginConfig) => {
              const plugin = plugins.find(p => p.id === pluginConfig.pluginId);
              if (!plugin) return null;

              return (
                <div
                  key={pluginConfig.pluginId}
                  className="p-4 bg-neutral-800 border border-neutral-700 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{plugin.name}</h4>
                      <p className="text-xs text-neutral-500 mt-1">{plugin.description}</p>
                      <p className="text-xs text-neutral-600 mt-1">by {plugin.author}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pluginConfig.enabled}
                          onChange={(e) => onToggle(pluginConfig.pluginId, e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-neutral-500">Enabled</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenSettings(plugin)}
                      className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 transition-colors text-xs uppercase tracking-wider"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => onUninstall(pluginConfig.pluginId)}
                      className="px-3 py-1 bg-red-900 hover:bg-red-800 transition-colors text-xs uppercase tracking-wider"
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Plugins Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-wider text-neutral-400">Available Plugins</h3>
          <button
            onClick={() => setShowCommunityPlugins(!showCommunityPlugins)}
            className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-wider border border-neutral-700"
          >
            {showCommunityPlugins ? 'Hide Community Plugins' : 'Show Community Plugins'}
          </button>
        </div>
        {plugins.length === 0 ? (
          <p className="text-sm text-neutral-500">No plugins available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plugins
              .filter((plugin) => {
                // Show Remainders Team plugins always, community plugins only when toggled
                return showCommunityPlugins || plugin.author === 'Remainders Team';
              })
              .map((plugin) => {
              const installed = isInstalled(plugin.id);
              const isOfficialPlugin = plugin.author === 'Remainders Team';
              
              return (
                <div
                  key={plugin.id}
                  className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium">{plugin.name}</h4>
                          {isOfficialPlugin && (
                            <span className="px-2 py-0.5 bg-blue-900 text-blue-300 text-[10px] uppercase tracking-wider">
                              Official
                            </span>
                          )}
                        </div>
                      </div>
                      {installed && (
                        <span className="px-2 py-1 bg-green-900 text-green-300 text-xs uppercase tracking-wider flex-shrink-0">
                          Installed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">{plugin.description}</p>
                    <p className="text-xs text-neutral-600 mt-2">
                      by {plugin.author} • v{plugin.version} • {plugin.downloads || 0} downloads
                    </p>
                  </div>
                  {!installed && (
                    <button
                      onClick={() => onInstall(plugin)}
                      className="w-full py-2 bg-white text-black hover:bg-neutral-200 transition-colors text-xs uppercase tracking-widest"
                    >
                      Install
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && selectedPlugin && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm uppercase tracking-wider">{selectedPlugin.name} Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-neutral-500 hover:text-white text-xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {Object.keys(selectedPlugin.configSchema || {}).length === 0 ? (
                <p className="text-xs text-neutral-500">This plugin has no configurable settings.</p>
              ) : (
                Object.entries(selectedPlugin.configSchema || {}).map(([key, schema]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <label className="text-xs uppercase tracking-widest text-neutral-500">
                      {schema.label || key}
                    </label>
                    {schema.type === 'string' && schema.enum && (
                      <select
                        value={settingsValues[key] || schema.default || ''}
                        onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 focus:border-white outline-none text-white text-sm"
                      >
                        {schema.enum.map((option: string) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                    {schema.type === 'string' && !schema.enum && (
                      <input
                        type="text"
                        value={settingsValues[key] || schema.default || ''}
                        onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 focus:border-white outline-none text-white text-sm"
                      />
                    )}
                    {schema.type === 'number' && (
                      <input
                        type="number"
                        value={settingsValues[key] || schema.default || 0}
                        onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: parseFloat(e.target.value) }))}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 focus:border-white outline-none text-white text-sm"
                      />
                    )}
                    {schema.type === 'boolean' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={settingsValues[key] ?? schema.default ?? false}
                          onChange={(e) => setSettingsValues(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="w-4 h-4"
                        />
                        <span className="text-xs text-neutral-400">{schema.label}</span>
                      </div>
                    )}
                    {schema.type === 'array' && schema.items?.type === 'object' && (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {(settingsValues[key] || schema.default || []).map((item: any, index: number) => (
                          <div key={index} className="p-3 bg-neutral-800/50 border border-neutral-700 rounded space-y-2">
                            {Object.entries(schema.items.properties || {}).map(([propKey, propSchema]: [string, any]) => (
                              <div key={propKey} className="space-y-1">
                                <label className="text-xs text-neutral-400">{propSchema.label || propKey}</label>
                                {propKey === 'color' ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={item[propKey] || propSchema.default || '#000000'}
                                      onChange={(e) => {
                                        const newArray = [...(settingsValues[key] || schema.default || [])];
                                        newArray[index] = { ...newArray[index], [propKey]: e.target.value };
                                        setSettingsValues(prev => ({ ...prev, [key]: newArray }));
                                      }}
                                      className="h-8 w-16 border border-neutral-700 rounded cursor-pointer"
                                    />
                                    <input
                                      type="text"
                                      value={item[propKey] || propSchema.default || ''}
                                      onChange={(e) => {
                                        const newArray = [...(settingsValues[key] || schema.default || [])];
                                        newArray[index] = { ...newArray[index], [propKey]: e.target.value };
                                        setSettingsValues(prev => ({ ...prev, [key]: newArray }));
                                      }}
                                      className="flex-1 px-2 py-1 bg-neutral-800 border border-neutral-700 text-white text-xs font-mono"
                                    />
                                  </div>
                                ) : (
                                  <input
                                    type="text"
                                    value={item[propKey] || propSchema.default || ''}
                                    onChange={(e) => {
                                      const newArray = [...(settingsValues[key] || schema.default || [])];
                                      newArray[index] = { ...newArray[index], [propKey]: e.target.value };
                                      setSettingsValues(prev => ({ ...prev, [key]: newArray }));
                                    }}
                                    className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 text-white text-xs"
                                  />
                                )}
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newArray = [...(settingsValues[key] || schema.default || [])];
                                newArray.splice(index, 1);
                                setSettingsValues(prev => ({ ...prev, [key]: newArray }));
                              }}
                              className="w-full py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs uppercase tracking-wider"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            const newItem: any = {};
                            Object.entries(schema.items.properties || {}).forEach(([propKey, propSchema]: [string, any]) => {
                              newItem[propKey] = propSchema.default || '';
                            });
                            const newArray = [...(settingsValues[key] || schema.default || []), newItem];
                            setSettingsValues(prev => ({ ...prev, [key]: newArray }));
                          }}
                          className="w-full py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs uppercase tracking-wider"
                        >
                          + Add {schema.label?.replace('s to Track', '') || 'Item'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveSettings}
                className="flex-1 py-2 bg-white text-black hover:bg-neutral-200 transition-colors text-xs uppercase tracking-widest"
              >
                Save
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
