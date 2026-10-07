// src/components/TimetableGrid.jsx — weekly MON–FRI grid, same pattern as
// her screenshots: day columns, period cards with green left edge, "—" if empty.
// Pages map their API rows into {day_of_week, title, sub} before passing them in.
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function TimetableGrid({ items = [] }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {DAYS.map((d) => {
        const dayItems = items
          .filter((r) => (r.day_of_week || '').toLowerCase() === d.toLowerCase())
          .sort((a, b) => (a.start || '').localeCompare(b.start || ''));
        return (
          <div key={d} style={{ flex: '1 1 150px', minWidth: 140 }}>
            <div className="section-label" style={{ marginBottom: '0.5rem' }}>{d}</div>
            {dayItems.length === 0 ? (
              <div className="text-muted">—</div>
            ) : (
              dayItems.map((r, i) => (
                <div key={i} style={{
                  backgroundColor: 'var(--surface-2)',
                  borderLeft: '3px solid var(--primary)',
                  borderRadius: 6,
                  padding: '0.55rem 0.7rem',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.title}</div>
                  <div className="text-muted" style={{ fontSize: '0.8rem' }}>{r.sub}</div>
                </div>
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}