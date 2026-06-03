import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('requires login before showing tabs and reveals them after login', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /welcome!/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/admin/i)).toBeChecked();
  expect(screen.getByLabelText(/trainer/i)).not.toBeChecked();
  expect(screen.queryByRole('button', { name: /home/i })).not.toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /booking/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /camps/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /student enrollment/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^trainers$/i })).toBeInTheDocument();
  expect(screen.getByText(/alex rivers/i)).toBeInTheDocument();
});

test('home calendar month navigation is available for admin, trainer, and edu partners', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByText(/april 2026/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /previous month/i }));
  expect(screen.getByText(/march 2026/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^profile$/i }));
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));

  await userEvent.click(screen.getByLabelText(/trainer/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'noah.bennett@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByText(/april 2026/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /next month/i }));
  expect(screen.getByText(/may 2026/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^profile$/i }));
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));

  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  await userEvent.type(screen.getByLabelText(/full name/i), 'Mira Chen');
  await userEvent.type(screen.getByRole('dialog', { name: /create account/i }).querySelector('input[type="email"]'), 'mira.chen@example.com');
  await userEvent.click(screen.getByRole('radio', { name: /edu partners/i, checked: false }));
  await userEvent.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'edupartner1');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'edupartner1');
  await userEvent.click(screen.getByRole('button', { name: /request approval/i }));

  await userEvent.click(screen.getByLabelText(/admin/i));
  await userEvent.clear(screen.getByLabelText(/email address/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.clear(screen.getByLabelText(/password/i));
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^approvals$/i }));
  await userEvent.click(screen.getByRole('button', { name: /approve request/i }));
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));

  await userEvent.click(screen.getByLabelText(/edu partners/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'mira.chen@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'edupartner1');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByText(/april 2026/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /next month/i }));
  expect(screen.getByText(/may 2026/i)).toBeInTheDocument();
});

test('home calendar shows public holidays together with classes', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByText(/good friday/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /previous month/i }));
  expect(screen.getByText(/hari raya puasa/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  expect(screen.getByText(/school closed/i)).toBeInTheDocument();
});

test('allows the user to request a password reset link from login', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));

  expect(screen.getByRole('dialog', { name: /forgot password/i })).toBeInTheDocument();
  expect(screen.getByDisplayValue('alex.rivers@example.com')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));

  expect(screen.queryByRole('dialog', { name: /forgot password/i })).not.toBeInTheDocument();
  expect(screen.getByText(/password reset link sent to alex\.rivers@example\.com\./i)).toBeInTheDocument();
});

test('new account requests stay pending until admin approval, then can log in', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: /create account/i }));

  expect(screen.getByRole('dialog', { name: /create account/i })).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/full name/i), 'Taylor Ng');
  await userEvent.type(screen.getByRole('dialog', { name: /create account/i }).querySelector('input[type="email"]'), 'taylor.ng@example.com');
  await userEvent.click(screen.getByRole('radio', { name: /trainer/i, checked: false }));
  await userEvent.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'securepass1');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'securepass1');
  await userEvent.click(screen.getByRole('button', { name: /request approval/i }));

  expect(screen.queryByRole('dialog', { name: /create account/i })).not.toBeInTheDocument();
  expect(screen.getByText(/approval request sent to kumar\.devadharshini@gmail\.com\./i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email address/i)).toHaveValue('taylor.ng@example.com');
  expect(screen.getByLabelText(/trainer/i)).toBeChecked();

  await userEvent.type(screen.getByLabelText(/password/i), 'securepass1');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByText(/your account request is still pending approval/i)).toBeInTheDocument();

  await userEvent.click(screen.getByLabelText(/admin/i));
  await userEvent.clear(screen.getByLabelText(/email address/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.clear(screen.getByLabelText(/password/i));
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^approvals$/i }));
  await userEvent.click(screen.getByRole('button', { name: /approve request/i }));

  expect(screen.getByText(/approval email sent to taylor\.ng@example\.com/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  await userEvent.click(screen.getByLabelText(/trainer/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'taylor.ng@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'securepass1');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByRole('button', { name: /^home$/i })).toBeInTheDocument();
});

test('whitelisted test accounts can create accounts without approval', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  await userEvent.type(screen.getByLabelText(/full name/i), 'Deva Admin');
  await userEvent.type(screen.getByRole('dialog', { name: /create account/i }).querySelector('input[type="email"]'), 'justdeva2010@gmail.com');
  await userEvent.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'adminpass1');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'adminpass1');
  await userEvent.click(screen.getByRole('button', { name: /request approval/i }));

  expect(screen.getByText(/can log in immediately\. approval is bypassed for this test account\./i)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/password/i), 'adminpass1');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  expect(screen.getByRole('button', { name: /^home$/i })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  await userEvent.type(screen.getByLabelText(/full name/i), 'Kumar Trainer');
  await userEvent.type(screen.getByRole('dialog', { name: /create account/i }).querySelector('input[type="email"]'), 'kumar.devadharshini@gmail.com');
  await userEvent.click(screen.getByRole('radio', { name: /trainer/i, checked: false }));
  await userEvent.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'trainerpass1');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'trainerpass1');
  await userEvent.click(screen.getByRole('button', { name: /request approval/i }));

  expect(screen.getByText(/can log in immediately\. approval is bypassed for this test account\./i)).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/password/i), 'trainerpass1');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  expect(screen.getByRole('button', { name: /availability/i })).toBeInTheDocument();
});

