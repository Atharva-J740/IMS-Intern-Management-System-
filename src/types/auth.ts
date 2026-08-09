export type Role = 'INTERN' | 'ADMIN' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}
