// 拼图变换工具函数

import { Piece } from '../types/game';

// 顺时针旋转90度
export function rotatePiece(piece: Piece): Piece {
  const { shape } = piece;
  const rows = shape.length;
  const cols = shape[0].length;
  
  // 创建新的旋转后的形状
  const rotatedShape: number[][] = [];
  for (let i = 0; i < cols; i++) {
    rotatedShape[i] = [];
    for (let j = 0; j < rows; j++) {
      rotatedShape[i][j] = shape[rows - 1 - j][i];
    }
  }
  
  return {
    ...piece,
    shape: rotatedShape
  };
}

// 水平镜像翻转
export function flipPiece(piece: Piece): Piece {
  const { shape } = piece;
  const rows = shape.length;
  const cols = shape[0].length;
  
  // 创建新的翻转后的形状
  const flippedShape: number[][] = [];
  for (let i = 0; i < rows; i++) {
    flippedShape[i] = [];
    for (let j = 0; j < cols; j++) {
      flippedShape[i][j] = shape[i][cols - 1 - j];
    }
  }
  
  return {
    ...piece,
    shape: flippedShape
  };
}

// 获取拼图的所有可能变换（用于AI选择最佳变换）
export function getAllPieceTransformations(piece: Piece): Piece[] {
  const transformations: Piece[] = [piece];
  
  // 添加旋转变换
  let rotated = piece;
  for (let i = 0; i < 3; i++) {
    rotated = rotatePiece(rotated);
    transformations.push(rotated);
  }
  
  // 添加翻转变换
  const flipped = flipPiece(piece);
  transformations.push(flipped);
  
  let flippedRotated = flipped;
  for (let i = 0; i < 3; i++) {
    flippedRotated = rotatePiece(flippedRotated);
    transformations.push(flippedRotated);
  }
  
  return transformations;
}

// 检查两个拼图形状是否相同
export function areShapesEqual(shape1: number[][], shape2: number[][]): boolean {
  if (shape1.length !== shape2.length) return false;
  
  for (let i = 0; i < shape1.length; i++) {
    if (shape1[i].length !== shape2[i].length) return false;
    for (let j = 0; j < shape1[i].length; j++) {
      if (shape1[i][j] !== shape2[i][j]) return false;
    }
  }
  
  return true;
}

// 去重变换（移除相同的形状）
export function getUniqueTransformations(piece: Piece): Piece[] {
  const allTransformations = getAllPieceTransformations(piece);
  const uniqueTransformations: Piece[] = [];
  
  for (const transformation of allTransformations) {
    const isDuplicate = uniqueTransformations.some(existing => 
      areShapesEqual(existing.shape, transformation.shape)
    );
    
    if (!isDuplicate) {
      uniqueTransformations.push(transformation);
    }
  }
  
  return uniqueTransformations;
}
