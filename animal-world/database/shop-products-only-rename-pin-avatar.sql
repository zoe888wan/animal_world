-- 商城仅保留：改名卡、置顶卡、头像（含头像框等）
-- 执行：mysql -u app -papp123 animal_world < shop-products-only-rename-pin-avatar.sql

USE animal_world;

-- 删除除改名卡、置顶卡、头像外的所有商品
DELETE FROM products
WHERE NOT (
  type = 'rename_card'
  OR name = '置顶卡'
  OR type IN ('avatar', 'avatar_frame', 'avatar_frame_premium')
);
