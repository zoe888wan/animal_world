-- 修复重复商品：食物改一个为冻干，饰品删一个
USE animal_world;

-- 鲜肉罐头 改为 冻干鸡肉粒（换名换图，避免与营养主粮雷同）
UPDATE products SET name = '冻干鸡肉粒', description = '优质冻干，营养美味', image_url = '/products/pet-treat.png' WHERE name = '鲜肉罐头';

-- 删除重复饰品：小铃铛（保留可爱项圈和蝴蝶结）
DELETE FROM products WHERE name = '小铃铛';
