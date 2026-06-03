import { useEffect, useMemo, useState } from 'react';
import { fetchBookings } from '../../bookingsApi';

export default function BookingTab({
  today,
  bookingView,
  setBookingView,
  bookings,
  bookingForm,
  setBookingForm,
  bookingAlert,
  rooms,
  timeOptions,
  durations,
  bookingCourseOptions,
  showCourseSelector,
  handleBooking,
}) {
  // ── Reports state ─────────────────────────────────────────────────────────
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportBookings, setReportBookings] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [expandedPerson, setExpandedPerson] = useState(null);

  useEffect(() => {
    if (bookingView !== 'reports') return;
    let cancelled = false;
    setReportLoading(true);
    fetchBookings(reportMonth)
      .then((data) => { if (!cancelled) { setReportBookings(data); setReportLoading(false); } })
      .catch(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; };
  }, [bookingView, reportMonth]);

  // ── Reports data ──────────────────────────────────────────────────────────
  const reportRows = useMemo(() => {
    const map = new Map();
    reportBookings.forEach((b) => {
      const name = b.bookerName || b.owner || 'Unknown';
      const [startH, startM] = b.start.split(':').map(Number);
      const [endH, endM] = b.end.split(':').map(Number);
      const durationMins = (endH * 60 + endM) - (startH * 60 + startM);

      if (!map.has(name)) {
        map.set(name, { name, totalBookings: 0, totalMinutes: 0, rooms: new Set(), bookings: [] });
      }
      const entry = map.get(name);
      entry.totalBookings += 1;
      entry.totalMinutes += durationMins > 0 ? durationMins : 0;
      entry.rooms.add(b.room);
      entry.bookings.push(b);
    });

    return Array.from(map.values())
      .map((entry) => ({ ...entry, rooms: Array.from(entry.rooms).sort() }))
      .sort((a, b) => b.totalBookings - a.totalBookings);
  }, [reportBookings]);

  const formatHours = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return dateStr;
    const [y, mo, d] = dateStr.split('-');
    return `${d}/${mo}/${y}`;
  };

  const monthLabel = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Reserve instantly</p>
          <h2>Book a classroom</h2>
        </div>
        <div className="pill-row">
          <button
            type="button"
            className={bookingView === 'book' ? 'chip active' : 'chip'}
            onClick={() => setBookingView('book')}
          >
            New booking
          </button>
          <button
            type="button"
            className={bookingView === 'reports' ? 'chip active' : 'chip'}
            onClick={() => setBookingView('reports')}
          >
            Reports
          </button>
        </div>
      </div>

      {bookingView === 'book' ? (
        <>
          {bookingAlert ? (
            <div className="form-alert" role="alert">
              <strong>Booking conflict</strong>
              <p>{bookingAlert}</p>
            </div>
          ) : null}
          <form className="form" onSubmit={handleBooking}>
            <div className="form__row">
              <label>
                Your name
                <input
                  type="text"
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  placeholder="Full name of the person booking"
                  required
                />
              </label>
            </div>
            <div className="form__row">
              <label>
                Date
                <input
                  type="date"
                  value={bookingForm.date}
                  min={today}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  required
                />
              </label>
              <label>
                Start time
                <select
                  value={bookingForm.start}
                  onChange={(e) => setBookingForm({ ...bookingForm, start: e.target.value })}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </label>
              <label>
                Duration
                <div className="pill-row">
                  {durations.map((duration) => (
                    <button
                      type="button"
                      key={duration}
                      className={bookingForm.duration === duration ? 'chip active' : 'chip'}
                      onClick={() => setBookingForm({ ...bookingForm, duration })}
                    >
                      {duration} min
                    </button>
                  ))}
                </div>
              </label>
            </div>
            <div className="form__row">
              <label>
                Classroom
                <select
                  value={bookingForm.room}
                  onChange={(e) => setBookingForm({ ...bookingForm, room: e.target.value })}
                >
                  {rooms.map((room) => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </label>
              {showCourseSelector ? (
                <label>
                  Courses
                  <select
                    value={bookingForm.course}
                    onChange={(e) => setBookingForm({ ...bookingForm, course: e.target.value })}
                  >
                    {bookingCourseOptions.map((course) => (
                      <option key={course} value={course}>{course}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Purpose
                <input
                  type="text"
                  value={bookingForm.purpose}
                  onChange={(e) => setBookingForm({ ...bookingForm, purpose: e.target.value })}
                  placeholder="Workshop, lecture, rehearsal"
                />
              </label>
            </div>
            <div className="form__row">
              <label>
                Number of weeks
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={bookingForm.weeks ?? 1}
                  onChange={(e) => setBookingForm({ ...bookingForm, weeks: Math.max(1, Math.min(52, Number(e.target.value) || 1)) })}
                  style={{ width: '100px' }}
                />
                <span className="muted" style={{ fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                  {(bookingForm.weeks ?? 1) > 1 ? `Books the same slot every week for ${bookingForm.weeks} weeks` : 'Book for 1 day only'}
                </span>
              </label>
            </div>
            <div className="cta-row">
              <button type="submit" className="primary">Confirm booking</button>
              <p className="muted">Slots are 30-minute increments; extend by picking longer durations.</p>
            </div>
          </form>
        </>
      ) : (
        <div className="schedule-box">
          {/* ── Month picker + totals ── */}
          <div className="section-heading" style={{ alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h3>Booking reports</h3>
              {!reportLoading && (
                <p className="muted">
                  {monthLabel(reportMonth)} &nbsp;·&nbsp;
                  {reportBookings.length} booking{reportBookings.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                  {formatHours(reportBookings.reduce((sum, b) => {
                    const [sh, sm] = b.start.split(':').map(Number);
                    const [eh, em] = b.end.split(':').map(Number);
                    const dur = (eh * 60 + em) - (sh * 60 + sm);
                    return sum + (dur > 0 ? dur : 0);
                  }, 0))} total
                </p>
              )}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', fontWeight: 600, gap: '4px' }}>
              Month
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => { setReportMonth(e.target.value); setExpandedPerson(null); }}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border, #ddd)', fontSize: '0.9rem' }}
              />
            </label>
          </div>

          {reportLoading ? (
            <p className="muted">Loading…</p>
          ) : reportRows.length === 0 ? (
            <p className="muted">No bookings recorded for {monthLabel(reportMonth)}.</p>
          ) : (
            <div className="trainer-session-list">
              {reportRows.map((row) => {
                const isExpanded = expandedPerson === row.name;
                return (
                  <div key={row.name} className="schedule-box profile-approvals" style={{ marginBottom: '1rem', padding: '0' }}>
                    {/* Person summary row — click to expand */}
                    <button
                      type="button"
                      onClick={() => setExpandedPerson(isExpanded ? null : row.name)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '1rem 1.25rem',
                        textAlign: 'left',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '1rem' }}>{row.name}</strong>
                        <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>
                          {row.totalBookings} booking{row.totalBookings !== 1 ? 's' : ''} &nbsp;·&nbsp;
                          {formatHours(row.totalMinutes)} booked &nbsp;·&nbsp;
                          {row.rooms.join(', ')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                        <span className="pill compact">{formatHours(row.totalMinutes)}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted, #888)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Expanded booking list */}
                    {isExpanded && (
                      <div
                        className="trainer-roster"
                        role="list"
                        aria-label={`Bookings by ${row.name}`}
                        style={{ borderTop: '1px solid var(--border, #eee)', padding: '0.25rem 0' }}
                      >
                        {row.bookings
                          .slice()
                          .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
                          .map((b) => {
                            const [sh, sm] = b.start.split(':').map(Number);
                            const [eh, em] = b.end.split(':').map(Number);
                            const dur = (eh * 60 + em) - (sh * 60 + sm);
                            return (
                              <div key={b.id} className="trainer-row" style={{ padding: '0.65rem 1.25rem' }}>
                                <div>
                                  <strong>{b.room}</strong>
                                  <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>
                                    {formatDate(b.date)} &nbsp;·&nbsp; {b.start} – {b.end}
                                  </p>
                                  {b.purpose ? (
                                    <p className="muted" style={{ margin: '1px 0 0', fontSize: '0.8rem' }}>{b.purpose}</p>
                                  ) : null}
                                </div>
                                <span className="pill compact">{formatHours(dur)}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

