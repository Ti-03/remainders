import { CSSProperties } from 'react';
import { PluginRenderElement, TextElement } from '@/lib/types';
import { getGoalSpanYears } from '@/lib/student-view';

interface StudentViewProps {
  width: number;
  height: number;
  studyStartDate: string;
  universityName: string;
  goalEndDate: string;
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
  pluginElements?: PluginRenderElement[];
  currentDate?: Date;
  backgroundImage?: { url: string; opacity: number };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function StudentView({
  width,
  height,
  studyStartDate,
  universityName,
  goalEndDate,
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
    bottomPadding: 0.14,
    sidePadding: 0.10,
    dotSpacing: 0.5,
  },
  textElements = [],
  pluginElements = [],
  currentDate = new Date(),
  backgroundImage,
}: StudentViewProps) {
  const startDate = new Date(studyStartDate);
  const endDate = new Date(goalEndDate);
  const totalWeeks = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / WEEK_MS));
  const elapsedWeeksRaw = Math.floor((currentDate.getTime() - startDate.getTime()) / WEEK_MS);
  const completedWeeks = clamp(elapsedWeeksRaw, 0, totalWeeks);
  const weeksRemaining = Math.max(totalWeeks - completedWeeks, 0);
  const progressPercent = Math.round((completedWeeks / totalWeeks) * 100);
  const goalTitle = universityName.trim() || 'Your Goal';

  const rows = clamp(getGoalSpanYears(startDate, endDate), 1, 10);
  const cols = Math.ceil(totalWeeks / rows);
  const aspectRatio = height / width;

  const safeAreaTop = aspectRatio > 2.0
    ? height * Math.max(layout.topPadding, 0.28)
    : height * layout.topPadding;
  const safeAreaBottom = height * layout.bottomPadding;
  const adjustedSidePadding = aspectRatio > 2.1
    ? Math.min(layout.sidePadding, 0.08)
    : aspectRatio > 2.0
      ? Math.min(layout.sidePadding, 0.09)
      : layout.sidePadding;
  const safeWidthPadding = width * adjustedSidePadding;

  const availableWidth = width - safeWidthPadding * 2;
  const availableHeight = height - safeAreaTop - safeAreaBottom;
  const titleFontSize = Math.max(16, width * typography.fontSize * 0.9);
  const footerFontSize = Math.max(15, width * typography.fontSize);
  const titleSpace = titleFontSize * 2.2;
  const footerSpace = typography.statsVisible ? footerFontSize * 3.1 : 0;
  const gridAvailableHeight = Math.max(80, availableHeight - titleSpace - footerSpace);

  const gap = Math.max(1, Math.floor(Math.max(layout.dotSpacing, 0.45) * 3));
  const dotSizeFromWidth = (availableWidth - gap * (cols - 1)) / cols;
  const dotSizeFromHeight = (gridAvailableHeight - gap * (rows - 1)) / rows;
  const dotSize = Math.max(3, Math.floor(Math.min(dotSizeFromWidth, dotSizeFromHeight, 18)));

  const gridWidth = cols * dotSize + (cols - 1) * gap;
  const gridHeight = rows * dotSize + (rows - 1) * gap;
  const startX = Math.max(safeWidthPadding, (width - gridWidth) / 2);
  const startY = safeAreaTop + Math.max(0, (gridAvailableHeight - gridHeight) / 2);
  const titleY = Math.max(safeAreaTop * 0.8, startY - titleFontSize * 1.6);
  const footerY = startY + gridHeight + footerFontSize * 1.7;

  const dots = [];
  for (let index = 0; index < totalWeeks; index++) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const color = index < completedWeeks
      ? colors.past
      : index === completedWeeks && completedWeeks < totalWeeks
        ? colors.current
        : colors.future;

    dots.push(
      <div
        key={`goal-dot-${index}`}
        style={{
          position: 'absolute',
          left: `${startX + col * (dotSize + gap)}px`,
          top: `${startY + row * (dotSize + gap)}px`,
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
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
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

      <div
        style={{
          position: 'absolute',
          top: `${titleY}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: `${width * 0.72}px`,
          fontSize: `${titleFontSize}px`,
          fontFamily: typography.fontFamily,
          color: colors.text,
          textAlign: 'center',
        }}
      >
        {goalTitle}
      </div>

      <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}>
        {dots}
      </div>

      {typography.statsVisible && (
        <div
          style={{
            position: 'absolute',
            top: `${footerY}px`,
            left: '0px',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${footerFontSize}px`,
            fontFamily: typography.fontFamily,
          }}
        >
          <span style={{ color: colors.current }}>{weeksRemaining}w left</span>
          <span style={{ color: colors.text, margin: '0px 8px' }}>·</span>
          <span style={{ color: colors.text }}>{progressPercent}%</span>
        </div>
      )}

      {textElements.map((element) => {
        if (!element.visible || element.content == null) return null;

        const style: CSSProperties = {
          position: 'absolute',
          left: `${element.x}%`,
          top: `${element.y}%`,
          fontSize: `${element.fontSize || 16}px`,
          fontFamily: element.fontFamily || typography.fontFamily,
          color: element.color || colors.text,
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

      {pluginElements.map((element, index) => {
        if (element.type === 'text' && element.content != null) {
          const contentStr = String(element.content || '').trim();
          if (!contentStr) return null;

          const style: CSSProperties = {
            position: 'absolute',
            left: `${element.x}px`,
            top: `${element.y}px`,
            fontSize: `${element.fontSize || 16}px`,
            color: element.color || colors.text,
            fontFamily: element.fontFamily || typography.fontFamily,
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
