/**
 * Life View Component - Enhanced with Customization Support
 * 
 * Renders 4,420 dots representing 85 years of life (1 dot = 1 week).
 * Now supports custom colors, typography, layout, text elements, and plugin additions.
 */

import { TextElement } from '@/lib/types';

interface LifeViewProps {
  width: number;
  height: number;
  birthDate: string;
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
  backgroundImage?: { url: string; opacity: number };
}

export default function LifeView({
  width,
  height,
  birthDate,
  colors = {
    background: '#1a1a1a',
    past: '#FFFFFF',
    current: '#FF6B35',
    future: '#333333',
    text: '#888888',
  },
  typography = {
    fontFamily: 'monospace',
    fontSize: 0.035,
    statsVisible: true,
  },
  layout = {
    topPadding: 0.25,
    bottomPadding: 0.14,
    sidePadding: 0.10,
    dotSpacing: 0.4,
  },
  textElements = [],
  pluginElements = [],
  currentDate = new Date(),
  backgroundImage,
}: LifeViewProps) {
  // Life Logic
  const LIFE_EXPECTANCY_YEARS = 85;
  const birth = new Date(birthDate);
  const today = currentDate;

  // Calculate total weeks (85 years × 52 weeks/year = 4,420 weeks)
  const TOTAL_DOTS = 4420;

  const diffTime = Math.abs(today.getTime() - birth.getTime());
  const weeksLived = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)), TOTAL_DOTS);
  const lifePercentage = ((weeksLived / TOTAL_DOTS) * 100).toFixed(1);

  // Layout Calculations with Aspect Ratio Support
  const aspectRatio = height / width;
  
  // Adapt safe zones based on aspect ratio
  const SAFE_AREA_TOP = aspectRatio > 2.0 
    ? height * Math.max(layout.topPadding, 0.28) 
    : height * layout.topPadding;
  const SAFE_AREA_BOTTOM = height * layout.bottomPadding;
  
  // Reduce side padding on narrower screens
  const adjustedSidePadding = aspectRatio > 2.1 
    ? Math.min(layout.sidePadding, 0.08) 
    : aspectRatio > 2.0 
    ? Math.min(layout.sidePadding, 0.09) 
    : layout.sidePadding;
  const SAFE_WIDTH_PADDING = width * adjustedSidePadding;

  const availableWidth = width - SAFE_WIDTH_PADDING * 2;
  const availableHeight = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;

  // Calculate optimal grid dimensions
  const outputRatio = availableWidth / availableHeight;
  const estimatedCols = Math.sqrt(TOTAL_DOTS * outputRatio);
  const cols = Math.max(40, Math.floor(estimatedCols)); // Minimum 40 columns
  const rows = Math.ceil(TOTAL_DOTS / cols);

  // Calculate dot size with spacing - ensure it fits both dimensions
  const dotSizeFromWidth = availableWidth / (cols + (cols - 1) * layout.dotSpacing);
  const dotSizeFromHeight = availableHeight / (rows + (rows - 1) * layout.dotSpacing);
  const dotSize = Math.floor(Math.min(dotSizeFromWidth, dotSizeFromHeight));
  const gap = Math.max(1, Math.floor(dotSize * layout.dotSpacing));

  // Grid dimensions
  const gridWidth = cols * dotSize + (cols - 1) * gap;
  const gridHeight = rows * dotSize + (rows - 1) * gap;

  // Center the grid with bounds checking
  const startX = Math.max(SAFE_WIDTH_PADDING, (width - gridWidth) / 2);
  const calculatedStartY = SAFE_AREA_TOP + (availableHeight - gridHeight) / 2;
  const startY = Math.max(SAFE_AREA_TOP * 0.9, calculatedStartY);

  // Generate dots
  const pastCircles = [];
  const futureCircles = [];
  let currentDotPosition = { cx: 0, cy: 0, radius: 0 };

  for (let i = 0; i < TOTAL_DOTS; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const cx = col * (dotSize + gap) + dotSize / 2;
    const cy = row * (dotSize + gap) + dotSize / 2;
    const radius = dotSize / 2;

    if (i < weeksLived) {
      pastCircles.push(
        <circle key={`past-${i}`} cx={cx} cy={cy} r={radius} fill={colors?.past || '#FFFFFF'} />
      );
    } else if (i === weeksLived) {
      currentDotPosition = { cx, cy, radius };
    } else {
      futureCircles.push(
        <circle key={`future-${i}`} cx={cx} cy={cy} r={radius} fill={colors?.future || '#333333'} />
      );
    }
  }

  // Footer stats
  const statsY = startY + gridHeight + height * 0.03;
  const footerFontSize = width * typography.fontSize;

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
      {/* Background image layer */}
      {backgroundImage?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={backgroundImage.url}
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: backgroundImage.opacity ?? 0.1,
          }}
        />
      )}
      {/* Main Grid SVG */}
      <svg
        width={gridWidth}
        height={gridHeight}
        style={{
          position: 'absolute',
          left: `${startX}px`,
          top: `${startY}px`,
        }}
      >
        {pastCircles}
        <circle
          cx={currentDotPosition.cx}
          cy={currentDotPosition.cy}
          r={currentDotPosition.radius}
          fill={colors?.current || '#FF6B35'}
        />
        {futureCircles}
      </svg>

      {/* Stats Footer */}
      {typography.statsVisible && (
        <div
          style={{
            position: 'absolute',
            top: `${statsY}px`,
            left: '0px',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${footerFontSize}px`,
            fontFamily: typography?.fontFamily || 'monospace',
            color: colors?.text || '#888888',
          }}
        >
          {lifePercentage}% to {LIFE_EXPECTANCY_YEARS}
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
        }
        return null;
      })}
    </div>
  );
}