test('whitelisted admin test account can log in directly without prior approval', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'justdeva2010@gmail.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'devaTest123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByRole('button', { name: /^home$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^approvals$/i })).toBeInTheDocument();
  expect(screen.getByText(/deva admin/i)).toBeInTheDocument();
});

test('trainer login shows home, trainer schedule, availability, and profile tabs', async () => {
  render(<App />);

  await userEvent.click(screen.getByLabelText(/trainer/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'noah.bennett@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByRole('button', { name: /^home$/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^booking$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /student enrollment/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /trainer schedule/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /availability/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^profile$/i })).toBeInTheDocument();
  expect(screen.getByText(/^trainer$/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /trainer schedule/i }));

  expect(screen.getByRole('heading', { name: /trainer schedule calendar/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /weekly view/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /monthly view/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /add trainer/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /book class for trainer/i })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  await userEvent.click(screen.getByRole('button', { name: /priya shah 02:00 pm/i }));

  expect(screen.getByRole('dialog', { name: /lyra/i })).toBeInTheDocument();
  expect(screen.getByText(/trainer class/i)).toBeInTheDocument();
  expect(screen.getByText(/problem-solving intensive/i)).toBeInTheDocument();
});

test('login page includes edu partners and the role only gets home and booking tabs', async () => {
  render(<App />);

  expect(screen.getByLabelText(/edu partners/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
  await userEvent.type(screen.getByLabelText(/full name/i), 'Mira Chen');
  await userEvent.type(screen.getByRole('dialog', { name: /create account/i }).querySelector('input[type="email"]'), 'mira.chen@example.com');
  await userEvent.click(screen.getByRole('radio', { name: /edu partners/i, checked: false }));
  await userEvent.type(screen.getByLabelText(/^password$/i, { selector: 'input' }), 'edupartner1');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'edupartner1');
  await userEvent.click(screen.getByRole('button', { name: /request approval/i }));

  expect(screen.getByText(/approval request/i)).toBeInTheDocument();

  await userEvent.click(screen.getByLabelText(/admin/i));
  await userEvent.clear(screen.getByLabelText(/email address/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.clear(screen.getByLabelText(/password/i));
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^approvals$/i }));
  await userEvent.click(screen.getByRole('button', { name: /approve request/i }));
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));

  await userEvent.click(screen.getByLabelText(/edu partners/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'mira.chen@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'edupartner1');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  expect(screen.getByRole('button', { name: /^home$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^booking$/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^camps$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /school calendar/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /student enrollment/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^trainers$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^profile$/i })).not.toBeInTheDocument();
  expect(screen.getByText(/edu partners/i)).toBeInTheDocument();
});

test('trainer can update availability from a dedicated tab', async () => {
  render(<App />);

  await userEvent.click(screen.getByLabelText(/trainer/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'noah.bennett@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  await userEvent.click(screen.getByRole('button', { name: /availability/i }));

  expect(screen.getByRole('heading', { name: /update your availability/i })).toBeInTheDocument();
  expect(screen.getByText(/^nbennett$/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /^wed$/i }));
  await userEvent.selectOptions(screen.getByLabelText(/wed time/i), '11:00 AM');
  await userEvent.click(screen.getByRole('button', { name: /save availability/i }));

  expect(screen.getByText(/availability updated\. admins can now see your latest schedule\./i)).toBeInTheDocument();
});

test('opens booking details in a popup from the calendar', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  await userEvent.click(screen.getByRole('button', { name: /orion 09:00/i }));

  expect(screen.getByRole('dialog', { name: /orion/i })).toBeInTheDocument();
  expect(screen.getByText(/design guild/i)).toBeInTheDocument();
  expect(screen.getByText(/brand strategy session/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /close/i }));

  expect(screen.queryByRole('dialog', { name: /orion/i })).not.toBeInTheDocument();
});

test('prevents overlapping classroom bookings for the same room and time range', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^booking$/i }));

  await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }));
  expect(screen.getByText(/booking secured\./i)).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText(/start time/i), '09:30');
  await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

  expect(screen.getByText(/this classroom is already booked for that time\. choose another slot\./i)).toBeInTheDocument();
});

