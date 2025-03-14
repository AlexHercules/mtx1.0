import mongoose, { Schema, Document } from 'mongoose';
import { User } from './User';

export interface ProjectDocument extends Document {
  title: string;
  description: string;
  shortDescription: string;
  category: string;
  tags: string[];
  creator: mongoose.Types.ObjectId | User;
  // ... 其他字段
  
  // 方法
  getProgressPercentage(): number;
  getRemainingDays(): number;
  isEnded(): boolean;
}

const projectSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true // 添加索引
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 200
  },
  category: {
    type: String,
    required: true,
    enum: ['科技', '设计', '影视', '游戏', '音乐', '出版', '公益', '其他'],
    index: true // 添加索引
  },
  tags: [{
    type: String,
    trim: true
  }],
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // 添加索引
  },
  // ... 其他字段
  
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'funded', 'failed', 'canceled'],
    default: 'draft',
    index: true // 添加索引
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // 添加索引
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 添加复合索引
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ tags: 1, status: 1 });
projectSchema.index({ currentFunding: -1, status: 1 });

// ... 方法实现

const Project = mongoose.model<ProjectDocument>('Project', projectSchema);
export default Project; 