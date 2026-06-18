interface LifeViewProps {
    width: number;
    height: number;
    birthDate: string;
}

export function LifeView({ width, height, birthDate }: LifeViewProps) {
    // Colors Config
    const BG_COLOR = '#1a1a1a';
    const TEXT_COLOR = '#888888';
    const PAST_COLOR = '#FFFFFF';
    const CURRENT_COLOR = '#FF6B35';
    const FUTURE_COLOR = '#333333'; // Dark grey

    // Life Logic
    const LIFE_EXPECTANCY_YEARS = 85;
    const birth = new Date(birthDate);
    const today = new Date();

    // Calculate total weeks
    // 85 years * 52 weeks/year = 4420 weeks
    // Each dot represents one week of life
    const TOTAL_DOTS = 4420;

    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const weeksLived = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)), TOTAL_DOTS);

    const lifePercentage = ((weeksLived / TOTAL_DOTS) * 100).toFixed(1);

    // Layout Calculations with Aspect Ratio Support
    const aspectRatio = height / width;
    
    // Adapt safe zones based on aspect ratio - taller phones need more top padding
    const SAFE_AREA_TOP = aspectRatio > 2.0 ? height * 0.28 : height * 0.25;
    const SAFE_AREA_BOTTOM = height * 0.14;
    
    // Reduce side padding on narrower screens
    const sidePaddingRatio = aspectRatio > 2.1 ? 0.08 : aspectRatio > 2.0 ? 0.09 : 0.10;
    const SAFE_WIDTH_PADDING = width * sidePaddingRatio;

    const availableWidth = width - (SAFE_WIDTH_PADDING * 2);
    const availableHeight = height - SAFE_AREA_TOP - SAFE_AREA_BOTTOM;

    // Algorithm to find optimal grid dimensions (Cols x Rows)
    // We want to fit TOTAL_DOTS into (availableWidth x availableHeight).
    // Aspect Ratio of container
    const outputRatio = availableWidth / availableHeight;

    // Calculate optimal columns based on aspect ratio
    // cols / rows ≈ outputRatio
    // cols * rows = TOTAL_DOTS
    // cols * (cols / outputRatio) = TOTAL_DOTS
    // cols^2 = TOTAL_DOTS * outputRatio
    const estimatedCols = Math.sqrt(TOTAL_DOTS * outputRatio);
    const cols = Math.max(40, Math.floor(estimatedCols)); // Minimum 40 columns
    const rows = Math.ceil(TOTAL_DOTS / cols);

    // Now calculate dot size with proper gap ratio
    const gapRatio = 0.4;
    
    // Calculate based on width constraint
    const dotSizeFromWidth = availableWidth / (cols + (cols - 1) * gapRatio);
    // Calculate based on height constraint  
    const dotSizeFromHeight = availableHeight / (rows + (rows - 1) * gapRatio);
    
    // Use the smaller value to ensure it fits
    const dotSize = Math.floor(Math.min(dotSizeFromWidth, dotSizeFromHeight));
    const gap = Math.max(1, Math.floor(dotSize * gapRatio)); // At least 1px gap

    // Recalculate actual dimensions
    const gridWidth = (cols * dotSize) + ((cols - 1) * gap);
    const gridHeight = (rows * dotSize) + ((rows - 1) * gap);

    // Center the grid with bounds checking
    const startX = Math.max(SAFE_WIDTH_PADDING, (width - gridWidth) / 2);
    const calculatedStartY = SAFE_AREA_TOP + (availableHeight - gridHeight) / 2;
    const startY = Math.max(SAFE_AREA_TOP * 0.9, calculatedStartY); // Ensure minimum top margin

    // Generate SVG circles for optimized rendering
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
            pastCircles.push(<circle key={`past-${i}`} cx={cx} cy={cy} r={radius} fill={PAST_COLOR} />);
        } else if (i === weeksLived) {
            currentDotPosition = { cx, cy, radius };
        } else {
            futureCircles.push(<circle key={`future-${i}`} cx={cx} cy={cy} r={radius} fill={FUTURE_COLOR} />);
        }
    }

    // Footer Stats
    const statsY = startY + gridHeight + (height * 0.03);
    const footerFontSize = width * 0.035;

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: BG_COLOR,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            {/* Container for the Grid - Using SVG for optimal performance */}
            <svg
                width={gridWidth}
                height={gridHeight}
                style={{
                    position: 'absolute',
                    left: startX,
                    top: startY,
                }}
            >
                {/* Past dots */}
                {pastCircles}

                {/* Current dot */}
                <circle 
                    cx={currentDotPosition.cx} 
                    cy={currentDotPosition.cy} 
                    r={currentDotPosition.radius} 
                    fill={CURRENT_COLOR} 
                />

                {/* Future dots */}
                {futureCircles}
            </svg>

            {/* Footer */}
            <div
                style={{
                    position: 'absolute',
                    top: statsY,
                    left: 0,
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: footerFontSize,
                    fontFamily: 'monospace',
                    color: TEXT_COLOR,
                }}
            >
                {lifePercentage}% to {LIFE_EXPECTANCY_YEARS}
            </div>
        </div>
    );
}
