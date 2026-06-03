import { useMemo, useState } from 'react';

function toMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr) {
  if (!dateStr) return dateStr;
  const [y, mo, d] = dateStr.split('-');
  return `${d}/${mo}/${y}`;
}

function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

export default function EduPartnerTimecardTab({ bookings, profile }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const myBookings = useMemo(() => {
    const name = (profile.name || '').toLowerCase();
    return bookings
      .filter((b) => {
        const matchesUser =
          (b.bookerName || b.owner || '').toLowerCase() === name;
        const matchesMonth = b.date && b.date.startsWith(month);
        return matchesUser && matchesMonth;
      })
      .slice()
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return toMinutes(a.start) - toMinutes(b.start);
      });
  }, [bookings, profile.name, month]);

  const totalMinutes = useMemo(
    () =>
      myBookings.reduce((acc, b) => {
        const dur = toMinutes(b.end) - toMinutes(b.start);
        return acc + (dur > 0 ? dur : 0);
      }, 0),
    [myBookings],
  );

  const uniqueRooms = useMemo(
    () => new Set(myBookings.map((b) => b.room)).size,
    [myBookings],
  );

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Edu Partner</p>
          <h2>My Timecard</h2>
        </div>
      </div>

      <div className="schedule-box">
        <div
          className="section-heading"
          style={{ alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div style={{ flex: 1 }}>
            <h3>Bookings for {monthLabel(month)}</h3>
            <p className="muted">
              {myBookings.length} booking{myBookings.length !== 1 ? 's' : ''}&nbsp;·&nbsp;
              {formatHours(totalMinutes)} total
            </p>
          </div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: '0.8rem',
              fontWeight: 600,
              gap: '4px',
            }}
          >
            Month
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border, #ddd)',
                fontSize: '0.9rem',
              }}
            />
          </label>
        </div>

        {myBookings.length === 0 ? (
          <p className="muted">No bookings found for {monthLabel(month)}.</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <div className="detail-card">
                <span className="muted">Total bookings</span>
                <strong style={{ fontSize: '1.4rem' }}>{myBookings.length}</strong>
              </div>
              <div className="detail-card">
                <span className="muted">Total hours</span>
                <strong style={{ fontSize: '1.4rem' }}>{formatHours(totalMinutes)}</strong>
              </div>
              <div className="detail-card">
                <span className="muted">Rooms used</span>
                <strong style={{ fontSize: '1.4rem' }}>{uniqueRooms}</strong>
              </div>
            </div>

            <div className="trainer-roster" role="list" aria-label="My bookings">
              {myBookings.map((b) => {
                const dur =
                  b.start && b.end
                    ? toMinutes(b.end) - toMinutes(b.start)
                    : 0;
                return (
                  <div key={b.id} className="trainer-row">
                    <div>
                      <strong>{formatDate(b.date)}</strong>
                      <p
                        className="muted"
                        style={{ margin: '2px 0 0', fontSize: '0.82rem' }}
                      >
                        {b.start} – {b.end}&nbsp;·&nbsp;{b.room}
                        {b.course ? ` · ${b.course}` : ''}
                      </p>
                      {b.purpose ? (
                        <p
                          className="muted"
                          style={{ margin: '1px 0 0', fontSize: '0.8rem' }}
                        >
                          {b.purpose}
                        </p>
                      ) : null}
                    </div>
                    {dur > 0 ? (
                      <span className="pill compact">{formatHours(dur)}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
