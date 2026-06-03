CREATE TABLE IF NOT EXISTS approved_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'trainer', 'eduPartners') NOT NULL,
  status ENUM('approved') NOT NULL DEFAULT 'approved',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_account_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'trainer', 'eduPartners') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainer_availabilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  day_label VARCHAR(12) NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  to_time VARCHAR(20) NOT NULL DEFAULT '',
  CONSTRAINT fk_trainer_availability_trainer
    FOREIGN KEY (trainer_id) REFERENCES trainers(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(120) NOT NULL,
  username VARCHAR(120) NOT NULL,
  password VARCHAR(255) NOT NULL,
  course VARCHAR(120) NOT NULL,
  start_date DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  weeks INT NOT NULL DEFAULT 12,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_enrollment_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  day_label VARCHAR(12) NOT NULL,
  CONSTRAINT fk_student_day_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classroom_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booker_name VARCHAR(120) NOT NULL DEFAULT '',
  room VARCHAR(80) NOT NULL,
  date_value DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  owner VARCHAR(120) NOT NULL,
  course VARCHAR(120) NULL,
  purpose VARCHAR(255) NULL,
  color VARCHAR(32) NOT NULL DEFAULT 'primary',
  weeks INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainer_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  trainer_name VARCHAR(120) NOT NULL,
  course VARCHAR(120) NOT NULL,
  date_value DATE NOT NULL,
  room VARCHAR(80) NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL DEFAULT '',
  session_type VARCHAR(40) NOT NULL DEFAULT 'trainer-class',
  parent_session_id INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainer_session_students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_session_id INT NOT NULL,
  student_enrollment_id INT NOT NULL,
  attendance_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  CONSTRAINT fk_session_student_session
    FOREIGN KEY (trainer_session_id) REFERENCES trainer_sessions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_session_student_enrollment
    FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS camps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  trainer_id INT NOT NULL,
  trainer_name VARCHAR(120) NOT NULL,
  course VARCHAR(120) NOT NULL,
  date_value DATE NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  room VARCHAR(80) NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollment_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  entry_key VARCHAR(120) NOT NULL,
  day_label VARCHAR(12) NOT NULL,
  date_value DATE NOT NULL,
  display_date VARCHAR(40) NOT NULL,
  start_time VARCHAR(20) NOT NULL,
  end_time VARCHAR(20) NOT NULL,
  is_no_class TINYINT(1) NOT NULL DEFAULT 0,
  holiday_title VARCHAR(255) NULL,
  status_label VARCHAR(80) NULL,
  notes VARCHAR(255) NULL,
  CONSTRAINT fk_schedule_enrollment
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS school_calendar_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(160) NOT NULL,
  date_value DATE NOT NULL,
  type_label VARCHAR(80) NOT NULL,
  status_label VARCHAR(80) NOT NULL,
  notes VARCHAR(255) NULL,
  color VARCHAR(32) NOT NULL DEFAULT 'warning',
  start_time VARCHAR(20) NOT NULL DEFAULT '00:00',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS edu_partners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  organisation VARCHAR(160) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
