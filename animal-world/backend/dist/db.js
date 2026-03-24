/**
 * 数据库连接池
 * 功能：统一管理 MySQL 连接，供各路由模块复用
 */
import mysql from 'mysql2/promise';
/** 从环境变量读取连接串，默认本地 animal_world 库 */
const url = process.env.DATABASE_URL || 'mysql://app:app123@localhost:3306/animal_world';
/** 连接池实例：限制 10 个连接，UTF8MB4 编码 */
export const pool = mysql.createPool({
    uri: url,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
});
