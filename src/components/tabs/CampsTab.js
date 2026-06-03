export default function CampsTab({
  campView,
  setCampView,
  campForm,
  setCampForm,
  campCourseOptions,
  trainers,
  rooms,
  timeOptions,
  durations,
  today,
  handleCreateCamp,
  campCalendarView,
  setCampCalendarView,
  campCalendarMonth,
  campWeekSessions,
  handleBookingSelect,
}) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Camps</p>
          <h2>{campView === 'book' ? 'Book camp slots and classrooms' : 'Camp calendar and schedule'}</h2>
        </div>
      </div>

      <div className="tabs enrollment-subtabs" aria-label="Camps pages">
        <button
          className={campView === 'book' ? 'tab active' : 'tab'}
          onClick={() => setCampView('book')}
        >
          Book Camp
        </button>
        <button
          className={campView === 'calendar' ? 'tab active' : 'tab'}
          onClick={() => setCampView('calendar')}
        >
          Camp Calendar
        </button>
      </div>

      {campView === 'book' ? (
        <section className="schedule-box">
          <div className="section-heading">
            <h3>Book Camp</h3>
            <p className="muted">Assign the camp name, trainer, room, and time slot. Camps will appear on the calendar and in Home.</p>
          </div>
          <form className="form" onSubmit={handleCreateCamp}>
            <div className="form__row">
              <label>
                Camp name
                <input
                  type="text"
                  value={campForm.name}
                  onChange={(e) => setCampForm({ ...campForm, name: e.target.value })}
                  placeholder="Holiday STEM Camp"
                  required
                />
              </label>
              <label>
                Trainer
                <select
                  value={campForm.trainerId}
                  onChange={(e) => setCampForm({ ...campForm, trainerId: Number(e.target.value) })}
                >
                  {trainers.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Course
                <select
                  value={campForm.course}
                  onChange={(e) => setCampForm({ ...campForm, course: e.target.value })}
                >
                  {campCourseOptions.map((course) => (
                    <option key={course} value={course}>{course}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form__row">
              <label>
                Date
                <input
                  type="date"
                  value={campForm.date}
                  min={today}
                  onChange={(e) => setCampForm({ ...campForm, date: e.target.value })}
                  required
                />
              </label>
              <label>
                Booking pattern
                <select
                  value={campForm.bookingPattern}
                  onChange={(e) => setCampForm({ ...campForm, bookingPattern: e.target.value })}
                >
                  <option value="single">Single day</option>
                  <option value="weekly">Weekly</option>
                  <option value="weekdays">That week Monday to Friday</option>
                </select>
              </label>
              {campForm.bookingPattern === 'weekly' ? (
                <label>
                  Number of weeks
                  <input
                    type="text"
                    inputMode="numeric"
                    value={campForm.weeks}
                    onChange={(e) => setCampForm({ ...campForm, weeks: e.target.value })}
                    placeholder="12"
                  />
                </label>
              ) : null}
            </div>
            <div className="form__row">
              <label>
                Start time
                <select
                  value={campForm.start}
                  onChange={(e) => setCampForm({ ...campForm, start: e.target.value })}
                >
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </label>
              <label>
                Duration
                <select
                  value={campForm.duration}
                  onChange={(e) => setCampForm({ ...campForm, duration: Number(e.target.value) })}
                >
                  {durations.map((duration) => (
                    <option key={duration} value={duration}>{duration} mins</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form__row">
              <label>
                Classroom
                <select
                  value={campForm.room}
                  onChange={(e) => setCampForm({ ...campForm, room: e.target.value })}
                >
                  {rooms.map((room) => (
                    <option key={room} value={room}>{room}</option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <input
                  type="text"
                  value={campForm.notes}
                  onChange={(e) => setCampForm({ ...campForm, notes: e.target.value })}
                  placeholder="Materials, age group, or reminders"
                />
              </label>
            </div>
            {campForm.bookingPattern === 'weekdays' ? (
              <p className="muted">This will book the selected camp time from Monday to Friday for the week containing the chosen date.</p>
            ) : null}
            <div className="cta-row trainer-actions">
              <button type="submit" className="primary">Book camp</button>
            </div>
          </form>
        </section>
      ) : null}

      {campView === 'calendar' ? (
        <section className="schedule-box profile-approvals">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Camp Calendar</p>
            <h3>Scheduled camps</h3>
          </div>
          <div className="view-toggle">
            <button
              className={campCalendarView === 'week' ? 'ghost active' : 'ghost'}
              onClick={() => setCampCalendarView('week')}
              type="button"
            >
              Weekly view
            </button>
            <button
              className={campCalendarView === 'month' ? 'ghost active' : 'ghost'}
              onClick={() => setCampCalendarView('month')}
              type="button"
            >
              Monthly view
            </button>
          </div>
        </div>
        {campCalendarView === 'month' ? (
          <div className="calendar">
            <div className="calendar__grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="calendar__weekday">{day}</div>
              ))}
              {campCalendarMonth.map((cell, idx) => (
                <div key={idx} className="calendar__cell">
                  {cell ? (
                    <>
                      <div className="calendar__date">{cell.day}</div>
                      <div className="calendar__bookings">
                        {cell.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={`pill calendar-pill ${item.color}`}
                            onClick={() => handleBookingSelect(item)}
                          >
                            {item.room} {item.start}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="week">
            {campWeekSessions.length === 0 ? <p className="muted">No camps scheduled this week.</p> : null}
            {campWeekSessions.map((item) => (
              <div key={item.id} className="week__card">
                <div>
                  <p className="eyebrow">{item.date}</p>
                  <h4>{item.room}</h4>
                  <p className="muted">{item.owner}</p>
                </div>
                <div className="pill-row">
                  <button
                    type="button"
                    className={`pill calendar-pill ${item.color}`}
                    onClick={() => handleBookingSelect(item)}
                  >
                    {item.start} - {item.end}
                  </button>
                  <span className="pill compact">{item.typeLabel}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        </section>
      ) : null}
    </section>
  );
}
