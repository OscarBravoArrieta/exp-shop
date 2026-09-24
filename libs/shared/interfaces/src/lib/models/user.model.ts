export interface User {
  id: string;
  fullName: string;
  email: string;
  avatar?: string | null;
  roles: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
