/**
 * Remainders - Main Page Component
 * Minimalist Redesign
 */

'use client';

import { useState, useEffect } from 'react';
import { UserProfile, DeviceModel, ViewMode } from '@/lib/types';
import DeviceSelector from '@/components/DeviceSelector';
import BirthDateInput from '@/components/BirthDateInput';
import StudentDetailsInput from '@/components/StudentDetailsInput';
import GoalWallpaperPreview from '@/components/GoalWallpaperPreview';
import ViewModeToggle from '@/components/ViewModeToggle';
import SetupInstructions from '@/components/SetupInstructions';
import AuthButton from '@/components/AuthButton';
import { deriveGoalEndDateFromDuration } from '@/lib/student-view';

const STORAGE_KEY = 'remainders-user-profile';
const THEME_COLOR = 'FFFFFF'; // White for minimalist dark theme

export default function Home() {
  const [birthDate, setBirthDate] = useState('');
  const [studyStartDate, setStudyStartDate] = useState('');
  const [universityName, setUniversityName] = useState('');
  const [goalEndDate, setGoalEndDate] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceModel | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('life');
  const [isMondayFirst, setIsMondayFirst] = useState(false);
  const [yearViewLayout, setYearViewLayout] = useState<'months' | 'days'>('months');
  const [daysLayoutMode, setDaysLayoutMode] = useState<'calendar' | 'continuous'>('continuous');
  const [wallpaperUrl, setWallpaperUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedProfile = localStorage.getItem(STORAGE_KEY);
      if (savedProfile) {
        const profile: UserProfile = JSON.parse(savedProfile);
        setBirthDate(profile.birthDate);
        setStudyStartDate(profile.studyStartDate || '');
        setUniversityName(profile.universityName || '');
        setGoalEndDate(
          profile.goalEndDate ||
          deriveGoalEndDateFromDuration(profile.studyStartDate || '', profile.studyDurationYears) ||
          ''
        );
        if (profile.viewMode) setViewMode(profile.viewMode);
        if (profile.isMondayFirst !== undefined) setIsMondayFirst(profile.isMondayFirst);
        if ((profile as any).yearViewLayout) setYearViewLayout((profile as any).yearViewLayout);
        if ((profile as any).daysLayoutMode) setDaysLayoutMode((profile as any).daysLayoutMode);

        if (profile.device) {
          setSelectedDevice({
            brand: profile.device.brand || '',
            model: profile.device.modelName,
            width: profile.device.width,
            height: profile.device.height,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const canSaveProfile = selectedDevice !== null && (
      viewMode === 'year' ||
      (viewMode === 'life' && Boolean(birthDate)) ||
      (viewMode === 'student' && Boolean(studyStartDate) && Boolean(universityName.trim()) && Boolean(goalEndDate))
    );

    if (canSaveProfile && selectedDevice) {
      const profile: any = {
        birthDate,
        studyStartDate,
        universityName: universityName.trim(),
        goalEndDate,
        themeColor: THEME_COLOR,
        device: {
          brand: selectedDevice.brand,
          modelName: selectedDevice.model,
          width: selectedDevice.width,
          height: selectedDevice.height,
        },
        viewMode,
        isMondayFirst,
        yearViewLayout,
        daysLayoutMode,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        console.log('Profile saved:', profile);
      } catch (error) {
        console.error('Failed to save profile:', error);
      }
    }
  }, [birthDate, studyStartDate, universityName, goalEndDate, selectedDevice, viewMode, isMondayFirst, yearViewLayout, daysLayoutMode]);

  const buildWallpaperPath = () => {
    if (!selectedDevice || !selectedDevice.width || !selectedDevice.height) return;
    if (viewMode === 'life' && !birthDate) return;
    if (viewMode === 'student' && (!studyStartDate || !universityName.trim() || !goalEndDate)) return;

    const params = new URLSearchParams({
      themeColor: THEME_COLOR,
      width: selectedDevice.width.toString(),
      height: selectedDevice.height.toString(),
      viewMode,
    });

    if (viewMode === 'life' && birthDate) {
      params.append('birthDate', birthDate);
    }

    if (viewMode === 'student') {
      params.append('studyStartDate', studyStartDate);
      params.append('universityName', universityName.trim());
      params.append('goalEndDate', goalEndDate);
    }
    
    if (viewMode === 'year') {
      if (isMondayFirst) {
        params.append('isMondayFirst', 'true');
      }
      params.append('yearViewLayout', yearViewLayout);
      if (yearViewLayout === 'days') {
        params.append('daysLayoutMode', daysLayoutMode);
      }
    }

    return `/api/wallpaper?${params.toString()}`;
  };

  const generateWallpaperUrl = () => {
    const path = buildWallpaperPath();
    if (!path) return;

    const baseUrl = typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.host}`
      : '';

    const url = `${baseUrl}${path}`;
    setWallpaperUrl(url);
  };

  // Auto-generate wallpaper URL when data is loaded from localStorage
  useEffect(() => {
    if (isFormComplete && !wallpaperUrl) {
      generateWallpaperUrl();
    }
  }, [selectedDevice, birthDate, studyStartDate, universityName, goalEndDate, viewMode, isMondayFirst, yearViewLayout, daysLayoutMode]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(wallpaperUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy keys:', error);
    }
  };

  const isFormComplete = viewMode === 'year'
    ? selectedDevice !== null
    : viewMode === 'life'
      ? Boolean(birthDate && selectedDevice)
      : Boolean(studyStartDate && universityName.trim() && goalEndDate && selectedDevice);

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6 selection:bg-white selection:text-black relative">
      {/* Auth Button */}
      <AuthButton />
      
      <div className="w-full flex-1 flex flex-col items-center justify-center max-w-md space-y-12">
        {/* Header */}
        <header className="text-center space-y-2 flex flex-col items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-light tracking-widest text-white uppercase">Remainders</h1>
            <a
              href="https://ko-fi.com/ti003"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white transition-colors"
              title="Support on Ko-fi"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 hover:opacity-100 transition-opacity">
                <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
              </svg>
            </a>
            <a
              href="https://github.com/Ti-03/Chronos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-500 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="opacity-80 hover:opacity-100 transition-opacity">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
          <p className="text-sm text-neutral-500 font-mono tracking-wide">MEMENTO MORI</p>
          <p className="sr-only">Generate life calendar and year calendar wallpapers. Visualize your life as 4,160 weeks for mindful, intentional living.</p>
        </header>

        {/* Configuration */}
        <section className="space-y-8 w-full" aria-label="Wallpaper Configuration">
          <ViewModeToggle selectedMode={viewMode} onChange={setViewMode} />
          
          {/* Monday First Toggle (only for year view) */}
          {viewMode === 'year' && (
            <>
              {/* Year View Layout Toggle */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-widest text-neutral-500">Layout</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setYearViewLayout('months')}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                      yearViewLayout === 'months'
                        ? 'bg-white text-black'
                        : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                    }`}
                  >
                    Months
                  </button>
                  <button
                    onClick={() => setYearViewLayout('days')}
                    className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                      yearViewLayout === 'days'
                        ? 'bg-white text-black'
                        : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                    }`}
                  >
                    Days
                  </button>
                </div>
              </div>

              {/* Days Layout Mode - only show when yearViewLayout is 'days' */}
              {yearViewLayout === 'days' && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-neutral-500">Days Mode</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDaysLayoutMode('continuous')}
                      className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                        daysLayoutMode === 'continuous'
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                      }`}
                    >
                      Continuous
                    </button>
                    <button
                      onClick={() => setDaysLayoutMode('calendar')}
                      className={`flex-1 py-3 text-xs uppercase tracking-widest transition-colors ${
                        daysLayoutMode === 'calendar'
                          ? 'bg-white text-black'
                          : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800'
                      }`}
                    >
                      Calendar
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {daysLayoutMode === 'continuous'
                      ? 'Days flow continuously'
                      : 'Days follow week structure'}
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
                    className="w-5 h-5 rounded cursor-pointer border-2 border-white/30 bg-black/50 checked:bg-white checked:border-white appearance-none relative checked:after:content-['✓'] checked:after:absolute checked:after:left-1/2 checked:after:top-1/2 checked:after:-translate-x-1/2 checked:after:-translate-y-1/2 checked:after:text-black checked:after:text-sm checked:after:font-bold"
                  />
                  <label htmlFor="mondayFirst" className="text-xs uppercase tracking-widest text-neutral-500 cursor-pointer">
                    Start week on Monday
                  </label>
                </div>
              )}
            </>
          )}

          <div className="space-y-6">
            {viewMode === 'life' && (
              <BirthDateInput value={birthDate} onChange={setBirthDate} />
            )}

            {viewMode === 'student' && (
              <StudentDetailsInput
                studyStartDate={studyStartDate}
                universityName={universityName}
                goalEndDate={goalEndDate}
                selectedDeviceLabel={selectedDevice?.model || ''}
                onStudyStartDateChange={setStudyStartDate}
                onUniversityNameChange={setUniversityName}
                onGoalEndDateChange={setGoalEndDate}
              />
            )}

            <DeviceSelector
              selectedModel={selectedDevice?.model || ''}
              onSelect={setSelectedDevice}
            />
          </div>

          <button
            onClick={generateWallpaperUrl}
            disabled={!isFormComplete}
            className={`
              w-full py-4 text-sm uppercase tracking-widest font-medium transition-all duration-300
              ${isFormComplete
                ? 'bg-white text-black hover:bg-neutral-200'
                : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
              }
            `}
            aria-label="Generate wallpaper URL"
          >
            Generate
          </button>
        </section>

        {/* Result Area */}
        {wallpaperUrl && (
          <section className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500" aria-label="Generated Wallpaper">
            <div className="flex items-center gap-2 p-4 border border-white/10 bg-white/5 rounded backdrop-blur-sm">
              <code className="text-xs text-neutral-400 truncate flex-1 font-mono">
                {wallpaperUrl}
              </code>
              <button
                onClick={copyToClipboard}
                className="text-xs text-white hover:text-neutral-300 uppercase tracking-wider"
                aria-label="Copy wallpaper URL to clipboard"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            {viewMode === 'student' && (
              <GoalWallpaperPreview
                previewUrl={wallpaperUrl}
              />
            )}

            {viewMode !== 'student' && (
              <div className="text-center">
                <a
                  href={wallpaperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-neutral-500 hover:text-white transition-colors border-b border-transparent hover:border-white pb-0.5"
                  aria-label="Open wallpaper preview in new tab"
                >
                  Preview Wallpaper
                </a>
              </div>
            )}

            <SetupInstructions wallpaperUrl={wallpaperUrl} selectedBrand={selectedDevice?.brand || ''} />
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full text-center py-4">
        <a
          href="https://github.com/Ti-03"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-neutral-600 hover:text-neutral-400 uppercase tracking-widest transition-colors"
        >
          Created by Qutibah Ananzeh
        </a>
      </footer>
    </main>
  );
}
