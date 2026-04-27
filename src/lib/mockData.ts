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
  {
    id: 'user-student-2',
    email: 'priya@aceclub.in',
    full_name: 'Priya Patel',
    role: 'student',
    created_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 'user-student-3',
    email: 'arjun@aceclub.in',
    full_name: 'Arjun Mehta',
    role: 'student',
    created_at: '2025-02-10T00:00:00Z',
  },
];

// ============================================
// Mock Course
// ============================================
const MOCK_COURSES: Course[] = [
  {
    id: 'course-1',
    name: 'GMAT Focus Edition — Ace Batch 2025',
    description: 'Comprehensive GMAT prep course covering Quant, Verbal, and Data Insights with structured sessions and practice materials.',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
  },
];

// ============================================
// Mock Sessions
// ============================================
const MOCK_SESSIONS: Session[] = [
  {
    id: 'session-1',
    course_id: 'course-1',
    title: 'Foundations of Arithmetic & Number Properties',
    session_number: 1,
    session_date: '2025-03-01T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-2',
    course_id: 'course-1',
    title: 'Algebra & Equations Mastery',
    session_number: 2,
    session_date: '2025-03-08T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-3',
    course_id: 'course-1',
    title: 'Geometry & Coordinate Geometry',
    session_number: 3,
    session_date: '2025-03-15T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-4',
    course_id: 'course-1',
    title: 'Word Problems & Rate/Work',
    session_number: 4,
    session_date: '2025-03-22T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-5',
    course_id: 'course-1',
    title: 'Data Sufficiency Strategies',
    session_number: 5,
    session_date: '2025-03-29T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-6',
    course_id: 'course-1',
    title: 'Critical Reasoning Fundamentals',
    session_number: 6,
    session_date: '2025-04-05T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-7',
    course_id: 'course-1',
    title: 'Reading Comprehension Techniques',
    session_number: 7,
    session_date: '2025-04-30T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'session-8',
    course_id: 'course-1',
    title: 'Data Insights — Multi-Source Reasoning',
    session_number: 8,
    session_date: '2026-05-10T10:00:00Z',
    is_published: true,
    created_at: '2025-02-15T00:00:00Z',
  },
];

