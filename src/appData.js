import {
  buildSchedulePreview,
  createEnrollmentRecord,
  createTrainerRecord,
} from './utils';

export const brandName = 'AkoCentric';

export const baseBookings = [
  { id: 1, room: 'Orion', date: '2026-02-15', start: '09:00', end: '10:30', owner: 'Design Guild', purpose: 'Brand strategy session', color: 'accent' },
  { id: 2, room: 'Lyra', date: '2026-02-16', start: '13:00', end: '15:00', owner: 'STEM Outreach', purpose: 'Engineering workshop', color: 'primary' },
  { id: 3, room: 'Nova', date: '2026-02-17', start: '11:30', end: '12:30', owner: 'Faculty Board', purpose: 'Curriculum review', color: 'warning' },
  { id: 4, room: 'Orion', date: '2026-02-18', start: '08:30', end: '09:30', owner: 'Mentors', purpose: 'Student check-in', color: 'primary' },
  { id: 5, room: 'Lyra', date: '2026-02-20', start: '16:00', end: '17:30', owner: 'Robotics', purpose: 'Build lab', color: 'accent' },
];

export const rooms = ['Orion', 'Lyra', 'Nova', 'Vega'];

export const timeOptions = Array.from({ length: 28 }, (_, idx) => {
  const minutes = 8 * 60 + idx * 30;
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${hours}:${mins}`;
});

export const durations = [30, 60, 90, 120, 150, 180];

export const bookingCourseOptions = [
  'Novice 1',
  'Novice 2',
  'Novice 3',
  'Apprentice 1',
  'Apprentice 2',
  'Apprentice 3',
  'Eye Level 1',
  'Eye Level 2',
  'Trial Class',
];

export const campCourseOptions = [
  'Roblox',
  'Minecraft',
  'Canva',
  'AI',
  'Lego Spike',
  'Lego Future',
  'Lego Wedo',
  'Lego Spike Prime',
  'Mbot',
];

export const courseOptions = [
  'Creative Writing',
  'Robotics Lab',
  'Science Discovery',
  'Math Enrichment',
];

export const studentTimeOptions = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

export const trainerTimeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

export const weekdayOptions = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'booking', label: 'Booking' },
  { id: 'camps', label: 'Camps' },
  { id: 'studentEnrollment', label: 'Student Enrollment' },
  { id: 'trainerSchedule', label: 'Trainer Schedule' },
  { id: 'eduPartnersManagement', label: 'Edu Partners' },
  { id: 'approvals', label: 'Approvals' },
  { id: 'trainerAvailability', label: 'Availability' },
  { id: 'profile', label: 'Profile' },
];

export const tabsByRole = {
  admin: ['home', 'booking', 'camps', 'studentEnrollment', 'trainerSchedule', 'eduPartnersManagement', 'approvals', 'profile'],
  trainer: ['home', 'trainerSchedule', 'trainerAvailability', 'profile'],
  eduPartners: ['home', 'booking', 'profile'],
};

export function createInitialEnrollmentForm(today) {
  return {
    studentName: '',
    username: '',
    password: '',
    course: '',
    startDate: today,
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    weeks: '12',
    days: [],
  };
}

export function createInitialTrainerForm() {
  return {
    name: '',
    username: '',
    email: '',
    password: '',
    availabilities: [],
    notes: '',
  };
}

export function createInitialTrainerBookingForm(today, trainerId = '') {
  return {
    trainerId,
    course: bookingCourseOptions[0],
    date: today,
    room: rooms[0],
    studentIds: [],
    notes: '',
  };
}

export function createInitialCampForm(today, trainerId = '') {
  return {
    name: '',
    trainerId,
    course: campCourseOptions[0],
    date: today,
    bookingPattern: 'single',
    weeks: '12',
    start: '09:00',
    duration: 120,
    room: rooms[0],
    notes: '',
  };
}

export const baseStudentEnrollments = [];

export const baseTrainers = [
  createTrainerRecord(1, 'Noah Bennett', 'nbennett', 'noah@akocentric.edu', 'noahTrain123', [{ day: 'Mon', fromTime: '10:00 AM', toTime: '04:00 PM' }, { day: 'Wed', fromTime: '10:00 AM', toTime: '04:00 PM' }], 'Prefers project-based sessions.'),
  createTrainerRecord(2, 'Priya Shah', 'pshah', 'priya@akocentric.edu', 'priyaMath456', [{ day: 'Tue', fromTime: '02:00 PM', toTime: '04:00 PM' }, { day: 'Thu', fromTime: '03:00 PM', toTime: '04:00 PM' }, { day: 'Fri', fromTime: '02:00 PM', toTime: '04:00 PM' }], 'Available for advanced enrichment blocks.'),
  createTrainerRecord(3, 'Lena Cruz', 'lcruz', 'lena@akocentric.edu', 'lenaWrite789', [{ day: 'Sat', fromTime: '11:00 AM', toTime: '04:00 PM' }], 'Weekend workshop specialist.'),
];

export const baseTrainerSessions = [];

export const baseCamps = [];

export const baseSchoolCalendarEvents = [
  {
    id: 1,
    title: 'New Year\'s Day',
    date: '2026-01-01',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 2,
    title: 'Chinese New Year',
    date: '2026-02-17',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 3,
    title: 'Chinese New Year',
    date: '2026-02-18',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Second day of Chinese New Year',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 4,
    title: 'Hari Raya Puasa',
    date: '2026-03-21',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 5,
    title: 'Good Friday',
    date: '2026-04-03',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 6,
    title: 'Labour Day',
    date: '2026-05-01',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 7,
    title: 'Hari Raya Haji',
    date: '2026-05-27',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 8,
    title: 'Vesak Day',
    date: '2026-05-31',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 9,
    title: 'Vesak Day (in lieu)',
    date: '2026-06-01',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Observed weekday replacement',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 10,
    title: 'Mid-Year Break',
    date: '2026-06-08',
    typeLabel: 'School Closure',
    statusLabel: 'School closed',
    notes: 'No student sessions scheduled',
    color: 'primary',
    start: '00:00',
  },
  {
    id: 11,
    title: 'National Day',
    date: '2026-08-09',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 12,
    title: 'National Day (in lieu)',
    date: '2026-08-10',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Observed weekday replacement',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 13,
    title: 'Staff Planning Day',
    date: '2026-09-14',
    typeLabel: 'School Closure',
    statusLabel: 'School closed',
    notes: 'Internal planning and training',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 14,
    title: 'Deepavali',
    date: '2026-11-08',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
  {
    id: 15,
    title: 'Deepavali (in lieu)',
    date: '2026-11-09',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Observed weekday replacement',
    color: 'accent',
    start: '00:00',
  },
  {
    id: 16,
    title: 'Christmas Day',
    date: '2026-12-25',
    typeLabel: 'Public Holiday',
    statusLabel: 'School closed',
    notes: 'Singapore public holiday',
    color: 'warning',
    start: '00:00',
  },
];

export function createStudentPreview(startDate, days, startTime, endTime, weeks, schoolCalendarByDate) {
  return buildSchedulePreview(startDate, days, startTime, endTime, weekdayOptions, weeks, schoolCalendarByDate);
}
