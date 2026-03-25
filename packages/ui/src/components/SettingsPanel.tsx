import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';

export type ThemeOption = 'dark' | 'light' | 'system';

export interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  workDurationMs: number;
  shortBreakMs: number;
  longBreakMs: number;
  onWorkDurationChange: (ms: number) => void;
  onShortBreakChange: (ms: number) => void;
  onLongBreakChange: (ms: number) => void;
  theme: ThemeOption;
  onThemeChange: (theme: ThemeOption) => void;
}

const MS_PER_MIN = 60 * 1000;

function msToMin(ms: number): number {
  return Math.round(ms / MS_PER_MIN);
}

function minToMs(min: number): number {
  return min * MS_PER_MIN;
}

interface DurationSliderProps {
  label: string;
  valueMs: number;
  min: number;
  max: number;
  onChange: (ms: number) => void;
}

function DurationSlider({ label, valueMs, min, max, onChange }: DurationSliderProps) {
  const minutes = msToMin(valueMs);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <label
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
          }}
        >
          {label}
        </label>
        <span
          aria-live="polite"
          style={{
            fontSize: 14,
            color: 'var(--text-muted)',
            minWidth: 48,
            textAlign: 'right',
          }}
        >
          {minutes} min
        </span>
      </div>
      <Slider.Root
        className="slider-root"
        value={[minutes]}
        min={min}
        max={max}
        step={1}
        onValueChange={(value) => onChange(minToMs(value[0]!))}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
          touchAction: 'none',
          width: '100%',
          height: 20,
        }}
      >
        <Slider.Track
          style={{
            backgroundColor: 'var(--surface-border)',
            position: 'relative',
            flexGrow: 1,
            borderRadius: 9999,
            height: 4,
          }}
        >
          <Slider.Range
            style={{
              position: 'absolute',
              backgroundColor: 'var(--text-primary)',
              borderRadius: 9999,
              height: '100%',
            }}
          />
        </Slider.Track>
        <Slider.Thumb
          aria-label={label}
          style={{
            display: 'block',
            width: 18,
            height: 18,
            backgroundColor: 'var(--text-primary)',
            borderRadius: 9999,
            cursor: 'pointer',
          }}
        />
      </Slider.Root>
    </div>
  );
}

const THEME_OPTIONS: readonly ThemeOption[] = ['dark', 'light', 'system'];
const THEME_LABELS: Record<ThemeOption, string> = { dark: 'Dark', light: 'Light', system: 'System' };

interface ThemeSelectorProps {
  value: ThemeOption;
  onChange: (theme: ThemeOption) => void;
}

function ThemeSelector({ value, onChange }: ThemeSelectorProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: 8,
        }}
      >
        Theme
      </div>
      <div
        role="radiogroup"
        aria-label="Theme"
        style={{
          display: 'flex',
          gap: 0,
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid var(--surface-border)',
        }}
      >
        {THEME_OPTIONS.map((option) => (
          <button
            key={option}
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            style={{
              flex: 1,
              padding: '8px 0',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              backgroundColor: value === option ? 'var(--text-primary)' : 'var(--surface)',
              color: value === option ? 'var(--canvas-bg)' : 'var(--text-muted)',
            }}
          >
            {THEME_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({
  open,
  onClose,
  workDurationMs,
  shortBreakMs,
  longBreakMs,
  onWorkDurationChange,
  onShortBreakChange,
  onLongBreakChange,
  theme,
  onThemeChange,
}: SettingsPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            zIndex: 48,
          }}
        />
        <Dialog.Content
          aria-label="Settings"
          aria-describedby={undefined}
          className="motion-safe:animate-[slide-in-right_300ms_ease-out] motion-reduce:animate-none"
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100vh',
            width: 340,
            maxWidth: '90vw',
            backgroundColor: 'var(--canvas-bg)',
            borderLeft: '1px solid var(--surface-border)',
            zIndex: 49,
            overflowY: 'auto',
            padding: '24px 16px',
            fontFamily: 'inherit',
          }}
        >
          <Dialog.Title
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--text-primary)',
              margin: '0 0 24px 0',
            }}
          >
            Settings
          </Dialog.Title>

          <ThemeSelector value={theme} onChange={onThemeChange} />

          <DurationSlider
            label="Work session"
            valueMs={workDurationMs}
            min={5}
            max={90}
            onChange={onWorkDurationChange}
          />
          <DurationSlider
            label="Short break"
            valueMs={shortBreakMs}
            min={1}
            max={30}
            onChange={onShortBreakChange}
          />
          <DurationSlider
            label="Long break"
            valueMs={longBreakMs}
            min={1}
            max={60}
            onChange={onLongBreakChange}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
