import { useEffect, useMemo, useState } from 'react';
import { fetchTrainerSessions } from '../../trainerSessionsApi';

export default function TrainerScheduleTab({
  trainerScheduleView,
  setTrainerScheduleView,
  trainerCalendarView,
  setTrainerCalendarView,
  trainerLayoutClassName,
  trainerForm,
  setTrainerForm,
  handleAddTrainer,
  weekdayOptions,
  handleTrainerFormDayToggle,
  handleTrainerFormAvailabilityTimeChange,
  courseOptions,
  bookingCourseOptions,
  trainerTimeSlots,
  loginRole,
  trainerSearch,
  setTrainerSearch,
  trainerBookingForm,
  setTrainerBookingForm,
  updateTrainerBookingForm,
  trainerBookingPreview,
  handlePreviewTrainerClass,
  trainerAvailabilityExpanded,
  setTrainerAvailabilityExpanded,
  studentEnrollments,
  handleTrainerBookingStudentToggle,
  trainers,
  filteredTrainers,
  rooms,
  today,
  handleBookTrainerClass,
  selectedTrainer,
  handleDeleteTrainer,
  selectedTrainerId,
  handleSelectedTrainerFieldChange,
  handleSelectedTrainerDayToggle,
  handleSelectedTrainerAvailabilityTimeChange,
  trainerCalendarMonth,
  trainerWeekSessions,
  handleBookingSelect,
  trainerSessions,
  formatDisplayDate,
  getWeekdayLabel,
  formatAvailabilitySummary,
}) {
  const filteredStudents = studentEnrollments.filter((student) => student.course === trainerBookingForm.course);
  const scheduledPreviewCount = trainerBookingPreview.filter((entry) => !entry.isNoClass).length;
  const holidayNoticeCount = trainerBookingPreview.filter((entry) => entry.isNoClass).length;

  // ── Trainer Timecard state ────────────────────────────────────────────────
  const [timecardView, setTimecardView] = useState('calendar');
  const [timecardMonth, setTimecardMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [timecardSessions, setTimecardSessions] = useState([]);
  const [timecardLoading, setTimecardLoading] = useState(false);

  useEffect(() => {
    if (loginRole !== 'trainer' || timecardView !== 'timecard' || !selectedTrainerId) return;
    let cancelled = false;
    setTimecardLoading(true);
    fetchTrainerSessions(timecardMonth)
      .then((data) => {
        if (!cancelled) {
          setTimecardSessions(data.filter((s) => s.trainerId === selectedTrainerId));
          setTimecardLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setTimecardLoading(false); });
    return () => { cancelled = true; };
  }, [loginRole, timecardView, timecardMonth, selectedTrainerId]);

  const timecardRows = useMemo(() => {
    const map = new Map();
    timecardSessions.forEach((s) => {
      const course = s.course || 'Uncategorised';
      if (!map.has(course)) {
        map.set(course, { course, sessions: [] });
      }
      map.get(course).sessions.push(s);
    });
    return Array.from(map.values()).sort((a, b) => a.course.localeCompare(b.course));
  }, [timecardSessions]);

  const timecardTotalMinutes = timecardSessions.length * 60;

  // ── Trainer Reports state ─────────────────────────────────────────────────
  const [reportMonth, setReportMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [reportSessions, setReportSessions] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [expandedTrainer, setExpandedTrainer] = useState(null);

  useEffect(() => {
    if (trainerScheduleView !== 'reports') return;
    let cancelled = false;
    setReportLoading(true);
    fetchTrainerSessions(reportMonth)
      .then((data) => { if (!cancelled) { setReportSessions(data); setReportLoading(false); } })
      .catch(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; };
  }, [trainerScheduleView, reportMonth]);

  const reportRows = useMemo(() => {
    const map = new Map();
    reportSessions.forEach((s) => {
      const name = s.trainerName || 'Unknown';
      if (!map.has(name)) {
        map.set(name, { name, totalSessions: 0, totalMinutes: 0, courses: new Set(), sessions: [] });
      }
      const entry = map.get(name);
      entry.totalSessions += 1;
      entry.totalMinutes += 60; // each trainer session is 1 hour
      entry.courses.add(s.course);
      entry.sessions.push(s);
    });
    return Array.from(map.values())
      .map((entry) => ({ ...entry, courses: Array.from(entry.courses).sort() }))
      .sort((a, b) => b.totalSessions - a.totalSessions);
  }, [reportSessions]);

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
          <p className="eyebrow">{loginRole === 'trainer' ? 'Trainer Schedule' : 'Trainers'}</p>
          <h2>{loginRole === 'trainer' ? 'Trainer availability and booking' : 'Trainer management and booking'}</h2>
        </div>
      </div>
      {loginRole !== 'trainer' ? (
        <div className="tabs enrollment-subtabs" aria-label="Trainers pages">
          <button
            className={trainerScheduleView === 'trainers' ? 'tab active' : 'tab'}
            onClick={() => setTrainerScheduleView('trainers')}
          >
            Trainers
          </button>
          <button
            className={trainerScheduleView === 'add' ? 'tab active' : 'tab'}
            onClick={() => setTrainerScheduleView('add')}
          >
            Add Trainer
          </button>
          <button
            className={trainerScheduleView === 'book' ? 'tab active' : 'tab'}
            onClick={() => setTrainerScheduleView('book')}
          >
            Book Class For Trainer
          </button>
          <button
            className={trainerScheduleView === 'calendar' ? 'tab active' : 'tab'}
            onClick={() => setTrainerScheduleView('calendar')}
          >
            Trainer Schedule Calendar
          </button>
          <button
            className={trainerScheduleView === 'reports' ? 'tab active' : 'tab'}
            onClick={() => setTrainerScheduleView('reports')}
          >
            Reports
          </button>
        </div>
      ) : null}

      {trainerScheduleView === 'trainers' && loginRole !== 'trainer' ? (
        <div className="student-browser trainer-browser">
          <section className="schedule-box">
            <div className="section-heading">
              <h3>Trainers</h3>
              <p className="muted">Search by trainer name, username, or email to open login and availability details.</p>
            </div>
            <div className="roster-toolbar">
              <label>
                Search trainer
                <input
                  type="text"
                  value={trainerSearch}
                  onChange={(e) => setTrainerSearch(e.target.value)}
                  placeholder="Search by trainer name, username, or email"
                />
              </label>
            </div>

            {filteredTrainers.length > 0 ? (
              <div className="trainer-roster" role="list" aria-label="Trainer roster">
                {filteredTrainers.map((trainer) => (
                  <button
                    type="button"
                    key={trainer.id}
                    className={selectedTrainer?.id === trainer.id ? 'trainer-row active' : 'trainer-row'}
                    onClick={() => setTrainerBookingForm({ ...trainerBookingForm, trainerId: trainer.id })}
                  >
                    <div>
                      <strong>{trainer.name}</strong>
                      <p className="muted">{trainer.email}</p>
                    </div>
                    <div className="trainer-row__meta">
                      <span className="pill compact">{trainer.username}</span>
                      <span className="pill compact accent">{trainer.password}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">No trainers match the current search.</p>
            )}
          </section>

          <section className="schedule-box">
            <div className="section-heading">
              <h3>Trainer Details</h3>
              <p className="muted">
                {selectedTrainer
                  ? `Viewing ${selectedTrainer.name}'s trainer account details.`
                  : 'Select a trainer to view username, password, and schedule details.'}
              </p>
            </div>
            {selectedTrainer ? (
              <div className="student-detail">
                <div className="student-detail__meta">
                  <div className="detail-card">
                    <span className="muted">Trainer name</span>
                    <strong>{selectedTrainer.name}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Username</span>
                    <strong>{selectedTrainer.username}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Email</span>
                    <strong>{selectedTrainer.email}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Password</span>
                    <strong>{selectedTrainer.password}</strong>
                  </div>
                  <div className="detail-card">
                    <span className="muted">Availability</span>
                    <strong>{formatAvailabilitySummary(selectedTrainer.availabilities)}</strong>
                  </div>
                </div>
                <div className="cta-row trainer-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleDeleteTrainer(selectedTrainer.id)}
                  >
                    Delete trainer
                  </button>
                </div>
                {selectedTrainer.notes ? <p className="muted">{selectedTrainer.notes}</p> : null}
              </div>
            ) : (
              <p className="muted">No trainer selected.</p>
            )}
          </section>
        </div>
      ) : null}

      {trainerScheduleView === 'add' && loginRole !== 'trainer' ? (
        <div className={trainerLayoutClassName}>
          <div className="trainer-column">
            <section className="schedule-box">
              <div className="section-heading">
                <h3>Add Trainer</h3>
                <p className="muted">Create a trainer record with login details and default availability.</p>
              </div>
              <form className="form" onSubmit={handleAddTrainer}>
                <div className="form__row">
                  <label>
                    Trainer name
                    <input
                      type="text"
                      value={trainerForm.name}
                      onChange={(e) => setTrainerForm({ ...trainerForm, name: e.target.value })}
                      placeholder="Full name"
                      required
                    />
                  </label>
                  <label>
                    Trainer username
                    <input
                      type="text"
                      value={trainerForm.username}
                      onChange={(e) => setTrainerForm({ ...trainerForm, username: e.target.value })}
                      placeholder="Username"
                      required
                    />
                  </label>
                </div>
                <div className="form__row">
                  <label>
                    Email
                    <input
                      type="email"
                      value={trainerForm.email}
                      onChange={(e) => setTrainerForm({ ...trainerForm, email: e.target.value })}
                      placeholder="trainer@email.com"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      type="text"
                      value={trainerForm.password}
                      onChange={(e) => setTrainerForm({ ...trainerForm, password: e.target.value })}
                      placeholder="Trainer password"
                      required
                    />
                  </label>
                </div>
                <div className="form__row">
                  <label>
                    Notes
                    <input
                      type="text"
                      value={trainerForm.notes}
                      onChange={(e) => setTrainerForm({ ...trainerForm, notes: e.target.value })}
                      placeholder="Special notes"
                    />
                  </label>
                </div>
                <div className="form__row form__row--stacked">
                  <div>
                    <span className="day-group__label">Availability days and times</span>
                    <div className="availability-grid">
                      {weekdayOptions.map((day) => {
                        const availability = trainerForm.availabilities.find((entry) => entry.day === day.label);

                        return (
                          <div key={day.label} className="availability-row">
                            <button
                              type="button"
                              className={availability ? 'chip active' : 'chip'}
                              onClick={() => handleTrainerFormDayToggle(day.label)}
                            >
                              {day.label}
                            </button>
                            <label>
                              <span className="sr-only">{day.label} from</span>
                              <select
                                aria-label={`${day.label} from time`}
                                value={availability?.fromTime || trainerTimeSlots[0]}
                                onChange={(e) => handleTrainerFormAvailabilityTimeChange(day.label, 'fromTime', e.target.value)}
                                disabled={!availability}
                              >
                                {trainerTimeSlots.map((slot) => (
                                  <option key={slot} value={slot}>{slot}</option>
                                ))}
                              </select>
                            </label>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted,#888)', alignSelf: 'center' }}>to</span>
                            <label>
                              <span className="sr-only">{day.label} to</span>
                              <select
                                aria-label={`${day.label} to time`}
                                value={availability?.toTime || trainerTimeSlots[trainerTimeSlots.length - 1]}
                                onChange={(e) => handleTrainerFormAvailabilityTimeChange(day.label, 'toTime', e.target.value)}
                                disabled={!availability}
                              >
                                {trainerTimeSlots.map((slot) => (
                                  <option key={slot} value={slot}>{slot}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="cta-row trainer-actions">
                  <button type="submit" className="primary">Add trainer</button>
                </div>
              </form>
            </section>
          </div>
        </div>
      ) : null}

      {trainerScheduleView === 'book' && loginRole !== 'trainer' ? (
        <div className="trainer-layout trainer-layout--book">
          <div className="trainer-column">
            <section className="schedule-box">
              <div className="section-heading">
                <h3>Book Class For Trainer</h3>
                <p className="muted">Admins can review trainer availability and assign classes.</p>
              </div>
              <form className="form" onSubmit={handleBookTrainerClass}>
                <div className="form__row">
                  <label>
                    Trainer
                    <select
                      value={trainerBookingForm.trainerId}
                      onChange={(e) => setTrainerBookingForm({ ...trainerBookingForm, trainerId: Number(e.target.value) })}
                    >
                      {trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Class
                    <select
                      value={trainerBookingForm.course}
                      onChange={(e) => {
                        const nextCourse = e.target.value;
                        setTrainerBookingForm({
                          ...trainerBookingForm,
                          course: nextCourse,
                          studentIds: trainerBookingForm.studentIds.filter((studentId) => (
                            studentEnrollments.some((student) => student.id === studentId && student.course === nextCourse)
                          )),
                        });
                      }}
                    >
                      {bookingCourseOptions.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="form__row">
                  <label>
                    Class date
                    <input
                      type="date"
                      value={trainerBookingForm.date}
                      min={today}
                      onChange={(e) => updateTrainerBookingForm({ date: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Room
                    <select
                      value={trainerBookingForm.room}
                      onChange={(e) => updateTrainerBookingForm({ room: e.target.value })}
                    >
                      {rooms.map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </label>

                </div>
                <div className="form__row form__row--stacked">
                  <div>
                    <span className="day-group__label">Students in this class</span>
                    {filteredStudents.length > 0 ? (
                      <div className="trainer-roster" role="list" aria-label="Students for trainer class">
                        {filteredStudents.map((student) => (
                          <label key={student.id} className="trainer-row trainer-row--selectable">
                            <div>
                              <strong>{student.studentName}</strong>
                              <p className="muted">{student.course}</p>
                              <p className="muted">{student.startTime} - {student.endTime}</p>
                            </div>
                            <div className="trainer-row__meta">
                              <input
                                type="checkbox"
                                checked={trainerBookingForm.studentIds.includes(student.id)}
                                onChange={() => handleTrainerBookingStudentToggle(student.id)}
                                aria-label={`Assign ${student.studentName}`}
                              />
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : studentEnrollments.length > 0 ? (
                      <p className="muted">No enrolled students match the selected class yet.</p>
                    ) : (
                      <p className="muted">Enroll students first before assigning them to a trainer class.</p>
                    )}
                  </div>

                  <label>
                    Admin notes
                    <input
                      type="text"
                      value={trainerBookingForm.notes}
                      onChange={(e) => updateTrainerBookingForm({ notes: e.target.value })}
                      placeholder="Class notes or reminders"
                    />
                  </label>
                </div>
                <div className="trainer-booking-hint">
                  {selectedTrainer ? `Selected trainer availability: ${formatAvailabilitySummary(selectedTrainer.availabilities)}.` : 'Select a trainer to check availability.'}
                </div>
                <button
                  type="button"
                  className={trainerAvailabilityExpanded ? 'ghost active trainer-expand-button' : 'ghost trainer-expand-button'}
                  onClick={() => setTrainerAvailabilityExpanded((prev) => !prev)}
                >
                  {trainerAvailabilityExpanded ? 'Hide selected trainer availability' : 'Selected Trainer Availability'}
                </button>
                {trainerAvailabilityExpanded ? (
                  <section className="schedule-box schedule-box--spaced">
                    <div className="section-heading">
                      <h3>Selected Trainer Availability</h3>
                      <p className="muted">Choose a trainer here, then review and adjust their availability before confirming the booking.</p>
                    </div>
                    {selectedTrainer ? (
                      <div className="trainer-editor">
                        <div className="student-detail__meta">
                          <div className="detail-card">
                            <span className="muted">Trainer</span>
                            <strong>{selectedTrainer.name}</strong>
                          </div>
                          <div className="detail-card">
                            <span className="muted">Availability</span>
                            <strong>{formatAvailabilitySummary(selectedTrainer.availabilities)}</strong>
                          </div>
                        </div>
                        <div className="form__row">
                          <label>
                            Update availability notes
                            <input
                              type="text"
                              value={selectedTrainer.notes}
                              onChange={(e) => handleSelectedTrainerFieldChange('notes', e.target.value)}
                              placeholder="Availability notes"
                            />
                          </label>
                        </div>
                        <div>
                          <span className="day-group__label">Update available days and times</span>
                          <div className="availability-grid">
                            {weekdayOptions.map((day) => {
                              const availability = selectedTrainer.availabilities.find((entry) => entry.day === day.label);

                              return (
                                <div key={day.label} className="availability-row">
                                  <button
                                    type="button"
                                    className={availability ? 'chip active' : 'chip'}
                                    onClick={() => handleSelectedTrainerDayToggle(day.label)}
                                  >
                                    {day.label}
                                  </button>
                                  <label>
                                    <span className="sr-only">{day.label} from</span>
                                    <select
                                      aria-label={`${day.label} from time`}
                                      value={availability?.fromTime || trainerTimeSlots[0]}
                                      onChange={(e) => handleSelectedTrainerAvailabilityTimeChange(day.label, 'fromTime', e.target.value)}
                                      disabled={!availability}
                                    >
                                      {trainerTimeSlots.map((slot) => (
                                        <option key={slot} value={slot}>{slot}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--muted,#888)', alignSelf: 'center' }}>to</span>
                                  <label>
                                    <span className="sr-only">{day.label} to</span>
                                    <select
                                      aria-label={`${day.label} to time`}
                                      value={availability?.toTime || trainerTimeSlots[trainerTimeSlots.length - 1]}
                                      onChange={(e) => handleSelectedTrainerAvailabilityTimeChange(day.label, 'toTime', e.target.value)}
                                      disabled={!availability}
                                    >
                                      {trainerTimeSlots.map((slot) => (
                                        <option key={slot} value={slot}>{slot}</option>
                                      ))}
                                    </select>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {selectedTrainer.notes ? <p className="muted">{selectedTrainer.notes}</p> : null}
                      </div>
                    ) : (
                      <p className="muted">Select a trainer to view availability.</p>
                    )}
                  </section>
                ) : null}
                <div className="cta-row trainer-actions">
                  <button type="button" className="ghost" onClick={handlePreviewTrainerClass}>Preview schedule</button>
                  <button type="submit" className="primary">Book class for trainer</button>
                </div>
              </form>
            </section>
          </div>

          <div className="trainer-column">
            <section className="schedule-box">
              <div className="section-heading">
                <h3>Preview schedule</h3>
                <p className="muted">
                  {trainerBookingPreview.length > 0
                    ? `${scheduledPreviewCount} classes scheduled${holidayNoticeCount > 0 ? `, ${holidayNoticeCount} holiday no-class notice${holidayNoticeCount === 1 ? '' : 's'}.` : '.'}`
                    : 'Preview the recurring trainer schedule before confirming the booking.'}
                </p>
              </div>
              {trainerBookingPreview.length > 0 ? (
                <div className="schedule-list">
                  {trainerBookingPreview.map((entry) => (
                    <div key={entry.id} className={entry.isNoClass ? 'schedule-item schedule-item--warning' : 'schedule-item'}>
                      <strong>{entry.day}</strong>
                      <div className="schedule-item__meta">
                        <span>{entry.displayDate}</span>
                        {entry.isNoClass ? <p className="muted">{entry.holidayTitle}</p> : null}
                      </div>
                      <span>{entry.isNoClass ? entry.statusLabel : `${entry.startTime} - ${entry.endTime}`}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No preview yet.</p>
              )}
            </section>
          </div>
        </div>
      ) : null}

      {loginRole === 'trainer' ? (
        <div className="tabs enrollment-subtabs" aria-label="Trainer schedule pages">
          <button
            className={timecardView === 'calendar' ? 'tab active' : 'tab'}
            onClick={() => setTimecardView('calendar')}
          >
            Schedule
          </button>
          <button
            className={timecardView === 'timecard' ? 'tab active' : 'tab'}
            onClick={() => setTimecardView('timecard')}
          >
            Timecard
          </button>
        </div>
      ) : null}

      {(loginRole !== 'trainer' && trainerScheduleView === 'calendar') || (loginRole === 'trainer' && timecardView === 'calendar') ? (
        <section className="schedule-box">
          <div className="panel__header">
            <div className="section-heading trainer-calendar-heading">
              <h3>Trainer Schedule Calendar</h3>
              <p className="muted">View booked trainer classes by week or month, then click an item for full details.</p>
            </div>
            <div className="view-toggle">
              <button
                className={trainerCalendarView === 'week' ? 'ghost active' : 'ghost'}
                onClick={() => setTrainerCalendarView('week')}
              >
                Weekly view
              </button>
              <button
                className={trainerCalendarView === 'month' ? 'ghost active' : 'ghost'}
                onClick={() => setTrainerCalendarView('month')}
              >
                Monthly view
              </button>
            </div>
          </div>
          {trainerCalendarView === 'month' ? (
            <div className="calendar trainer-calendar">
              <div className="calendar__grid">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="calendar__weekday">
                    {day}
                  </div>
                ))}
                {trainerCalendarMonth.map((cell, idx) => (
                  <div key={idx} className="calendar__cell trainer-calendar__cell">
                    {cell && (
                      <>
                        <div className="calendar__date">{cell.day}</div>
                        <div className="calendar__bookings">
                          {cell.items.map((session) => (
                            <button
                              type="button"
                              key={session.id}
                              className="pill compact accent trainer-calendar__pill calendar-pill"
                              onClick={() => handleBookingSelect(session)}
                            >
                              {session.trainerName} {session.timeSlot}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="week trainer-week">
              {trainerWeekSessions.length === 0 && <p className="muted">No trainer classes this week.</p>}
              {trainerWeekSessions.map((session) => (
                <div key={session.id} className="week__card">
                  <div>
                    <p className="eyebrow">{session.date}</p>
                    <h4>{session.room}</h4>
                    <p className="muted">{session.owner}</p>
                  </div>
                  <div className="pill-row">
                    <button
                      type="button"
                      className={`pill calendar-pill ${session.color}`}
                      onClick={() => handleBookingSelect(session)}
                    >
                      {session.owner} {session.start}
                    </button>
                    <span className="pill compact">{session.typeLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {loginRole === 'trainer' && timecardView === 'timecard' ? (
        <div className="schedule-box">
          <div className="section-heading" style={{ alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h3>My Timecard</h3>
              {!timecardLoading && (
                <p className="muted">
                  {monthLabel(timecardMonth)} &nbsp;·&nbsp;
                  {timecardSessions.length} class{timecardSessions.length !== 1 ? 'es' : ''} &nbsp;·&nbsp;
                  {formatHours(timecardTotalMinutes)} total
                </p>
              )}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', fontWeight: 600, gap: '4px' }}>
              Month
              <input
                type="month"
                value={timecardMonth}
                onChange={(e) => setTimecardMonth(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border, #ddd)', fontSize: '0.9rem' }}
              />
            </label>
          </div>

          {timecardLoading ? (
            <p className="muted">Loading…</p>
          ) : timecardSessions.length === 0 ? (
            <p className="muted">No classes recorded for {monthLabel(timecardMonth)}.</p>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div className="detail-card">
                  <span className="muted">Total classes</span>
                  <strong style={{ fontSize: '1.4rem' }}>{timecardSessions.length}</strong>
                </div>
                <div className="detail-card">
                  <span className="muted">Total hours</span>
                  <strong style={{ fontSize: '1.4rem' }}>{formatHours(timecardTotalMinutes)}</strong>
                </div>
                <div className="detail-card">
                  <span className="muted">Courses taught</span>
                  <strong style={{ fontSize: '1.4rem' }}>{timecardRows.length}</strong>
                </div>
              </div>

              <div className="trainer-session-list">
                {timecardRows.map((row) => (
                  <div key={row.course} className="schedule-box profile-approvals" style={{ marginBottom: '1rem', padding: '0' }}>
                    <div style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid var(--border, #eee)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                      <div>
                        <strong style={{ fontSize: '1rem' }}>{row.course}</strong>
                        <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>
                          {row.sessions.length} class{row.sessions.length !== 1 ? 'es' : ''} &nbsp;·&nbsp; {formatHours(row.sessions.length * 60)}
                        </p>
                      </div>
                      <span className="pill compact success">{formatHours(row.sessions.length * 60)}</span>
                    </div>
                    <div
                      className="trainer-roster"
                      role="list"
                      aria-label={`${row.course} sessions`}
                      style={{ padding: '0.25rem 0' }}
                    >
                      {row.sessions
                        .slice()
                        .sort((a, b) => a.date.localeCompare(b.date))
                        .map((s) => (
                          <div key={s.id} className="trainer-row" style={{ padding: '0.65rem 1.25rem' }}>
                            <div>
                              <strong>{formatDate(s.date)}</strong>
                              <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>
                                {s.timeSlot} &nbsp;·&nbsp; {s.room}
                                {s.sessionType === 'makeup-class' ? ' · Makeup class' : ''}
                              </p>
                              {s.notes ? (
                                <p className="muted" style={{ margin: '1px 0 0', fontSize: '0.8rem' }}>{s.notes}</p>
                              ) : null}
                            </div>
                            <span className="pill compact">1h</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}

      {trainerScheduleView === 'reports' && loginRole !== 'trainer' ? (
        <div className="schedule-box">
          {/* Month picker + totals */}
          <div className="section-heading" style={{ alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <h3>Trainer reports</h3>
              {!reportLoading && (
                <p className="muted">
                  {monthLabel(reportMonth)} &nbsp;·&nbsp;
                  {reportSessions.length} session{reportSessions.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                  {formatHours(reportSessions.length * 60)} total
                </p>
              )}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.8rem', fontWeight: 600, gap: '4px' }}>
              Month
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => { setReportMonth(e.target.value); setExpandedTrainer(null); }}
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border, #ddd)', fontSize: '0.9rem' }}
              />
            </label>
          </div>

          {reportLoading ? (
            <p className="muted">Loading…</p>
          ) : reportRows.length === 0 ? (
            <p className="muted">No trainer sessions recorded for {monthLabel(reportMonth)}.</p>
          ) : (
            <div className="trainer-session-list">
              {reportRows.map((row) => {
                const isExpanded = expandedTrainer === row.name;
                return (
                  <div key={row.name} className="schedule-box profile-approvals" style={{ marginBottom: '1rem', padding: '0' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedTrainer(isExpanded ? null : row.name)}
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
                          {row.totalSessions} session{row.totalSessions !== 1 ? 's' : ''} &nbsp;·&nbsp;
                          {formatHours(row.totalMinutes)} worked &nbsp;·&nbsp;
                          {row.courses.join(', ')}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                        <span className="pill compact">{formatHours(row.totalMinutes)}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted, #888)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div
                        className="trainer-roster"
                        role="list"
                        aria-label={`Sessions by ${row.name}`}
                        style={{ borderTop: '1px solid var(--border, #eee)', padding: '0.25rem 0' }}
                      >
                        {row.sessions
                          .slice()
                          .sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot.localeCompare(b.timeSlot))
                          .map((s) => (
                            <div key={s.id} className="trainer-row" style={{ padding: '0.65rem 1.25rem' }}>
                              <div>
                                <strong>{s.course}</strong>
                                <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.82rem' }}>
                                  {formatDate(s.date)} &nbsp;·&nbsp; {s.timeSlot} &nbsp;·&nbsp; {s.room}
                                </p>
                                {s.notes ? (
                                  <p className="muted" style={{ margin: '1px 0 0', fontSize: '0.8rem' }}>{s.notes}</p>
                                ) : null}
                              </div>
                              <span className="pill compact">1h</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
