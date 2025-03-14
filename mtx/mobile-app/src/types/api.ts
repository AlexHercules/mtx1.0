export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

export interface ProjectListResponse {
  projects: Project[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
} 