test('admin booking shows a courses dropdown while trainer booking does not', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^booking$/i }));

  expect(screen.getByLabelText(/courses/i)).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText(/courses/i), 'Trial Class');
  expect(screen.getByLabelText(/courses/i)).toHaveValue('Trial Class');

  await userEvent.click(screen.getByRole('button', { name: /logout/i }));
  await userEvent.click(screen.getByLabelText(/trainer/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'noah.bennett@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^booking$/i }));

  expect(screen.queryByLabelText(/courses/i)).not.toBeInTheDocument();
});

test('prevents classroom bookings from clashing with trainer class bookings', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^booking$/i }));

  await userEvent.clear(screen.getByLabelText(/date/i));
  await userEvent.type(screen.getByLabelText(/date/i), '2026-04-21');
  await userEvent.selectOptions(screen.getByLabelText(/start time/i), '14:00');
  await userEvent.selectOptions(screen.getByLabelText(/classroom/i), 'Lyra');
  await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }));

  expect(screen.getByText(/this classroom is already booked for that time\. choose another slot\./i)).toBeInTheDocument();
});

test('home shows both trainer booked classes and classroom bookings', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));

  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));

  expect(screen.getByText(/trainer class/i)).toBeInTheDocument();
  expect(screen.getByText(/classroom booking/i)).toBeInTheDocument();
  expect(screen.getByText(/priya shah/i)).toBeInTheDocument();
  expect(screen.getByText(/stem outreach/i)).toBeInTheDocument();
});

test('admin can book a camp and it appears in the camps calendar and home calendar', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^camps$/i }));

  expect(screen.getByRole('heading', { name: /book camp/i })).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/camp name/i), 'Holiday STEM Camp');
  await userEvent.selectOptions(screen.getByLabelText(/course/i), 'Minecraft');
  expect(screen.getByLabelText(/course/i)).toHaveValue('Minecraft');
  await userEvent.selectOptions(screen.getByLabelText(/^trainer$/i), 'Lena Cruz');
  await userEvent.clear(screen.getByLabelText(/^date$/i));
  await userEvent.type(screen.getByLabelText(/^date$/i), '2026-04-22');
  await userEvent.selectOptions(screen.getByLabelText(/start time/i), '09:00');
  await userEvent.selectOptions(screen.getByLabelText(/duration/i), '120');
  await userEvent.selectOptions(screen.getByLabelText(/classroom/i), 'Vega');
  await userEvent.type(screen.getByLabelText(/notes/i), 'Ages 10 to 12');
  await userEvent.click(screen.getByRole('button', { name: /book camp/i }));

  expect(screen.getByText(/1 holiday stem camp camp session booked\./i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /camp calendar/i })).toHaveClass('tab active');

  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  expect(screen.getByText(/holiday stem camp/i)).toBeInTheDocument();
  expect(screen.getByText(/^camp$/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /09:00 - 11:00/i }));
  expect(screen.getByText(/^minecraft$/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));

  await userEvent.click(screen.getByRole('button', { name: /^home$/i }));
  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));

  expect(screen.getByText(/holiday stem camp/i)).toBeInTheDocument();
  expect(screen.getByText(/^minecraft$/i)).toBeInTheDocument();
  expect(screen.getByText(/^camp$/i)).toBeInTheDocument();
});

