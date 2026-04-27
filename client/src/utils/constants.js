export const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Faculty → departments mapping — mirrors server/src/utils/faculties.js
 * COORDINATION users have their department field set to a faculty name.
 */
export const FACULTIES = {
  'Faculty of Computing': [
    'Computer Science',
    'Software Engineering',
    'Cyber Security',
    'Artificial Intelligence',
    'Data Science',
    'Information Technology',
  ],
  'Faculty of Engineering': [
    'Electrical Engineering',
    'Electronics Engineering',
    'Civil Engineering',
    'Mechanical Engineering',
    'Biomedical Engineering',
  ],
  'Faculty of Management Sciences': [
    'Business Administration',
    'Accounting & Finance',
    'Project Management',
  ],
  'Faculty of Media Sciences': [
    'Media Sciences',
    'Mass Communication',
    'Journalism & Media',
  ],
  'Faculty of Health Sciences': [
    'Pharmacy',
    'Nutrition & Dietetics',
    'Public Health',
  ],
  'Faculty of Social Sciences': [
    'Psychology',
    'Law',
    'Islamic Studies',
    'English Literature',
  ],
};

export const FACULTY_NAMES = Object.keys(FACULTIES);

/** Flat list of all departments across all faculties */
export const DEPARTMENTS = Object.values(FACULTIES).flat();

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

/**
 * Returns the departments a user is allowed to pick from.
 * COORDINATION users are scoped to their own faculty.
 * Everyone else sees all departments.
 */
export function getDepartmentsForUser(user) {
  if (user?.role === 'COORDINATION' && user?.department && FACULTIES[user.department]) {
    return FACULTIES[user.department];
  }
  return DEPARTMENTS;
}
