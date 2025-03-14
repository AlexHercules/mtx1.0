export interface User {
  _id: string;
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
  avatar?: string;
  bio?: string;
  role: 'user' | 'creator' | 'admin';
  status: 'active' | 'suspended' | 'deactivated';
  supportedProjects: string[];
  createdProjects: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  tags: string[];
  creator: string | User;
  images: Array<{url: string, caption?: string}>;
  video?: {url: string, thumbnail?: string};
  fundingGoal: number;
  currentFunding: number;
  backers: Array<{
    user: string | User;
    amount: number;
    rewardTier?: string;
    anonymous: boolean;
    createdAt: Date;
  }>;
  rewardTiers: Array<{
    _id: string;
    title: string;
    description: string;
    amount: number;
    items: string[];
    maxBackers?: number;
    currentBackers: number;
    estimatedDelivery?: Date;
  }>;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'pending' | 'active' | 'funded' | 'failed' | 'canceled';
  createdAt: Date;
  updatedAt: Date;
} 