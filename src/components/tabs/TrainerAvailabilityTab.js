export default function TrainerAvailabilityTab({
  trainer,
  trainerTimeSlots,
  timeOptions,
  weekdayOptions,
  handleSelectedTrainerFieldChange,
  handleSelectedTrainerDayToggle,
  handleSelectedTrainerAvailabilityTimeChange,
  handleSaveTrainerAvailability,
}) {
  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Availability</p>
          <h2>Update your availability</h2>
        </div>
      </div>
      {trainer ? (
        <div className="trainer-layout trainer-layout--single">
          <section className="schedule-box">
            <div className="section-heading">
              <h3>{trainer.name}</h3>
              <p className="muted">Set the days and time slots you are available so admins can book classes accurately.</p>
            </div>
            <div className="student-detail__meta">
              <div className="detail-card">
                <span className="muted">Username</span>
                <strong>{trainer.username}</strong>
              </div>
            </div>
            <div className="form trainer-inline-editor">
              <div className="form__row">
                <label>
                  Availability notes
                  <input
                    type="text"
                    value={trainer.notes}
                    onChange={(e) => handleSelectedTrainerFieldChange('notes', e.target.value)}
                    placeholder="Add availability notes"
                  />
                </label>
              </div>
              <div>
                <span className="day-group__label">Available days and times</span>
                <div className="availability-grid">
                  {weekdayOptions.map((day) => {
                    const availability = trainer.availabilities.find((entry) => entry.day === day.label);

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
                          <input
                            type="text"
                            list={`avail-from-${day.label}`}
                            aria-label={`${day.label} from time`}
                            value={availability?.fromTime || ''}
                            onChange={(e) => handleSelectedTrainerAvailabilityTimeChange(day.label, 'fromTime', e.target.value)}
                            disabled={!availability}
                            placeholder="08:00"
                          />
                          <datalist id={`avail-from-${day.label}`}>
                            {timeOptions.map((slot) => (
                              <option key={slot} value={slot} />
                            ))}
                          </datalist>
                        </label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted,#888)', alignSelf: 'center' }}>to</span>
                        <label>
                          <span className="sr-only">{day.label} to</span>
                          <input
                            type="text"
                            list={`avail-to-${day.label}`}
                            aria-label={`${day.label} to time`}
                            value={availability?.toTime || ''}
                            onChange={(e) => handleSelectedTrainerAvailabilityTimeChange(day.label, 'toTime', e.target.value)}
                            disabled={!availability}
                            placeholder="21:30"
                          />
                          <datalist id={`avail-to-${day.label}`}>
                            {timeOptions.map((slot) => (
                              <option key={slot} value={slot} />
                            ))}
                          </datalist>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="cta-row trainer-actions">
                <button type="button" className="primary" onClick={handleSaveTrainerAvailability}>Save availability</button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <section className="schedule-box">
          <div className="section-heading">
            <h3>Trainer account not linked</h3>
            <p className="muted">Your login is not linked to a trainer record yet. Ask an admin to add your trainer profile first.</p>
          </div>
        </section>
      )}
    </section>
  );
}
