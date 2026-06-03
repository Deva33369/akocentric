export function addMinutes(time, minutesToAdd) {
  const is12h = time.includes('AM') || time.includes('PM');
  let baseMinutes;
  if (is12h) {
    const [clock, meridiem] = time.split(' ');
    const [hourValue, minuteValue] = clock.split(':').map(Number);
    let hours = hourValue % 12;
    if (meridiem === 'PM') hours += 12;
    baseMinutes = hours * 60 + minuteValue;
  } else {
    const [hours, minutes] = time.split(':').map(Number);
    baseMinutes = hours * 60 + minutes;
  }
  const totalMinutes = ((baseMinutes + minutesToAdd) % (24 * 60) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (is12h) {
    const meridiem = hours24 >= 12 ? 'PM' : 'AM';
    const hours12 = hours24 % 12 || 12;
    return `${hours12.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${meridiem}`;
  }
  return `${hours24.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function parseDateString(dateString) {
  if (!dateString) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateString) {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${month}/${day}/${year}`;
}

export function getWeekdayLabel(dateString, weekdayOptions) {
  const dayValue = parseDateString(dateString)?.getDay();
  return weekdayOptions.find((day) => day.value === dayValue)?.label || '';
}

export function buildSchedulePreview(startDate, days, startTime, endTime, weekdayOptions, weeks = 6, schoolCalendarByDate = new Map()) {
  const totalWeeks = Number(weeks);

  if (!startDate || days.length === 0 || !Number.isInteger(totalWeeks) || totalWeeks <= 0) {
    return [];
  }

  const start = parseDateString(startDate);
  const availableDays = weekdayOptions
    .filter((day) => days.includes(day.label))
    .sort((a, b) => a.value - b.value);

  if (availableDays.length === 0) {
    return [];
  }

  const preview = [];
  let countedWeeks = 0;
  let weekOffset = 0;
  const maxWeekOffset = totalWeeks + 104;

  while (countedWeeks < totalWeeks && weekOffset < maxWeekOffset) {
    const weekEntries = availableDays.map((day) => {
      const sessionDate = new Date(start);
      const offset = (day.value - start.getDay() + 7) % 7 + weekOffset * 7;
      sessionDate.setDate(start.getDate() + offset);

      if (sessionDate < start) {
        return null;
      }

      return {
        id: `${day.label}-${weekOffset}-${formatDate(sessionDate)}`,
        day: day.label,
        date: formatDate(sessionDate),
        displayDate: formatDisplayDate(formatDate(sessionDate)),
        startTime,
        endTime,
      };
    }).filter(Boolean);

    const closureEntries = weekEntries.filter((entry) => {
      const events = schoolCalendarByDate.get(entry.date) || [];
      return events.length > 0;
    });

    if (closureEntries.length > 0) {
      closureEntries.forEach((entry) => {
        const events = schoolCalendarByDate.get(entry.date) || [];
        const holidayTitle = events.map((event) => event.title).join(', ');

        preview.push({
          ...entry,
          id: `${entry.id}-holiday`,
          isNoClass: true,
          holidayTitle,
          statusLabel: 'No class',
          notes: holidayTitle ? `${holidayTitle} - No class` : 'No class',
        });
      });
      weekOffset += 1;
      continue;
    }

    preview.push(...weekEntries);
    countedWeeks += 1;
    weekOffset += 1;
  }

  return preview;
}

export function createEnrollmentRecord(id, studentName, username, password, course, startDate, startTime, endTime, days, weekdayOptions, weeks = 6, schoolCalendarByDate = new Map()) {
  return {
    id,
    studentName,
    username,
    password,
    course,
    startDate,
    startTime,
    endTime,
    weeks,
    days,
    schedule: buildSchedulePreview(startDate, days, startTime, endTime, weekdayOptions, weeks, schoolCalendarByDate),
  };
}

export function createTrainerRecord(id, name, username, email, password, availabilities, notes = '') {
  return {
    id,
    name,
    username,
    email,
    password,
    availabilities,
    notes,
  };
}

export function normalizeTrainerSession(session) {
  return {
    id: `trainer-${session.id}`,
    sessionId: session.id,
    room: session.room,
    date: session.date,
    start: session.timeSlot,
    end: session.endTime || addMinutes(session.timeSlot, 60),
    owner: session.trainerName,
    trainerId: session.trainerId,
    trainerName: session.trainerName,
    studentIds: session.studentIds || [],
    attendanceByStudentId: session.attendanceByStudentId || {},
    purpose: session.notes || session.course,
    color: 'success',
    typeLabel: session.sessionType === 'makeup-class' ? 'Makeup class' : 'Trainer class',
    sessionType: session.sessionType || 'trainer-class',
    course: session.course,
    isPushedBack: session.isPushedBack || false,
  };
}

export function normalizeCampSession(session) {
  return {
    id: `camp-${session.id}`,
    room: session.room,
    date: session.date,
    start: session.start,
    end: session.end,
    owner: session.name,
    course: session.course,
    purpose: session.notes ? `${session.trainerName} · ${session.notes}` : `Trainer: ${session.trainerName}`,
    color: 'accent',
    typeLabel: 'Camp',
    trainerName: session.trainerName,
  };
}

export function normalizeSchoolCalendarEvent(event) {
  return {
    id: `school-${event.id}`,
    room: event.title,
    date: event.date,
    start: event.start || '00:00',
    end: event.start || '00:00',
    owner: event.statusLabel,
    course: event.typeLabel,
    purpose: event.notes,
    color: event.color || 'warning',
    typeLabel: 'School Calendar',
  };
}
