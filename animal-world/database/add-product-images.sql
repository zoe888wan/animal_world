-- 为已有商品添加展示图（适用于已执行过 seed 的数据库）
-- 执行：mysql -u app -papp123 animal_world < add-product-images.sql

USE animal_world;

UPDATE products SET image_url = '/products/avatar-frame.png' WHERE type = 'avatar_frame' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/products/boost-card.png' WHERE name = '热度加速卡' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/products/pin-card.png' WHERE name = '置顶卡' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/products/star-badge.png' WHERE type = 'badge' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/products/rename-card.png' WHERE type = 'rename_card' AND (image_url IS NULL OR image_url = '');
UPDATE products SET image_url = '/products/credit-restore.png' WHERE type = 'credit_restore' AND (image_url IS NULL OR image_url = '');
