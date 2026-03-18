请务必执行以下迁移，否则：
- 头像框无法佩戴（users 表缺少 avatar_frame_id 列）
- 商城仍显示旧名称（VIP 钻石框等），不会变成花草命名

在项目根目录或 database 所在目录执行：

  mysql -u app -papp123 animal_world < animal-world/database/apply-product-names-and-avatar-frame.sql

（如数据库名或账号不同，请替换 -u、-p 和库名。）

执行后请重启后端，刷新前端页面。
