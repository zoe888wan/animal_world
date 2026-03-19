-- 统一补齐并区分商品展示图（使用 SVG 资源）
-- 执行：mysql -u app -papp123 animal_world < database/update-product-images-v3.sql

USE animal_world;

-- 基础卡片/徽章
UPDATE products SET image_url='/products/boost-card.svg' WHERE name='热度加速卡';
UPDATE products SET image_url='/products/pin-card.svg' WHERE name='置顶卡';
UPDATE products SET image_url='/products/star-badge.svg' WHERE name='小星星徽章';
UPDATE products SET image_url='/products/rename-card.svg' WHERE name='改名卡';
UPDATE products SET image_url='/products/credit-restore.svg' WHERE type='credit_restore' OR name='信誉分恢复';

-- 饰品（区分蝴蝶结发夹 vs 蝴蝶结）
UPDATE products SET image_url='/products/pet-collar.svg' WHERE name='雏菊项圈';
UPDATE products SET image_url='/products/pet-bow-clip.svg' WHERE name='蝴蝶结发夹';
UPDATE products SET image_url='/products/pet-bow.svg' WHERE name='蝴蝶结';
UPDATE products SET image_url='/products/pet-bell.svg' WHERE name='小铃铛';

-- 食物
UPDATE products SET image_url='/products/pet-snack.svg' WHERE name='美味零食包';
UPDATE products SET image_url='/products/pet-treat.svg' WHERE name='冻干鸡肉粒';
UPDATE products SET image_url='/products/pet-can.svg' WHERE name='鲜肉罐头';
UPDATE products SET image_url='/products/pet-chew.svg' WHERE name='磨牙棒';

-- 药品
UPDATE products SET image_url='/products/medicine-cold.svg' WHERE name='感冒药';
UPDATE products SET image_url='/products/medicine-stomach.svg' WHERE name='肠胃药';

-- 头像框
UPDATE products SET image_url='/products/avatar-frame.svg' WHERE name='明星头像框';
UPDATE products SET image_url='/products/frame-gold.svg' WHERE name='紫薇花';
UPDATE products SET image_url='/products/frame-crystal.svg' WHERE name='缠绕花藤';
UPDATE products SET image_url='/products/frame-diamond.svg' WHERE name='烂漫樱';

-- 头像商品（之前脚本插入时 image_url 为 NULL）
UPDATE products SET image_url='/products/avatar-dragon.svg' WHERE name='龙系头像';
UPDATE products SET image_url='/products/avatar-unicorn.svg' WHERE name='独角兽头像';
UPDATE products SET image_url='/products/avatar-crown.svg' WHERE name='皇冠头像';
UPDATE products SET image_url='/products/avatar-butterfly.svg' WHERE name='蝴蝶头像';

