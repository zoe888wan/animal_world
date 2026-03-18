# 数据库导入说明

## 方式一：双击运行
直接双击 `导入数据库.bat`，输入 MySQL root 密码后回车。

## 方式二：命令行
在项目根目录或 database 目录打开终端，执行：

```bash
mysql -u root -p < database/init-mysql.sql
```

若 `mysql` 不在 PATH 中，使用完整路径，例如：
```
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql" -u root -p < database/init-mysql.sql
```

## 后端连接配置
导入后会创建用户 `app`，密码 `app123`。后端默认连接：
- 地址：localhost:3306
- 数据库：animal_world
- 用户：app / app123

若使用 root，在 backend 目录创建 `.env`：
```
DATABASE_URL=mysql://root:你的密码@localhost:3306/animal_world
```
