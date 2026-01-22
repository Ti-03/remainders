
import { Plugin, PluginRenderElement, PluginExecutionContext } from '../types';

export const stravaPlugin: Plugin = {
  id: 'strava-activities',
  name: 'Strava Activities',
  description: 'Visualize your workouts as colored dots on your year view',
  author: 'Remainders',
  version: '1.1.0',
  configSchema: {
    mode: {
      type: 'string',
      enum: ['simple', 'types'],
      default: 'types',
      label: 'Display Mode',
    },
    // Sport toggles
    showRun: {
      type: 'boolean',
      default: true,
      label: 'Show Runs',
    },
    showRide: {
      type: 'boolean',
      default: true,
      label: 'Show Rides',
    },
    showSwim: {
      type: 'boolean',
      default: true,
      label: 'Show Swims',
    },
    showOther: {
      type: 'boolean',
      default: true,
      label: 'Show Other Activities',
    },
    // Colors
    runColor: {
      type: 'string',
      default: '#FC4C02', // Strava Orange
      label: 'Run Color',
    },
    rideColor: {
      type: 'string',
      default: '#007FB6', // Strava Blue
      label: 'Ride Color',
    },
    swimColor: {
      type: 'string',
      default: '#605CA8',
      label: 'Swim Color',
    },
    otherColor: {
      type: 'string',
      default: '#00B060',
      label: 'Other Activity Color',
    },
    simpleColor: {
      type: 'string',
      default: '#FC4C02',
      label: 'Simple Mode Color',
    },
    // Legend options
    showLegend: {
      type: 'boolean',
      default: true,
      label: 'Show Legend',
    },
    legendDisplay: {
      type: 'string',
      enum: ['count', 'percentage'],
      default: 'count',
      label: 'Legend Display',
    },
  },
  execute: (ctx: PluginExecutionContext): PluginRenderElement[] => {
    // 1. Check for data
    if (!ctx.integrations?.strava || !Array.isArray(ctx.integrations.strava)) {
      return [];
    }

    const activities = ctx.integrations.strava;
    const year = ctx.currentDate?.getFullYear() || new Date().getFullYear();
    const isSimpleMode = ctx.config.mode === 'simple';
    const showPercentage = ctx.config.legendDisplay === 'percentage';

    // Sport toggles (default to true if not set)
    const showRun = ctx.config.showRun !== false;
    const showRide = ctx.config.showRide !== false;
    const showSwim = ctx.config.showSwim !== false;
    const showOther = ctx.config.showOther !== false;

    // Helper to check if activity type is enabled
    const isTypeEnabled = (type: string): boolean => {
      if (type === 'Run') return showRun;
      if (type === 'Ride') return showRide;
      if (type === 'Swim') return showSwim;
      return showOther; // All other types
    };

    // Helper to get color for activity type
    const getColor = (type: string): string => {
      if (isSimpleMode) return ctx.config.simpleColor || '#FC4C02';
      if (type === 'Run') return ctx.config.runColor || '#FC4C02';
      if (type === 'Ride') return ctx.config.rideColor || '#007FB6';
      if (type === 'Swim') return ctx.config.swimColor || '#605CA8';
      return ctx.config.otherColor || '#00B060';
    };

    // 2. Map activities to date strings and count by type
    const activityMapByDate = new Map<string, string>();
    const countByType = { Run: 0, Ride: 0, Swim: 0, Other: 0 };
    
    activities.forEach(activity => {
      const localDateStr = activity.start_date_local.split('T')[0]; // "YYYY-MM-DD"
      
      // Only process activities from current year
      if (!localDateStr.startsWith(String(year))) return;
      
      // Normalize activity type
      const actType = ['Run', 'Ride', 'Swim'].includes(activity.type) 
        ? activity.type 
        : 'Other';
      
      // Skip if this type is disabled
      if (!isTypeEnabled(actType)) return;
      
      // Count all activities (even duplicates on same day)
      if (actType === 'Run') countByType.Run++;
      else if (actType === 'Ride') countByType.Ride++;
      else if (actType === 'Swim') countByType.Swim++;
      else countByType.Other++;
      
      // For coloring dots, only keep first activity per day
      if (!activityMapByDate.has(localDateStr)) {
        activityMapByDate.set(localDateStr, actType);
      }
    });

    // 3. Build color modifiers
    const modifiers: PluginRenderElement[] = [];
    
    for (const [dateStr, type] of activityMapByDate.entries()) {
      modifiers.push({
        type: 'day-color-modifier',
        date: dateStr,
        color: getColor(type)
      });
    }

    // 4. Build legend
    if (ctx.config.showLegend !== false) {
      const totalActiveDays = activityMapByDate.size;
      const totalActivities = countByType.Run + countByType.Ride + countByType.Swim + countByType.Other;
      
      if (isSimpleMode) {
        // Simple mode: just show total active days or percentage
        let label: string;
        if (showPercentage) {
          // Calculate days in year so far
          const now = ctx.currentDate || new Date();
          const startOfYear = new Date(year, 0, 1);
          const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
          const percentage = Math.round((totalActiveDays / dayOfYear) * 100);
          label = `${percentage}% days active`;
        } else {
          label = `${totalActiveDays} active days`;
        }
        
        modifiers.push({
          type: 'legend-data',
          items: [{ label, color: ctx.config.simpleColor || '#FC4C02' }]
        });
      } else {
        // Types mode: show each enabled sport with count/percentage
        const legendItems: { label: string; color: string }[] = [];
        
        const formatLabel = (name: string, count: number): string => {
          if (showPercentage && totalActivities > 0) {
            const pct = Math.round((count / totalActivities) * 100);
            return `${name} ${pct}%`;
          }
          return `${name} ${count}`;
        };
        
        if (showRun && countByType.Run > 0) {
          legendItems.push({
            label: formatLabel('Run', countByType.Run),
            color: ctx.config.runColor || '#FC4C02'
          });
        }
        if (showRide && countByType.Ride > 0) {
          legendItems.push({
            label: formatLabel('Ride', countByType.Ride),
            color: ctx.config.rideColor || '#007FB6'
          });
        }
        if (showSwim && countByType.Swim > 0) {
          legendItems.push({
            label: formatLabel('Swim', countByType.Swim),
            color: ctx.config.swimColor || '#605CA8'
          });
        }
        if (showOther && countByType.Other > 0) {
          legendItems.push({
            label: formatLabel('Other', countByType.Other),
            color: ctx.config.otherColor || '#00B060'
          });
        }
        
        // Only add legend if we have items
        if (legendItems.length > 0) {
          modifiers.push({
            type: 'legend-data',
            items: legendItems
          });
        }
      }
    }

    return modifiers;
  }
};
