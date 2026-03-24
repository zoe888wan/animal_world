-- 清理重复/冗余商品，每类相似商品不超过2个
-- 执行：mysql -u app -papp123 animal_world -e "source c:/path/to/cleanup-shop-products.sql"

USE animal_world;

-- 删除重复头像框：璀璨金框与 VIP 钻石框设计雷同，保留璀璨金框；明星头像框与璀璨金框均为金色系，保留明星头像框+水晶紫框（金/紫各一）
DELETE FROM products WHERE name IN ('VIP 钻石框', '璀璨金框');

-- 删除冗余：冻干鸡肉粒（与美味零食包功效相似，食物类保留2个）
DELETE FROM products WHERE name = '冻干鸡肉粒';

-- 删除冗余：小铃铛（饰品类保留项圈+蝴蝶结2个）
DELETE FROM products WHERE name = '小铃铛';
