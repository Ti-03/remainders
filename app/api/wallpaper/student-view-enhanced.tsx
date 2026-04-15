import { CSSProperties } from 'react';
import { PluginRenderElement, TextElement } from '@/lib/types';
import { getAcademicGraduationDate } from '@/lib/student-view';

interface StudentViewProps {
  width: number;
  height: number;
  studyStartDate: string;
  universityName: string;
  studyDurationYears: number;
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
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export default function StudentView({
  width,
  height,
  studyStartDate,
  universityName,
  studyDurationYears,
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
    topPadding: 0.18,
    bottomPadding: 0.12,
    sidePadding: 0.10,
    dotSpacing: 0.7,
  },
  textElements = [],
  pluginElements = [],
  currentDate = new Date(),
  backgroundImage,
}: StudentViewProps) {
  const startDate = new Date(studyStartDate);
  const safeDurationYears = clamp(Math.round(studyDurationYears || 4), 1, 10);
  const graduationDate = getAcademicGraduationDate(startDate, safeDurationYears);
  const totalWeeks = Math.max(1, Math.ceil((graduationDate.getTime() - startDate.getTime()) / WEEK_MS));

  const elapsedWeeksRaw = Math.floor((currentDate.getTime() - startDate.getTime()) / WEEK_MS);
  const completedWeeks = clamp(elapsedWeeksRaw, 0, totalWeeks);
  const weeksRemaining = Math.max(totalWeeks - completedWeeks, 0);
  const progressPercent = Math.round((completedWeeks / totalWeeks) * 1000) / 10;
  const isComplete = currentDate.getTime() >= graduationDate.getTime();

  const rows = safeDurationYears;
  const cols = Math.ceil(totalWeeks / rows);

  const aspectRatio = height / width;
  const safeTop = height * (aspectRatio > 2.0 ? Math.max(layout.topPadding, 0.16) : layout.topPadding);
  const safeBottom = height * layout.bottomPadding;
  const adjustedSidePadding = aspectRatio > 2.0
    ? Math.min(layout.sidePadding, 0.1)
    : layout.sidePadding;
  const sidePadding = width * adjustedSidePadding;

  const titleFontSize = Math.max(28, width * typography.fontSize * 1.15);
  const metaFontSize = Math.max(16, titleFontSize * 0.58);
  const footerFontSize = Math.max(16, width * typography.fontSize * 0.9);
  const headerHeight = titleFontSize + metaFontSize + 36;
  const footerHeight = typography.statsVisible ? footerFontSize + 28 : 0;

  const availableWidth = width - sidePadding * 2;
  const availableHeight = height - safeTop - safeBottom - headerHeight - footerHeight;

  const horizontalGap = Math.max(1, Math.floor(Math.max(layout.dotSpacing, 0.35) * 4));
  const verticalGap = Math.max(6, Math.floor(Math.max(layout.dotSpacing, 0.45) * 10));

  const dotSizeFromWidth = (availableWidth - horizontalGap * (cols - 1)) / cols;
  const dotSizeFromHeight = (availableHeight - verticalGap * (rows - 1)) / rows;
  const dotSize = Math.max(2, Math.floor(Math.min(dotSizeFromWidth, dotSizeFromHeight, 18)));

  const gridWidth = cols * dotSize + (cols - 1) * horizontalGap;
  const gridHeight = rows * dotSize + (rows - 1) * verticalGap;
  const startX = Math.max(sidePadding, (width - gridWidth) / 2);
  const startY = safeTop + headerHeight + Math.max(0, (availableHeight - gridHeight) / 2);
  const footerY = startY + gridHeight + 24;

  const dots = [];
  for (let index = 0; index < totalWeeks; index++) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const isCurrent = !isComplete && index === completedWeeks;
    const isPast = index < completedWeeks;
    const color = isCurrent ? colors.current : isPast ? colors.past : colors.future;

    dots.push(
      <div
        key={`student-dot-${index}`}
        style={{
          position: 'absolute',
          left: `${startX + col * (dotSize + horizontalGap)}px`,
          top: `${startY + row * (dotSize + verticalGap)}px`,
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
    );
  }

  const programLabel = `${safeDurationYears} year${safeDurationYears === 1 ? '' : 's'}`;
  const metaLabel = `Started ${formatMonthYear(startDate)} | Ends ${formatMonthYear(graduationDate)} | ${programLabel}`;
  const footerLabel = isComplete
    ? `Completed | Graduated ${formatMonthYear(graduationDate)}`
    : `${progressPercent}% complete | ${weeksRemaining}w left | ${formatMonthYear(graduationDate)}`;

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
          top: `${safeTop}px`,
          left: `${sidePadding}px`,
          width: `${width - sidePadding * 2}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: `${titleFontSize}px`,
            fontFamily: typography.fontFamily,
            color: colors.past,
          }}
        >
          {universityName.trim()}
        </div>
        <div
          style={{
            fontSize: `${metaFontSize}px`,
            fontFamily: typography.fontFamily,
            color: colors.text,
          }}
        >
          {metaLabel}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        {dots}
      </div>

      {typography.statsVisible && (
        <div
          style={{
            position: 'absolute',
            top: `${footerY}px`,
            left: `${sidePadding}px`,
            width: `${width - sidePadding * 2}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: `${footerFontSize}px`,
            fontFamily: typography.fontFamily,
            color: colors.text,
            textAlign: 'center',
          }}
        >
          {footerLabel}
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
