export default function SchoolCalendarTab({
  schoolCalendarView,
  setSchoolCalendarView,
  schoolCalendarMonthLabel,
  goToPreviousSchoolMonth,
  goToNextSchoolMonth,
  goToCurrentSchoolMonth,
  schoolCalendarMonth,
  schoolWeekEvents,
}) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">School Calendar</p>
          <h2>Public holidays and school closures</h2>
          <p className="muted">{schoolCalendarMonthLabel}</p>
        </div>
        <div className="view-toggle">
          <button className="ghost" onClick={goToPreviousSchoolMonth}>
            Previous month
          </button>
          <button className="ghost" onClick={goToCurrentSchoolMonth}>
            Current month
          </button>
          <button className="ghost" onClick={goToNextSchoolMonth}>
            Next month
          </button>
          <button
            className={schoolCalendarView === 'week' ? 'ghost active' : 'ghost'}
            onClick={() => setSchoolCalendarView('week')}
          >
            Weekly view
          </button>
          <button
            className={schoolCalendarView === 'month' ? 'ghost active' : 'ghost'}
            onClick={() => setSchoolCalendarView('month')}
          >
            Monthly view
          </button>
        </div>
      </div>
      {schoolCalendarView === 'month' ? (
        <div className="calendar">
          <div className="calendar__grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar__weekday">{day}</div>
            ))}
            {schoolCalendarMonth.map((cell, idx) => (
              <div key={idx} className="calendar__cell">
                {cell ? (
                  <>
                    <div className="calendar__date">{cell.day}</div>
                    <div className="calendar__bookings">
                      {cell.items.map((item) => (
                        <div key={item.id} className={`pill calendar-pill ${item.color}`}>
                          {item.title}
                        </div>
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
          {schoolWeekEvents.length === 0 ? <p className="muted">No public holidays or school closures this week.</p> : null}
          {schoolWeekEvents.map((item) => (
            <div key={item.id} className="week__card">
              <div>
                <p className="eyebrow">{item.date}</p>
                <h4>{item.title}</h4>
                <p className="muted">{item.typeLabel}</p>
              </div>
              <div className="pill-row">
                <span className={`pill calendar-pill ${item.color}`}>{item.statusLabel}</span>
                <span className="pill compact">{item.notes}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
