-- 将已有商品价格改为虚拟币（新库用 seed 即可，此脚本用于已有库）
USE animal_world;
UPDATE products SET price = 100 WHERE type = 'avatar_frame';
UPDATE products SET price = 200 WHERE name = '热度加速卡';
UPDATE products SET price = 50 WHERE name = '置顶卡';
UPDATE products SET price = 30 WHERE type = 'badge';
UPDATE products SET price = 20 WHERE type = 'rename_card';
UPDATE products SET price = 100 WHERE type = 'credit_restore';
