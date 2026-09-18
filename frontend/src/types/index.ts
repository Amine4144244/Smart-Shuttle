export type Role = 'SUPER_ADMIN' | 'ORGANIZER' | 'DRIVER' | 'EMPLOYEE' | 'PARTICIPANT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: Role;
  status: string;
  createdAt: string;
}
