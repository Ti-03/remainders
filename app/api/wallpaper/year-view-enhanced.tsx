/**
 * Year View Component - Enhanced with Customization Support
 * 
 * Renders 365/366 dots in a 12-month calendar grid showing current year progress.
 * Now supports custom colors, typography, layout, text elements, and plugin additions.
 */

import { TextElement } from '@/lib/types';
import {
  calculateDaysLeftInYear,
  getCurrentDayOfYear,
  getTotalDaysInCurrentYear,
} from '@/lib/calcs';

interface YearViewProps {
  width: number;
  height: number;
  isMondayFirst: boolean;
  yearViewLayout?: 'months' | 'days';
  daysLayoutMode?: 'calendar' | 'continuous';
  colors?: {
    background: string;
    past: string;
    current: string;
    future: string;
    text: string;
  };
  typography?: {
    fontFamily: string;
    fontSize: number;
    statsVisible: boolean;
  };
  layout?: {
    topPadding: number;
    bottomPadding: number;
    sidePadding: number;
    dotSpacing: number;
  };
  textElements?: TextElement[];
  pluginElements?: any[];
  currentDate?: Date;
  timezone?: string;
}

export default function YearView({
  width,
  height,
  isMondayFirst,
  yearViewLayout = 'months',
  daysLayoutMode = 'continuous',
  colors = {
    background: '#1a1a1a',
    past: '#FFFFFF',
    current: '#FF6B35',
    future: '#404040',
    text: '#888888',
  },
  typography = {
    fontFamily: 'monospace',
    fontSize: 0.035,
    statsVisible: true,
  },
  layout = {
    topPadding: 0.25,
    bottomPadding: 0.15,
    sidePadding: 0.18,
    dotSpacing: 0.7,
  },
  textElements = [],
  pluginElements = [],
  currentDate = new Date(),
  timezone = 'UTC',
}: YearViewProps) {
  // Year Logic
  const date = currentDate;
  const currentYear = date.getFullYear();
  const currentDayOfYear = getCurrentDayOfYear(timezone);
  const daysLeft = calculateDaysLeftInYear(timezone);
  const totalDays = getTotalDaysInCurrentYear();

  // Extract color modifiers and legend data from plugins (used by both views)
  const colorModifiers = new Map<string, string>(); // "YYYY-MM-DD" -> color
  let legendData: { color: string; label: string }[] = [];
  
  console.log('YearViewEnhanced: Processing plugin elements:', pluginElements.length);
  
  pluginElements.forEach((el: any) => {
    if (el.type === 'day-color-modifier' && el.date && el.color) {
      colorModifiers.set(el.date, el.color);
    } else if (el.type === 'legend-data' && Array.isArray(el.items)) {
      console.log('YearViewEnhanced: Found legend data:', el.items);
      legendData = el.items;
    }
  });
  
  console.log('YearViewEnhanced: Final legendData length:', legendData.length);
  console.log('YearViewEnhanced: Color modifiers count:', colorModifiers.size);

  // Days View Layout (weekly grid - 2 weeks per row)
  if (yearViewLayout === 'days') {
    const aspectRatio = height / width;
    
    const SAFE_AREA_TOP = aspectRatio > 2.0 
      ? height * Math.max(layout.topPadding, 0.28) 
      : height * layout.topPadding;
    const SAFE_AREA_BOTTOM = height * layout.bottomPadding;
    const SAFE_HEIGHT = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;
    
    const adjustedSidePadding = aspectRatio > 2.1 
      ? Math.min(layout.sidePadding, 0.12) 
      : aspectRatio > 2.0 
      ? Math.min(layout.sidePadding, 0.15) 
      : layout.sidePadding;
    
    const paddingX = width * adjustedSidePadding;
    const availableWidth = width - paddingX * 2;
    
    // Calculate grid dimensions - 14 days per row (2 weeks)
    const COLS_PER_ROW = 14;
    
    // Calculate offset for calendar mode
    let startDayOffset = 0;
    if (daysLayoutMode === 'calendar') {
      // Get the day of week for January 1st
      const jan1 = new Date(currentYear, 0, 1);
      startDayOffset = jan1.getDay(); // 0 = Sunday
      
      // If Monday first, adjust the offset
      if (isMondayFirst) {
        startDayOffset = startDayOffset === 0 ? 6 : startDayOffset - 1;
      }
    }
    
    const totalCells = startDayOffset + totalDays;
    const ROWS = Math.ceil(totalCells / COLS_PER_ROW);
    
    // Calculate dot size
    const maxDotSizeH = availableWidth / COLS_PER_ROW;
    const maxDotSizeV = SAFE_HEIGHT / (ROWS + 2); // +2 for stats spacing
    const dotSize = Math.min(maxDotSizeH, maxDotSizeV) * 0.7; // Smaller dots
    const dotGap = dotSize * layout.dotSpacing * 0.5; // Tighter spacing
    
    const statsFontSize = dotSize * 0.8; // Much smaller footer text
    const statsMargin = dotSize * 2;
    
    const gridWidth = COLS_PER_ROW * (dotSize + dotGap) - dotGap;
    const gridHeight = ROWS * (dotSize + dotGap) - dotGap;
    
    const startX = paddingX + (availableWidth - gridWidth) / 2;
    const startY = SAFE_AREA_TOP + (SAFE_HEIGHT - gridHeight - statsMargin - statsFontSize) / 2;
    const statsY = startY + gridHeight + statsMargin;
    
    // Create all dots
    const allDots = [];
    for (let day = 1; day <= totalDays; day++) {
      // Construct date string for lookup
      const dayDate = new Date(currentYear, 0, day); // Day of year to actual date
      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
      const dd = String(dayDate.getDate()).padStart(2, '0');
      const dateStr = `${currentYear}-${mm}-${dd}`;
      
      let color;
      // Check for modifier first
      if (colorModifiers.has(dateStr)) {
        color = colorModifiers.get(dateStr)!;
      } else if (day < currentDayOfYear) {
        color = colors.past;
      } else if (day === currentDayOfYear) {
        color = colors.current;
      } else {
        color = colors.future;
      }
      
      // Calculate position with offset for first week
      const cellIndex = day - 1 + startDayOffset;
      const row = Math.floor(cellIndex / COLS_PER_ROW);
      const col = cellIndex % COLS_PER_ROW;
      
      allDots.push(
        <div
          key={`dot-${day}`}
          style={{
            position: 'absolute',
            left: `${startX + col * (dotSize + dotGap)}px`,
            top: `${startY + row * (dotSize + dotGap)}px`,
            width: `${dotSize}px`,
            height: `${dotSize}px`,
            borderRadius: '50%',
            backgroundColor: color,
          }}
        />
      );
    }
    
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors?.background || '#1a1a1a',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
          {allDots}
        </div>

        {/* Stats Footer */}
        {typography.statsVisible && (
          <div
            style={{
              position: 'absolute',
              top: `${statsY}px`,
              left: '0px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: `${statsFontSize}px`,
                fontFamily: typography?.fontFamily || 'monospace',
                marginBottom: legendData.length > 0 ? `${statsFontSize * 0.5}px` : '0px',
              }}
            >
              <span style={{ color: colors?.current || '#FF6B35' }}>{daysLeft}d left</span>
              <span style={{ color: colors?.text || '#888888', margin: '0px 8px' }}>·</span>
              <span style={{ color: colors?.text || '#888888' }}>{Math.round((currentDayOfYear / totalDays) * 100)}%</span>
            </div>
            
            {/* Legend - Only rendered if plugins provide data */}
            {legendData.length > 0 && (
              <div 
                style={{
                  display: 'flex',
                  marginTop: '8px',
                }}
              >
                {legendData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', margin: '0 8px' }}>
                    <div 
                      style={{ 
                        width: `${statsFontSize * 0.6}px`, 
                        height: `${statsFontSize * 0.6}px`, 
                        borderRadius: '50%', 
                        backgroundColor: item.color,
                        marginRight: '6px'
                      }} 
                    />
                    <span 
                      style={{ 
                        color: item.color, 
                        fontSize: `${statsFontSize * 0.7}px`,
                        fontFamily: typography?.fontFamily || 'monospace',
                        opacity: 0.9
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Custom Text Elements */}
        {textElements.map((element) => {
          if (!element.visible || element.content == null) return null;
          
          const style: any = {
            position: 'absolute',
            left: `${element.x}%`,
            top: `${element.y}%`,
            fontSize: `${element.fontSize || 16}px`,
            fontFamily: element.fontFamily || typography?.fontFamily || 'monospace',
            color: element.color || colors?.text || '#888888',
          };

          const align = element.align || 'left';
          if (align === 'center') {
            style.transform = 'translate(-50%, -50%)';
          } else if (align === 'right') {
            style.transform = 'translate(-100%, -50%)';
          } else {
            style.transform = 'translateY(-50%)';
          }

          return (
            <div key={element.id} style={style}>
              {String(element.content).trim()}
            </div>
          );
        })}

        {/* Plugin-added Elements (excluding modifiers and legend data) */}
        {pluginElements.map((element, index) => {
          if (element.type === 'day-color-modifier' || element.type === 'legend-data') return null;
          
          if (element.type === 'text' && element.content != null) {
            const contentStr = String(element.content || '').trim();
            
            if (!contentStr) return null;

            const style: any = {
              position: 'absolute',
              left: `${element.x}px`,
              top: `${element.y}px`,
              fontSize: `${element.fontSize || 16}px`,
              color: element.color || colors?.text || '#888888',
              fontFamily: element.fontFamily || typography?.fontFamily || 'monospace',
            };

            if (element.align === 'center') {
              style.transform = 'translateX(-50%)';
            } else if (element.align === 'right') {
              style.transform = 'translateX(-100%)';
            }

            if (typeof element.maxWidth === 'number') {
              style.maxWidth = `${element.maxWidth}px`;
            }
            
            return (
              <div key={`plugin-${index}`} style={style}>
                {contentStr}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Grid Layout Config (Months View)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const COLUMNS = 3;
  const ROWS = 4;

  // Layout Calculations with Aspect Ratio Support
  const aspectRatio = height / width;
  
  // Adapt safe zones based on aspect ratio
  const SAFE_AREA_TOP = aspectRatio > 2.0 
    ? height * Math.max(layout.topPadding, 0.28) 
    : height * layout.topPadding;
  const SAFE_AREA_BOTTOM = height * layout.bottomPadding;
  const SAFE_HEIGHT = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;

  // Adjust side padding for narrower screens
  const adjustedSidePadding = aspectRatio > 2.1 
    ? Math.min(layout.sidePadding, 0.12) 
    : aspectRatio > 2.0 
    ? Math.min(layout.sidePadding, 0.15) 
    : layout.sidePadding;
  
  const paddingX = width * adjustedSidePadding;
  const availableWidth = width - paddingX * 2;
  const cellWidth = availableWidth / COLUMNS;

  // Calculate optimal dot size based on available space (both horizontal and vertical)
  const maxDotSizeH = cellWidth / 8; // 7 dots + spacing
  const maxMonthBlockHeight = SAFE_HEIGHT / ROWS;
  const maxDotSizeV = maxMonthBlockHeight / 9; // Labels + 6 rows of dots + gaps
  
  const dotSize = Math.min(maxDotSizeH, maxDotSizeV, cellWidth / 7, 20);
  const dotGap = dotSize * layout.dotSpacing;
  const monthLabelSize = dotSize * 1.6;

  const monthBlockHeight = monthLabelSize + dotSize + 6 * dotSize + 5 * dotGap;
  const rowGap = monthLabelSize * 1.0;

  const statsFontSize = monthLabelSize;
  const statsMargin = rowGap * 3.0; // Reduced for tighter spacing

  const gridHeight = ROWS * monthBlockHeight + (ROWS - 1) * rowGap;
  const totalContentHeight = gridHeight + statsMargin + statsFontSize;

  // Ensure content doesn't go too high
  const calculatedStartY = SAFE_AREA_TOP + (SAFE_HEIGHT - totalContentHeight) / 2;
  const startY = Math.max(SAFE_AREA_TOP * 0.9, calculatedStartY);
  const statsY = startY + gridHeight + statsMargin;

  // Helper to get days in month
  const getDaysInMonth = (year: number, monthIndex: number) => {
    return new Date(year, monthIndex + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, monthIndex: number) => {
    if (isMondayFirst) {
      const day = new Date(year, monthIndex, 1).getDay();
      return day === 0 ? 6 : day - 1;
    }
    return new Date(year, monthIndex, 1).getDay();
  };

  let globalDayCounter = 0;

  // Build month grids
  const monthCells = MONTHS.map((monthName, monthIndex) => {
    const daysInMonth = getDaysInMonth(currentYear, monthIndex);
    const startDay = getFirstDayOfMonth(currentYear, monthIndex);

    const dots = [];

    // Render 7x6 grid (42 cells)
    for (let i = 0; i < 42; i++) {
      const dayNum = i - startDay + 1;
      let color = 'transparent';

      if (dayNum > 0 && dayNum <= daysInMonth) {
        globalDayCounter++;
        
        // Construct date string for lookup
        const mm = String(monthIndex + 1).padStart(2, '0');
        const dd = String(dayNum).padStart(2, '0');
        const dateStr = `${currentYear}-${mm}-${dd}`;
        
        // Check for modifier first
        if (colorModifiers.has(dateStr)) {
          color = colorModifiers.get(dateStr)!;
        } else if (globalDayCounter < currentDayOfYear) {
          color = colors.past;
        } else if (globalDayCounter === currentDayOfYear) {
          color = colors.current;
        } else {
          color = colors.future;
        }
      }

      if (dayNum > 0 && dayNum <= daysInMonth) {
        const row = Math.floor(i / 7);
        const col = i % 7;

        dots.push(
          <div
            key={`dot-${monthIndex}-${i}`}
            style={{
              position: 'absolute',
              left: `${col * (dotSize + dotGap)}px`,
              top: `${row * (dotSize + dotGap)}px`,
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              borderRadius: '50%',
              backgroundColor: color,
            }}
          />
        );
      }
    }

    // Position of month cell
    const colIndex = monthIndex % COLUMNS;
    const rowIndex = Math.floor(monthIndex / COLUMNS);

    const x = paddingX + colIndex * cellWidth;
    const y = startY + rowIndex * (monthBlockHeight + rowGap);
    
    // Center dot grid within cell
    const dotGridWidth = (7 * dotSize) + (6 * dotGap);
    const centerOffset = Math.max(0, (cellWidth - dotGridWidth) / 2);

    return (
      <div
        key={monthName}
        style={{
          position: 'absolute',
          left: `${x + centerOffset}px`,
          top: `${y}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            color: colors?.text || '#888888',
            fontSize: `${monthLabelSize}px`,
            marginBottom: `${dotSize}px`,
            fontFamily: typography?.fontFamily || 'monospace',
            display: 'flex',
          }}
        >
          {monthName}
        </div>
        <div
          style={{
            position: 'relative',
            width: `${7 * (dotSize + dotGap)}px`,
            height: `${6 * (dotSize + dotGap)}px`,
            display: 'flex',
          }}
        >
          {dots}
        </div>
      </div>
    );
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: colors?.background || '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
        {monthCells}
      </div>

      {/* Stats Footer */}
      {typography.statsVisible && (
        <div
          style={{
            position: 'absolute',
            top: `${statsY}px`,
            left: '0px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: `${statsFontSize}px`,
              fontFamily: typography?.fontFamily || 'monospace',
              marginBottom: legendData.length > 0 ? `${statsFontSize * 0.5}px` : '0px',
            }}
          >
            <span style={{ color: colors?.current || '#FF6B35' }}>{daysLeft}d left</span>
            <span style={{ color: colors?.text || '#888888', margin: '0px 8px' }}>·</span>
            <span style={{ color: colors?.text || '#888888' }}>{Math.round((currentDayOfYear / totalDays) * 100)}%</span>
          </div>
          
          {/* Legend - Only rendered if plugins provide data */}
          {legendData.length > 0 && (
            <div 
              style={{
                display: 'flex',
                marginTop: '8px',
              }}
            >
              {legendData.map((item: { color: string; label: string }, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', margin: '0 8px' }}>
                  <div 
                    style={{ 
                      width: `${statsFontSize * 0.6}px`, 
                      height: `${statsFontSize * 0.6}px`, 
                      borderRadius: '50%', 
                      backgroundColor: item.color,
                      marginRight: '6px'
                    }} 
                  />
                  <span 
                    style={{ 
                      color: item.color, 
                      fontSize: `${statsFontSize * 0.7}px`,
                      fontFamily: typography?.fontFamily || 'monospace',
                      opacity: 0.9
                    }}
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Text Elements */}
      {textElements.map((element) => {
        if (!element.visible || element.content == null) return null;
        
        const style: any = {
          position: 'absolute',
          left: `${element.x}%`,
          top: `${element.y}%`,
          fontSize: `${element.fontSize || 16}px`,
          fontFamily: element.fontFamily || typography?.fontFamily || 'monospace',
          color: element.color || colors?.text || '#888888',
        };

        // Handle alignment for percentage-based positioning
        const align = element.align || 'left';
        if (align === 'center') {
          style.transform = 'translate(-50%, -50%)';
        } else if (align === 'right') {
          style.transform = 'translate(-100%, -50%)';
        } else {
          style.transform = 'translateY(-50%)';
        }

        return (
          <div key={element.id} style={style}>
            {String(element.content).trim()}
          </div>
        );
      })}

      {/* Plugin-added Elements */}
      {pluginElements.map((element, index) => {
        if (element.type === 'text' && element.content != null) {
          const contentStr = String(element.content || '').trim();
          
          if (!contentStr) return null;

          const style: any = {
            position: 'absolute',
            left: `${element.x}px`,
            top: `${element.y}px`,
            fontSize: `${element.fontSize || 16}px`,
            color: element.color || colors?.text || '#888888',
            fontFamily: element.fontFamily || typography?.fontFamily || 'monospace',
          };

          // Handle alignment
          if (element.align === 'center') {
            style.transform = 'translateX(-50%)';
          } else if (element.align === 'right') {
            style.transform = 'translateX(-100%)';
          }

          if (typeof element.maxWidth === 'number') {
            style.maxWidth = `${element.maxWidth}px`;
          }
          
          return (
            <div key={`plugin-${index}`} style={style}>
              {contentStr}
            </div>
          );
        } else if (element.type === 'circle') {
          return (
            <div
              key={`plugin-${index}`}
              style={{
                position: 'absolute',
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.width}px`,
                height: `${element.height}px`,
                borderRadius: '50%',
                backgroundColor: element.color || '#FC4C02',
                zIndex: 10, // Ensure it sits on top of existing dots
              }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
