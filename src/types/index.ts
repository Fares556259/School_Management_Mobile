export interface Student {
  id: string;
  name: string;
  class: string;
  avatarUrl?: string;
}

export interface Grade {
  id: string;
  subject: string;
  score: number;
  total: number;
  date: string;
}

export interface Payment {
  id: string;
  month: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
}

export interface TimetableSlot {
  day: string;
  time: string;
  subject: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
}
