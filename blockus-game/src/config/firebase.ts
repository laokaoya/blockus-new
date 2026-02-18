import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase配置 - 使用免费计划
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "blockus-game-demo.firebaseapp.com",
  databaseURL: "https://blockus-game-demo-default-rtdb.firebaseio.com",
  projectId: "blockus-game-demo",
  storageBucket: "blockus-game-demo.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};

// 初始化Firebase
const app = initializeApp(firebaseConfig);

// 获取Realtime Database实例
export const database = getDatabase(app);

export default app;