test('admin can book a camp weekly for multiple weeks', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^camps$/i }));

  await userEvent.type(screen.getByLabelText(/camp name/i), 'Weekly AI Camp');
  await userEvent.selectOptions(screen.getByLabelText(/course/i), 'AI');
  await userEvent.selectOptions(screen.getByLabelText(/^trainer$/i), 'Lena Cruz');
  await userEvent.clear(screen.getByLabelText(/^date$/i));
  await userEvent.type(screen.getByLabelText(/^date$/i), '2026-04-22');
  await userEvent.selectOptions(screen.getByLabelText(/booking pattern/i), 'weekly');
  await userEvent.clear(screen.getByLabelText(/number of weeks/i));
  await userEvent.type(screen.getByLabelText(/number of weeks/i), '2');
  await userEvent.selectOptions(screen.getByLabelText(/start time/i), '09:00');
  await userEvent.selectOptions(screen.getByLabelText(/classroom/i), 'Vega');
  await userEvent.click(screen.getByRole('button', { name: /book camp/i }));

  expect(screen.getByText(/2 weekly ai camp camp sessions booked\./i)).toBeInTheDocument();
});

test('admin can book a camp for monday to friday of the selected week', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^camps$/i }));

  await userEvent.type(screen.getByLabelText(/camp name/i), 'Weeklong Canva Camp');
  await userEvent.selectOptions(screen.getByLabelText(/course/i), 'Canva');
  await userEvent.selectOptions(screen.getByLabelText(/^trainer$/i), 'Lena Cruz');
  await userEvent.clear(screen.getByLabelText(/^date$/i));
  await userEvent.type(screen.getByLabelText(/^date$/i), '2026-04-22');
  await userEvent.selectOptions(screen.getByLabelText(/booking pattern/i), 'weekdays');
  await userEvent.selectOptions(screen.getByLabelText(/start time/i), '09:00');
  await userEvent.selectOptions(screen.getByLabelText(/classroom/i), 'Vega');
  await userEvent.click(screen.getByRole('button', { name: /book camp/i }));

  expect(screen.getByText(/5 weeklong canva camp camp sessions booked\./i)).toBeInTheDocument();
});

test('prevents camps from clashing with existing room bookings', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^camps$/i }));
  await userEvent.click(screen.getByRole('button', { name: /book camp/i }));

  await userEvent.type(screen.getByLabelText(/camp name/i), 'Math Sprint Camp');
  await userEvent.selectOptions(screen.getByLabelText(/^trainer$/i), 'Lena Cruz');
  await userEvent.clear(screen.getByLabelText(/^date$/i));
  await userEvent.type(screen.getByLabelText(/^date$/i), '2026-04-21');
  await userEvent.selectOptions(screen.getByLabelText(/start time/i), '14:00');
  await userEvent.selectOptions(screen.getByLabelText(/classroom/i), 'Lyra');
  await userEvent.click(screen.getByRole('button', { name: /book camp/i }));

  expect(screen.getByText(/this classroom is already booked on 04\/21\/2026 for that camp time/i)).toBeInTheDocument();
});

