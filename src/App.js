import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import BookingModal from './components/BookingModal';
import HomeTab from './components/tabs/HomeTab';
import BookingTab from './components/tabs/BookingTab';
import CampsTab from './components/tabs/CampsTab';
import StudentEnrollmentTab from './components/tabs/StudentEnrollmentTab';
import TrainerScheduleTab from './components/tabs/TrainerScheduleTab';
import TrainerAvailabilityTab from './components/tabs/TrainerAvailabilityTab';
import ApprovalsTab from './components/tabs/ApprovalsTab';
import EduPartnersTab from './components/tabs/EduPartnersTab';
import ProfileTab from './components/tabs/ProfileTab';
import { sendApprovalGrantedEmail, sendApprovalRequestEmail, sendForgotPasswordEmail } from './emailApi';
import {
  createTrainer as createTrainerApi,
  deleteTrainer as deleteTrainerApi,
  fetchTrainers,
  seedTrainers,
  updateTrainer as updateTrainerApi,
} from './trainersApi';
import {
  createEnrollment as createEnrollmentApi,
  deleteEnrollment as deleteEnrollmentApi,
  extendEnrollmentSchedule,
  fetchEnrollments,
  updateEnrollment as updateEnrollmentApi,
} from './enrollmentsApi';
import {
  createBooking as createBookingApi,
  deleteBooking as deleteBookingApi,
  fetchBookings,
  updateBooking as updateBookingApi,
} from './bookingsApi';
import {
  createTrainerSessionsBulk,
  deleteTrainerSession as deleteTrainerSessionApi,
  fetchTrainerSessions,
  updateTrainerSession as updateTrainerSessionApi,
  updateTrainerSessionAttendance,
} from './trainerSessionsApi';
import { fetchEduPartners, createEduPartner, deleteEduPartner, deleteEduPartnerByEmail } from './eduPartnersApi';
import {
  fetchApprovedAccounts,
  createApprovedAccount,
  deleteApprovedAccount,
  fetchPendingRequests,
  createPendingRequest,
  deletePendingRequest,
} from './accountsApi';
import {
  baseCamps,
  baseSchoolCalendarEvents,
  baseTrainerSessions,
  baseTrainers,
  bookingCourseOptions,
  campCourseOptions,
  brandName,
  courseOptions,
  createInitialCampForm,
  createInitialEnrollmentForm,
  createInitialTrainerBookingForm,
  createInitialTrainerForm,
  createStudentPreview,
  durations,
  rooms,
  studentTimeOptions,
  tabs,
  tabsByRole,
  timeOptions,
  trainerTimeSlots,
  weekdayOptions,
} from './appData';
import {
  addMinutes,
  formatDate,
  formatDisplayDate,
  getWeekdayLabel,
  normalizeCampSession,
  normalizeSchoolCalendarEvent,
  normalizeTrainerSession,
  parseDateString,
} from './utils';

