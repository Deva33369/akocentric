import { useEffect, useState } from 'react';

function createEditEnrollmentForm(enrollment) {
  if (!enrollment) {
    return {
      studentName: '',
      username: '',
      password: '',
      course: '',
      startDate: '',
      startTime: '',
      endTime: '',
      weeks: '',
      days: [],
    };
  }

  return {
    studentName: enrollment.studentName || '',
    username: enrollment.username || '',
    password: enrollment.password || '',
    course: enrollment.course || '',
    startDate: enrollment.startDate || '',
    startTime: enrollment.startTime || '',
    endTime: enrollment.endTime || '',
    weeks: String(enrollment.weeks ?? ''),
    days: enrollment.days || [],
  };
}

export default function StudentEnrollmentTab({
  studentEnrollmentView,
  setStudentEnrollmentView,
  enrollmentForm,
  setEnrollmentForm,
  today,
  studentTimeOptions,
  weekdayOptions,
  handleEnrollmentDayToggle,
  handleConfirmEnrollment,
  schedulePreview,
  handlePreviewSchedule,
  filteredEnrollments,
  studentSearch,
  setStudentSearch,
  courseFilter,
  setCourseFilter,
  dayFilter,
  setDayFilter,
  courseCounts,
  dayCounts,
  selectedEnrollmentId,
  setSelectedEnrollmentId,
  selectedEnrollment,
  handleUpdateEnrollment,
  handleDeleteEnrollment,
  formatDisplayDate,
  courseOptions,
}) {
  const scheduledPreviewCount = schedulePreview.filter((entry) => !entry.isNoClass).length;
  const holidayNoticeCount = schedulePreview.filter((entry) => entry.isNoClass).length;
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editEnrollmentForm, setEditEnrollmentForm] = useState(() => createEditEnrollmentForm(selectedEnrollment));

  useEffect(() => {
    setIsEditingStudent(false);
    setEditEnrollmentForm(createEditEnrollmentForm(selectedEnrollment));
  }, [selectedEnrollment]);

  const handleEditEnrollmentDayToggle = (dayLabel) => {
    setEditEnrollmentForm((prev) => ({
      ...prev,
      days: prev.days.includes(dayLabel)
        ? prev.days.filter((day) => day !== dayLabel)
        : [...prev.days, dayLabel],
    }));
  };

  const handleSaveStudentChanges = async () => {
    if (!selectedEnrollment) {
      return;
    }

    const saved = await handleUpdateEnrollment(selectedEnrollment.id, editEnrollmentForm);

    if (saved) {
      setIsEditingStudent(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Student Enrollment</p>
          <h2>Enroll Students</h2>
        </div>
      </div>
      <div className="tabs enrollment-subtabs" aria-label="Student enrollment pages">
        <button
          className={studentEnrollmentView === 'new' ? 'tab active' : 'tab'}
          onClick={() => setStudentEnrollmentView('new')}
        >
          New Enrollment
        </button>
        <button
          className={studentEnrollmentView === 'students' ? 'tab active' : 'tab'}
          onClick={() => setStudentEnrollmentView('students')}
        >
          Enrolled Students
        </button>
      </div>

      {studentEnrollmentView === 'new' ? (
        <div className="enrollment-layout">
          <form className="form enrollment-form" onSubmit={handleConfirmEnrollment}>
            <div className="schedule-box">
              <div className="section-heading">
                <h3>New enrollment</h3>
                <p className="muted">Add a student, select a course, and build the weekly class schedule.</p>
              </div>
              <div className="form__row">
                <label>
                  Student name
                  <input
                    type="text"
                    value={enrollmentForm.studentName}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, studentName: e.target.value });
                    }}
                    placeholder="Full name"
                    required
                  />
                </label>
                <label>
                  Username
                  <input
                    type="text"
                    value={enrollmentForm.username}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, username: e.target.value });
                    }}
                    placeholder="Student username"
                    required
                  />
                </label>
              </div>
              <div className="form__row">
                <label>
                  Password
                  <input
                    type="text"
                    value={enrollmentForm.password}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, password: e.target.value });
                    }}
                    placeholder="Student password"
                    required
                  />
                </label>
                <label>
                  Course
                  <select
                    value={enrollmentForm.course}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, course: e.target.value });
                    }}
                    required
                  >
                    <option value="">Select course...</option>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form__row">
                <label>
                  Start date
                  <input
                    type="date"
                    value={enrollmentForm.startDate}
                    min={today}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, startDate: e.target.value });
                    }}
                    required
                  />
                  <span className="field-hint">mm/dd/yyyy</span>
                </label>
                <label>
                  Start time
                  <input
                    type="text"
                    list="student-start-time-options"
                    value={enrollmentForm.startTime}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, startTime: e.target.value });
                    }}
                    placeholder="10:00 AM"
                  />
                  <datalist id="student-start-time-options">
                    {studentTimeOptions.map((slot) => (
                      <option key={slot} value={slot} />
                    ))}
                  </datalist>
                </label>
                <label>
                  End time
                  <input
                    type="text"
                    list="student-end-time-options"
                    value={enrollmentForm.endTime}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, endTime: e.target.value });
                    }}
                    placeholder="11:00 AM"
                  />
                  <datalist id="student-end-time-options">
                    {studentTimeOptions.map((slot) => (
                      <option key={slot} value={slot} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Number of weeks
                  <input
                    type="text"
                    inputMode="numeric"
                    value={enrollmentForm.weeks}
                    onChange={(e) => {
                      setEnrollmentForm({ ...enrollmentForm, weeks: e.target.value });
                    }}
                    placeholder="12"
                  />
                  <span className="field-hint">Type how many weeks of classes to schedule.</span>
                </label>
              </div>
              <div className="form__row form__row--stacked">
                <div>
                  <span className="day-group__label">Day of week</span>
                  <div className="day-group">
                    {weekdayOptions.map((day) => (
                      <button
                        type="button"
                        key={day.label}
                        className={enrollmentForm.days.includes(day.label) ? 'chip active' : 'chip'}
                        onClick={() => handleEnrollmentDayToggle(day.label)}
                        aria-pressed={enrollmentForm.days.includes(day.label)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="cta-row enrollment-actions">
                <button type="button" className="ghost enrollment-actions__secondary" onClick={handlePreviewSchedule}>Preview schedule</button>
                <button type="submit" className="primary enrollment-actions__primary">Confirm enrollment</button>
              </div>
            </div>
          </form>

          <div className="enrollment-sidebar">
            <section className="schedule-box">
              <div className="section-heading">
                <h3>Preview schedule</h3>
                <p className="muted">
                  {schedulePreview.length > 0
                    ? `${scheduledPreviewCount} classes scheduled${holidayNoticeCount > 0 ? `, ${holidayNoticeCount} holiday no-class notice${holidayNoticeCount === 1 ? '' : 's'}.` : '.'}`
                    : 'Create a preview before confirming enrollment.'}
                </p>
              </div>
              {schedulePreview.length > 0 ? (
                <div className="schedule-list">
                  {schedulePreview.map((entry) => (
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
      ) : (
        <div className="student-browser">
          <section className="schedule-box">
            <div className="section-heading">
              <h3>Enrolled Students</h3>
              <p className="muted">Use search and class or day filters to work through larger enrollment lists.</p>
            </div>
            <div className="roster-toolbar">
              <label>
                Search student
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by student name"
                />
              </label>
              <label>
                Filter by class
                <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  <option value="all">All classes</option>
                  {courseCounts.map((entry) => (
                    <option key={entry.course} value={entry.course}>{entry.course}</option>
                  ))}
                </select>
              </label>
              <label>
                Filter by day
                <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
                  <option value="all">All days</option>
                  {dayCounts.map((entry) => (
                    <option key={entry.day} value={entry.day}>{entry.day}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="roster-summary">
              <span className="pill compact">{filteredEnrollments.length} students shown</span>
              {courseCounts.map((entry) => (
                <span key={entry.course} className="pill compact accent">{entry.course}: {entry.count}</span>
              ))}
              {dayCounts.map((entry) => (
                <span key={entry.day} className="pill compact warning">{entry.day}: {entry.count}</span>
              ))}
            </div>

            {filteredEnrollments.length > 0 ? (
              <div className="student-roster" role="list" aria-label="Enrolled student roster">
                <div className="student-roster__header">
                  <span>Student</span>
                  <span>Username</span>
                  <span>Class</span>
                  <span>Day</span>
                  <span>Time</span>
                </div>
                {filteredEnrollments.map((student) => (
                  <button
                    type="button"
                    key={student.id}
                    className={selectedEnrollmentId === student.id ? 'student-row active' : 'student-row'}
                    onClick={() => setSelectedEnrollmentId(student.id)}
                  >
                    <strong>{student.studentName}</strong>
                    <span>{student.username}</span>
                    <span>{student.course}</span>
                    <span>{student.days.join(', ')}</span>
                    <span>{student.startTime} - {student.endTime}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">No students match the current search or filter.</p>
            )}
          </section>

          <section className="schedule-box">
            <div className="section-heading">
              <h3>Scheduled Classes</h3>
              <p className="muted">
                {selectedEnrollment
                  ? `${selectedEnrollment.studentName} is scheduled for ${selectedEnrollment.course}.`
                  : 'Select a student to view the scheduled classes.'}
              </p>
            </div>
            {selectedEnrollment ? (
              <div className="student-detail">
                {isEditingStudent ? (
                  <div className="form">
                    <div className="form__row">
                      <label>
                        Student name
                        <input
                          type="text"
                          value={editEnrollmentForm.studentName}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, studentName: e.target.value }))}
                          placeholder="Full name"
                          required
                        />
                      </label>
                      <label>
                        Username
                        <input
                          type="text"
                          value={editEnrollmentForm.username}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, username: e.target.value }))}
                          placeholder="Student username"
                          required
                        />
                      </label>
                    </div>
                    <div className="form__row">
                      <label>
                        Password
                        <input
                          type="text"
                          value={editEnrollmentForm.password}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, password: e.target.value }))}
                          placeholder="Student password"
                          required
                        />
                      </label>
                      <label>
                        Class
                        <select
                          value={editEnrollmentForm.course}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, course: e.target.value }))}
                          required
                        >
                          <option value="">Select class...</option>
                          {courseOptions.map((course) => (
                            <option key={course} value={course}>
                              {course}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="form__row">
                      <label>
                        Start date
                        <input
                          type="date"
                          value={editEnrollmentForm.startDate}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, startDate: e.target.value }))}
                          required
                        />
                        <span className="field-hint">mm/dd/yyyy</span>
                      </label>
                      <label>
                        Start time
                        <input
                          type="text"
                          list="student-edit-start-time-options"
                          value={editEnrollmentForm.startTime}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, startTime: e.target.value }))}
                          placeholder="10:00 AM"
                        />
                        <datalist id="student-edit-start-time-options">
                          {studentTimeOptions.map((slot) => (
                            <option key={slot} value={slot} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        End time
                        <input
                          type="text"
                          list="student-edit-end-time-options"
                          value={editEnrollmentForm.endTime}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, endTime: e.target.value }))}
                          placeholder="11:00 AM"
                        />
                        <datalist id="student-edit-end-time-options">
                          {studentTimeOptions.map((slot) => (
                            <option key={slot} value={slot} />
                          ))}
                        </datalist>
                      </label>
                      <label>
                        Number of weeks
                        <input
                          type="text"
                          inputMode="numeric"
                          value={editEnrollmentForm.weeks}
                          onChange={(e) => setEditEnrollmentForm((prev) => ({ ...prev, weeks: e.target.value }))}
                          placeholder="12"
                        />
                        <span className="field-hint">Saving will rebuild the student schedule.</span>
                      </label>
                    </div>
                    <div className="form__row form__row--stacked">
                      <div>
                        <span className="day-group__label">Day of week</span>
                        <div className="day-group">
                          {weekdayOptions.map((day) => (
                            <button
                              type="button"
                              key={day.label}
                              className={editEnrollmentForm.days.includes(day.label) ? 'chip active' : 'chip'}
                              onClick={() => handleEditEnrollmentDayToggle(day.label)}
                              aria-pressed={editEnrollmentForm.days.includes(day.label)}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="student-detail__meta">
                    <div className="detail-card">
                      <span className="muted">Student name</span>
                      <strong>{selectedEnrollment.studentName}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Username</span>
                      <strong>{selectedEnrollment.username}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Password</span>
                      <strong>{selectedEnrollment.password}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Class</span>
                      <strong>{selectedEnrollment.course}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Day</span>
                      <strong>{selectedEnrollment.days.join(', ')}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Start date</span>
                      <strong>{formatDisplayDate(selectedEnrollment.startDate)}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Time</span>
                      <strong>{selectedEnrollment.startTime} - {selectedEnrollment.endTime}</strong>
                    </div>
                    <div className="detail-card">
                      <span className="muted">Weeks</span>
                      <strong>{selectedEnrollment.weeks}</strong>
                    </div>
                  </div>
                )}
                <div className="cta-row trainer-actions">
                  {isEditingStudent ? (
                    <>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setEditEnrollmentForm(createEditEnrollmentForm(selectedEnrollment));
                          setIsEditingStudent(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={handleSaveStudentChanges}
                      >
                        Save changes
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          setEditEnrollmentForm(createEditEnrollmentForm(selectedEnrollment));
                          setIsEditingStudent(true);
                        }}
                      >
                        Edit student
                      </button>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleDeleteEnrollment(selectedEnrollment.id)}
                      >
                        Delete student
                      </button>
                    </>
                  )}
                </div>
                {isEditingStudent ? (
                  <p className="muted">The schedule below shows the current saved classes. Save changes to regenerate it from the updated details.</p>
                ) : null}
                <div className="schedule-list schedule-list--compact">
                  {selectedEnrollment.schedule.map((session) => (
                    <div key={session.id} className="schedule-item">
                      <strong>{session.day}</strong>
                      <span>{session.displayDate}</span>
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="muted">No student selected.</p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
