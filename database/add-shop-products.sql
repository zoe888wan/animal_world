-- 新增商品：宠物配饰、投喂粮、精致头像框（带展示图）
-- 执行：mysql -u app -papp123 animal_world < add-shop-products.sql

USE animal_world;

-- 宠物配饰（花草·简约风格）
INSERT INTO products (name, description, price, image_url, type, popularity_boost) VALUES
('雏菊项圈', '小雏菊点缀，清新可爱', 15, '/products/pet-collar.png', 'pet_accessory', 5),
('蝴蝶结发夹', '软萌蝴蝶结，萌宠必备', 12, '/products/pet-bow.png', 'pet_accessory', 5),
('小铃铛', '轻轻叮当，出行安心', 8, '/products/pet-bell.png', 'pet_accessory', 3)
;

-- 宠物投喂粮
INSERT INTO products (name, description, price, image_url, type, popularity_boost) VALUES
('美味零食包', '小零食大满足，简约健康', 18, '/products/pet-snack.png', 'pet_food', 8),
('冻干鸡肉粒', '优质蛋白，宠物最爱', 22, '/products/pet-treat.png', 'pet_food', 8)
;

-- 头像框（花草命名：紫薇花、缠绕花藤、烂漫樱）
INSERT INTO products (name, description, price, image_url, type, popularity_boost) VALUES
('紫薇花', '紫薇花色，温柔浪漫', 80, '/products/frame-gold.png', 'avatar_frame_premium', 50),
('缠绕花藤', '缠绕花藤，自然清新', 70, '/products/frame-crystal.png', 'avatar_frame_premium', 50),
('烂漫樱', '樱花烂漫，春日气息', 120, '/products/frame-diamond.png', 'avatar_frame_premium', 50)
;
