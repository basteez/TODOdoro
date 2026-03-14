export interface DevotionRecordSession {
  readonly sessionId: string;
  readonly startedAt: number;
  readonly elapsedMs: number;
}

export interface DevotionRecordProps {
  sessions: ReadonlyArray<DevotionRecordSession>;
  todoTitle: string;
}

function groupByDate(sessions: ReadonlyArray<DevotionRecordSession>): Map<string, DevotionRecordSession[]> {
  const groups = new Map<string, DevotionRecordSession[]>();
  for (const session of sessions) {
    const key = new Date(session.startedAt).toDateString();
    const group = groups.get(key);
    if (group) {
      group.push(session);
    } else {
      groups.set(key, [session]);
    }
  }
  return groups;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function computeTimeSpan(sessions: ReadonlyArray<{ startedAt: number }>): string {
  if (sessions.length === 0) return '';
  const first = new Date(sessions[0]!.startedAt);
  const last = new Date(sessions[sessions.length - 1]!.startedAt);
  // Normalize to calendar dates to avoid same-day time differences inflating the count
  const firstDay = new Date(first.getFullYear(), first.getMonth(), first.getDate());
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const diffDays = Math.round((lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (diffDays <= 1) return '1 day';
  return `${diffDays} days`;
}

export function DevotionRecord({ sessions, todoTitle }: DevotionRecordProps) {
  if (sessions.length === 0) {
    return (
      <div style={{ padding: '16px 20px', fontFamily: 'Inter, sans-serif', color: 'var(--text-muted)', fontSize: 13 }}>
        No sessions recorded for {todoTitle}
      </div>
    );
  }

  const dateGroups = groupByDate(sessions);
  const dates = Array.from(dateGroups.keys());
  const totalDays = dates.length;
  const firstDate = formatDate(sessions[0]!.startedAt);
  const lastDate = formatDate(sessions[sessions.length - 1]!.startedAt);
  const sameDay = totalDays === 1;

  const ariaLabel = sameDay
    ? `${sessions.length} Pomodoro${sessions.length !== 1 ? 's' : ''} invested on ${firstDate}`
    : `${sessions.length} Pomodoro${sessions.length !== 1 ? 's' : ''} invested across ${totalDays} days, from ${firstDate} to ${lastDate}`;

  return (
    <div
      aria-label={ariaLabel}
      style={{
        padding: '16px 20px',
        fontFamily: 'Inter, sans-serif',
        maxHeight: 320,
        overflowY: 'auto',
        minWidth: 240,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          marginBottom: 12,
        }}
      >
        {sameDay
          ? `First session: ${firstDate}`
          : `First session: ${firstDate} — Latest: ${lastDate}`}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dates.map((dateKey) => {
          const group = dateGroups.get(dateKey)!;
          return (
            <div key={dateKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  minWidth: 52,
                  flexShrink: 0,
                }}
              >
                {formatDate(group[0]!.startedAt)}
              </span>
              <div style={{ display: 'flex', gap: 3 }}>
                {group.map((session) => (
                  <span
                    key={session.sessionId}
                    aria-hidden="true"
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'var(--devotion)',
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
