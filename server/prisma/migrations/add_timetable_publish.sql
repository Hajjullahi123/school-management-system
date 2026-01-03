-- Add isPublished column to Timetable table
ALTER TABLE Timetable ADD COLUMN isPublished BOOLEAN NOT NULL DEFAULT 0;
