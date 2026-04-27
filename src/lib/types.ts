/* ============================================
   ACE CLUB LMS — Type Definitions
   ============================================ */

export type UserRole = 'admin' | 'student';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  course_id: string;
  title: string;
  session_number: number;
  session_date: string;
  is_published: boolean;
  created_at: string;
  materials?: Material[];
}

export type MaterialType = 'pre_read' | 'class_material' | 'worksheet' | 'video';

export interface Material {
  id: string;
  session_id: string;
  type: MaterialType;
  title: string;
  file_url?: string;
  notion_url?: string;
  video_url?: string;
  available_from: string;
  created_at: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}

// UI State types
export interface SessionWithStatus extends Session {
  status: 'available' | 'locked' | 'upcoming';
  materialsStatus: {
    pre_read: MaterialStatus;
    class_material: MaterialStatus;
    worksheet: MaterialStatus;
    video: MaterialStatus;
  };
}

export interface MaterialStatus {
  available: boolean;
  material?: Material;
  available_from?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