test('builds and confirms a student enrollment schedule', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /student enrollment/i }));

  expect(screen.getByRole('heading', { name: /enroll students/i })).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/student name/i), 'Jordan Miles');
  await userEvent.type(screen.getByLabelText(/username/i), 'jmiles-new');
  await userEvent.type(screen.getByLabelText(/password/i), 'securepass1');
  await userEvent.selectOptions(screen.getByLabelText(/course/i), 'Novice 1');
  await userEvent.clear(screen.getByLabelText(/start time/i));
  await userEvent.type(screen.getByLabelText(/start time/i), '10:00 AM');
  await userEvent.clear(screen.getByLabelText(/end time/i));
  await userEvent.type(screen.getByLabelText(/end time/i), '11:00 AM');
  await userEvent.clear(screen.getByLabelText(/number of weeks/i));
  await userEvent.type(screen.getByLabelText(/number of weeks/i), '13');
  await userEvent.click(screen.getByRole('button', { name: /^mon$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^wed$/i }));
  await userEvent.click(screen.getByRole('button', { name: /preview schedule/i }));

  expect(screen.getByText(/26 classes scheduled, 1 holiday no-class notice/i)).toBeInTheDocument();
  expect(screen.getByText(/hari raya haji/i)).toBeInTheDocument();
  expect(screen.getByText(/no class/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /confirm enrollment/i }));

  expect(screen.getByText(/jordan miles enrollment confirmed/i)).toBeInTheDocument();
  expect(screen.getByText(/jordan miles/i)).toBeInTheDocument();
  expect(screen.getByText(/jmiles-new/i)).toBeInTheDocument();
  expect(screen.getByText(/novice 1/i)).toBeInTheDocument();
});

test('shows enrolled students grouped by class and day with schedule details on selection', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /student enrollment/i }));
  await userEvent.click(screen.getByRole('button', { name: /enrolled students/i }));

  expect(screen.getByRole('heading', { name: /enrolled students/i })).toBeInTheDocument();
  expect(screen.getByRole('list', { name: /enrolled student roster/i })).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText(/filter by class/i), 'Apprentice 2');
  expect(screen.getByRole('button', { name: /avery cole acole apprentice 2 tue, thu 02:00 pm - 03:00 pm/i })).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText(/filter by day/i), 'Tue');
  await userEvent.type(screen.getByLabelText(/search student/i), 'Avery');

  await userEvent.click(screen.getByRole('button', { name: /avery cole acole apprentice 2 tue, thu 02:00 pm - 03:00 pm/i }));

  expect(screen.getByText(/avery cole is scheduled for apprentice 2/i)).toBeInTheDocument();
  expect(screen.getByText(/student name/i)).toBeInTheDocument();
  expect(screen.getByText(/username/i)).toBeInTheDocument();
  expect(screen.getByText(/password/i)).toBeInTheDocument();
  expect(screen.getByText(/^acole$/i)).toBeInTheDocument();
  expect(screen.getByText(/^math2026$/i)).toBeInTheDocument();
  expect(screen.getByText(/start date/i)).toBeInTheDocument();
  expect(screen.getByText(/02:00 pm - 03:00 pm/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /delete student/i }));

  expect(screen.getByText(/avery cole was removed from enrolled students/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /avery cole acole apprentice 2 tue, thu 02:00 pm - 03:00 pm/i })).not.toBeInTheDocument();
});

test('admin can edit an enrolled student from the enrolled students view', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /student enrollment/i }));

  await userEvent.type(screen.getByLabelText(/student name/i), 'Taylor Ng');
  await userEvent.type(screen.getByLabelText(/username/i), 'tng-student');
  await userEvent.type(screen.getByLabelText(/^password$/i), 'studentpass1');
  await userEvent.selectOptions(screen.getByLabelText(/course/i), 'Novice 1');
  await userEvent.clear(screen.getByLabelText(/start time/i));
  await userEvent.type(screen.getByLabelText(/start time/i), '10:00 AM');
  await userEvent.clear(screen.getByLabelText(/end time/i));
  await userEvent.type(screen.getByLabelText(/end time/i), '11:00 AM');
  await userEvent.clear(screen.getByLabelText(/number of weeks/i));
  await userEvent.type(screen.getByLabelText(/number of weeks/i), '6');
  await userEvent.click(screen.getByRole('button', { name: /^mon$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^wed$/i }));
  await userEvent.click(screen.getByRole('button', { name: /confirm enrollment/i }));

  expect(screen.getByText(/taylor ng enrollment confirmed/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /edit student/i }));
  await userEvent.clear(screen.getByLabelText(/student name/i));
  await userEvent.type(screen.getByLabelText(/student name/i), 'Taylor Ng Updated');
  await userEvent.clear(screen.getByLabelText(/username/i));
  await userEvent.type(screen.getByLabelText(/username/i), 'tng-updated');
  await userEvent.clear(screen.getByLabelText(/^password$/i));
  await userEvent.type(screen.getByLabelText(/^password$/i), 'studentpass2');
  await userEvent.selectOptions(screen.getByLabelText(/^class$/i), 'Apprentice 2');
  await userEvent.clear(screen.getByLabelText(/start date/i));
  await userEvent.type(screen.getByLabelText(/start date/i), '2026-04-21');
  await userEvent.clear(screen.getByLabelText(/start time/i));
  await userEvent.type(screen.getByLabelText(/start time/i), '02:00 PM');
  await userEvent.clear(screen.getByLabelText(/end time/i));
  await userEvent.type(screen.getByLabelText(/end time/i), '03:00 PM');
  await userEvent.clear(screen.getByLabelText(/number of weeks/i));
  await userEvent.type(screen.getByLabelText(/number of weeks/i), '8');
  await userEvent.click(screen.getByRole('button', { name: /^mon$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^wed$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^tue$/i }));
  await userEvent.click(screen.getByRole('button', { name: /^thu$/i }));
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  expect(screen.getByText(/taylor ng updated enrollment updated/i)).toBeInTheDocument();
  expect(screen.getByText(/^taylor ng updated$/i)).toBeInTheDocument();
  expect(screen.getByText(/^tng-updated$/i)).toBeInTheDocument();
  expect(screen.getByText(/^studentpass2$/i)).toBeInTheDocument();
  expect(screen.getByText(/^apprentice 2$/i)).toBeInTheDocument();
  expect(screen.getByText(/^tue, thu$/i)).toBeInTheDocument();
  expect(screen.getByText(/02:00 pm - 03:00 pm/i)).toBeInTheDocument();
  expect(screen.getByText(/^8$/i)).toBeInTheDocument();
});

