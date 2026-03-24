USE animal_world;

-- price 现为虚拟币数量
INSERT INTO products (name, description, price, image_url, type, popularity_boost) VALUES
('明星头像框', '金色边框，彰显明星气质', 100, '/products/avatar-frame.png', 'avatar_frame', 50),
('热度加速卡', '24 小时内曝光度翻倍', 200, '/products/boost-card.png', 'boost', 100),
('置顶卡', '动态置顶 1 小时', 50, '/products/pin-card.png', 'boost', 20),
('小星星徽章', '宠物资料页闪耀徽章', 30, '/products/star-badge.png', 'badge', 10),
('改名卡', '每月额外修改个人资料2次机会', 20, '/products/rename-card.png', 'rename_card', 0);
