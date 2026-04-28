/* ============================================
   ACE CLUB LMS — Mock Data
   
   This layer simulates a Supabase backend.
   When you're ready to integrate Supabase,
   replace these functions with real API calls.
   ============================================ */

import { User, Course, Session, Material, Enrollment } from './types';

// ============================================
// Mock Users
// ============================================
const MOCK_USERS: User[] = [
  {
    id: 'user-admin-1',
    email: 'admin@aceclub.in',
    full_name: 'Ace Admin',
    role: 'admin',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'user-student-1',
    email: 'student@aceclub.in',
    full_name: 'Rahul Sharma',
    role: 'student',
    created_at: '2025-01-15T00:00:00Z',
  },
];

// ============================================
// Mock Course
// ============================================
const MOCK_COURSES: Course[] = [
  {
    id: 'course-1',
    name: 'GMAT Focus Intensive — Batch 2025',
    description: 'An elite 8-week structured program for GMAT Focus Edition aspirants.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

// ============================================
// Mock Sessions (8-Week Curriculum)
// ============================================
const MOCK_SESSIONS: Session[] = [
  // Week 1
  { id: 'session-1', course_id: 'course-1', title: 'Orientation', session_number: 1, session_date: '2025-05-03T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-2', course_id: 'course-1', title: 'Quants: Fractions + Percentages + Ratios & Mixtures + SI/CI', session_number: 2, session_date: '2025-05-04T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 2
  { id: 'session-3', course_id: 'course-1', title: 'Verbal: RC + CR (Strengthen the Conclusion)', session_number: 3, session_date: '2025-05-10T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-4', course_id: 'course-1', title: 'Quants: Pipes & Cisterns + Work & Time + Speed, Time, Distance', session_number: 4, session_date: '2025-05-11T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 3
  { id: 'session-5', course_id: 'course-1', title: 'Verbal: RC + CR (Find the Assumption)', session_number: 5, session_date: '2025-05-17T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-6', course_id: 'course-1', title: 'Quants: Probability + Permutation & Combination', session_number: 6, session_date: '2025-05-18T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 4
  { id: 'session-7', course_id: 'course-1', title: 'Verbal: RC + CR (Evaluate the Conclusion + Boldface Qs)', session_number: 7, session_date: '2025-05-24T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-8', course_id: 'course-1', title: 'Quants: Polynomials + Functions + Equations + Inequalities', session_number: 8, session_date: '2025-05-25T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 5
  { id: 'session-9', course_id: 'course-1', title: 'Verbal: RC + CR (Paradox Qs + Draw Inferences)', session_number: 9, session_date: '2025-05-31T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-10', course_id: 'course-1', title: 'Quants: Number Properties + Multiples & Factors + Power & Roots + Exponents', session_number: 10, session_date: '2025-06-01T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 6
  { id: 'session-11', course_id: 'course-1', title: 'Verbal: RC + CR (Weaken Argument + Complete the Argument)', session_number: 11, session_date: '2025-06-07T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-12', course_id: 'course-1', title: 'Quants: Averages + Descriptive Stats + Set Theory + Progressions', session_number: 12, session_date: '2025-06-08T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 7
  { id: 'session-13', course_id: 'course-1', title: 'Data Insights: Data Sufficiency', session_number: 13, session_date: '2025-06-14T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-14', course_id: 'course-1', title: 'Data Insights: Graphical Interpretation + Table Analysis', session_number: 14, session_date: '2025-06-15T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  // Week 8
  { id: 'session-15', course_id: 'course-1', title: 'Data Insights: Multi-Source Reasoning', session_number: 15, session_date: '2025-06-21T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
  { id: 'session-16', course_id: 'course-1', title: 'Data Insights: Two-Part Analysis', session_number: 16, session_date: '2025-06-22T10:00:00Z', is_published: true, created_at: '2025-01-01T00:00:00Z' },
];

// ============================================
// Mock Materials
// ============================================
const MOCK_MATERIALS: Material[] = [
  // Permutation Session Pre-read (The REAL link)
  {
    id: 'mat-perm-1',
    session_id: 'session-6',
    type: 'pre_read',
    title: 'Permutation Concept Overview',
    notion_url: 'https://www.notion.so/Permutation-303e9744253f803fa3a5d0e35e868490?source=copy_link',
    available_from: '2025-01-01T00:00:00Z', // Available now for testing
    created_at: '2025-01-01T00:00:00Z',
  },
  // Sample slides for Session 6
  {
    id: 'mat-perm-2',
    session_id: 'session-6',
    type: 'class_material',
    title: 'Permutation & Combination - Class Slides',
    file_url: '/sample/session6-slides.pdf',
    available_from: '2025-05-18T12:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
  }
];

// ============================================
// Mock Enrollments
// ============================================
const MOCK_ENROLLMENTS: Enrollment[] = [
  { id: 'enroll-1', user_id: 'user-student-1', course_id: 'course-1', enrolled_at: '2025-01-15T00:00:00Z' },
];

// ============================================
// In-memory store (simulates DB)
// ============================================
let users = [...MOCK_USERS];
let courses = [...MOCK_COURSES];
let sessions = [...MOCK_SESSIONS];
let materials = [...MOCK_MATERIALS];
let enrollments = [...MOCK_ENROLLMENTS];

// --- API Functions (Simplified for brevity) ---

export function mockLogin(email: string): User | null {
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUser(id: string): User | null { return users.find(u => u.id === id) || null; }
export function getCourses(): Course[] { return courses; }
export function getCourse(id: string): Course | null { return courses.find(c => c.id === id) || null; }

export function createCourse(data: any): Course {
  const course = { ...data, id: `course-${Date.now()}`, created_at: new Date().toISOString() };
  courses.push(course);
  return course;
}

export function updateCourse(id: string, data: any): Course | null {
  const idx = courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  courses[idx] = { ...courses[idx], ...data };
  return courses[idx];
}

export function deleteCourse(id: string): boolean {
  courses = courses.filter(c => c.id !== id);
  // Optional: also cascade delete sessions for this course
  return true;
}


export function getSessions(courseId?: string): Session[] {
  let result = courseId ? sessions.filter(s => s.course_id === courseId) : sessions;
  return result.sort((a, b) => a.session_number - b.session_number);
}

export function getSession(id: string): Session | null {
  const session = sessions.find(s => s.id === id) || null;
  if (session) {
    session.materials = materials.filter(m => m.session_id === id);
  }
  return session;
}

export function createSession(data: any): Session {
  const session = { ...data, id: `session-${Date.now()}`, created_at: new Date().toISOString() };
  sessions.push(session);
  return session;
}

export function updateSession(id: string, data: any): Session | null {
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...data };
  return sessions[idx];
}

export function deleteSession(id: string): boolean {
  sessions = sessions.filter(s => s.id !== id);
  materials = materials.filter(m => m.session_id !== id);
  return true;
}

export function getMaterials(sessionId: string): Material[] { return materials.filter(m => m.session_id === sessionId); }
export function getMaterial(id: string): Material | null { return materials.find(m => m.id === id) || null; }

export function createMaterial(data: any): Material {
  const material = { ...data, id: `mat-${Date.now()}`, created_at: new Date().toISOString() };
  materials.push(material);
  return material;
}

export function updateMaterial(id: string, data: any): Material | null {
  const idx = materials.findIndex(m => m.id === id);
  if (idx === -1) return null;
  materials[idx] = { ...materials[idx], ...data };
  return materials[idx];
}

export function deleteMaterial(id: string): boolean {
  materials = materials.filter(m => m.id !== id);
  return true;
}


export function getEnrollments(userId?: string, courseId?: string): Enrollment[] {
  let result = enrollments;
  if (userId) result = result.filter(e => e.user_id === userId);
  if (courseId) result = result.filter(e => e.course_id === courseId);
  return result;
}

export function enrollUser(userId: string, courseId: string): Enrollment {
  const existing = enrollments.find(e => e.user_id === userId && e.course_id === courseId);
  if (existing) return existing;
  const enrollment = { id: `enroll-${Date.now()}`, user_id: userId, course_id: courseId, enrolled_at: new Date().toISOString() };
  enrollments.push(enrollment);
  return enrollment;
}

export function unenrollUser(userId: string, courseId: string): boolean {
  enrollments = enrollments.filter(e => !(e.user_id === userId && e.course_id === courseId));
  return true;
}

export function getUsers(role?: string): User[] {
  if (role) return users.filter(u => u.role === role);
  return users;
}

export function createUser(data: any): User {
  const user = { ...data, id: `user-${Date.now()}`, created_at: new Date().toISOString() };
  users.push(user);
  return user;
}

export function updateUser(id: string, data: any): User | null {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  return users[idx];
}

export function deleteUser(id: string): boolean {
  users = users.filter(u => u.id !== id);
  enrollments = enrollments.filter(e => e.user_id !== id);
  return true;
}

export function isMaterialAvailable(material: Material): boolean {

  return new Date() >= new Date(material.available_from);
}

export function getSessionStatus(session: Session): 'available' | 'locked' | 'upcoming' {
  const now = new Date();
  const sessionDate = new Date(session.session_date);
  const sessionMaterials = materials.filter(m => m.session_id === session.id);
  const hasAvailable = sessionMaterials.some(m => isMaterialAvailable(m));
  if (hasAvailable) return 'available';
  const daysUntil = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil <= 7 && daysUntil > 0) return 'upcoming';
  return 'locked';
}
