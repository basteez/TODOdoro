import { DevotionRecord } from './DevotionRecord.js';
import type { DevotionRecordSession } from './DevotionRecord.js';

export interface ShelfCardItem {
  id: string;
  title: string;
  pomodoroCount: number;
  sealedAt: number | null;
  releasedAt: number | null;
  releaseReason: 'completed_its_purpose' | 'was_never_truly_mine' | null;
  lifecycleStatus: 'sealed' | 'released';
}

export interface ShelfCardProps {
  item: ShelfCardItem;
  sessions: ReadonlyArray<DevotionRecordSession>;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ShelfCard({ item, sessions }: ShelfCardProps) {
  const isSealed = item.lifecycleStatus === 'sealed';
  const badgeColor = isSealed ? 'var(--sealed)' : 'var(--released)';
  const badgeText = isSealed ? 'Sealed' : 'Released';
  const date = isSealed ? item.sealedAt : item.releasedAt;

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        borderRadius: 8,
        padding: '12px 16px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
          {item.title}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: badgeColor,
            backgroundColor: 'transparent',
            border: `1px solid ${badgeColor}`,
            borderRadius: 4,
            padding: '2px 6px',
            flexShrink: 0,
          }}
        >
          {badgeText}
        </span>
      </div>
      {sessions.length > 0 && (
        <DevotionRecord sessions={sessions} todoTitle={item.title} />
      )}
      {date && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {badgeText} {formatDate(date)}
        </div>
      )}
    </div>
  );
}