test('adds a trainer and books a class from the trainer schedule tab', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^trainers$/i }));

  expect(screen.getByRole('heading', { name: /trainer management and booking/i })).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /add trainer/i }));
  expect(screen.getByRole('button', { name: /add trainer/i })).toHaveClass('tab active');

  await userEvent.type(screen.getByLabelText(/trainer name/i), 'Taylor Ng');
  await userEvent.type(screen.getByLabelText(/trainer username/i), 'tng');
  await userEvent.type(screen.getByLabelText(/email/i), 'taylor@example.com');
  await userEvent.type(screen.getByLabelText(/^password$/i), 'taylorPass1');
  await userEvent.click(screen.getByRole('button', { name: /^mon$/i }));
  await userEvent.selectOptions(screen.getByLabelText(/mon time/i), '09:00 AM');
  await userEvent.click(screen.getByRole('button', { name: /^fri$/i }));
  await userEvent.selectOptions(screen.getByLabelText(/fri time/i), '09:00 AM');
  await userEvent.click(screen.getByRole('button', { name: /add trainer$/i }));

  expect(screen.getByText(/taylor ng added to trainers/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /book class for trainer/i })).toHaveClass('tab active');

  await userEvent.selectOptions(screen.getByLabelText(/^trainer$/i), 'Taylor Ng');
  await userEvent.selectOptions(screen.getByLabelText(/class$/i), 'Novice 1');
  expect(screen.getByLabelText(/assign jordan miles/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/assign avery cole/i)).not.toBeInTheDocument();
  await userEvent.click(screen.getByLabelText(/assign jordan miles/i));
  await userEvent.clear(screen.getByLabelText(/class date/i));
  await userEvent.type(screen.getByLabelText(/class date/i), '2026-04-24');
  await userEvent.click(screen.getByRole('button', { name: /selected trainer availability/i }));
  expect(screen.getByText(/update availability notes/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /preview schedule/i }));

  expect(screen.getByText(/12 classes scheduled, 1 holiday no-class notice/i)).toBeInTheDocument();
  expect(screen.getByText(/labour day/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /book class for trainer$/i }));

  expect(screen.getByText(/12 trainer classes booked for taylor ng/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /trainer schedule calendar/i })).toHaveClass('tab active');
  expect(screen.getByText(/novice 1/i)).toBeInTheDocument();
  expect(screen.getByText(/taylor ng 09:00 am/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /taylor ng 09:00 am/i }));
  expect(screen.getByText(/jordan miles/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
});

