export interface Student {
  id: string;
  name: string;
  class: string;
  avatarUrl?: string | null;
}

export interface Grade {
  id: string;
  subject: string;
  score: number;
  total: number;
  date: string;
}

export interface PaymentRecord {
  id: number;
  month: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Paid' | 'Partial' | 'Due' | 'Locked';
  isOverdue: boolean;
  dueDate?: string;
  overdueDays?: number;
}

export interface Session {
  id: number;
  subject: string;
  room: string;
  time: string;
  attendance: 'Pres' | 'Abs' | 'Rtr' | 'Exclu' | '-';
  iconName: string;
  color: string;
}

export interface TeacherNote {
  id: number;
  author: string;
  text: string;
  time: string;
}

export interface CourseFile {
  id: number;
  name: string;
  type: 'pdf' | 'book';
  sharedBy: string;
  size: string;
}

export interface HomeworkItem {
  id: number;
  title: string;
  dueDate: string;
  isUrgent: boolean;
  assignedDate: string;
}

export interface Exam {
  id: number;
  subject: string;
  time: string;
  description: string;
  iconName: string;
  accentColor: string;
  bgColor: string;
  tags: string[];
}

export interface Notification {
  id: number;
  type: string;
  studentName: string;
  studentAvatar?: string | null;
  title?: string;
  message: string;
  time: string;
  iconName: string;
  iconColor: string;
  isNew: boolean;
  createdAt: string;
}

export interface Announcement {
  id: number;
  title: string;
  date: string;
  category: string;
  image: string;
  images?: string[];
  excerpt: string;
  content: string;
  pdfUrl?: string;
}

export interface AttendanceHistoryDay {
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  sessions: {
    id: number;
    lessonId: number | null;
    subject: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
  }[];
  notes: {
    author: string;
    text: string;
  }[];
}

export interface StudentDayData {
  holidayName?: string;
  sessions: Session[];
  notes: TeacherNote[];
  files: CourseFile[];
  homeworkDue: HomeworkItem[];
  homeworkGiven: HomeworkItem[];
  exams: Exam[];
}
