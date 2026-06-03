import { useEffect, useState } from 'react';

export default function BookingModal({
  selectedBooking,
  handleClose,
  formatDisplayDate,
  loginRole,
  selectedTrainerId,
  trainers,
  studentEnrollments,
  bookingCourseOptions,
  makeupDrafts,
  rooms,
  timeOptions,
  trainerTimeSlots,
  openMakeupDraft,
  updateMakeupDraft,
  handleArrangeMakeupClass,
  handleStudentAttendanceChange,
  handleUpdateTrainerSession,
  handleSaveClassroomBookingEdit,
  handleDeleteSelectedBooking,
  handlePushClassBack,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bookerName: '',
    trainerId: '',
    course: '',
    date: '',
    room: '',
    start: '',
    end: '',
    purpose: '',
    studentIds: [],
    notes: '',
  });
  const [editStudentSearch, setEditStudentSearch] = useState('');
  const [editStudentClassFilter, setEditStudentClassFilter] = useState('all');

  const normalizeTrainerTimeOption = (value) => {
    if (!value || value.includes('AM') || value.includes('PM')) {
      return value;
    }

    const [hourValue, minuteValue] = value.split(':').map(Number);
    const meridiem = hourValue >= 12 ? 'PM' : 'AM';
    const hours12 = hourValue % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${minuteValue.toString().padStart(2, '0')} ${meridiem}`;
  };

  useEffect(() => {
    if (!selectedBooking) {
      return;
    }

    setIsEditing(false);
    setEditStudentSearch('');
    setEditStudentClassFilter('all');
    setEditForm({
      bookerName: selectedBooking.bookerName || selectedBooking.owner || '',
      trainerId: selectedBooking.trainerId || '',
      course: selectedBooking.course || bookingCourseOptions[0],
      date: selectedBooking.date || '',
      room: selectedBooking.room || rooms[0],
      start: selectedBooking.start || '',
      end: selectedBooking.end || '',
      purpose: selectedBooking.purpose || '',
      studentIds: selectedBooking.studentIds || [],
      notes: selectedBooking.notes || '',
    });
  }, [selectedBooking, bookingCourseOptions, rooms]);

  if (!selectedBooking) {
    return null;
  }

  const canTakeAttendance = loginRole === 'admin' || (loginRole === 'trainer' && selectedBooking.trainerId === selectedTrainerId);
  const canArrangeMakeup = loginRole === 'admin' && selectedBooking.sessionType === 'trainer-class';
  const isClassroomBooking = typeof selectedBooking.id === 'number' && !selectedBooking.sessionType;
  const canEditTrainerClass = loginRole === 'admin' && (selectedBooking.sessionType === 'trainer-class' || selectedBooking.sessionType === 'makeup-class');
  const canEditClassroomBooking = loginRole === 'admin' && isClassroomBooking;
  const canDeleteBooking = loginRole === 'admin' && selectedBooking.typeLabel !== 'School Calendar';
  const canPushClassBack = loginRole === 'admin' && selectedBooking.sessionType === 'trainer-class' && !selectedBooking.isPushedBack;
  const availableCourseOptions = editForm.course && !bookingCourseOptions.includes(editForm.course)
    ? [editForm.course, ...bookingCourseOptions]
    : bookingCourseOptions;
  const studentClassOptions = Array.from(new Set(studentEnrollments.map((student) => student.course))).sort();
  const filteredEditableStudents = studentEnrollments.filter((student) => {
    const matchesSearch = !editStudentSearch
      || student.studentName.toLowerCase().includes(editStudentSearch.toLowerCase())
      || student.username.toLowerCase().includes(editStudentSearch.toLowerCase());
    const matchesClass = editStudentClassFilter === 'all' || student.course === editStudentClassFilter;

    return matchesSearch && matchesClass;
  });
  const trainerEditTimeOptions = Array.from(new Set([
    ...(timeOptions || []).map(normalizeTrainerTimeOption),
    ...(trainerTimeSlots || []),
    editForm.start,
    editForm.end,
  ].filter(Boolean)));

  const handleEditStudentToggle = (studentId) => {
    setEditForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((entry) => entry !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const handleSaveEdit = async () => {
    try {
      if (isClassroomBooking) {
        const saved = await handleSaveClassroomBookingEdit(selectedBooking.id, {
          bookerName: editForm.bookerName,
          room: editForm.room,
          date: editForm.date,
          start: editForm.start,
          end: editForm.end,
          owner: editForm.bookerName,
          course: editForm.course,
          purpose: editForm.purpose,
          color: selectedBooking.color || 'primary',
          studentIds: editForm.studentIds,
        });
        if (saved) setIsEditing(false);
      } else {
        const saved = await handleUpdateTrainerSession(selectedBooking.sessionId, editForm);
        if (saved) setIsEditing(false);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Save edit error:', err);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={handleClose}>
      <section
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-modal-title"
        onClick={(evt) => evt.stopPropagation()}
      >
        <div className="modal-card__header">
          <div>
            <p className="eyebrow">Booking Details</p>
            <h3 id="booking-modal-title">{selectedBooking.room}</h3>
          </div>
          <div className="pill-row">
            {canEditTrainerClass || canEditClassroomBooking ? (
              <button type="button" className={isEditing ? 'ghost active' : 'ghost'} onClick={() => setIsEditing((prev) => !prev)}>
                {isEditing ? 'Cancel edit' : 'Edit'}
              </button>
            ) : null}
            {canPushClassBack ? (
              <button type="button" className="ghost" onClick={() => handlePushClassBack(selectedBooking.sessionId)}>
                Push class back
              </button>
            ) : null}
            {selectedBooking.isPushedBack ? (
              <span className="pill compact accent">Pushed back</span>
            ) : null}
            {canDeleteBooking ? (
              <button type="button" className="ghost" onClick={() => handleDeleteSelectedBooking(selectedBooking)}>
                Delete booking
              </button>
            ) : null}
            <button type="button" className="ghost" onClick={handleClose}>Close</button>
          </div>
        </div>
        {isEditing ? (
          <section className="schedule-box profile-approvals">
            <div className="section-heading">
              <h3>{isClassroomBooking ? 'Edit booking' : 'Edit class'}</h3>
              <p className="muted">{isClassroomBooking ? 'Update the date, time, room, or purpose.' : 'Update the trainer, date, time, room, or students for this class.'}</p>
            </div>
            <div className="form">
              {!isClassroomBooking ? (
                <div className="form__row">
                  <label>
                    Trainer
                    <select
                      value={editForm.trainerId}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, trainerId: Number(e.target.value) }))}
                    >
                      {trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Class
                    <select
                      value={editForm.course}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, course: e.target.value }))}
                    >
                      {availableCourseOptions.map((course) => (
                        <option key={course} value={course}>{course}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              <div className="form__row">
                <label>
                  {isClassroomBooking ? 'Booking date' : 'Class date'}
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </label>
                <label>
                  Room
                  <select
                    value={editForm.room}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, room: e.target.value }))}
                  >
                    {rooms.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </label>
              </div>
              {!isClassroomBooking ? (
                <div className="form__row">
                  <label>
                    Start time
                    <select
                      value={editForm.start}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, start: e.target.value }))}
                    >
                      {trainerEditTimeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    End time
                    <select
                      value={editForm.end}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, end: e.target.value }))}
                    >
                      {trainerEditTimeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
              {isClassroomBooking ? (
                <>
                  <div className="form__row">
                    <label>
                      Booked by
                      <input
                        type="text"
                        value={editForm.bookerName}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, bookerName: e.target.value }))}
                        placeholder="Booker name"
                      />
                    </label>
                    <label>
                      Course
                      <select
                        value={editForm.course}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, course: e.target.value }))}
                      >
                        {availableCourseOptions.map((course) => (
                          <option key={course} value={course}>{course}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form__row">
                    <label>
                      Start time
                      <select
                        value={editForm.start}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, start: e.target.value }))}
                      >
                        {(timeOptions || []).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      End time
                      <select
                        value={editForm.end}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, end: e.target.value }))}
                      >
                        {(timeOptions || []).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="form__row">
                    <label>
                      Purpose
                      <input
                        type="text"
                        value={editForm.purpose}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, purpose: e.target.value }))}
                        placeholder="Booking purpose"
                      />
                    </label>
                  </div>
                </>
              ) : null}
              {!isClassroomBooking ? (
              <div className="form__row form__row--stacked">
                <div>
                  <div className="section-heading section-heading--compact">
                    <h3>Add students</h3>
                    <p className="muted">Search by name or username, filter by class, and add any student to this class.</p>
                  </div>
                  <div className="roster-toolbar roster-toolbar--compact">
                    <label>
                      Search student
                      <input
                        type="text"
                        value={editStudentSearch}
                        onChange={(e) => setEditStudentSearch(e.target.value)}
                        placeholder="Search by student name or username"
                      />
                    </label>
                    <label>
                      Filter by class
                      <select
                        value={editStudentClassFilter}
                        onChange={(e) => setEditStudentClassFilter(e.target.value)}
                      >
                        <option value="all">All classes</option>
                        {studentClassOptions.map((course) => (
                          <option key={course} value={course}>{course}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="roster-summary">
                    <span className="pill compact">{editForm.studentIds.length} selected</span>
                  </div>
                  {filteredEditableStudents.length > 0 ? (
                    <div className="trainer-roster trainer-roster--scrollable" role="list" aria-label="Editable class students">
                      {filteredEditableStudents.map((student) => (
                        <label key={student.id} className="trainer-row trainer-row--selectable">
                          <div>
                            <strong>{student.studentName}</strong>
                            <p className="muted">{student.course}</p>
                            <p className="muted">{student.startTime} - {student.endTime}</p>
                          </div>
                          <div className="trainer-row__meta">
                            <input
                              type="checkbox"
                              checked={editForm.studentIds.includes(student.id)}
                              onChange={() => handleEditStudentToggle(student.id)}
                              aria-label={`Assign ${student.studentName} in edit mode`}
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No enrolled students match the current search or class filter.</p>
                  )}
                </div>
                <label>
                  Admin notes
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Class notes or reminders"
                  />
                </label>
              </div>
              ) : null}
              <div className="cta-row trainer-actions">
                <button type="button" className="primary" onClick={handleSaveEdit}>Save changes</button>
              </div>
            </div>
          </section>
        ) : null}
        <div className="student-detail__meta">
          <div className="detail-card">
            <span className="muted">Date</span>
            <strong>{formatDisplayDate(selectedBooking.date)}</strong>
          </div>
          <div className="detail-card">
            <span className="muted">Time</span>
            <strong>{selectedBooking.start} - {selectedBooking.end}</strong>
          </div>
          <div className="detail-card">
            <span className="muted">Booked by</span>
            <strong>{selectedBooking.bookerName || selectedBooking.owner || '—'}</strong>
          </div>
          {selectedBooking.trainerName ? (
            <div className="detail-card">
              <span className="muted">Trainer</span>
              <strong>{selectedBooking.trainerName}</strong>
            </div>
          ) : null}
          <div className="detail-card">
            <span className="muted">Type</span>
            <strong>{selectedBooking.typeLabel || 'Classroom booking'}</strong>
          </div>
          {selectedBooking.course ? (
            <div className="detail-card">
              <span className="muted">Course</span>
              <strong>{selectedBooking.course}</strong>
            </div>
          ) : null}
          <div className="detail-card">
            <span className="muted">Purpose</span>
            <strong>{selectedBooking.purpose || 'Class session'}</strong>
          </div>
        </div>
        {isClassroomBooking && (selectedBooking.studentIds || []).length > 0 ? (
          <section className="schedule-box profile-approvals">
            <div className="section-heading">
              <h3>Students In Class</h3>
            </div>
            <div className="trainer-roster">
              {(selectedBooking.studentIds || []).map((sid) => {
                const student = studentEnrollments.find((s) => s.id === sid);
                if (!student) return null;
                return (
                  <div key={sid} className="trainer-row">
                    <div>
                      <strong>{student.studentName}</strong>
                      <p className="muted">{student.course} · {student.startTime} - {student.endTime}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
        {selectedBooking.students?.length ? (
          <section className="schedule-box profile-approvals">
            <div className="section-heading">
              <h3>Students In Class</h3>
            </div>
            <div className="trainer-session-list trainer-session-list--compact">
              {selectedBooking.students.map((student) => {
                const draftKey = `${selectedBooking.sessionId}-${student.id}`;
                const draft = makeupDrafts?.[draftKey];
                const status = student.attendanceStatus;

                return (
                  <div key={student.id} className="attendance-entry">
                    <div className="trainer-session-card">
                      <div>
                        <strong>{student.name}</strong>
                        <p className="muted">{student.username}</p>
                      </div>
                      <div className="pill-row">
                        {canTakeAttendance ? (
                          <>
                            <button
                              type="button"
                              className={status === 'present' ? 'pill compact success' : 'ghost'}
                              onClick={() => handleStudentAttendanceChange(selectedBooking.sessionId, student.id, status === 'present' ? 'pending' : 'present')}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className={status === 'missed' ? 'pill compact warning' : 'ghost'}
                              onClick={() => handleStudentAttendanceChange(selectedBooking.sessionId, student.id, status === 'missed' ? 'pending' : 'missed')}
                            >
                              Missed
                            </button>
                          </>
                        ) : (
                          <span className={`pill compact${status === 'present' ? ' success' : status === 'missed' ? ' warning' : ''}`}>
                            {status === 'pending' ? 'Not marked' : status}
                          </span>
                        )}
                      </div>
                    </div>
                    {status === 'missed' && canArrangeMakeup ? (
                      <div className="makeup-form">
                        {student.hasMakeup ? (
                          <span className="pill compact accent">Make-up arranged</span>
                        ) : (
                          <>
                            <button type="button" className="ghost" onClick={() => openMakeupDraft(selectedBooking.sessionId, student.id)}>
                              Arrange make-up class
                            </button>
                            {draft ? (
                              <div className="makeup-form__fields">
                                <label>
                                  Make-up date
                                  <input
                                    type="date"
                                    value={draft.date}
                                    onChange={(e) => updateMakeupDraft(selectedBooking.sessionId, student.id, 'date', e.target.value)}
                                  />
                                </label>
                                <label>
                                  Room
                                  <select
                                    value={draft.room}
                                    onChange={(e) => updateMakeupDraft(selectedBooking.sessionId, student.id, 'room', e.target.value)}
                                  >
                                    {rooms.map((room) => (
                                      <option key={room} value={room}>{room}</option>
                                    ))}
                                  </select>
                                </label>
                                <button
                                  type="button"
                                  className="primary"
                                  onClick={() => handleArrangeMakeupClass(selectedBooking.sessionId, student.id)}
                                >
                                  Confirm make-up
                                </button>
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}