test('trainer can mark a student missed and admin can arrange a make-up class', async () => {
  render(<App />);

  await userEvent.click(screen.getByLabelText(/trainer/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'noah.bennett@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /trainer schedule/i }));
  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  await userEvent.click(screen.getByRole('button', { name: /noah bennett 10:00 am/i }));

  expect(screen.getByText(/jordan miles/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /missed/i }));
  expect(screen.getByText(/^missed$/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  await userEvent.click(screen.getByRole('button', { name: /^profile$/i }));
  await userEvent.click(screen.getByRole('button', { name: /logout/i }));

  await userEvent.click(screen.getByLabelText(/admin/i));
  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^trainers$/i }));
  await userEvent.click(screen.getByRole('button', { name: /trainer schedule calendar/i }));
  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  await userEvent.click(screen.getByRole('button', { name: /noah bennett 10:00 am/i }));

  await userEvent.click(screen.getByRole('button', { name: /arrange make-up class/i }));
  await userEvent.clear(screen.getByLabelText(/make-up date/i));
  await userEvent.type(screen.getByLabelText(/make-up date/i), '2026-04-22');
  await userEvent.selectOptions(screen.getByLabelText(/^room$/i), 'Vega');
  await userEvent.click(screen.getByRole('button', { name: /confirm make-up/i }));

  expect(screen.getByText(/make-up class arranged for jordan miles/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(screen.getByText(/make-up class for jordan miles/i)).toBeInTheDocument();
});

test('admin can edit a trainer class from the calendar popup', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^trainers$/i }));
  await userEvent.click(screen.getByRole('button', { name: /trainer schedule calendar/i }));
  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  await userEvent.click(screen.getByRole('button', { name: /noah bennett 10:00 am/i }));

  await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
  expect(screen.getByRole('heading', { name: /edit class/i })).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText(/^trainer$/i), 'Lena Cruz');
  await userEvent.clear(screen.getByLabelText(/class date/i));
  await userEvent.type(screen.getByLabelText(/class date/i), '2026-04-25');
  await userEvent.selectOptions(screen.getByLabelText(/^start time$/i), '02:30 PM');
  await userEvent.selectOptions(screen.getByLabelText(/^end time$/i), '03:30 PM');
  await userEvent.selectOptions(screen.getByLabelText(/^room$/i), 'Vega');
  await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

  expect(screen.getByText(/class updated for lena cruz/i)).toBeInTheDocument();
  expect(screen.getByText(/^lena cruz$/i)).toBeInTheDocument();
  expect(screen.getByText(/02:30 pm - 03:30 pm/i)).toBeInTheDocument();
});

test('admin can delete a trainer class from the calendar popup', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^trainers$/i }));
  await userEvent.click(screen.getByRole('button', { name: /trainer schedule calendar/i }));
  await userEvent.click(screen.getByRole('button', { name: /weekly view/i }));
  await userEvent.click(screen.getByRole('button', { name: /noah bennett 10:00 am/i }));

  await userEvent.click(screen.getByRole('button', { name: /delete booking/i }));

  expect(screen.getByText(/trainer class deleted/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /noah bennett 10:00 am/i })).not.toBeInTheDocument();
});

test('admin can search trainers and view username and password details', async () => {
  render(<App />);

  await userEvent.type(screen.getByLabelText(/email address/i), 'alex.rivers@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /login/i }));
  await userEvent.click(screen.getByRole('button', { name: /^trainers$/i }));

  expect(screen.getByRole('button', { name: /^trainers$/i })).toHaveClass('tab active');
  expect(screen.getByRole('heading', { name: /^trainers$/i })).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/search trainer/i), 'Priya');
  await userEvent.click(screen.getByRole('button', { name: /priya shah/i }));

  expect(screen.getByText(/viewing priya shah's trainer account details/i)).toBeInTheDocument();
  expect(screen.getByText(/^pshah$/i)).toBeInTheDocument();
  expect(screen.getByText(/^priya@akocentric\.edu$/i)).toBeInTheDocument();
  expect(screen.getByText(/^priyaMath456$/i)).toBeInTheDocument();
  expect(screen.queryByText(/course focus/i)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /delete trainer/i }));

  expect(screen.getByText(/priya shah deleted from trainers/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /priya shah/i })).not.toBeInTheDocument();
});
