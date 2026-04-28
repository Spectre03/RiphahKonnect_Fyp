/**
 * Faculty → departments mapping for Riphah International University.
 * COORDINATION users have their `department` field set to a faculty name.
 * This file is the single source of truth for which departments each faculty manages.
 */

const FACULTIES = {
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

const ALL_DEPARTMENTS = Object.values(FACULTIES).flat();
const FACULTY_NAMES = Object.keys(FACULTIES);

/** Returns the faculty name for a given department, or null if not found. */
function getFacultyForDepartment(department) {
  for (const [faculty, depts] of Object.entries(FACULTIES)) {
    if (depts.includes(department)) return faculty;
  }
  return null;
}

/** Returns the list of departments for a given faculty. */
function getDepartmentsForFaculty(faculty) {
  return FACULTIES[faculty] || [];
}

/**
 * Checks whether a COORDINATION user (identified by their faculty stored in `department`)
 * is allowed to manage the given target department.
 * UNIVERSITY_ADMIN / SYSTEM_ADMIN bypass this check at the controller level.
 */
function coordinatorCanManage(coordinatorFaculty, targetDepartment) {
  const depts = FACULTIES[coordinatorFaculty] || [];
  return depts.includes(targetDepartment);
}

module.exports = {
  FACULTIES,
  ALL_DEPARTMENTS,
  FACULTY_NAMES,
  getFacultyForDepartment,
  getDepartmentsForFaculty,
  coordinatorCanManage,
};
