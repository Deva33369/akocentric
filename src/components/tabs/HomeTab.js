export default function HomeTab({
  brandName,
  calendarView,
  setCalendarView,
  homeCalendarMonthLabel,
  goToPreviousHomeMonth,
  goToCurrentHomeMonth,
  goToNextHomeMonth,
  calendarMonth,
  weekBookings,
  handleBookingSelect,
}) {
  const getScheduleLabel = (item) => item.course || item.purpose || item.owner;
  const getScheduleTimeLabel = (item) => {
    if (item.typeLabel === 'School Calendar') {
      return item.owner || 'All day';
    }

    return `${item.start}${item.end && item.end !== item.start ? ` - ${item.end}` : ''}`;
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Welcome to {brandName}</p>
          <h2>Classroom availability at a glance</h2>
          <p className="muted">{homeCalendarMonthLabel}</p>
        </div>
        <div className="view-toggle">
          <button className="ghost" onClick={goToPreviousHomeMonth}>
            Previous month
          </button>
          <button className="ghost" onClick={goToCurrentHomeMonth}>
            Current month
          </button>
          <button className="ghost" onClick={goToNextHomeMonth}>
            Next month
          </button>
          <button
            className={calendarView === 'week' ? 'ghost active' : 'ghost'}
            onClick={() => setCalendarView('week')}
          >
            Weekly view
          </button>
          <button
            className={calendarView === 'month' ? 'ghost active' : 'ghost'}
            onClick={() => setCalendarView('month')}
          >
            Monthly view
          </button>
        </div>
      </div>
      {calendarView === 'month' ? (
        <div className="calendar">
          <div className="calendar__grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="calendar__weekday">
                {day}
              </div>
            ))}
            {calendarMonth.map((cell, idx) => (
              <div key={idx} className="calendar__cell">
                {cell && (
                  <>
                    <div className="calendar__date">{cell.day}</div>
                    <div className="calendar__bookings">
                      {cell.items.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={`pill calendar-pill ${item.color}`}
                          onClick={() => handleBookingSelect(item)}
                        >
                          {item.room} · {getScheduleLabel(item)}{item.typeLabel === 'School Calendar' ? '' : ` · ${item.start}`}
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
        <div className="week">
          {weekBookings.length === 0 && <p className="muted">No schedules this week.</p>}
          {weekBookings.map((item) => (
            <div key={item.id} className="week__card">
              <div>
                <p className="eyebrow">{item.date}</p>
                <h4>{item.room}</h4>
                <p className="muted">{getScheduleLabel(item)}</p>
                {item.owner !== getScheduleLabel(item) ? <p className="muted">{item.owner}</p> : null}
              </div>
              <div className="pill-row">
                <button
                  type="button"
                  className={`pill calendar-pill ${item.color}`}
                  onClick={() => handleBookingSelect(item)}
                >
                  {getScheduleTimeLabel(item)}
                </button>
                <span className="pill compact">{item.typeLabel || 'Classroom booking'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
