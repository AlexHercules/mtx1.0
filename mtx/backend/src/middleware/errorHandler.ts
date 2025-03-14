import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils';

// 自定义API错误类
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误处理中间件
export const errorHandler = 