function toMinutes(time) {
  if (time.includes('AM') || time.includes('PM')) {
    const [clock, meridiem] = time.split(' ');
    const [hourValue, minuteValue] = clock.split(':').map(Number);
    let hours = hourValue % 12;
    if (meridiem === 'PM') {
      hours += 12;
    }
    return hours * 60 + minuteValue;
  }

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toDisplayTime(totalMinutes) {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours24 = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${meridiem}`;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function hasRoomConflict(entries, date, room, startMinutes, endMinutes) {
  return entries.some((entry) => (
    entry.date === date
    && entry.room === room
    && rangesOverlap(startMinutes, endMinutes, entry.startMinutes, entry.endMinutes)
  ));
}

function hasTrainerConflict(entries, date, trainerId, startMinutes, endMinutes) {
  return entries.some((entry) => (
    entry.date === date
    && entry.trainerId === trainerId
    && rangesOverlap(startMinutes, endMinutes, entry.startMinutes, entry.endMinutes)
  ));
}

function getTrainerSessionTimeRange(session) {
  const startMinutes = toMinutes(session.timeSlot);
  const endMinutes = session.endTime ? toMinutes(session.endTime) : startMinutes + 60;

  return { startMinutes, endMinutes };
}

function getAvailabilityTimeRange(availability) {
  const startLabel = availability.fromTime || availability.timeSlot || '';
  const startMinutes = toMinutes(startLabel);
  const endLabel = availability.toTime || toDisplayTime(startMinutes + 60);
  const endMinutes = toMinutes(endLabel);

  return { startLabel, endLabel, startMinutes, endMinutes };
}

function compareScheduleEntries(first, second) {
  if (first.date !== second.date) {
    return first.date.localeCompare(second.date);
  }

  return toMinutes(first.start) - toMinutes(second.start);
}

function buildCampDates(startDate, bookingPattern, weeks) {
  const baseDate = parseDateString(startDate);

  if (!baseDate) {
    return [];
  }

  if (bookingPattern === 'weekdays') {
    const dayOfWeek = baseDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + mondayOffset);

    return Array.from({ length: 5 }, (_, index) => {
      const current = new Date(monday);
      current.setDate(monday.getDate() + index);
      return formatDate(current);
    });
  }

  if (bookingPattern === 'weekly') {
    const totalWeeks = Number(weeks);

    if (!Number.isInteger(totalWeeks) || totalWeeks <= 0) {
      return [];
    }

    return Array.from({ length: totalWeeks }, (_, index) => {
      const current = new Date(baseDate);
      current.setDate(baseDate.getDate() + index * 7);
      return formatDate(current);
    });
  }

  return [formatDate(baseDate)];
}

function toggleAvailabilityEntry(availabilities, dayLabel) {
  const exists = availabilities.some((entry) => entry.day === dayLabel);
  if (exists) {
    return availabilities.filter((entry) => entry.day !== dayLabel);
  }

  return [...availabilities, { day: dayLabel, fromTime: trainerTimeSlots[0], toTime: trainerTimeSlots[trainerTimeSlots.length - 1] }];
}

function updateAvailabilityTimeField(availabilities, dayLabel, field, value) {
  return availabilities.map((entry) => (
    entry.day === dayLabel ? { ...entry, [field]: value } : entry
  ));
}

function formatAvailabilitySummary(availabilities) {
  return availabilities
    .map((entry) => `${entry.day} ${entry.fromTime || entry.timeSlot || ''} – ${entry.toTime || ''}`)
    .join(', ');
}

const approvalEmail = (process.env.REACT_APP_APPROVAL_EMAIL || '').trim() || 'akocentricsg@gmail.com';

const testAccountsBypassApproval = {
  admin: ['justdeva2010@gmail.com'],
  trainer: ['kumar.devadharshini@gmail.com'],
};

const testAccountNames = {
  'justdeva2010@gmail.com': 'Deva Admin',
  'kumar.devadharshini@gmail.com': 'Kumar Trainer',
};

function canBypassApproval(email, role) {
  return (testAccountsBypassApproval[role] || []).includes(email);
}

function getBypassAccountName(email) {
  return testAccountNames[email] || email.split('@')[0];
}

function getRoleLabel(role) {
  if (role === 'admin') {
    return 'Admin';
  }
  if (role === 'trainer') {
    return 'Trainer';
  }
  if (role === 'eduPartners') {
    return 'Edu Partners';
  }
  return role;
}

const initialApprovedAccounts = [
  {
    id: 1,
    name: 'Alex Rivers',
    email: 'alex.rivers@example.com',
    password: 'password123',
    role: 'admin',
    status: 'approved',
  },
  {
    id: 2,
    name: 'Noah Bennett',
    email: 'noah.bennett@example.com',
    password: 'password123',
    role: 'trainer',
    status: 'approved',
  },
];

function App() {
  const today = useMemo(() => formatDate(new Date()), []);
  const [theme, setTheme] = useState('light');
  const [activeTab, setActiveTab] = useState('home');
  const [bookings, setBookings] = useState([]);
  const [bookingView, setBookingView] = useState('book');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [calendarView, setCalendarView] = useState('month');
  const [homeCalendarAnchor, setHomeCalendarAnchor] = useState(() => {
    const base = parseDateString(today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('eko_loggedIn') === 'true');
  const [loginRole, setLoginRole] = useState(() => localStorage.getItem('eko_role') || 'admin');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [createAccountForm, setCreateAccountForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
  });
  const [approvedAccounts, setApprovedAccounts] = useState(initialApprovedAccounts);
  const [pendingAccountRequests, setPendingAccountRequests] = useState([]);
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('eko_profile');
      return saved ? JSON.parse(saved) : { name: 'Alex Rivers', email: 'alex.rivers@example.com', role: 'Coordinator', avatar: '' };
    } catch { return { name: 'Alex Rivers', email: 'alex.rivers@example.com', role: 'Coordinator', avatar: '' }; }
  });
  const [bookingForm, setBookingForm] = useState({
    name: '',
    date: today,
    start: '09:00',
    duration: 60,
    room: rooms[0],
    course: bookingCourseOptions[0],
    purpose: 'Seminar',
    weeks: 1,
  });
  const [bookingAlert, setBookingAlert] = useState('');
  const [camps, setCamps] = useState(baseCamps);
  const [campForm, setCampForm] = useState(() => createInitialCampForm(today, ''));
  const [campView, setCampView] = useState('book');
  const [campCalendarView, setCampCalendarView] = useState('month');
  const [enrollmentForm, setEnrollmentForm] = useState(() => createInitialEnrollmentForm(today));
  const [studentEnrollmentView, setStudentEnrollmentView] = useState('new');
  const [schedulePreview, setSchedulePreview] = useState([]);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState(null);
  const [trainerScheduleView, setTrainerScheduleView] = useState('add');
  const [trainerCalendarView, setTrainerCalendarView] = useState('month');
  const [trainerForm, setTrainerForm] = useState(createInitialTrainerForm());
  const [trainerBookingForm, setTrainerBookingForm] = useState(() => createInitialTrainerBookingForm(today, ''));
  const [trainerBookingPreview, setTrainerBookingPreview] = useState([]);
  const [trainerAvailabilityExpanded, setTrainerAvailabilityExpanded] = useState(false);
  const [trainerSessions, setTrainerSessions] = useState(baseTrainerSessions);
  const [makeupDrafts, setMakeupDrafts] = useState({});
  const [trainerSearch, setTrainerSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [dayFilter, setDayFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [eduPartners, setEduPartners] = useState([]);
  const trainerSaveRequestIdsRef = useRef({});

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage('');
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  useEffect(() => {
    let isCancelled = false;

    async function loadBookings() {
      try {
        const loaded = await fetchBookings();
        if (!isCancelled) setBookings(loaded);
      } catch (error) {
        if (!isCancelled) setMessage(`Could not load bookings from database. ${error.message}`);
      }
    }

    loadBookings();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    const allowedTabs = tabsByRole[loginRole];
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [activeTab, isLoggedIn, loginRole]);

  useEffect(() => {
    if (!isLoggedIn || loginRole !== 'trainer') {
      return;
    }

    const linkedTrainer = trainers.find((trainer) => trainer.email.toLowerCase() === profile.email.toLowerCase()) || null;
    setSelectedTrainerId(linkedTrainer?.id ?? null);
  }, [isLoggedIn, loginRole, profile.email, trainers]);

  useEffect(() => {
    let isCancelled = false;

    async function loadEnrollmentRecords() {
      try {
        const loaded = await fetchEnrollments();
        if (isCancelled) return;
        setStudentEnrollments(loaded);
        setSelectedEnrollmentId((currentId) => (
          currentId && loaded.some((e) => e.id === currentId)
            ? currentId
            : (loaded[0]?.id ?? null)
        ));
      } catch (error) {
        if (!isCancelled) {
          setStudentEnrollments([]);
          setSelectedEnrollmentId(null);
          setMessage(`Could not load student enrollments from the deployed API. ${error.message}`);
        }
      }
    }

    loadEnrollmentRecords();

    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadTrainerSessionRecords() {
      try {
        const loaded = await fetchTrainerSessions();
        if (!isCancelled) setTrainerSessions(loaded);
      } catch (error) {
        if (!isCancelled) setMessage(`Could not load trainer sessions from database. ${error.message}`);
      }
    }

    loadTrainerSessionRecords();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadEduPartners() {
      try {
        const loaded = await fetchEduPartners();
        if (!isCancelled) setEduPartners(loaded);
      } catch {
        // non-fatal: edu partners table may not exist yet
      }
    }

    loadEduPartners();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadAccountData() {
      try {
        const [approved, pending] = await Promise.all([
          fetchApprovedAccounts(),
          fetchPendingRequests(),
        ]);
        if (isCancelled) return;
        // Merge DB accounts with hardcoded ones, DB takes precedence
        setApprovedAccounts((prev) => {
          const dbEmails = new Set(approved.map((a) => a.email.toLowerCase()));
          const hardcodedOnly = prev.filter((a) => !dbEmails.has(a.email.toLowerCase()));
          return [...approved, ...hardcodedOnly];
        });
        setPendingAccountRequests(pending);
      } catch {
        // non-fatal: tables may not exist yet (pre-init)
      }
    }

    loadAccountData();
    return () => { isCancelled = true; };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadTrainerRecords() {
      try {
        const loadedTrainers = await fetchTrainers();

        if (isCancelled) {
          return;
        }

        const fallbackTrainerId = loadedTrainers[0]?.id ?? '';

        setTrainers(loadedTrainers);
        setSelectedTrainerId((currentId) => (
          currentId && loadedTrainers.some((trainer) => trainer.id === currentId)
            ? currentId
            : (fallbackTrainerId || null)
        ));
        setTrainerBookingForm((prev) => ({
          ...prev,
          trainerId: loadedTrainers.some((trainer) => trainer.id === Number(prev.trainerId))
            ? prev.trainerId
            : fallbackTrainerId,
          studentIds: loadedTrainers.some((trainer) => trainer.id === Number(prev.trainerId))
            ? prev.studentIds
            : [],
        }));
        setCampForm((prev) => ({
          ...prev,
          trainerId: loadedTrainers.some((trainer) => trainer.id === Number(prev.trainerId))
            ? prev.trainerId
            : fallbackTrainerId,
        }));
      } catch (error) {
        if (!isCancelled) {
          setMessage(`Trainer database sync is unavailable. Using local sample trainers. ${error.message}`);
        }
      }
    }

    loadTrainerRecords();

    return () => {
      isCancelled = true;
    };
  }, [today]);

  const replaceSavedTrainer = (savedTrainer) => {
    setTrainers((prev) => prev.map((trainer) => (
      trainer.id === savedTrainer.id ? savedTrainer : trainer
    )));
  };

  const persistTrainerUpdate = async (trainer, successMessage = '', rollbackTrainer = null) => {
    const nextRequestId = (trainerSaveRequestIdsRef.current[trainer.id] || 0) + 1;
    trainerSaveRequestIdsRef.current[trainer.id] = nextRequestId;

    try {
      const savedTrainer = await updateTrainerApi(trainer.id, trainer);
      if (trainerSaveRequestIdsRef.current[trainer.id] !== nextRequestId) {
        return savedTrainer;
      }
      replaceSavedTrainer(savedTrainer);
      if (successMessage) {
        setMessage(successMessage);
      }
      return savedTrainer;
    } catch (error) {
      if (trainerSaveRequestIdsRef.current[trainer.id] !== nextRequestId) {
        return null;
      }
      if (rollbackTrainer) {
        replaceSavedTrainer(rollbackTrainer);
      }
      setMessage(`Trainer update could not be saved to the database. ${error.message}`);
      return null;
    }
  };

  const updateEnrollmentForm = (changes) => {
    setEnrollmentForm((prev) => ({ ...prev, ...changes }));
    setSchedulePreview([]);
  };

  const updateBookingForm = (changes) => {
    setBookingForm((prev) => ({ ...prev, ...changes }));
    setBookingAlert('');
  };

  const handleLogin = (evt) => {
    evt.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      setMessage('Enter email and password to continue.');
      return;
    }

    const normalizedEmail = loginForm.email.trim().toLowerCase();
    const bypassApproval = canBypassApproval(normalizedEmail, loginRole);
    const pendingRequest = pendingAccountRequests.find((account) => (
      account.email.toLowerCase() === normalizedEmail && account.role === loginRole
    ));

    if (pendingRequest && !bypassApproval) {
      setMessage(`Your account request is still pending approval from ${approvalEmail}.`);
      return;
    }

    let approvedAccount = approvedAccounts.find((account) => (
      account.email.toLowerCase() === normalizedEmail
      && account.password === loginForm.password
      && account.role === loginRole
    ));

    // Also allow trainers stored in the database to log in directly
    if (!approvedAccount && loginRole === 'trainer') {
      const matchedTrainer = trainers.find((t) => (
        t.email.toLowerCase() === normalizedEmail && t.password === loginForm.password
      ));
      if (matchedTrainer) {
        approvedAccount = {
          id: matchedTrainer.id,
          name: matchedTrainer.name,
          email: matchedTrainer.email,
          password: matchedTrainer.password,
          role: 'trainer',
          status: 'approved',
        };
      }
    }

    // Also allow edu partners stored in the database to log in directly
    if (!approvedAccount && loginRole === 'eduPartners') {
      const matchedPartner = eduPartners.find((p) => (
        p.email.toLowerCase() === normalizedEmail && p.password === loginForm.password
      ));
      if (matchedPartner) {
        approvedAccount = {
          id: matchedPartner.id,
          name: matchedPartner.name,
          email: matchedPartner.email,
          password: matchedPartner.password,
          role: 'eduPartners',
          status: 'approved',
        };
      }
    }

    if (!approvedAccount && bypassApproval) {
      approvedAccount = {
        id: approvedAccounts.length + pendingAccountRequests.length + 1,
        name: getBypassAccountName(normalizedEmail),
        email: normalizedEmail,
        password: loginForm.password,
        role: loginRole,
        status: 'approved',
      };
      setApprovedAccounts((prev) => {
        const existingAccount = prev.find((account) => (
          account.email.toLowerCase() === normalizedEmail && account.role === loginRole
        ));

        return existingAccount ? prev : [...prev, approvedAccount];
      });
    }

    if (!approvedAccount) {
      setMessage('Your account is not approved yet or the login details are incorrect.');
      return;
    }

    setProfile((prev) => ({
      ...prev,
      name: approvedAccount.name || prev.name,
      email: approvedAccount.email,
      role: getRoleLabel(loginRole),
    }));
    setActiveTab('home');
    setTrainerScheduleView(loginRole === 'admin' ? 'trainers' : 'calendar');
    setIsLoggedIn(true);
    localStorage.setItem('eko_loggedIn', 'true');
    localStorage.setItem('eko_role', loginRole);
    localStorage.setItem('eko_profile', JSON.stringify({
      name: approvedAccount.name || 'User',
      email: approvedAccount.email,
      role: getRoleLabel(loginRole),
      avatar: '',
    }));
    setLoginForm({ email: '', password: '' });
    setMessage('Welcome back.');
  };

  const openForgotPassword = () => {
    setForgotPasswordEmail(loginForm.email);
    setForgotPasswordOpen(true);
  };

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordEmail('');
  };

  const handleForgotPassword = async (evt) => {
    evt.preventDefault();

    if (!forgotPasswordEmail) {
      setMessage('Enter your email address to reset the password.');
      return;
    }

    try {
      await sendForgotPasswordEmail(forgotPasswordEmail);
      setForgotPasswordOpen(false);
      setForgotPasswordEmail('');
      setMessage(`Your password has been sent to ${forgotPasswordEmail}.`);
    } catch (error) {
      setMessage(error.message || 'Could not send password email. Please contact admin.');
    }
  };

  const openCreateAccount = () => {
    setCreateAccountForm({
      name: '',
      email: loginForm.email,
      password: '',
      confirmPassword: '',
      role: loginRole,
    });
    setCreateAccountOpen(true);
  };

  const closeCreateAccount = () => {
    setCreateAccountOpen(false);
    setCreateAccountForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: loginRole,
    });
  };

  const handleCreateAccount = async (evt) => {
    evt.preventDefault();

    const normalizedEmail = createAccountForm.email.trim().toLowerCase();
    const requestName = createAccountForm.name;
    const requestRole = createAccountForm.role;
    const requestPassword = createAccountForm.password;

    if (!createAccountForm.name || !createAccountForm.email || !createAccountForm.password) {
      setMessage('Complete the name, email, and password to create an account.');
      return;
    }

    if (createAccountForm.password !== createAccountForm.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    const duplicateApproved = approvedAccounts.some((account) => account.email.toLowerCase() === normalizedEmail);
    const duplicatePending = pendingAccountRequests.some((account) => account.email.toLowerCase() === normalizedEmail);

    if (duplicateApproved || duplicatePending) {
      setMessage('An account request for this email already exists.');
      return;
    }

    const newRequest = {
      id: pendingAccountRequests.length + approvedAccounts.length + 1,
      name: requestName,
      email: normalizedEmail,
      password: requestPassword,
      role: requestRole,
      status: 'pending',
    };

    if (canBypassApproval(normalizedEmail, requestRole)) {
      const bypassAccount = { ...newRequest, status: 'approved' };
      setApprovedAccounts((prev) => [...prev, bypassAccount]);
      try { await createApprovedAccount(bypassAccount); } catch { /* non-fatal */ }
      setCreateAccountOpen(false);
      setCreateAccountForm({ name: '', email: '', password: '', confirmPassword: '', role: requestRole });
      setLoginRole(requestRole);
      setLoginForm({ email: normalizedEmail, password: '' });
      setMessage(`${requestName} can log in immediately. Approval is bypassed for this test account.`);
      return;
    }

    try {
      const saved = await createPendingRequest(newRequest);
      setPendingAccountRequests((prev) => [...prev, saved || newRequest]);
    } catch {
      setPendingAccountRequests((prev) => [...prev, newRequest]);
    }
    setCreateAccountOpen(false);
    setCreateAccountForm({ name: '', email: '', password: '', confirmPassword: '', role: requestRole });
    setLoginRole(requestRole);
    setLoginForm({ email: normalizedEmail, password: '' });

    try {
      await sendApprovalRequestEmail({ name: requestName, email: normalizedEmail, role: requestRole });
      setMessage(`Approval request emailed to ${approvalEmail}. ${requestName} can log in after the approval email is sent.`);
    } catch (error) {
      setMessage(`Approval request saved, but the email service could not reach ${approvalEmail}. ${error.message}`);
    }
  };

  const handleApproveAccountRequest = async (requestId) => {
    const request = pendingAccountRequests.find((account) => account.id === requestId);
    if (!request) {
      return;
    }

    const approvedEntry = { ...request, status: 'approved' };
    setApprovedAccounts((prev) => [...prev, approvedEntry]);
    setPendingAccountRequests((prev) => prev.filter((account) => account.id !== requestId));

    try {
      await Promise.all([
        createApprovedAccount(approvedEntry),
        deletePendingRequest(request.id),
      ]);
    } catch { /* non-fatal — UI is already updated */ }

    // Auto-add to the relevant tab's table based on role
    if (request.role === 'trainer') {
      try {
        const newTrainer = await createTrainerApi({
          name: request.name,
          username: request.email,
          email: request.email,
          password: request.password,
          notes: '',
          availabilities: [],
        });
        setTrainers((prev) => [...prev, newTrainer]);
      } catch { /* non-fatal */ }
    } else if (request.role === 'eduPartners') {
      try {
        await createEduPartner({
          name: request.name,
          username: request.email,
          email: request.email,
          password: request.password,
          organisation: '',
          notes: '',
        });
      } catch { /* non-fatal */ }
    }

    try {
      await sendApprovalGrantedEmail({ name: request.name, email: request.email, role: request.role });
      setMessage(`Approval email sent to ${request.email}. This account can now log in.`);
    } catch (error) {
      setMessage(`Account approved, but the approval email could not be delivered to ${request.email}. ${error.message}`);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('eko_loggedIn');
    localStorage.removeItem('eko_role');
    localStorage.removeItem('eko_profile');
    setActiveTab('home');
    setTrainerScheduleView('trainers');
    setMessage('You have been logged out.');
  };

  const handleAvatarChange = (evt) => {
    const file = evt.target.files?.[0];
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, avatar: url }));
  };

  const handleBooking = async (evt) => {
    evt.preventDefault();
    const duration = Number(bookingForm.duration);
    const startMinutes = toMinutes(bookingForm.start);
    const weeks = Math.max(1, Math.min(52, Number(bookingForm.weeks) || 1));

    if (!bookingForm.name.trim()) {
      setBookingAlert('Please enter your name before confirming the booking.');
      return;
    }

    if (!Number.isFinite(duration) || duration < 30) {
      setBookingAlert('Classroom bookings must be at least 30 minutes.');
      return;
    }

    const newEnd = addMinutes(bookingForm.start, bookingForm.duration);
    const endMinutes = toMinutes(newEnd);

    if (endMinutes <= startMinutes) {
      setBookingAlert('Booking end time must be later than the start time.');
      return;
    }

    // Build list of dates (1 per week)
    const dates = [];
    for (let w = 0; w < weeks; w++) {
      const d = new Date(bookingForm.date);
      d.setDate(d.getDate() + w * 7);
      dates.push(d.toISOString().slice(0, 10));
    }

    const classroomEntries = bookings.map((booking) => ({
      date: booking.date,
      room: booking.room,
      startMinutes: toMinutes(booking.start),
      endMinutes: toMinutes(booking.end),
    }));
    const trainerEntries = trainerSessions.map((session) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(session);
      return {
        date: session.date,
        room: session.room,
        startMinutes,
        endMinutes,
      };
    });
    const campEntries = camps.map((camp) => ({
      date: camp.date,
      room: camp.room,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    // Check conflicts for all dates
    for (const date of dates) {
      const hasClash = hasRoomConflict(
        [...classroomEntries, ...trainerEntries, ...campEntries],
        date,
        bookingForm.room,
        startMinutes,
        endMinutes,
      );
      if (hasClash) {
        setBookingAlert(`This classroom is already booked on ${date} for that time. Choose another slot.`);
        return;
      }
    }

    try {
      const savedBookings = [];
      for (const date of dates) {
        const bookingPayload = {
          bookerName: bookingForm.name.trim(),
          room: bookingForm.room,
          date,
          start: bookingForm.start,
          end: newEnd,
          owner: bookingForm.name.trim() || profile.name,
          course: bookingForm.course,
          purpose: bookingForm.purpose,
          color: 'primary',
          weeks,
        };
        const saved = await createBookingApi(bookingPayload);
        savedBookings.push({ ...saved, bookerName: saved.bookerName || bookingPayload.bookerName });
      }
      setBookingAlert('');
      setBookings((prev) => [...prev, ...savedBookings]);
      setBookingForm((prev) => ({ ...prev, name: '', purpose: 'Seminar', weeks: 1 }));
      setMessage(weeks > 1 ? `${weeks} weekly bookings secured.` : 'Booking secured.');
    } catch (error) {
      setBookingAlert(`Failed to save booking: ${error.message}`);
    }
  };

  const handleCreateCamp = (evt) => {
    evt.preventDefault();

    const duration = Number(campForm.duration);
    const startMinutes = toMinutes(campForm.start);
    const end = addMinutes(campForm.start, duration);
    const endMinutes = toMinutes(end);
    const trainer = trainers.find((entry) => entry.id === Number(campForm.trainerId));
    const scheduledDates = buildCampDates(campForm.date, campForm.bookingPattern, campForm.weeks);

    if (!campForm.name.trim() || !trainer) {
      setMessage('Complete the camp name and trainer before booking a camp.');
      return;
    }

    if (!Number.isFinite(duration) || duration < 30 || endMinutes <= startMinutes) {
      setMessage('Camp bookings must be at least 30 minutes with an end time after the start time.');
      return;
    }

    if (campForm.bookingPattern === 'weekly') {
      const weekCount = Number(campForm.weeks);

      if (!Number.isInteger(weekCount) || weekCount <= 0) {
        setMessage('Enter a valid number of weeks for weekly camp booking.');
        return;
      }
    }

    if (scheduledDates.length === 0) {
      setMessage('Choose a valid camp date pattern before booking.');
      return;
    }

    const classroomEntries = bookings.map((booking) => ({
      date: booking.date,
      room: booking.room,
      startMinutes: toMinutes(booking.start),
      endMinutes: toMinutes(booking.end),
    }));
    const trainerRoomEntries = trainerSessions.map((session) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(session);
      return {
        date: session.date,
        room: session.room,
        startMinutes,
        endMinutes,
      };
    });
    const campRoomEntries = camps.map((camp) => ({
      date: camp.date,
      room: camp.room,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    const trainerScheduleEntries = trainerSessions.map((session) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(session);
      return {
        date: session.date,
        trainerId: session.trainerId,
        startMinutes,
        endMinutes,
      };
    });
    const campTrainerEntries = camps.map((camp) => ({
      date: camp.date,
      trainerId: camp.trainerId,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    for (const date of scheduledDates) {
      if (hasRoomConflict(
        [...classroomEntries, ...trainerRoomEntries, ...campRoomEntries],
        date,
        campForm.room,
        startMinutes,
        endMinutes,
      )) {
        setMessage(`This classroom is already booked on ${formatDisplayDate(date)} for that camp time. Choose another room or slot.`);
        return;
      }

      if (hasTrainerConflict(
        [...trainerScheduleEntries, ...campTrainerEntries],
        date,
        trainer.id,
        startMinutes,
        endMinutes,
      )) {
        setMessage(`${trainer.name} already has another booking on ${formatDisplayDate(date)} at that time.`);
        return;
      }
    }

    const nextBaseId = camps.reduce((maxId, camp) => Math.max(maxId, camp.id), 0) + 1;
    const newCamps = scheduledDates.map((date, index) => ({
      id: nextBaseId + index,
      name: campForm.name.trim(),
      trainerId: trainer.id,
      trainerName: trainer.name,
      course: campForm.course,
      date,
      start: campForm.start,
      end,
      room: campForm.room,
      notes: campForm.notes.trim(),
    }));

    setCamps((prev) => [...newCamps, ...prev]);
    setCampForm(createInitialCampForm(today, trainer.id));
    setCampView('calendar');
    setMessage(`${newCamps.length} ${campForm.name.trim()} camp session${newCamps.length === 1 ? '' : 's'} booked.`);
  };

  const handleBookingSelect = (booking) => {
    setSelectedBooking(booking);
  };

  const handleBookingModalClose = () => {
    setSelectedBooking(null);
  };

  const handleDeleteSelectedBooking = async (booking) => {
    if (!booking) {
      return;
    }

    if (booking.typeLabel === 'School Calendar') {
      setMessage('School calendar events cannot be deleted from this popup.');
      return;
    }

    if (typeof booking.id === 'number') {
      try {
        await deleteBookingApi(booking.id);
      } catch (error) {
        setMessage(`Could not delete booking. ${error.message}`);
        return;
      }
      setBookings((prev) => prev.filter((entry) => entry.id !== booking.id));
      setSelectedBooking(null);
      setMessage('Classroom booking deleted.');
      return;
    }

    if (typeof booking.id === 'string' && booking.id.startsWith('camp-')) {
      const campId = Number(booking.id.replace('camp-', ''));
      setCamps((prev) => prev.filter((entry) => entry.id !== campId));
      setSelectedBooking(null);
      setMessage('Camp booking deleted.');
      return;
    }

    if (typeof booking.id === 'string' && booking.id.startsWith('trainer-')) {
      const sessionId = Number(booking.id.replace('trainer-', ''));
      const session = trainerSessions.find((entry) => entry.id === sessionId);

      if (!session) {
        return;
      }

      // Collect IDs to delete (session + makeup classes)
      const idsToDelete = trainerSessions
        .filter((entry) => entry.id === sessionId || (session.sessionType === 'trainer-class' && entry.sessionType === 'makeup-class' && entry.parentSessionId === sessionId))
        .map((entry) => entry.id);

      try {
        await Promise.all(idsToDelete.map((id) => deleteTrainerSessionApi(id)));
      } catch (error) {
        setMessage(`Could not delete trainer class. ${error.message}`);
        return;
      }

      setTrainerSessions((prev) => prev.filter((entry) => !idsToDelete.includes(entry.id)));
      setSelectedBooking(null);
      setMessage(session.sessionType === 'makeup-class' ? 'Make-up class deleted.' : 'Trainer class deleted.');
    }
  };

  const getTrainerSessionFromSelection = (session) => {
    if (!session) {
      return null;
    }

    if (typeof session.sessionId === 'number') {
      return trainerSessions.find((entry) => entry.id === session.sessionId) || null;
    }

    if (typeof session.id === 'number' && 'trainerId' in session) {
      return trainerSessions.find((entry) => entry.id === session.id) || null;
    }

    if (typeof session.id === 'string' && session.id.startsWith('trainer-')) {
      const sessionId = Number(session.id.replace('trainer-', ''));
      return trainerSessions.find((entry) => entry.id === sessionId) || null;
    }

    return null;
  };

  const buildTrainerSessionBooking = (session) => {
    const normalized = normalizeTrainerSession(session);

    // If no explicit studentIds, fall back to matching enrolled students by course + day of week
    const sessionDayLabel = getWeekdayLabel(session.date, weekdayOptions);
    const resolvedStudentIds = (session.studentIds || []).length > 0
      ? session.studentIds
      : studentEnrollments
          .filter((s) => s.course === session.course && (s.days || []).includes(sessionDayLabel))
          .map((s) => s.id);

    const students = resolvedStudentIds
      .map((studentId) => {
        const student = studentEnrollments.find((entry) => entry.id === studentId);
        if (!student) {
          return null;
        }

        const attendanceStatus = session.attendanceByStudentId?.[studentId] || 'pending';
        const hasMakeup = trainerSessions.some((entry) => (
          entry.sessionType === 'makeup-class'
          && entry.parentSessionId === session.id
          && (entry.studentIds || []).includes(studentId)
        ));

        return {
          id: student.id,
          name: student.studentName,
          username: student.username,
          course: student.course,
          attendanceStatus,
          hasMakeup,
        };
      })
      .filter(Boolean);

    return {
      ...normalized,
      notes: session.notes,
      students,
      sessionId: session.id,
    };
  };

  const handleTrainerSessionSelect = (session) => {
    const sourceSession = getTrainerSessionFromSelection(session);
    if (!sourceSession) {
      setSelectedBooking(session.typeLabel ? session : normalizeTrainerSession(session));
      return;
    }

    setSelectedBooking(buildTrainerSessionBooking(sourceSession));
  };

  const handleTrainerSelect = (trainerId) => {
    setSelectedTrainerId(trainerId);
    setTrainerBookingForm((prev) => ({ ...prev, trainerId }));
    setTrainerBookingPreview([]);
  };

  const updateTrainerBookingForm = (changes) => {
    setTrainerBookingForm((prev) => ({ ...prev, ...changes }));
    setTrainerBookingPreview([]);
  };

  const handleTrainerBookingStudentToggle = (studentId) => {
    setTrainerBookingForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((entry) => entry !== studentId)
        : [...prev.studentIds, studentId],
    }));
    setTrainerBookingPreview([]);
  };

  const handleTrainerFormDayToggle = (dayLabel) => {
    setTrainerForm((prev) => ({
      ...prev,
      availabilities: toggleAvailabilityEntry(prev.availabilities, dayLabel),
    }));
  };

  const handleTrainerFormAvailabilityTimeChange = (dayLabel, field, value) => {
    setTrainerForm((prev) => ({
      ...prev,
      availabilities: updateAvailabilityTimeField(prev.availabilities, dayLabel, field, value),
    }));
  };

  const handleAddTrainer = async (evt) => {
    evt.preventDefault();

    if (!trainerForm.name || !trainerForm.username || !trainerForm.email || !trainerForm.password || trainerForm.availabilities.length === 0) {
      setMessage('Complete the trainer name, username, email, password, and availability before adding a trainer.');
      return;
    }

    try {
      const newTrainer = await createTrainerApi({
        name: trainerForm.name,
        username: trainerForm.username,
        email: trainerForm.email,
        password: trainerForm.password,
        availabilities: trainerForm.availabilities,
        notes: trainerForm.notes,
      });

      setTrainers((prev) => [...prev, newTrainer]);
      handleTrainerSelect(newTrainer.id);
      setCampForm((prev) => ({ ...prev, trainerId: prev.trainerId || newTrainer.id }));
      setTrainerScheduleView('book');
      setTrainerForm(createInitialTrainerForm());
      setMessage(`${newTrainer.name} added to trainers.`);
    } catch (error) {
      setMessage(`Trainer could not be added. ${error.message}`);
    }
  };

  const handleAddEduPartner = async (form) => {
    try {
      const saved = await createApprovedAccount({ ...form, role: 'eduPartners' });
      setApprovedAccounts((prev) => [...prev, saved]);
      setMessage(`${saved.name} added as an edu partner.`);
      return true;
    } catch (error) {
      setMessage(`Could not add edu partner. ${error.message}`);
      return false;
    }
  };

  const handleDeleteEduPartner = async (partnerId) => {
    const partner = approvedAccounts.find((a) => a.id === partnerId && a.role === 'eduPartners');
    if (!partner) return;
    try {
      await deleteApprovedAccount(partnerId);
      try { await deleteEduPartnerByEmail(partner.email); } catch { /* non-fatal if not in edu_partners */ }
      setApprovedAccounts((prev) => prev.filter((a) => a.id !== partnerId));
      setMessage(`${partner.name} removed.`);
    } catch (error) {
      setMessage(`Could not delete edu partner. ${error.message}`);
    }
  };

  const handleDeleteTrainer = async (trainerId) => {
    const trainer = trainers.find((entry) => entry.id === trainerId);

    if (!trainer) {
      return;
    }

    try {
      await deleteTrainerApi(trainerId);

      const remainingTrainers = trainers.filter((entry) => entry.id !== trainerId);
      setTrainers(remainingTrainers);
      setTrainerSessions((prev) => prev.filter((entry) => entry.trainerId !== trainerId));
      setCamps((prev) => prev.filter((entry) => entry.trainerId !== trainerId));

      // Remove from approved accounts (state + DB)
      const linkedAccount = approvedAccounts.find((entry) => entry.email.toLowerCase() === trainer.email.toLowerCase());
      setApprovedAccounts((prev) => prev.filter((entry) => entry.email.toLowerCase() !== trainer.email.toLowerCase()));
      if (linkedAccount?.id) {
        try { await deleteApprovedAccount(linkedAccount.id); } catch { /* non-fatal */ }
      }

      const nextTrainerId = remainingTrainers[0]?.id ?? '';
      setSelectedTrainerId(nextTrainerId || null);
      setTrainerBookingForm((prev) => ({
        ...prev,
        trainerId: nextTrainerId,
        studentIds: [],
      }));
      setCampForm((prev) => ({
        ...prev,
        trainerId: remainingTrainers.some((entry) => entry.id === Number(prev.trainerId)) ? prev.trainerId : nextTrainerId,
      }));
      setTrainerBookingPreview([]);
      setSelectedBooking((prev) => (prev?.trainerId === trainerId ? null : prev));
      setMessage(`${trainer.name} deleted from trainers.`);
    } catch (error) {
      setMessage(`Trainer could not be deleted. ${error.message}`);
    }
  };

  const handleSelectedTrainerFieldChange = (field, value) => {
    const currentTrainer = trainers.find((trainer) => trainer.id === selectedTrainerId);
    if (!currentTrainer) {
      return;
    }

    const nextTrainer = { ...currentTrainer, [field]: value };

    setTrainers((prev) => prev.map((trainer) => (
      trainer.id === selectedTrainerId ? nextTrainer : trainer
    )));
    setTrainerBookingPreview([]);
    void persistTrainerUpdate(nextTrainer, '', currentTrainer);
  };

  const handleSelectedTrainerDayToggle = (dayLabel) => {
    const currentTrainer = trainers.find((trainer) => trainer.id === selectedTrainerId);
    if (!currentTrainer) {
      return;
    }

    const nextTrainer = {
      ...currentTrainer,
      availabilities: toggleAvailabilityEntry(currentTrainer.availabilities, dayLabel),
    };

    setTrainers((prev) => prev.map((trainer) => (
      trainer.id === selectedTrainerId ? nextTrainer : trainer
    )));
    setTrainerBookingPreview([]);
    void persistTrainerUpdate(nextTrainer, '', currentTrainer);
  };

  const handleSelectedTrainerAvailabilityTimeChange = (dayLabel, field, value) => {
    const currentTrainer = trainers.find((trainer) => trainer.id === selectedTrainerId);
    if (!currentTrainer) {
      return;
    }

    const nextTrainer = {
      ...currentTrainer,
      availabilities: updateAvailabilityTimeField(currentTrainer.availabilities, dayLabel, field, value),
    };

    setTrainers((prev) => prev.map((trainer) => (
      trainer.id === selectedTrainerId ? nextTrainer : trainer
    )));
    setTrainerBookingPreview([]);
    void persistTrainerUpdate(nextTrainer, '', currentTrainer);
  };

  const handleSaveTrainerAvailability = async () => {
    if (!selectedTrainer) {
      setMessage('No trainer profile is linked to this login yet.');
      return;
    }

    if (selectedTrainer.availabilities.length === 0) {
      setMessage('Select at least one available day before saving.');
      return;
    }

    await persistTrainerUpdate(selectedTrainer, 'Availability updated. Admins can now see your latest schedule.');
  };

  const buildTrainerBookingSchedule = () => {
    const trainer = trainers.find((entry) => entry.id === Number(trainerBookingForm.trainerId));

    if (!trainer) {
      return { error: 'Select a trainer before booking a class.' };
    }

    if (trainerBookingForm.studentIds.length === 0) {
      return { error: 'Assign at least one student to the trainer class before booking it.' };
    }

    // Derive week count from the enrolled students' weeks (use max so all students get their full schedule)
    const selectedStudents = studentEnrollments.filter((s) => trainerBookingForm.studentIds.includes(s.id));
    const weekCount = selectedStudents.length > 0
      ? Math.max(...selectedStudents.map((s) => Number(s.weeks) || 12))
      : 12;
    if (!Number.isInteger(weekCount) || weekCount <= 0) {
      return { error: 'Could not determine week count from enrolled students.' };
    }

    const bookingDay = getWeekdayLabel(trainerBookingForm.date, weekdayOptions);

    const matchedAvailability = trainer.availabilities.find((entry) => entry.day === bookingDay);

    if (!matchedAvailability) {
      return { error: `${trainer.name} is not available on ${bookingDay || 'that day'}.` };
    }

    // Use the first selected student's enrolled time for the class time slot
    const firstStudent = selectedStudents[0];
    const { startLabel: availableStartTime, endLabel: availableEndTime } = getAvailabilityTimeRange(matchedAvailability);
    const classStartTime = firstStudent?.startTime || availableStartTime;
    const classEndTime = firstStudent?.endTime || availableEndTime;

    const preview = createStudentPreview(
      trainerBookingForm.date,
      [bookingDay],
      classStartTime,
      classEndTime,
      weekCount,
      schoolCalendarByDate,
    );

    if (preview.length === 0) {
      return { error: 'Choose a valid trainer date to preview the class schedule.' };
    }

    const scheduledEntries = preview.filter((entry) => !entry.isNoClass);

    const classroomEntries = bookings.map((booking) => ({
      date: booking.date,
      room: booking.room,
      startMinutes: toMinutes(booking.start),
      endMinutes: toMinutes(booking.end),
    }));
    const trainerEntries = trainerSessions.map((session) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(session);
      return {
        date: session.date,
        room: session.room,
        startMinutes,
        endMinutes,
      };
    });
    const campEntries = camps.map((camp) => ({
      date: camp.date,
      room: camp.room,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    const trainerScheduleEntries = trainerSessions.map((session) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(session);
      return {
        date: session.date,
        trainerId: session.trainerId,
        startMinutes,
        endMinutes,
      };
    });
    const campTrainerEntries = camps.map((camp) => ({
      date: camp.date,
      trainerId: camp.trainerId,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    for (const entry of scheduledEntries) {
      const entryStartMinutes = toMinutes(entry.startTime);
      const entryEndMinutes = toMinutes(entry.endTime);

      if (hasRoomConflict(
        [...classroomEntries, ...trainerEntries, ...campEntries],
        entry.date,
        trainerBookingForm.room,
        entryStartMinutes,
        entryEndMinutes,
      )) {
        return { error: `This classroom is already booked on ${formatDisplayDate(entry.date)} for that trainer time slot. Choose another room or date.` };
      }

      if (hasTrainerConflict(
        [...trainerScheduleEntries, ...campTrainerEntries],
        entry.date,
        trainer.id,
        entryStartMinutes,
        entryEndMinutes,
      )) {
        return { error: `${trainer.name} already has another booking on ${formatDisplayDate(entry.date)} at that time.` };
      }
    }

    return {
      trainer,
      preview,
      scheduledEntries,
      matchedAvailability,
    };
  };

  const handlePreviewTrainerClass = () => {
    const result = buildTrainerBookingSchedule();

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setTrainerBookingPreview(result.preview);
    setMessage('Trainer class schedule preview ready.');
  };

  const handleBookTrainerClass = async (evt) => {
    evt.preventDefault();
    const result = buildTrainerBookingSchedule();

    if (result.error) {
      setMessage(result.error);
      return;
    }

    const sessionsPayload = result.scheduledEntries.map((entry) => ({
      trainerId: result.trainer.id,
      trainerName: result.trainer.name,
      course: trainerBookingForm.course,
      date: entry.date,
      room: trainerBookingForm.room,
      timeSlot: entry.startTime,
      endTime: entry.endTime,
      sessionType: 'trainer-class',
      notes: trainerBookingForm.notes,
      studentIds: trainerBookingForm.studentIds,
    }));

    try {
      const { insertedIds } = await createTrainerSessionsBulk(sessionsPayload);
      const newSessions = sessionsPayload.map((s, index) => ({
        ...s,
        id: insertedIds[index],
        studentIds: trainerBookingForm.studentIds,
        attendanceByStudentId: {},
      }));
      setTrainerSessions((prev) => [...newSessions, ...prev]);
      setTrainerBookingForm(createInitialTrainerBookingForm(today, result.trainer.id));
      setTrainerBookingPreview([]);
      setTrainerAvailabilityExpanded(false);
      setTrainerScheduleView('calendar');
      setMessage(`${newSessions.length} trainer classes booked for ${result.trainer.name}.`);
    } catch (error) {
      setMessage(`Failed to save trainer sessions: ${error.message}`);
    }
  };

  const handleStudentAttendanceChange = async (sessionId, studentId, status) => {
    const previousSessions = trainerSessions;
    const previousSelected = selectedBooking;

    setTrainerSessions((prev) => prev.map((session) => (
      session.id === sessionId
        ? {
          ...session,
          attendanceByStudentId: {
            ...session.attendanceByStudentId,
            [studentId]: status,
          },
        }
        : session
    )));

    try {
      await updateTrainerSessionAttendance(sessionId, studentId, status);
    } catch (error) {
      setTrainerSessions(previousSessions);
      setSelectedBooking(previousSelected);
      setMessage(`Failed to update attendance in the database. ${error.message}`);
    }
  };

  const openMakeupDraft = (sessionId, studentId) => {
    const key = `${sessionId}-${studentId}`;
    setMakeupDrafts((prev) => ({
      ...prev,
      [key]: prev[key] || { date: today, room: rooms[0] },
    }));
  };

  const updateMakeupDraft = (sessionId, studentId, field, value) => {
    const key = `${sessionId}-${studentId}`;
    setMakeupDrafts((prev) => ({
      ...prev,
      [key]: {
        date: today,
        room: rooms[0],
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const handleArrangeMakeupClass = (sessionId, studentId) => {
    const session = trainerSessions.find((entry) => entry.id === sessionId);
    const student = studentEnrollments.find((entry) => entry.id === studentId);
    const key = `${sessionId}-${studentId}`;
    const draft = makeupDrafts[key];

    if (!session || !student || !draft) {
      return;
    }

    const trainer = trainers.find((entry) => entry.id === session.trainerId);
    if (!trainer) {
      setMessage('Trainer record is missing for this make-up class.');
      return;
    }

    if (trainerSessions.some((entry) => (
      entry.sessionType === 'makeup-class'
      && entry.parentSessionId === sessionId
      && (entry.studentIds || []).includes(studentId)
    ))) {
      setMessage(`A make-up class is already arranged for ${student.studentName}.`);
      return;
    }

    const bookingDay = getWeekdayLabel(draft.date, weekdayOptions);
    const matchedAvailability = trainer.availabilities.find((entry) => entry.day === bookingDay);

    if (!matchedAvailability) {
      setMessage(`${trainer.name} is not available on ${bookingDay || 'that day'} for a make-up class.`);
      return;
    }

    const { startLabel: availableStartTime, startMinutes: trainerStartMinutes, endMinutes: trainerEndMinutes } = getAvailabilityTimeRange(matchedAvailability);
    const classroomEntries = bookings.map((booking) => ({
      date: booking.date,
      room: booking.room,
      startMinutes: toMinutes(booking.start),
      endMinutes: toMinutes(booking.end),
    }));
    const trainerEntries = trainerSessions.map((entry) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(entry);
      return {
        date: entry.date,
        room: entry.room,
        startMinutes,
        endMinutes,
      };
    });
    const campEntries = camps.map((camp) => ({
      date: camp.date,
      room: camp.room,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    if (hasRoomConflict(
      [...classroomEntries, ...trainerEntries, ...campEntries],
      draft.date,
      draft.room,
      trainerStartMinutes,
      trainerEndMinutes,
    )) {
      setMessage('This classroom is already booked for that make-up class time. Choose another room or date.');
      return;
    }

    const trainerScheduleEntries = trainerSessions.map((entry) => {
      const { startMinutes, endMinutes } = getTrainerSessionTimeRange(entry);
      return {
        date: entry.date,
        trainerId: entry.trainerId,
        startMinutes,
        endMinutes,
      };
    });
    const campTrainerEntries = camps.map((camp) => ({
      date: camp.date,
      trainerId: camp.trainerId,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    if (hasTrainerConflict(
      [...trainerScheduleEntries, ...campTrainerEntries],
      draft.date,
      trainer.id,
      trainerStartMinutes,
      trainerEndMinutes,
    )) {
      setMessage(`${trainer.name} already has another booking at that make-up class time.`);
      return;
    }

    const newSession = {
      id: trainerSessions.length + 1,
      trainerId: trainer.id,
      trainerName: trainer.name,
      course: session.course,
      date: draft.date,
      room: draft.room,
      timeSlot: availableStartTime,
      studentIds: [studentId],
      attendanceByStudentId: {},
      sessionType: 'makeup-class',
      parentSessionId: sessionId,
      notes: `Make-up class for ${student.studentName}`,
    };

    setTrainerSessions((prev) => [newSession, ...prev]);
    setMakeupDrafts((prev) => {
      const nextDrafts = { ...prev };
      delete nextDrafts[key];
      return nextDrafts;
    });
    setMessage(`Make-up class arranged for ${student.studentName}.`);
  };

  const handlePushClassBack = async (sessionId) => {
    const session = trainerSessions.find((entry) => entry.id === sessionId);
    if (!session || session.isPushedBack) {
      return;
    }

    setTrainerSessions((prev) => prev.map((entry) => (
      entry.id === sessionId ? { ...entry, isPushedBack: true } : entry
    )));

    const sessionStudentIds = session.studentIds || [];

    if (sessionStudentIds.length > 0) {
      setStudentEnrollments((prev) => prev.map((enrollment) => {
        if (!sessionStudentIds.includes(enrollment.id)) {
          return enrollment;
        }

        const schedule = enrollment.schedule || [];
        if (schedule.length === 0) {
          return enrollment;
        }

        const newEntries = (enrollment.days || []).flatMap((day) => {
          const lastEntryForDay = [...schedule].reverse().find((entry) => entry.day === day);
          if (!lastEntryForDay) {
            return [];
          }

          const lastDate = parseDateString(lastEntryForDay.date);
          if (!lastDate) {
            return [];
          }

          const newDate = new Date(lastDate);
          newDate.setDate(newDate.getDate() + 7);
          const newDateStr = formatDate(newDate);

          return [{
            id: `pushed-ext-${day}-${newDateStr}-${sessionId}`,
            day,
            date: newDateStr,
            displayDate: formatDisplayDate(newDateStr),
            startTime: enrollment.startTime,
            endTime: enrollment.endTime,
          }];
        });

        // Persist extended schedule entries to DB
        if (newEntries.length > 0) {
          extendEnrollmentSchedule(enrollment.id, newEntries).catch((error) => {
            console.error(`Failed to persist schedule extension for student ${enrollment.id}:`, error.message);
          });
        }

        return {
          ...enrollment,
          schedule: [...schedule, ...newEntries].sort((a, b) => a.date.localeCompare(b.date)),
        };
      }));
    }

    setMessage(`Class on ${formatDisplayDate(session.date)} pushed back. Affected student schedules extended by 1 week.`);
  };

  const handleSaveClassroomBookingEdit = async (bookingId, updates) => {
    // Optimistic update — reflect changes in UI immediately
    const previousBookings = bookings;
    const previousSelected = selectedBooking;
    const optimistic = { ...selectedBooking, ...updates };
    setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updates } : b)));
    setSelectedBooking(optimistic);
    try {
      const updated = await updateBookingApi(bookingId, updates);
      // Sync with server response
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, ...updates, ...updated } : b)));
      setSelectedBooking((prev) => (prev ? { ...prev, ...updates, ...updated } : null));
      setMessage('Booking updated.');
      return true;
    } catch (error) {
      // Revert on failure
      setBookings(previousBookings);
      setSelectedBooking(previousSelected);
      setMessage(`Failed to update booking in the database. ${error.message}`);
      return false;
    }
  };

  const handleUpdateTrainerSession = async (sessionId, updates) => {
    const currentSession = trainerSessions.find((entry) => entry.id === sessionId);
    const trainer = trainers.find((entry) => entry.id === Number(updates.trainerId));

    if (!currentSession) {
      setMessage('This trainer class could not be found.');
      return false;
    }

    if (!trainer) {
      setMessage('Select a trainer before saving class changes.');
      return false;
    }

    if (!updates.studentIds.length) {
      setMessage('Assign at least one student before saving class changes.');
      return false;
    }

    const bookingDay = getWeekdayLabel(updates.date, weekdayOptions);
    const matchedAvailability = trainer.availabilities.find((entry) => entry.day === bookingDay);

    if (!matchedAvailability) {
      setMessage(`${trainer.name} is not available on ${bookingDay || 'that day'}.`);
      return false;
    }

    const schoolEvents = schoolCalendarByDate.get(updates.date) || [];
    if (schoolEvents.length > 0) {
      setMessage(`No class can be scheduled on ${formatDisplayDate(updates.date)} because of ${schoolEvents.map((entry) => entry.title).join(', ')}.`);
      return false;
    }

    const {
      startLabel: availableStartTime,
      endLabel: availableEndTime,
      startMinutes: availabilityStartMinutes,
      endMinutes: availabilityEndMinutes,
    } = getAvailabilityTimeRange(matchedAvailability);
    const classStartTime = updates.start || currentSession.timeSlot || availableStartTime;
    const classEndTime = updates.end || currentSession.endTime || availableEndTime;
    const startMinutes = toMinutes(classStartTime);
    const endMinutes = toMinutes(classEndTime);

    if (endMinutes <= startMinutes) {
      setMessage('Class end time must be later than the start time.');
      return false;
    }

    if (startMinutes < availabilityStartMinutes || endMinutes > availabilityEndMinutes) {
      setMessage(`${trainer.name} is available on ${bookingDay || 'that day'} from ${availableStartTime} to ${availableEndTime}. Choose a time within that range.`);
      return false;
    }

    const classroomEntries = bookings.map((booking) => ({
      date: booking.date,
      room: booking.room,
      startMinutes: toMinutes(booking.start),
      endMinutes: toMinutes(booking.end),
    }));
    const trainerRoomEntries = trainerSessions
      .filter((entry) => entry.id !== sessionId)
      .map((entry) => {
        const { startMinutes: entryStartMinutes, endMinutes: entryEndMinutes } = getTrainerSessionTimeRange(entry);
        return {
          date: entry.date,
          room: entry.room,
          startMinutes: entryStartMinutes,
          endMinutes: entryEndMinutes,
        };
      });
    const campRoomEntries = camps.map((camp) => ({
      date: camp.date,
      room: camp.room,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    if (hasRoomConflict(
      [...classroomEntries, ...trainerRoomEntries, ...campRoomEntries],
      updates.date,
      updates.room,
      startMinutes,
      endMinutes,
    )) {
      setMessage(`This classroom is already booked on ${formatDisplayDate(updates.date)} for that trainer time slot. Choose another room or date.`);
      return false;
    }

    const trainerScheduleEntries = trainerSessions
      .filter((entry) => entry.id !== sessionId)
      .map((entry) => {
        const { startMinutes: entryStartMinutes, endMinutes: entryEndMinutes } = getTrainerSessionTimeRange(entry);
        return {
          date: entry.date,
          trainerId: entry.trainerId,
          startMinutes: entryStartMinutes,
          endMinutes: entryEndMinutes,
        };
      });
    const campTrainerEntries = camps.map((camp) => ({
      date: camp.date,
      trainerId: camp.trainerId,
      startMinutes: toMinutes(camp.start),
      endMinutes: toMinutes(camp.end),
    }));

    if (hasTrainerConflict(
      [...trainerScheduleEntries, ...campTrainerEntries],
      updates.date,
      trainer.id,
      startMinutes,
      endMinutes,
    )) {
      setMessage(`${trainer.name} already has another booking on ${formatDisplayDate(updates.date)} at that time.`);
      return false;
    }

    const updatedSession = {
      ...currentSession,
      trainerId: trainer.id,
      trainerName: trainer.name,
      course: updates.course,
      date: updates.date,
      room: updates.room,
      timeSlot: classStartTime,
      endTime: classEndTime,
      studentIds: updates.studentIds,
      attendanceByStudentId: Object.fromEntries(
        Object.entries(currentSession.attendanceByStudentId || {}).filter(([sid]) => updates.studentIds.includes(Number(sid))),
      ),
      notes: updates.notes,
    };

    const previousSessions = trainerSessions;
    const previousSelected = selectedBooking;

    // Update local state immediately so calendar and modal both reflect the change
    setTrainerSessions((prev) => prev.map((session) => (session.id !== sessionId ? session : updatedSession)));
    setSelectedBooking(buildTrainerSessionBooking(updatedSession));

    try {
      await updateTrainerSessionApi(sessionId, {
        trainerId: trainer.id,
        trainerName: trainer.name,
        course: updates.course,
        date: updates.date,
        room: updates.room,
        timeSlot: classStartTime,
        endTime: classEndTime,
        notes: updates.notes,
        studentIds: updates.studentIds,
      });

      setMessage(`Class updated for ${trainer.name}.`);
      return true;
    } catch (error) {
      setTrainerSessions(previousSessions);
      setSelectedBooking(previousSelected);
      setMessage(`Failed to update trainer class in the database. ${error.message}`);
      return false;
    }
  };

  const handleEnrollmentDayToggle = (dayLabel) => {
    setEnrollmentForm((prev) => ({
      ...prev,
      days: prev.days.includes(dayLabel)
        ? prev.days.filter((day) => day !== dayLabel)
        : [...prev.days, dayLabel],
    }));
    setSchedulePreview([]);
  };

  const handlePreviewSchedule = () => {
    const result = buildEnrollmentPayload(enrollmentForm, 'preview');

    if (result.error) {
      setMessage(result.error);
      return;
    }

    setSchedulePreview(result.preview);
    setMessage('Schedule preview ready.');
  };

  const handleConfirmEnrollment = async (evt) => {
    evt.preventDefault();
    const result = buildEnrollmentPayload(enrollmentForm, 'create');

    if (result.error) {
      setMessage(result.error);
      return;
    }

    try {
      const savedEnrollment = await createEnrollmentApi(result.payload);
      setStudentEnrollments((prev) => [savedEnrollment, ...prev]);
      setSelectedEnrollmentId(savedEnrollment.id);
      setStudentEnrollmentView('students');
      setSchedulePreview(result.preview);
      setEnrollmentForm(createInitialEnrollmentForm(today));
      setMessage(`${savedEnrollment.studentName} enrollment confirmed.`);
    } catch (error) {
      setMessage(`Failed to save enrollment in the database. ${error.message}`);
    }
  };

  const handleUpdateEnrollment = async (enrollmentId, updates) => {
    const currentEnrollment = studentEnrollments.find((entry) => entry.id === enrollmentId);

    if (!currentEnrollment) {
      setMessage('This student could not be found.');
      return false;
    }

    const result = buildEnrollmentPayload(updates, 'update');

    if (result.error) {
      setMessage(result.error);
      return false;
    }

    try {
      const savedEnrollment = await updateEnrollmentApi(enrollmentId, result.payload);
      setStudentEnrollments((prev) => prev.map((entry) => (
        entry.id === enrollmentId ? savedEnrollment : entry
      )));
      setSelectedEnrollmentId(enrollmentId);
      setMessage(`${savedEnrollment.studentName} enrollment updated.`);
      return true;
    } catch (error) {
      setMessage(`Failed to update enrollment in the database. ${error.message}`);
      return false;
    }
  };

  const handleDeleteEnrollment = async (studentId) => {
    const student = studentEnrollments.find((entry) => entry.id === studentId);

    if (!student) {
      return;
    }

    try {
      await deleteEnrollmentApi(studentId);
    } catch (error) {
      setMessage(`Failed to remove enrollment from the database. ${error.message}`);
      return;
    }

    const remainingEnrollments = studentEnrollments.filter((entry) => entry.id !== studentId);
    setStudentEnrollments(remainingEnrollments);
    setSelectedEnrollmentId(remainingEnrollments[0]?.id ?? null);
    setTrainerSessions((prev) => prev.map((session) => {
      if (!(session.studentIds || []).includes(studentId)) {
        return session;
      }

      const nextAttendance = Object.fromEntries(
        Object.entries(session.attendanceByStudentId || {}).filter(([entryStudentId]) => Number(entryStudentId) !== studentId),
      );

      return {
        ...session,
        studentIds: (session.studentIds || []).filter((entryStudentId) => entryStudentId !== studentId),
        attendanceByStudentId: nextAttendance,
      };
    }));
    setMessage(`${student.studentName} was removed from enrolled students.`);
  };

  const buildEnrollmentPayload = (form, mode = 'create') => {
    const actionLabels = {
      preview: 'previewing',
      create: 'confirming',
      update: 'saving',
    };
    const actionLabel = actionLabels[mode] || 'saving';

    if (!form.studentName || !form.username || !form.password || !form.course || !form.startDate) {
      return { error: `Complete the student name, username, password, course, and start date before ${actionLabel} the schedule.` };
    }

    if (!Array.isArray(form.days) || form.days.length === 0) {
      return { error: `Select at least one available day before ${actionLabel} the schedule.` };
    }

    if (toMinutes(form.endTime) <= toMinutes(form.startTime)) {
      return { error: 'Student class end time must be later than the start time.' };
    }

    const weekCount = Number(form.weeks);
    if (!Number.isInteger(weekCount) || weekCount <= 0) {
      return { error: 'Enter a valid number of weeks for the student schedule.' };
    }

    const preview = createStudentPreview(
      form.startDate,
      form.days,
      form.startTime,
      form.endTime,
      weekCount,
      schoolCalendarByDate,
    );

    if (preview.length === 0) {
      return { error: `Choose a valid start date and at least one available day before ${actionLabel} the schedule.` };
    }

    return {
      preview,
      payload: {
        studentName: form.studentName,
        username: form.username,
        password: form.password,
        course: form.course,
        startDate: form.startDate,
        startTime: form.startTime,
        endTime: form.endTime,
        weeks: weekCount,
        days: form.days,
        schedule: preview,
      },
    };
  };

  const homeScheduleEntries = useMemo(() => {
    const trainerEntries = trainerSessions.map(normalizeTrainerSession);
    const campEntries = camps.map(normalizeCampSession);
    const schoolEntries = baseSchoolCalendarEvents.map(normalizeSchoolCalendarEvent);
    return [...bookings, ...trainerEntries, ...campEntries, ...schoolEntries]
      .sort(compareScheduleEntries);
  }, [bookings, trainerSessions, camps]);

  const bookingsByDate = useMemo(() => {
    const map = new Map();
    homeScheduleEntries.forEach((entry) => {
      if (!map.has(entry.date)) {
        map.set(entry.date, []);
      }
      map.get(entry.date).push(entry);
    });
    return map;
  }, [homeScheduleEntries]);

  const schoolCalendarByDate = useMemo(() => {
    const map = new Map();
    baseSchoolCalendarEvents.forEach((entry) => {
      if (!map.has(entry.date)) {
        map.set(entry.date, []);
      }
      map.get(entry.date).push(entry);
    });
    return map;
  }, []);

  const homeCalendarMonthLabel = useMemo(() => homeCalendarAnchor.toLocaleDateString('en-SG', {
    month: 'long',
    year: 'numeric',
  }), [homeCalendarAnchor]);

  const goToPreviousHomeMonth = () => {
    setHomeCalendarAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextHomeMonth = () => {
    setHomeCalendarAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToCurrentHomeMonth = () => {
    const base = parseDateString(today);
    setHomeCalendarAnchor(new Date(base.getFullYear(), base.getMonth(), 1));
  };

  const calendarMonth = useMemo(() => {
    const base = homeCalendarAnchor;
    const year = base.getFullYear();
    const month = base.getMonth();
    const start = new Date(year, month, 1);
    const startDay = start.getDay();
    const end = new Date(year, month + 1, 0);
    const daysInMonth = end.getDate();
    const cells = [];

    for (let index = 0; index < startDay; index += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = formatDate(new Date(year, month, day));
      cells.push({ day, date, items: bookingsByDate.get(date) || [] });
    }
    return cells;
  }, [bookingsByDate, homeCalendarAnchor]);

  const weekBookings = useMemo(() => {
    const windowStart = new Date(homeCalendarAnchor);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 6);

    return homeScheduleEntries
      .filter((entry) => {
        const date = parseDateString(entry.date);
        return date >= windowStart && date <= windowEnd;
      })
      .sort(compareScheduleEntries);
  }, [homeScheduleEntries, homeCalendarAnchor]);

  const selectedEnrollment = studentEnrollments.find((entry) => entry.id === selectedEnrollmentId) || null;
  const selectedTrainer = trainers.find((entry) => entry.id === selectedTrainerId) || null;

  useEffect(() => {
    const sourceSession = getTrainerSessionFromSelection(selectedBooking);
    if (!sourceSession) {
      return;
    }

    setSelectedBooking(buildTrainerSessionBooking(sourceSession));
  }, [selectedBooking?.id, trainerSessions, studentEnrollments]);

  const filteredTrainers = useMemo(() => trainers
    .filter((trainer) => {
      const search = trainerSearch.trim().toLowerCase();
      if (!search) {
        return true;
      }

      return trainer.name.toLowerCase().includes(search)
        || trainer.username.toLowerCase().includes(search)
        || trainer.email.toLowerCase().includes(search);
    })
    .sort((a, b) => a.name.localeCompare(b.name)), [trainerSearch, trainers]);

  const trainerSessionsByDate = useMemo(() => {
    const map = new Map();
    trainerSessions.forEach((session) => {
      if (!map.has(session.date)) {
        map.set(session.date, []);
      }
      map.get(session.date).push(session);
    });
    return map;
  }, [trainerSessions]);

  const trainerCalendarMonth = useMemo(() => {
    const base = parseDateString(today);
    const year = base.getFullYear();
    const month = base.getMonth();
    const start = new Date(year, month, 1);
    const startDay = start.getDay();
    const end = new Date(year, month + 1, 0);
    const daysInMonth = end.getDate();
    const cells = [];

    for (let index = 0; index < startDay; index += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = formatDate(new Date(year, month, day));
      cells.push({ day, date, items: trainerSessionsByDate.get(date) || [] });
    }

    return cells;
  }, [today, trainerSessionsByDate]);

  const trainerWeekSessions = useMemo(() => {
    const windowStart = parseDateString(today);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 6);

    return trainerSessions
      .map(normalizeTrainerSession)
      .filter((session) => {
        const date = parseDateString(session.date);
        return date >= windowStart && date <= windowEnd;
      })
      .sort(compareScheduleEntries);
  }, [today, trainerSessions]);

  const campsByDate = useMemo(() => {
    const map = new Map();
    camps.map(normalizeCampSession).forEach((camp) => {
      if (!map.has(camp.date)) {
        map.set(camp.date, []);
      }
      map.get(camp.date).push(camp);
    });
    return map;
  }, [camps]);

  const campCalendarMonth = useMemo(() => {
    const base = parseDateString(today);
    const year = base.getFullYear();
    const month = base.getMonth();
    const start = new Date(year, month, 1);
    const startDay = start.getDay();
    const end = new Date(year, month + 1, 0);
    const daysInMonth = end.getDate();
    const cells = [];

    for (let index = 0; index < startDay; index += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = formatDate(new Date(year, month, day));
      cells.push({ day, date, items: campsByDate.get(date) || [] });
    }

    return cells;
  }, [campsByDate, today]);

  const campWeekSessions = useMemo(() => {
    const windowStart = parseDateString(today);
    const windowEnd = new Date(windowStart);
    windowEnd.setDate(windowStart.getDate() + 6);

    return camps
      .map(normalizeCampSession)
      .filter((session) => {
        const date = parseDateString(session.date);
        return date >= windowStart && date <= windowEnd;
      })
      .sort(compareScheduleEntries);
  }, [camps, today]);

  const filteredEnrollments = useMemo(() => studentEnrollments
    .filter((entry) => {
      const matchesSearch = entry.studentName.toLowerCase().includes(studentSearch.trim().toLowerCase());
      const matchesCourse = courseFilter === 'all' || entry.course === courseFilter;
      const matchesDay = dayFilter === 'all' || entry.days.includes(dayFilter);
      return matchesSearch && matchesCourse && matchesDay;
    })
    .sort((a, b) => a.course.localeCompare(b.course) || a.studentName.localeCompare(b.studentName)), [studentEnrollments, studentSearch, courseFilter, dayFilter]);

  const studentEnrollmentCourseOptions = bookingCourseOptions;

  const courseCounts = useMemo(() => studentEnrollmentCourseOptions
    .map((course) => ({
      course,
      count: studentEnrollments.filter((entry) => entry.course === course).length,
    }))
    .filter((entry) => entry.count > 0), [studentEnrollments]);
  

  const dayCounts = useMemo(() => weekdayOptions
    .map(({ label }) => ({
      day: label,
      count: studentEnrollments.filter((entry) => entry.days.includes(label)).length,
    }))
    .filter((entry) => entry.count > 0), [studentEnrollments]);

  const visibleTabs = tabs
    .filter((tab) => tabsByRole[loginRole].includes(tab.id))
    .map((tab) => (
      loginRole === 'admin' && tab.id === 'trainerSchedule'
        ? { ...tab, label: 'Trainers' }
        : tab
    ));
  const activeTabLabel = visibleTabs.find((tab) => tab.id === activeTab)?.label || visibleTabs[0]?.label || 'Home';

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeTab
            brandName={brandName}
            calendarView={calendarView}
            setCalendarView={setCalendarView}
            homeCalendarMonthLabel={homeCalendarMonthLabel}
            goToPreviousHomeMonth={goToPreviousHomeMonth}
            goToCurrentHomeMonth={goToCurrentHomeMonth}
            goToNextHomeMonth={goToNextHomeMonth}
            calendarMonth={calendarMonth}
            weekBookings={weekBookings}
            handleBookingSelect={handleBookingSelect}
          />
        );
      case 'booking':
        return (
          <BookingTab
            today={today}
            bookingView={bookingView}
            setBookingView={setBookingView}
            bookings={bookings}
            bookingForm={bookingForm}
            setBookingForm={updateBookingForm}
            bookingAlert={bookingAlert}
            rooms={rooms}
            timeOptions={timeOptions}
            durations={durations}
            bookingCourseOptions={bookingCourseOptions}
            showCourseSelector={loginRole === 'admin'}
            handleBooking={handleBooking}
          />
        );
      case 'camps':
        return (
          <CampsTab
            campView={campView}
            setCampView={setCampView}
            campForm={campForm}
            setCampForm={setCampForm}
            campCourseOptions={campCourseOptions}
            trainers={trainers}
            rooms={rooms}
            timeOptions={timeOptions}
            durations={durations}
            today={today}
            handleCreateCamp={handleCreateCamp}
            campCalendarView={campCalendarView}
            setCampCalendarView={setCampCalendarView}
            campCalendarMonth={campCalendarMonth}
            campWeekSessions={campWeekSessions}
            handleBookingSelect={handleBookingSelect}
          />
        );
      case 'studentEnrollment':
        return (
          <StudentEnrollmentTab
            studentEnrollmentView={studentEnrollmentView}
            setStudentEnrollmentView={setStudentEnrollmentView}
            enrollmentForm={enrollmentForm}
            setEnrollmentForm={updateEnrollmentForm}
            today={today}
            studentTimeOptions={studentTimeOptions}
            weekdayOptions={weekdayOptions}
            handleEnrollmentDayToggle={handleEnrollmentDayToggle}
            handleConfirmEnrollment={handleConfirmEnrollment}
            schedulePreview={schedulePreview}
            handlePreviewSchedule={handlePreviewSchedule}
            filteredEnrollments={filteredEnrollments}
            studentSearch={studentSearch}
            setStudentSearch={setStudentSearch}
            courseFilter={courseFilter}
            setCourseFilter={setCourseFilter}
            dayFilter={dayFilter}
            setDayFilter={setDayFilter}
            courseCounts={courseCounts}
            dayCounts={dayCounts}
            selectedEnrollmentId={selectedEnrollmentId}
            setSelectedEnrollmentId={setSelectedEnrollmentId}
            selectedEnrollment={selectedEnrollment}
            handleUpdateEnrollment={handleUpdateEnrollment}
            handleDeleteEnrollment={handleDeleteEnrollment}
            formatDisplayDate={formatDisplayDate}
            courseOptions={studentEnrollmentCourseOptions}
          />
        );
      case 'trainerSchedule':
        return (
          <TrainerScheduleTab
            trainerScheduleView={trainerScheduleView}
            setTrainerScheduleView={setTrainerScheduleView}
            trainerCalendarView={trainerCalendarView}
            setTrainerCalendarView={setTrainerCalendarView}
            trainerLayoutClassName="trainer-layout trainer-layout--single"
            trainerForm={trainerForm}
            setTrainerForm={setTrainerForm}
            handleAddTrainer={handleAddTrainer}
            weekdayOptions={weekdayOptions}
            handleTrainerFormDayToggle={handleTrainerFormDayToggle}
            handleTrainerFormAvailabilityTimeChange={handleTrainerFormAvailabilityTimeChange}
            courseOptions={courseOptions}
            bookingCourseOptions={bookingCourseOptions}
            trainerTimeSlots={trainerTimeSlots}
            loginRole={loginRole}
            trainerSearch={trainerSearch}
            setTrainerSearch={setTrainerSearch}
            trainerBookingForm={trainerBookingForm}
            setTrainerBookingForm={(nextState) => {
              const trainerId = Number(nextState.trainerId);
              setTrainerBookingForm(nextState);
              setTrainerBookingPreview([]);
              if (!Number.isNaN(trainerId) && trainerId) {
                handleTrainerSelect(trainerId);
              }
            }}
            updateTrainerBookingForm={updateTrainerBookingForm}
            trainerBookingPreview={trainerBookingPreview}
            handlePreviewTrainerClass={handlePreviewTrainerClass}
            trainerAvailabilityExpanded={trainerAvailabilityExpanded}
            setTrainerAvailabilityExpanded={setTrainerAvailabilityExpanded}
            studentEnrollments={studentEnrollments}
            handleTrainerBookingStudentToggle={handleTrainerBookingStudentToggle}
            trainers={trainers}
            filteredTrainers={filteredTrainers}
            rooms={rooms}
            today={today}
            handleBookTrainerClass={handleBookTrainerClass}
            selectedTrainer={selectedTrainer}
            handleDeleteTrainer={handleDeleteTrainer}
            selectedTrainerId={selectedTrainerId}
            handleSelectedTrainerFieldChange={handleSelectedTrainerFieldChange}
            handleSelectedTrainerDayToggle={handleSelectedTrainerDayToggle}
            handleSelectedTrainerAvailabilityTimeChange={handleSelectedTrainerAvailabilityTimeChange}
            trainerCalendarMonth={trainerCalendarMonth}
            trainerWeekSessions={trainerWeekSessions}
            handleBookingSelect={handleTrainerSessionSelect}
            trainerSessions={trainerSessions}
            formatDisplayDate={formatDisplayDate}
            getWeekdayLabel={(date) => getWeekdayLabel(date, weekdayOptions)}
            formatAvailabilitySummary={formatAvailabilitySummary}
          />
        );
      case 'trainerAvailability':
        return (
          <TrainerAvailabilityTab
            trainer={selectedTrainer}
            trainerTimeSlots={trainerTimeSlots}
            weekdayOptions={weekdayOptions}
            handleSelectedTrainerFieldChange={handleSelectedTrainerFieldChange}
            handleSelectedTrainerDayToggle={handleSelectedTrainerDayToggle}
            handleSelectedTrainerAvailabilityTimeChange={handleSelectedTrainerAvailabilityTimeChange}
            handleSaveTrainerAvailability={handleSaveTrainerAvailability}
          />
        );
      case 'approvals':
        return (
          <ApprovalsTab
            approvalEmail={approvalEmail}
            pendingAccountRequests={pendingAccountRequests}
            handleApproveAccountRequest={handleApproveAccountRequest}
          />
        );
      case 'eduPartnersManagement':
        return (
          <EduPartnersTab
            eduPartners={approvedAccounts.filter((a) => a.role === 'eduPartners')}
            handleAddEduPartner={handleAddEduPartner}
            handleDeleteEduPartner={handleDeleteEduPartner}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            profile={profile}
            theme={theme}
            setTheme={setTheme}
            isLoggedIn={isLoggedIn}
            handleLogout={handleLogout}
            handleAvatarChange={handleAvatarChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      <div className="glow" aria-hidden />
      {isLoggedIn ? (
        <div className="layout">
          <aside className="sidebar">
            <div className="brand">
              <div className="orb">AC</div>
              <div>
                <p className="eyebrow">{brandName}</p>
              </div>
            </div>
            <nav className="tabs vertical" aria-label="Main navigation tabs">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={activeTab === tab.id ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === 'approvals' && pendingAccountRequests.length > 0 ? (
                    <span className="tab-badge">{pendingAccountRequests.length}</span>
                  ) : null}
                </button>
              ))}
            </nav>
          </aside>

          <div className="main-column">
            <header className="topbar">
              <div>
                <p className="eyebrow">{brandName}</p>
                <strong>{activeTabLabel} hub</strong>
              </div>
              <div className="auth">
                <span className="pill compact primary">{profile.name}</span>
                <span className="pill compact">{profile.role}</span>
              </div>
            </header>

            <main>{renderActiveTab()}</main>
          </div>
        </div>
      ) : (
        <LoginPage
          brandName={brandName}
          loginRole={loginRole}
          setLoginRole={setLoginRole}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          handleLogin={handleLogin}
          forgotPasswordOpen={forgotPasswordOpen}
          forgotPasswordEmail={forgotPasswordEmail}
          setForgotPasswordEmail={setForgotPasswordEmail}
          openForgotPassword={openForgotPassword}
          closeForgotPassword={closeForgotPassword}
          handleForgotPassword={handleForgotPassword}
          createAccountOpen={createAccountOpen}
          createAccountForm={createAccountForm}
          setCreateAccountForm={setCreateAccountForm}
          openCreateAccount={openCreateAccount}
          closeCreateAccount={closeCreateAccount}
          handleCreateAccount={handleCreateAccount}
          approvalEmail={approvalEmail}
        />
      )}

      <BookingModal
        selectedBooking={selectedBooking}
        handleClose={handleBookingModalClose}
        formatDisplayDate={formatDisplayDate}
        loginRole={loginRole}
        selectedTrainerId={selectedTrainerId}
        trainers={trainers}
        studentEnrollments={studentEnrollments}
        bookingCourseOptions={bookingCourseOptions}
        makeupDrafts={makeupDrafts}
        rooms={rooms}
        timeOptions={timeOptions}
        trainerTimeSlots={trainerTimeSlots}
        openMakeupDraft={openMakeupDraft}
        updateMakeupDraft={updateMakeupDraft}
        handleArrangeMakeupClass={handleArrangeMakeupClass}
        handleStudentAttendanceChange={handleStudentAttendanceChange}
        handleUpdateTrainerSession={handleUpdateTrainerSession}
        handleSaveClassroomBookingEdit={handleSaveClassroomBookingEdit}
        handleDeleteSelectedBooking={handleDeleteSelectedBooking}
        handlePushClassBack={handlePushClassBack}
      />

      {message && <div className="toast">{message}</div>}
    </div>
  );
}

export default App;