// ============================================
// Mock Materials
// ============================================
const MOCK_MATERIALS: Material[] = [
  // Session 1 materials
  {
    id: 'mat-1-1',
    session_id: 'session-1',
    type: 'pre_read',
    title: 'Number Properties — Concept Overview',
    notion_url: 'https://www.notion.so/aceclub/number-properties-overview',
    available_from: '2025-02-27T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-1-2',
    session_id: 'session-1',
    type: 'class_material',
    title: 'Session 1 — Class Slides',
    file_url: '/sample/session1-slides.pdf',
    available_from: '2025-03-01T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-1-3',
    session_id: 'session-1',
    type: 'worksheet',
    title: 'Arithmetic Practice Set',
    file_url: '/sample/session1-worksheet.pdf',
    available_from: '2025-03-01T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-1-4',
    session_id: 'session-1',
    type: 'video',
    title: 'Number Properties Deep Dive',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    available_from: '2025-03-01T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 2 materials
  {
    id: 'mat-2-1',
    session_id: 'session-2',
    type: 'pre_read',
    title: 'Algebra Refresher — Key Concepts',
    notion_url: 'https://www.notion.so/aceclub/algebra-refresher',
    available_from: '2025-03-05T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-2-2',
    session_id: 'session-2',
    type: 'class_material',
    title: 'Session 2 — Class Slides',
    file_url: '/sample/session2-slides.pdf',
    available_from: '2025-03-08T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-2-3',
    session_id: 'session-2',
    type: 'worksheet',
    title: 'Algebra Problem Set',
    file_url: '/sample/session2-worksheet.pdf',
    available_from: '2025-03-08T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 3 materials
  {
    id: 'mat-3-1',
    session_id: 'session-3',
    type: 'pre_read',
    title: 'Geometry Essentials',
    notion_url: 'https://www.notion.so/aceclub/geometry-essentials',
    available_from: '2025-03-12T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-3-2',
    session_id: 'session-3',
    type: 'class_material',
    title: 'Session 3 — Class Slides',
    file_url: '/sample/session3-slides.pdf',
    available_from: '2025-03-15T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-3-3',
    session_id: 'session-3',
    type: 'worksheet',
    title: 'Geometry Practice Set',
    file_url: '/sample/session3-worksheet.pdf',
    available_from: '2025-03-15T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-3-4',
    session_id: 'session-3',
    type: 'video',
    title: 'Coordinate Geometry Walkthrough',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    available_from: '2025-03-15T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 4 materials
  {
    id: 'mat-4-1',
    session_id: 'session-4',
    type: 'pre_read',
    title: 'Word Problems Strategies',
    notion_url: 'https://www.notion.so/aceclub/word-problems',
    available_from: '2025-03-19T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-4-2',
    session_id: 'session-4',
    type: 'class_material',
    title: 'Session 4 — Class Slides',
    file_url: '/sample/session4-slides.pdf',
    available_from: '2025-03-22T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-4-3',
    session_id: 'session-4',
    type: 'worksheet',
    title: 'Rate & Work Problem Set',
    file_url: '/sample/session4-worksheet.pdf',
    available_from: '2025-03-22T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 5 materials
  {
    id: 'mat-5-1',
    session_id: 'session-5',
    type: 'pre_read',
    title: 'Data Sufficiency — What to Expect',
    notion_url: 'https://www.notion.so/aceclub/data-sufficiency-intro',
    available_from: '2025-03-26T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-5-2',
    session_id: 'session-5',
    type: 'class_material',
    title: 'Session 5 — Class Slides',
    file_url: '/sample/session5-slides.pdf',
    available_from: '2025-03-29T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-5-3',
    session_id: 'session-5',
    type: 'worksheet',
    title: 'DS Practice Set',
    file_url: '/sample/session5-worksheet.pdf',
    available_from: '2025-03-29T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-5-4',
    session_id: 'session-5',
    type: 'video',
    title: 'Data Sufficiency Masterclass',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    available_from: '2025-03-29T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 6 materials
  {
    id: 'mat-6-1',
    session_id: 'session-6',
    type: 'pre_read',
    title: 'Critical Reasoning — Argument Structure',
    notion_url: 'https://www.notion.so/aceclub/cr-argument-structure',
    available_from: '2025-04-02T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-6-2',
    session_id: 'session-6',
    type: 'class_material',
    title: 'Session 6 — Class Slides',
    file_url: '/sample/session6-slides.pdf',
    available_from: '2025-04-05T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-6-3',
    session_id: 'session-6',
    type: 'worksheet',
    title: 'CR Practice Set',
    file_url: '/sample/session6-worksheet.pdf',
    available_from: '2025-04-05T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 7 materials
  {
    id: 'mat-7-1',
    session_id: 'session-7',
    type: 'pre_read',
    title: 'RC Reading Strategies',
    notion_url: 'https://www.notion.so/aceclub/rc-strategies',
    available_from: '2025-04-27T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-7-2',
    session_id: 'session-7',
    type: 'class_material',
    title: 'Session 7 — Class Slides',
    file_url: '/sample/session7-slides.pdf',
    available_from: '2025-04-30T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-7-3',
    session_id: 'session-7',
    type: 'worksheet',
    title: 'RC Passage Set',
    file_url: '/sample/session7-worksheet.pdf',
    available_from: '2025-04-30T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },

  // Session 8 materials (future - locked)
  {
    id: 'mat-8-1',
    session_id: 'session-8',
    type: 'pre_read',
    title: 'Multi-Source Reasoning Overview',
    notion_url: 'https://www.notion.so/aceclub/msr-overview',
    available_from: '2026-05-07T00:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-8-2',
    session_id: 'session-8',
    type: 'class_material',
    title: 'Session 8 — Class Slides',
    file_url: '/sample/session8-slides.pdf',
    available_from: '2026-05-10T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
  {
    id: 'mat-8-3',
    session_id: 'session-8',
    type: 'worksheet',
    title: 'DI Practice Set',
    file_url: '/sample/session8-worksheet.pdf',
    available_from: '2026-05-10T12:00:00Z',
    created_at: '2025-02-15T00:00:00Z',
  },
];

// ============================================
// Mock Enrollments
// ============================================
const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: 'enroll-1',
    user_id: 'user-student-1',
    course_id: 'course-1',
    enrolled_at: '2025-01-15T00:00:00Z',
  },
  {
    id: 'enroll-2',
    user_id: 'user-student-2',
    course_id: 'course-1',
    enrolled_at: '2025-02-01T00:00:00Z',
  },
  {
    id: 'enroll-3',
    user_id: 'user-student-3',
    course_id: 'course-1',
    enrolled_at: '2025-02-10T00:00:00Z',
  },
];

// ============================================
// In-memory store (simulates DB)
// ============================================
let users = [...MOCK_USERS];
let courses = [...MOCK_COURSES];
let sessions = [...MOCK_SESSIONS];
let materials = [...MOCK_MATERIALS];
let enrollments = [...MOCK_ENROLLMENTS];

// ============================================
// Auth Functions
// ============================================
export function mockLogin(email: string): User | null {
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  return user || null;
}

export function getUser(id: string): User | null {
  return users.find(u => u.id === id) || null;
}

// ============================================
// Course Functions
// ============================================
export function getCourses(): Course[] {
  return courses;
}

export function getCourse(id: string): Course | null {
  return courses.find(c => c.id === id) || null;
}

export function createCourse(data: Omit<Course, 'id' | 'created_at'>): Course {
  const course: Course = {
    ...data,
    id: `course-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  courses.push(course);
  return course;
}

export function updateCourse(id: string, data: Partial<Course>): Course | null {
  const idx = courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  courses[idx] = { ...courses[idx], ...data };
  return courses[idx];
}

export function deleteCourse(id: string): boolean {
  const idx = courses.findIndex(c => c.id === id);
  if (idx === -1) return false;
  courses.splice(idx, 1);
  return true;
}

// ============================================
// Session Functions
// ============================================
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

export function createSession(data: Omit<Session, 'id' | 'created_at'>): Session {
  const session: Session = {
    ...data,
    id: `session-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  sessions.push(session);
  return session;
}

export function updateSession(id: string, data: Partial<Session>): Session | null {
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return null;
  sessions[idx] = { ...sessions[idx], ...data };
  return sessions[idx];
}

export function deleteSession(id: string): boolean {
  const idx = sessions.findIndex(s => s.id === id);
  if (idx === -1) return false;
  sessions.splice(idx, 1);
  // Also delete associated materials
  materials = materials.filter(m => m.session_id !== id);
  return true;
}

// ============================================
// Material Functions
// ============================================
export function getMaterials(sessionId: string): Material[] {
  return materials.filter(m => m.session_id === sessionId);
}

export function getMaterial(id: string): Material | null {
  return materials.find(m => m.id === id) || null;
}

export function createMaterial(data: Omit<Material, 'id' | 'created_at'>): Material {
  const material: Material = {
    ...data,
    id: `mat-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  materials.push(material);
  return material;
}

export function updateMaterial(id: string, data: Partial<Material>): Material | null {
  const idx = materials.findIndex(m => m.id === id);
  if (idx === -1) return null;
  materials[idx] = { ...materials[idx], ...data };
  return materials[idx];
}

export function deleteMaterial(id: string): boolean {
  const idx = materials.findIndex(m => m.id === id);
  if (idx === -1) return false;
  materials.splice(idx, 1);
  return true;
}

// ============================================
// Enrollment Functions
// ============================================
export function getEnrollments(userId?: string, courseId?: string): Enrollment[] {
  let result = enrollments;
  if (userId) result = result.filter(e => e.user_id === userId);
  if (courseId) result = result.filter(e => e.course_id === courseId);
  return result;
}

export function enrollUser(userId: string, courseId: string): Enrollment {
  const existing = enrollments.find(e => e.user_id === userId && e.course_id === courseId);
  if (existing) return existing;
  
  const enrollment: Enrollment = {
    id: `enroll-${Date.now()}`,
    user_id: userId,
    course_id: courseId,
    enrolled_at: new Date().toISOString(),
  };
  enrollments.push(enrollment);
  return enrollment;
}

export function unenrollUser(userId: string, courseId: string): boolean {
  const idx = enrollments.findIndex(e => e.user_id === userId && e.course_id === courseId);
  if (idx === -1) return false;
  enrollments.splice(idx, 1);
  return true;
}

export function isEnrolled(userId: string, courseId: string): boolean {
  return enrollments.some(e => e.user_id === userId && e.course_id === courseId);
}

// ============================================
// User Management Functions
// ============================================
export function getUsers(role?: string): User[] {
  if (role) return users.filter(u => u.role === role);
  return users;
}

export function createUser(data: Omit<User, 'id' | 'created_at'>): User {
  const user: User = {
    ...data,
    id: `user-${Date.now()}`,
    created_at: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

export function updateUser(id: string, data: Partial<User>): User | null {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data };
  return users[idx];
}

export function deleteUser(id: string): boolean {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return false;
  users.splice(idx, 1);
  // Also remove enrollments
  enrollments = enrollments.filter(e => e.user_id !== id);
  return true;
}

// ============================================
// Utility: Check material availability
// ============================================
export function isMaterialAvailable(material: Material): boolean {
  return new Date() >= new Date(material.available_from);
}

export function getSessionStatus(session: Session): 'available' | 'locked' | 'upcoming' {
  const now = new Date();
  const sessionDate = new Date(session.session_date);
  const sessionMaterials = materials.filter(m => m.session_id === session.id);
  
  // If any material is available, session is available
  const hasAvailable = sessionMaterials.some(m => isMaterialAvailable(m));
  
  if (hasAvailable) return 'available';
  
  // If session is within 7 days, it's upcoming
  const daysUntil = (sessionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil <= 7 && daysUntil > 0) return 'upcoming';
  
  return 'locked';
}
