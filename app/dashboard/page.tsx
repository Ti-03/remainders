/**
 * Enhanced User Dashboard
 * Complete wallpaper configuration interface
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { saveUserProfile, saveUserConfig, isUsernameAvailable, getUserConfigByUsername, applyPendingKofiGrant } from '@/lib/firebase';
import { UserConfig, DeviceModel, ViewMode, Plugin, PluginConfig, TextElement, DaysLayoutMode, BackgroundImage } from '@/lib/types';
import ViewModeToggle from '@/components/ViewModeToggle';
import BirthDateInput from '@/components/BirthDateInput';
import StudentDetailsInput from '@/components/StudentDetailsInput';
import DeviceSelector from '@/components/DeviceSelector';
import ThemeColorPicker from '@/components/ThemeColorPicker';
import PluginMarketplace from '@/components/PluginMarketplace';
import TextElementsEditor from '@/components/TextElementsEditor';
import BackgroundPicker from '@/components/BackgroundPicker';
import { PRESET_THEMES, getThemeByName, Theme } from '@/lib/themes';
import { seedExamplePlugins } from '@/lib/seed-plugins';

/** Returns remaining days until expiry, or null if no expiry. Negative = expired. */
function getDaysRemaining(planExpiresAt: any): number | null {
  if (!planExpiresAt) return null;
  const expiryDate = planExpiresAt.toDate?.() ?? new Date(planExpiresAt);
  return Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function DashboardPage() {
  const { user, userProfile, loading, refreshProfile, isPro } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // Username setup
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  
  // Wallpaper config
  const [viewMode, setViewMode] = useState<ViewMode>('life');
  const [birthDate, setBirthDate] = useState('');
  const [studyStartDate, setStudyStartDate] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [studyDurationYears, setStudyDurationYears] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceModel | null>(null);
  const [isMondayFirst, setIsMondayFirst] = useState(false);
  const [yearViewLayout, setYearViewLayout] = useState<'months' | 'days'>('months');
  const [daysLayoutMode, setDaysLayoutMode] = useState<'calendar' | 'continuous'>('continuous');
  
  // Customization state
  const [selectedTheme, setSelectedTheme] = useState<string>('Dark Default');
  const [colors, setColors] = useState({
    background: '#1a1a1a',
    past: '#FFFFFF',
    current: '#FF6B35',
    future: '#404040',
    text: '#888888',
  });
  const [fontFamily, setFontFamily] = useState('monospace');
  const [fontSize, setFontSize] = useState(0.035);
  const [statsVisible, setStatsVisible] = useState(true);
  const [textAlignment, setTextAlignment] = useState<'top' | 'bottom'>('bottom');
  const [timezone, setTimezone] = useState('UTC');
  const [layout, setLayout] = useState({
    topPadding: 0.25,
    bottomPadding: 0.15,
    sidePadding: 0.18,
    dotSpacing: 0.7,
  });
  
  // Ensure layout always has dotSpacing
  const safeLayout = {
    ...layout,
    dotSpacing: layout.dotSpacing ?? 0.7,
  };
  
  // Background image state
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null);
  const [backgroundExpanded, setBackgroundExpanded] = useState(false);

  // Ko-fi email state
  const [kofiEmail, setKofiEmail] = useState('');
  const [kofiStatus, setKofiStatus] = useState<'idle' | 'checking' | 'granted' | 'not_found' | 'already_pro' | 'invalid_email'>('idle');

  // Plugin state
  const [plugins, setPlugins] = useState<PluginConfig[]>([]);
  
  // Text elements state
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  
  // Config state
  const [config, setConfig] = useState<Partial<UserConfig> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Collapsible sections state
  const [themeColorsExpanded, setThemeColorsExpanded] = useState(false);
  const [typographyLayoutExpanded, setTypographyLayoutExpanded] = useState(false);
  
  // Reset confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Auto-save with debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate if config is complete (needed before useEffects)
  const isConfigComplete = viewMode === 'year'
    ? selectedDevice !== null
    : viewMode === 'life'
      ? Boolean(birthDate && selectedDevice)
      : Boolean(studyStartDate && universityName.trim() && studyDurationYears && selectedDevice);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && mounted) {
      router.push('/');
    }
  }, [user, loading, mounted, router]);

  useEffect(() => {
    if (userProfile?.username) {
      setUsername(userProfile.username);
      loadUserConfig(userProfile.username);
    }
  }, [userProfile]);

  // Track changes and trigger auto-save with debouncing
  useEffect(() => {
    if (!config) return;
    
    // Normalize device structure for comparison
    const currentDevice = selectedDevice ? {
      brand: selectedDevice.brand,
      modelName: selectedDevice.model,
      width: selectedDevice.width,
      height: selectedDevice.height,
    } : null;
    
    const currentState = {
      colors: JSON.stringify(colors),
      typography: JSON.stringify({ fontFamily, fontSize, statsVisible }),
      layout: JSON.stringify(layout),
      plugins: JSON.stringify(plugins),
      textElements: JSON.stringify(textElements),
      backgroundImage: JSON.stringify(backgroundImage),
      viewMode,
      birthDate,
      studyStartDate,
      universityName: universityName.trim(),
      studyDurationYears,
      isMondayFirst,
      yearViewLayout,
      daysLayoutMode,
      timezone,
      device: JSON.stringify(currentDevice),
    };

    const savedState = {
      colors: JSON.stringify(config.colors),
      typography: JSON.stringify(config.typography),
      layout: JSON.stringify(config.layout),
      plugins: JSON.stringify(config.plugins || []),
      textElements: JSON.stringify(config.textElements || []),
      backgroundImage: JSON.stringify(config.backgroundImage ?? null),
      viewMode: config.viewMode,
      birthDate: config.birthDate,
      studyStartDate: config.studyStartDate,
      universityName: config.universityName,
      studyDurationYears: config.studyDurationYears != null ? String(config.studyDurationYears) : '',
      isMondayFirst: config.isMondayFirst,
      yearViewLayout: config.yearViewLayout,
      daysLayoutMode: config.daysLayoutMode,
      timezone: config.timezone,
      device: JSON.stringify(config.device),
    };
    
    const hasChanges = JSON.stringify(currentState) !== JSON.stringify(savedState);
    setHasUnsavedChanges(hasChanges);
    
    // Auto-save with 2-second debounce
    if (hasChanges && isConfigComplete) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        setAutoSaving(true);
        setSaveStatus('saving');
        saveConfig().then(() => {
          setSaveStatus('saved');
          if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
          saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000);
        }).catch(() => {
          setSaveStatus('error');
          if (saveStatusTimerRef.current) clearTimeout(saveStatusTimerRef.current);
          saveStatusTimerRef.current = setTimeout(() => setSaveStatus('idle'), 4000);
        }).finally(() => {
          setAutoSaving(false);
        });
      }, 2000); // 2 seconds after last change
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [colors, fontFamily, fontSize, statsVisible, layout, plugins, textElements, backgroundImage, viewMode, birthDate, studyStartDate, universityName, studyDurationYears, isMondayFirst, yearViewLayout, daysLayoutMode, timezone, selectedDevice, config, isConfigComplete]);

  const loadUserConfig = async (username: string) => {
    const { data } = await getUserConfigByUsername(username);
    if (data) {
      const cfg = data as UserConfig;
      setConfig(cfg);
      setViewMode(cfg.viewMode || 'life');
      setBirthDate(cfg.birthDate || '');
      setStudyStartDate(cfg.studyStartDate || '');
      setUniversityName(cfg.universityName || '');
      setStudyDurationYears(cfg.studyDurationYears ? String(cfg.studyDurationYears) : '');
      setIsMondayFirst(cfg.isMondayFirst || false);
      setYearViewLayout(cfg.yearViewLayout || 'months');
      setDaysLayoutMode(cfg.daysLayoutMode || 'continuous');
      
      // Load customization settings
      if (cfg.colors) {
        setColors(cfg.colors);
        // Check if colors match a preset theme
        const matchingTheme = PRESET_THEMES.find(theme => 
          JSON.stringify(theme.colors) === JSON.stringify(cfg.colors)
        );
        setSelectedTheme(matchingTheme?.name || 'Custom');
      }
      
      if (cfg.typography) {
        setFontFamily(cfg.typography.fontFamily || 'monospace');
        setFontSize(cfg.typography.fontSize || 0.035);
        setStatsVisible(cfg.typography.statsVisible ?? true);
      }
      
      if (cfg.timezone) {
        setTimezone(cfg.timezone);
      }
      
      if (cfg.layout) {
        setLayout({
          topPadding: cfg.layout.topPadding ?? 0.25,
          bottomPadding: cfg.layout.bottomPadding ?? 0.15,
          sidePadding: cfg.layout.sidePadding ?? 0.18,
          dotSpacing: cfg.layout.dotSpacing ?? 0.7,
        });
      }
      
      if (cfg.plugins) {
        setPlugins(cfg.plugins);
      }

      if (cfg.textElements) {
        setTextElements(cfg.textElements);
      }

      if (cfg.backgroundImage) {
        setBackgroundImage(cfg.backgroundImage);
      }
      
      if (cfg.device && cfg.device.width) {
        setSelectedDevice({
          brand: cfg.device.brand,
          model: cfg.device.modelName,
          width: cfg.device.width,
          height: cfg.device.height,
        });
      }
    } else {
      // Initialize default config with all fields
      const defaultDevice = selectedDevice ? {
        brand: selectedDevice.brand,
        modelName: selectedDevice.model,
        width: selectedDevice.width,
        height: selectedDevice.height,
      } : undefined;
      
      const defaultConfig = {
        colors: colors,
        typography: {
          fontFamily: fontFamily,
          fontSize: fontSize,
          statsVisible: statsVisible,
        },
        layout: layout,
        textElements: [],
        plugins: [],
        viewMode: viewMode,
        birthDate: birthDate,
        studyStartDate: studyStartDate,
        universityName: universityName.trim(),
        studyDurationYears: studyDurationYears ? parseInt(studyDurationYears, 10) : undefined,
        isMondayFirst: isMondayFirst,
        yearViewLayout: yearViewLayout,
        daysLayoutMode: daysLayoutMode,
        timezone: timezone,
        device: defaultDevice,
      };
      setConfig(defaultConfig);
      setHasUnsavedChanges(false);
    }
  };

  const handleInstallPlugin = (plugin: Plugin) => {
    const newPluginConfig: PluginConfig = {
      pluginId: plugin.id,
      enabled: true,
      config: {},
    };
    setPlugins(prev => [...prev, newPluginConfig]);
  };

  const handleUninstallPlugin = (pluginId: string) => {
    setPlugins(prev => prev.filter(p => p.pluginId !== pluginId));
  };

  const handleTogglePlugin = (pluginId: string) => {
    setPlugins(prev => 
      prev.map(p => 
        p.pluginId === pluginId 
          ? { ...p, enabled: !p.enabled }
          : p
      )
    );
  };

  const handleConfigurePlugin = (pluginId: string, config: Record<string, any>) => {
    setPlugins(prev => 
      prev.map(p => 
        p.pluginId === pluginId 
          ? { ...p, config }
          : p
      )
    );
  };

  const checkUsername = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-_]/g, '');
    setUsername(cleaned);
    
    if (cleaned.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setUsernameAvailable(null);
      return;
    }
    
    if (cleaned.length > 20) {
      setUsernameError('Username must be less than 20 characters');
      setUsernameAvailable(null);
      return;
    }

    const reserved = ['admin', 'api', 'dashboard', 'login', 'logout', 'signup', 'signin', 'wallpaper'];
    if (reserved.includes(cleaned)) {
      setUsernameError('This username is reserved');
      setUsernameAvailable(false);
      return;
    }

    setCheckingUsername(true);
    setUsernameError('');
    
    const available = await isUsernameAvailable(cleaned);
    setUsernameAvailable(available);
    
    if (!available) {
      setUsernameError('Username already taken');
    }
    
    setCheckingUsername(false);
  };

  const handleSaveUsername = async () => {
    if (!user || !usernameAvailable) return;
    
    setSavingUsername(true);
    const { success, error } = await saveUserProfile(
      user.uid,
      username,
      user.displayName || '',
      user.email || ''
    );
    
    if (success) {
      // Check if this user donated on Ko-fi before signing up
      if (user.email) {
        await applyPendingKofiGrant(user.uid, user.email, username);
      }
      await refreshProfile();
      // Initialize default config
      await saveConfig();
    } else {
      setUsernameError(error || 'Failed to save username');
    }
    
    setSavingUsername(false);
  };

  const handleKofiEmailCheck = async () => {
    if (!user || !kofiEmail.trim() || !userProfile?.username) return;
    if (isPro) { setKofiStatus('already_pro'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(kofiEmail.trim())) { setKofiStatus('invalid_email'); return; }
    setKofiStatus('checking');
    const granted = await applyPendingKofiGrant(user.uid, kofiEmail.trim(), userProfile.username);
    setKofiStatus(granted ? 'granted' : 'not_found');
  };

  const handleThemeChange = (themeName: string) => {
    setSelectedTheme(themeName);
    if (themeName !== 'Custom') {
      const theme = getThemeByName(themeName);
      if (theme) {
        setColors(theme.colors);
      }
    }
  };

  const handleColorChange = (colorKey: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [colorKey]: value }));
    setSelectedTheme('Custom');
  };

  const handleExportConfig = () => {
    const exportData = {
      colors,
      typography: {
        fontFamily,
        fontSize,
        statsVisible,
      },
      layout,
      viewMode,
      birthDate,
      studyStartDate,
      universityName: universityName.trim(),
      studyDurationYears: studyDurationYears ? parseInt(studyDurationYears, 10) : undefined,
      isMondayFirst,
      yearViewLayout,
      daysLayoutMode,
      device: selectedDevice,
      plugins,
      textElements,
      timezone,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remainders-config-${userProfile?.username || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        
        // Validate and apply imported config
        if (imported.colors) setColors(imported.colors);
        if (imported.typography) {
          setFontFamily(imported.typography.fontFamily || 'monospace');
          setFontSize(imported.typography.fontSize || 0.035);
          setStatsVisible(imported.typography.statsVisible ?? true);
        }
        if (imported.layout) setLayout(imported.layout);
        if (imported.viewMode) setViewMode(imported.viewMode);
        if (imported.birthDate) setBirthDate(imported.birthDate);
        if (imported.studyStartDate) setStudyStartDate(imported.studyStartDate);
        if (imported.universityName) setUniversityName(imported.universityName);
        if (imported.studyDurationYears !== undefined) setStudyDurationYears(String(imported.studyDurationYears));
        if (imported.isMondayFirst !== undefined) setIsMondayFirst(imported.isMondayFirst);
        if (imported.yearViewLayout) setYearViewLayout(imported.yearViewLayout);
        if (imported.daysLayoutMode) setDaysLayoutMode(imported.daysLayoutMode);
        if (imported.device) setSelectedDevice(imported.device);
        if (imported.textElements) setTextElements(imported.textElements);
        if (imported.plugins) setPlugins(imported.plugins);
        if (imported.timezone) setTimezone(imported.timezone);
        if (imported.timezone) setTimezone(imported.timezone);
        
        setSaveMessage('✓ Config imported successfully');
        setTimeout(() => setSaveMessage(''), 2000);
      } catch (error) {
        setSaveMessage('✗ Invalid config file');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleResetSettings = async () => {
    // Reset all settings to defaults
    setSelectedTheme('Dark Default');
    setColors({
      background: '#1a1a1a',
      past: '#FFFFFF',
      current: '#FF6B35',
      future: '#404040',
      text: '#888888',
    });
    setFontFamily('monospace');
    setFontSize(0.035);
    setStatsVisible(true);
    setTextAlignment('bottom');
    setTimezone('UTC');
    setLayout({
      topPadding: 0.25,
      bottomPadding: 0.15,
      sidePadding: 0.18,
      dotSpacing: 0.7,
    });
    setPlugins([]);
    setTextElements([]);
    setDaysLayoutMode('continuous');
    setShowResetConfirm(false);
    setSaveMessage('✓ Settings reset to defaults');
    setTimeout(() => setSaveMessage(''), 2000);
    
    // Save the reset state to database
    if (user && userProfile?.username) {
      const configToSave: Partial<UserConfig> = {
        userId: user.uid,
        username: userProfile.username,
        birthDate,
        studyStartDate,
        universityName: universityName.trim(),
        studyDurationYears: studyDurationYears ? parseInt(studyDurationYears, 10) : undefined,
        viewMode,
        device: selectedDevice ? {
          brand: selectedDevice.brand,
          modelName: selectedDevice.model,
          width: selectedDevice.width,
          height: selectedDevice.height,
        } : { brand: '', modelName: '', width: 1170, height: 2532 },
        colors: {
          background: '#1a1a1a',
          past: '#FFFFFF',
          current: '#FF6B35',
          future: '#404040',
          text: '#888888',
        },
        typography: {
          fontFamily: 'monospace',
          fontSize: 0.035,
          statsVisible: true,
        },
        layout: {
          topPadding: 0.25,
          bottomPadding: 0.15,
          sidePadding: 0.18,
          dotSpacing: 0.7,
        },
        textElements: [],
        plugins: [],
        isMondayFirst,
        yearViewLayout,
        daysLayoutMode,
        timezone: 'UTC',
        updatedAt: new Date(),
      };
      
      await saveUserConfig(userProfile.username, configToSave);
    }
  };

  const saveConfig = async () => {
    if (!user || !userProfile?.username) return;
    
    setSaving(true);
    setSaveMessage('');
    
    const configToSave: Partial<UserConfig> = {
      userId: user.uid,
      username: userProfile.username,
      birthDate,
      studyStartDate,
      universityName: universityName.trim(),
      studyDurationYears: studyDurationYears ? parseInt(studyDurationYears, 10) : undefined,
      viewMode,
      device: selectedDevice ? {
        brand: selectedDevice.brand,
        modelName: selectedDevice.model,
        width: selectedDevice.width,
        height: selectedDevice.height,
      } : { brand: '', modelName: '', width: 1170, height: 2532 },
      colors: colors,
      typography: {
        fontFamily: fontFamily,
        fontSize: fontSize,
        statsVisible: statsVisible,
      },
      layout: layout,
      textElements: textElements,
      plugins: plugins,
      backgroundImage: backgroundImage ?? undefined,
      plan: (userProfile?.plan || userProfile?.role === 'admin' ? 'pro' : 'free') as 'free' | 'pro',
      isMondayFirst,
      yearViewLayout,
      daysLayoutMode,
      timezone: timezone,
      updatedAt: new Date(),
    };

    const { success, error } = await saveUserConfig(userProfile.username, configToSave);
    
    if (success) {
      setSaveMessage('✓ Saved');
      setConfig(configToSave); // Update saved config state
      setHasUnsavedChanges(false); // Reset unsaved changes flag
      setTimeout(() => setSaveMessage(''), 2000);
    } else {
      setSaveMessage('✗ Error: ' + error);
    }
    
    setSaving(false);
  };

  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white text-sm tracking-widest uppercase animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Username setup flow
  if (!userProfile?.username) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl tracking-widest uppercase">Choose Username</h1>
            <p className="text-sm text-neutral-500">
              This will be your personal wallpaper URL
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                value={username}
                onChange={(e) => checkUsername(e.target.value)}
                placeholder="your-name"
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 focus:border-white outline-none text-white placeholder:text-neutral-600 transition-colors"
                autoFocus
              />
              
              {username.length >= 3 && (
                <div className="flex items-center gap-2 text-sm px-2">
                  {checkingUsername ? (
                    <span className="text-neutral-500">Checking...</span>
                  ) : usernameAvailable === true ? (
                    <>
                      <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-500">Available</span>
                    </>
                  ) : usernameAvailable === false ? (
                    <>
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-red-500">{usernameError}</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {username && usernameAvailable && (
              <div className="p-4 bg-neutral-900 border border-neutral-700 rounded">
                <div className="text-xs text-neutral-500 mb-1">Your wallpaper URL will be:</div>
                <code className="text-sm text-white font-mono">
                  {typeof window !== 'undefined' && window.location.origin}/api/{username}
                </code>
              </div>
            )}

            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-xs text-yellow-500 px-1">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full flex-shrink-0" />
                Unsaved changes will be saved automatically once setup is complete.
              </div>
            )}

            <button
              onClick={handleSaveUsername}
              disabled={!usernameAvailable || savingUsername}
              className="w-full py-3 bg-white text-black disabled:bg-neutral-800 disabled:text-neutral-600 hover:bg-neutral-200 transition-colors uppercase tracking-widest text-sm font-medium"
            >
              {savingUsername ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 p-4 flex items-center justify-between sticky top-0 bg-[#1a1a1a] z-10">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Remainders" className="w-8 h-8" />
          <div>
            <h1 className="text-sm tracking-widest uppercase">Dashboard</h1>
            <code className="text-xs text-neutral-500">/api/{userProfile.username}</code>
          </div>
          {/* Save-status widget */}
          <div className={`flex items-center gap-1.5 text-xs transition-opacity duration-300 ${saveStatus === 'idle' && !hasUnsavedChanges ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {saveStatus === 'saving' ? (
              <>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-neutral-400">Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                <span className="text-green-500">All changes saved</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                <span className="text-red-400">Save failed</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                <span className="text-yellow-500">Unsaved changes</span>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://ko-fi.com/ti003"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-white uppercase tracking-wider transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
            </svg>
            Buy Me a Coffee
          </a>
          <a
            href="/"
            className="text-xs text-neutral-500 hover:text-white uppercase tracking-wider transition-colors"
          >
            Home
          </a>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-6 max-w-2xl mx-auto pb-32">{/* Added pb-32 for bottom padding */}
        {/* Personal URL Card */}
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <div>
            <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">
              Your Wallpaper URL
            </div>
            <code className="text-sm text-white font-mono break-all">
              {typeof window !== 'undefined' && window.location.origin}/api/{userProfile.username}
            </code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/api/${userProfile.username}`
                );
              }}
              className="flex-1 py-2 bg-white text-black hover:bg-neutral-200 transition-colors text-xs uppercase tracking-widest"
            >
              Copy URL
            </button>
            <a
              href={`/api/${userProfile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest text-center"
            >
              Preview
            </a>
          </div>
        </div>

        {/* Subscription Status */}
        {(() => {
          const isAdmin = userProfile?.role === 'admin';
          const daysLeft = getDaysRemaining(userProfile?.planExpiresAt);

          if (isAdmin) {
            return (
              <div className="px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono uppercase tracking-widest text-[#FF6B35] font-bold">Admin</span>
                  <span className="text-xs font-mono text-neutral-500">Full access · No expiration</span>
                </div>
              </div>
            );
          }

          if (isPro && daysLeft !== null) {
            const urgency = daysLeft <= 3 ? 'text-red-400' : daysLeft <= 7 ? 'text-yellow-400' : 'text-green-400';
            const barColor = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#eab308' : '#22c55e';
            const barWidth = Math.max(2, Math.min(100, (daysLeft / 30) * 100));
            return (
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono uppercase tracking-widest text-[#FF6B35] font-bold">Pro</span>
                    <span className={`text-xs font-mono ${urgency}`}>
                      {daysLeft <= 0 ? 'Expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-neutral-600">
                    {(() => {
                      const d = userProfile?.planExpiresAt?.toDate?.() ?? new Date(userProfile?.planExpiresAt);
                      return d instanceof Date && !isNaN(d.getTime())
                        ? `Expires ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : '';
                    })()}
                  </span>
                </div>
                <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div style={{ width: `${barWidth}%`, height: '100%', background: barColor, borderRadius: '9999px', transition: 'width 0.3s' }} />
                </div>
                {daysLeft <= 7 && (
                  <div className="text-xs font-mono text-neutral-500">
                    {daysLeft <= 0
                      ? 'Your Pro plan has expired. Donate again on Ko-fi to renew.'
                      : 'Pro expiring soon — '}{daysLeft > 0 && (
                        <a href="https://ko-fi.com/ti003" target="_blank" rel="noopener noreferrer" className="text-[#FF6B35] hover:underline">
                          donate on Ko-fi to renew
                        </a>
                    )}
                  </div>
                )}
              </div>
            );
          }

          if (isPro && daysLeft === null) {
            return (
              <div className="px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-3">
                <span className="text-xs font-mono uppercase tracking-widest text-[#FF6B35] font-bold">Pro</span>
                <span className="text-xs font-mono text-neutral-500">Active · No expiration</span>
              </div>
            );
          }

          // Free user — show how to get Pro
          return (
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-neutral-500">Free Plan</span>
                <a
                  href="https://ko-fi.com/ti003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-[#FF6B35] hover:underline uppercase tracking-widest"
                >
                  Upgrade to Pro →
                </a>
              </div>
              <div className="text-xs font-mono text-neutral-600 leading-relaxed">
                Donate on Ko-fi to unlock Pro backgrounds, custom uploads, and support the project.
              </div>
              <div className="flex flex-col gap-1.5 text-xs font-mono">
                {[
                  ['1', 'Visit ko-fi.com/ti003 and donate any amount'],
                  ['2', 'Pro activates automatically (email must match your account)'],
                  ['3', 'Used a different email? Use the "Donated on Ko-fi?" field below'],
                ].map(([step, text]) => (
                  <div key={step} className="flex gap-2">
                    <span className="text-[#FF6B35] font-bold">{step}.</span>
                    <span className="text-neutral-500">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Wallpaper Configuration */}
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg space-y-6">
          <h2 className="text-sm uppercase tracking-wider text-neutral-400">Wallpaper Configuration</h2>
          
          {/* View Mode */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500">View Mode</label>
            <ViewModeToggle selectedMode={viewMode} onChange={setViewMode} />
          </div>

          {/* Birth Date (only for life view) */}
          {viewMode === 'life' && (
            <div className="space-y-2">
              <BirthDateInput value={birthDate} onChange={setBirthDate} />
            </div>
          )}

          {viewMode === 'student' && (
            <StudentDetailsInput
              studyStartDate={studyStartDate}
              universityName={universityName}
              studyDurationYears={studyDurationYears}
              onStudyStartDateChange={setStudyStartDate}
              onUniversityNameChange={setUniversityName}
              onStudyDurationYearsChange={setStudyDurationYears}
            />
          )}

          {/* Device Selector */}
          <div className="space-y-2">
            <DeviceSelector
              selectedModel={selectedDevice?.model || ''}
              onSelect={setSelectedDevice}
            />
          </div>

          {/* Monday First (only for year view) */}
          {viewMode === 'year' && (
            <>
              {/* Year View Layout Toggle */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-neutral-500">Year View Layout</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setYearViewLayout('months')}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                      yearViewLayout === 'months'
                        ? 'bg-white text-black'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    Months
                  </button>
                  <button
                    onClick={() => setYearViewLayout('days')}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                      yearViewLayout === 'days'
                        ? 'bg-white text-black'
                        : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                    }`}
                  >
                    Days
                  </button>
                </div>
                <p className="text-xs text-neutral-500">
                  {yearViewLayout === 'months' 
                    ? 'Display days organized by months' 
                    : 'Display days as a continuous grid'}
                </p>
              </div>

              {/* Days Layout Mode - only show when yearViewLayout is 'days' */}
              {yearViewLayout === 'days' && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Days Layout Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDaysLayoutMode('continuous')}
                      className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                        daysLayoutMode === 'continuous'
                          ? 'bg-white text-black'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      Continuous
                    </button>
                    <button
                      onClick={() => setDaysLayoutMode('calendar')}
                      className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                        daysLayoutMode === 'calendar'
                          ? 'bg-white text-black'
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      Calendar
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {daysLayoutMode === 'continuous'
                      ? 'Days flow continuously without week alignment'
                      : 'Days follow calendar week structure'}
                  </p>
                </div>
              )}

              {/* Monday First - show for months view OR days view with calendar mode */}
              {(yearViewLayout === 'months' || (yearViewLayout === 'days' && daysLayoutMode === 'calendar')) && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="mondayFirst"
                    checked={isMondayFirst}
                    onChange={(e) => setIsMondayFirst(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <label htmlFor="mondayFirst" className="text-xs uppercase tracking-widest text-neutral-500">
                    Start week on Monday
                  </label>
                </div>
              )}
            </>
          )}

          {/* Timezone Selector */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500">Your Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white focus:border-white outline-none text-sm"
            >
              <option value="UTC">UTC (GMT+0)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="America/Chicago">Chicago (GMT-6)</option>
              <option value="America/Denver">Denver (GMT-7)</option>
              <option value="America/Los_Angeles">Los Angeles (GMT-8)</option>
              <option value="America/Anchorage">Alaska (GMT-9)</option>
              <option value="Pacific/Honolulu">Hawaii (GMT-10)</option>
              <option value="America/Toronto">Toronto (GMT-5)</option>
              <option value="America/Mexico_City">Mexico City (GMT-6)</option>
              <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
              <option value="Europe/London">London (GMT+0)</option>
              <option value="Europe/Paris">Paris (GMT+1)</option>
              <option value="Europe/Berlin">Berlin (GMT+1)</option>
              <option value="Europe/Rome">Rome (GMT+1)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
              <option value="Europe/Amsterdam">Amsterdam (GMT+1)</option>
              <option value="Europe/Moscow">Moscow (GMT+3)</option>
              <option value="Asia/Dubai">Dubai (GMT+4)</option>
              <option value="Asia/Karachi">Karachi (GMT+5)</option>
              <option value="Asia/Kolkata">India (GMT+5:30)</option>
              <option value="Asia/Dhaka">Dhaka (GMT+6)</option>
              <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
              <option value="Asia/Singapore">Singapore (GMT+8)</option>
              <option value="Asia/Hong_Kong">Hong Kong (GMT+8)</option>
              <option value="Asia/Shanghai">Shanghai (GMT+8)</option>
              <option value="Asia/Tokyo">Tokyo (GMT+9)</option>
              <option value="Asia/Seoul">Seoul (GMT+9)</option>
              <option value="Australia/Sydney">Sydney (GMT+11)</option>
              <option value="Australia/Melbourne">Melbourne (GMT+11)</option>
              <option value="Pacific/Auckland">Auckland (GMT+13)</option>
            </select>
            <p className="text-xs text-neutral-500">This affects which day is marked as current</p>
          </div>
        </div>

        {/* Theme & Colors */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setThemeColorsExpanded(!themeColorsExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-neutral-800 transition-colors"
          >
            <h2 className="text-sm uppercase tracking-wider text-neutral-400">Theme & Colors</h2>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform ${themeColorsExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {themeColorsExpanded && (
            <div className="px-6 pb-6 space-y-6">
          
          {/* Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500">Preset Theme</label>
            <select
              value={selectedTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white focus:border-white outline-none"
            >
              {PRESET_THEMES.map((theme) => (
                <option key={theme.name} value={theme.name}>
                  {theme.name} - {theme.description}
                </option>
              ))}
              <option value="Custom">Custom - Create your own</option>
            </select>
          </div>

          {/* Custom Color Pickers (only show when Custom is selected) */}
          {selectedTheme === 'Custom' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Background</label>
                  <ThemeColorPicker
                    selectedColor={colors.background}
                    onChange={(color: string) => handleColorChange('background', color)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Text</label>
                  <ThemeColorPicker
                    selectedColor={colors.text}
                    onChange={(color: string) => handleColorChange('text', color)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Past Days</label>
                  <ThemeColorPicker
                    selectedColor={colors.past}
                    onChange={(color: string) => handleColorChange('past', color)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Current Day</label>
                  <ThemeColorPicker
                    selectedColor={colors.current}
                    onChange={(color: string) => handleColorChange('current', color)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Future Days</label>
                  <ThemeColorPicker
                    selectedColor={colors.future}
                    onChange={(color: string) => handleColorChange('future', color)}
                  />
                </div>
              </div>
            </div>
          )}
            </div>
          )}
        </div>

        {/* Typography & Layout */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setTypographyLayoutExpanded(!typographyLayoutExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-neutral-800 transition-colors"
          >
            <h2 className="text-sm uppercase tracking-wider text-neutral-400">Typography & Layout</h2>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform ${typographyLayoutExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {typographyLayoutExpanded && (
            <div className="px-6 pb-6 space-y-6">
          
          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 text-white focus:border-white outline-none"
              style={{ fontFamily }}
            >
              <optgroup label="Monospace">
                <option value="monospace" style={{ fontFamily: 'monospace' }}>Monospace (Default)</option>
                <option value="'Courier New', monospace" style={{ fontFamily: "'Courier New', monospace" }}>Courier New</option>
                <option value="'Consolas', monospace" style={{ fontFamily: "'Consolas', monospace" }}>Consolas</option>
                <option value="'Monaco', monospace" style={{ fontFamily: "'Monaco', monospace" }}>Monaco</option>
              </optgroup>
              <optgroup label="Sans Serif">
                <option value="sans-serif" style={{ fontFamily: 'sans-serif' }}>Sans Serif (Default)</option>
                <option value="system-ui, sans-serif" style={{ fontFamily: 'system-ui, sans-serif' }}>System UI</option>
                <option value="Arial, sans-serif" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                <option value="Helvetica, sans-serif" style={{ fontFamily: 'Helvetica, sans-serif' }}>Helvetica</option>
                <option value="Verdana, sans-serif" style={{ fontFamily: 'Verdana, sans-serif' }}>Verdana</option>
                <option value="'Trebuchet MS', sans-serif" style={{ fontFamily: "'Trebuchet MS', sans-serif" }}>Trebuchet MS</option>
                <option value="'Segoe UI', sans-serif" style={{ fontFamily: "'Segoe UI', sans-serif" }}>Segoe UI</option>
              </optgroup>
              <optgroup label="Serif">
                <option value="serif" style={{ fontFamily: 'serif' }}>Serif (Default)</option>
                <option value="Georgia, serif" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
                <option value="'Times New Roman', serif" style={{ fontFamily: "'Times New Roman', serif" }}>Times New Roman</option>
                <option value="'Palatino Linotype', serif" style={{ fontFamily: "'Palatino Linotype', serif" }}>Palatino</option>
              </optgroup>
              <optgroup label="Display">
                <option value="Impact, sans-serif" style={{ fontFamily: 'Impact, sans-serif' }}>Impact</option>
                <option value="'Comic Sans MS', cursive" style={{ fontFamily: "'Comic Sans MS', cursive" }}>Comic Sans MS</option>
              </optgroup>
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500">
              Font Size: {(fontSize * 100).toFixed(1)}%
            </label>
            <input
              type="range"
              min="0.02"
              max="0.05"
              step="0.001"
              value={fontSize}
              onChange={(e) => setFontSize(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Stats Visibility */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="statsVisible"
              checked={statsVisible}
              onChange={(e) => setStatsVisible(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="statsVisible" className="text-xs uppercase tracking-widest text-neutral-500">
              Show stats (days left, percentage)
            </label>
          </div>

          {/* Text Alignment */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-neutral-500">Text Position</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTextAlignment('top')}
                className={`py-3 px-4 border transition-colors ${
                  textAlignment === 'top'
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-800 text-white border-neutral-700 hover:border-neutral-500'
                }`}
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setTextAlignment('bottom')}
                className={`py-3 px-4 border transition-colors ${
                  textAlignment === 'bottom'
                    ? 'bg-white text-black border-white'
                    : 'bg-neutral-800 text-white border-neutral-700 hover:border-neutral-500'
                }`}
              >
                Bottom
              </button>
            </div>
          </div>

          {/* Layout Padding */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-neutral-500">
                Top Padding: {(safeLayout.topPadding * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.01"
                value={safeLayout.topPadding}
                onChange={(e) => setLayout(prev => ({ ...prev, topPadding: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-neutral-500">
                Bottom Padding: {(safeLayout.bottomPadding * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="0.4"
                step="0.01"
                value={safeLayout.bottomPadding}
                onChange={(e) => setLayout(prev => ({ ...prev, bottomPadding: parseFloat(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="mt-6 p-6 bg-neutral-800 border border-neutral-700 rounded-lg">
            <div className="text-xs uppercase tracking-widest text-neutral-400 mb-4 text-center">Live Preview</div>
            <div 
              className="relative bg-black rounded overflow-hidden"
              style={{
                height: '300px',
                padding: `${safeLayout.topPadding * 300}px ${safeLayout.sidePadding * 500}px ${safeLayout.bottomPadding * 300}px`,
              }}
            >
              {/* Sample dots grid */}
              <div className="flex flex-wrap gap-1" style={{ gap: `${safeLayout.dotSpacing * 4}px` }}>
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      backgroundColor: i < 20 ? colors.past : i === 20 ? colors.current : colors.future,
                    }}
                  />
                ))}
              </div>
              
              {/* Sample text */}
              <div 
                className="absolute"
                style={{
                  fontFamily,
                  fontSize: `${fontSize * 300}px`,
                  color: colors.text,
                  ...(textAlignment === 'top' 
                    ? { top: `${safeLayout.topPadding * 300}px` }
                    : { bottom: `${safeLayout.bottomPadding * 300}px` }),
                  left: `${safeLayout.sidePadding * 500}px`,
                }}
              >
                {statsVisible && (
                  <>
                    <div>Life: 40.5% lived</div>
                    <div>23,654 days remaining</div>
                  </>
                )}
              </div>
            </div>
          </div>

            </div>
          )}
        </div>

        {/* Reset Confirmation Dialog */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-medium text-white">Reset All Settings?</h3>
              <p className="text-sm text-neutral-400">
                This will reset all customization settings to their default values, including:
              </p>
              <ul className="text-sm text-neutral-400 list-disc list-inside space-y-1">
                <li>Theme & Colors</li>
                <li>Typography & Layout</li>
                <li>Text Elements</li>
                <li>Plugins</li>
              </ul>
              <p className="text-sm text-red-400 font-medium">
                This action cannot be undone. Your username and device settings will not be affected.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetSettings}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 transition-colors text-xs uppercase tracking-widest text-white"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Background Image */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <button
            onClick={() => setBackgroundExpanded(!backgroundExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-neutral-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-sm uppercase tracking-wider text-neutral-400">Background Image</h2>
              {!isPro && (
                <span className="text-xs bg-neutral-700 text-neutral-400 px-2 py-0.5 rounded">
                  Free presets available
                </span>
              )}
              {isPro && (
                <span className="text-xs bg-[#FF6B35]/20 text-[#FF6B35] px-2 py-0.5 rounded">
                  Pro
                </span>
              )}
            </div>
            <svg
              className={`w-5 h-5 text-neutral-400 transition-transform ${backgroundExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {backgroundExpanded && (
            <div className="p-6 border-t border-neutral-800">
              <p className="text-xs text-neutral-500 mb-4">
                Add a background image behind your wallpaper grid.
                {!isPro && ' Upgrade to Pro to upload custom images.'}
              </p>
              {user && (
                <BackgroundPicker
                  value={backgroundImage}
                  onChange={setBackgroundImage}
                  userId={user.uid}
                  isPro={isPro}
                />
              )}
            </div>
          )}
        </div>

        {/* Text Elements Editor */}
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-neutral-400">Custom Text Elements</h2>
          <p className="text-xs text-neutral-500">Add custom text overlays to your wallpaper</p>
          <TextElementsEditor
            textElements={textElements}
            onChange={setTextElements}
          />
        </div>

        {/* Plugin Marketplace */}
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-neutral-400">Plugins</h2>
            <div className="flex gap-2">
              <a
                href="/plugins/editor"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-500 hover:text-white transition-colors uppercase tracking-widest"
              >
                My Plugins →
              </a>
            </div>
          </div>
          <PluginMarketplace
            installedPlugins={plugins}
            onInstall={handleInstallPlugin}
            onUninstall={handleUninstallPlugin}
            onToggle={handleTogglePlugin}
            onConfigure={handleConfigurePlugin}
          />
        </div>

        {/* Config Management */}
        <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-lg space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-neutral-400">Config Management</h2>
          
          {/* Plugin count display */}
          <div className="text-sm text-neutral-500">
            {plugins.filter(p => p.enabled).length} plugin{plugins.filter(p => p.enabled).length !== 1 ? 's' : ''} enabled
          </div>
          
          {/* Ko-fi donation unlock */}
          {!isPro && (
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-neutral-400">Donated on Ko-fi?</h3>
                <p className="text-xs text-neutral-600 mt-1">
                  If you donated with a different email, enter it here to unlock Pro.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={kofiEmail}
                  onChange={e => { setKofiEmail(e.target.value); setKofiStatus('idle'); }}
                  placeholder="your@kofi-email.com"
                  className="flex-1 bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs text-white placeholder:text-neutral-600 rounded focus:outline-none focus:border-neutral-500"
                />
                <button
                  onClick={handleKofiEmailCheck}
                  disabled={!kofiEmail.trim() || kofiStatus === 'checking'}
                  className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 text-xs text-white rounded transition-colors whitespace-nowrap"
                >
                  {kofiStatus === 'checking' ? 'Checking...' : 'Verify'}
                </button>
              </div>
              {kofiStatus === 'granted' && (
                <p className="text-xs text-green-400">✓ Donation verified — Pro access granted! Refresh to see changes.</p>
              )}
              {kofiStatus === 'not_found' && (
                <p className="text-xs text-red-400">No donation found for that email. Contact the admin if you think this is a mistake.</p>
              )}
              {kofiStatus === 'already_pro' && (
                <p className="text-xs text-neutral-500">You already have Pro access.</p>
              )}
              {kofiStatus === 'invalid_email' && (
                <p className="text-xs text-yellow-500">Please enter a valid email address.</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleExportConfig}
              className="py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest"
            >
              Export Config
            </button>
            <label className="py-3 bg-neutral-800 hover:bg-neutral-700 transition-colors text-xs uppercase tracking-widest text-center cursor-pointer">
              Import Config
              <input
                type="file"
                accept=".json"
                onChange={handleImportConfig}
                className="hidden"
              />
            </label>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-3 bg-red-900/30 hover:bg-red-900/50 border border-red-800 text-red-400 hover:text-red-300 transition-colors text-xs uppercase tracking-widest"
          >
            Reset All Settings
          </button>
        </div>
      </div>

      {/* Auto-save indicator */}
      {(autoSaving || saving || saveMessage) && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              {(autoSaving || saving) ? (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-neutral-300">Saving...</span>
                </>
              ) : saveMessage.startsWith('✓') ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-500">{saveMessage}</span>
                </>
              ) : saveMessage.startsWith('✗') ? (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-500">{saveMessage}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
      
      {/* Warning if config is incomplete */}
      {hasUnsavedChanges && !isConfigComplete && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg px-4 py-2 shadow-lg">
            <div className="text-xs text-red-400">
              {viewMode === 'life' && !birthDate && '⚠ Please enter your birth date'}
              {viewMode === 'student' && !studyStartDate && '⚠ Please enter your study start date'}
              {viewMode === 'student' && studyStartDate && !universityName.trim() && '⚠ Please enter your university'}
              {viewMode === 'student' && studyStartDate && universityName.trim() && !studyDurationYears && '⚠ Please enter your study duration'}
              {!selectedDevice && '⚠ Please select a device'}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full text-center py-4 border-t border-neutral-800">
        <a
          href="https://github.com/Ti-03"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
        >
          Created by Qutibah Ananzeh
        </a>
      </footer>
    </div>
  );
}
