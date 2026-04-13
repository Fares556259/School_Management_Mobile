import { Student, Grade, Payment, TimetableSlot, Notice } from '../types';

// Mock data for initial implementation
const MOCK_CHILDREN: Student[] = [
  { id: '1', name: 'Zayneb Selmi', class: '3ème Année B', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zayneb' },
  { id: '2', name: 'Youssef Selmi', class: '1ère Année A', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef' },
];

export const parentService = {
  fetchChildren: async (): Promise<Student[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return MOCK_CHILDREN;
  },
};

export const studentService = {
  fetchGrades: async (studentId: string): Promise<Grade[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [
      { id: '1', subject: 'Mathématiques', score: 18, total: 20, date: '2024-03-20' },
      { id: '2', subject: 'Français', score: 15, total: 20, date: '2024-03-22' },
      { id: '3', subject: 'Sciences', score: 12, total: 20, date: '2024-03-25' },
    ];
  },
  fetchPayments: async (studentId: string): Promise<Payment[]> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [
      { id: '1', month: 'Mars', amount: 250, status: 'PAID' },
      { id: '2', month: 'Avril', amount: 250, status: 'PENDING' },
    ];
  },
};
