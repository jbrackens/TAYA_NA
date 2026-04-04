SELECT pg_catalog.setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users)+1);
INSERT INTO roles ("id", "name") VALUES (3, 'account-manager');
INSERT INTO users ("email", "password") VALUES ('account-manager@luckydino.com', '$2b$10$nrN4HbpibDjZXwWyA9nQ9eJpzi3ddmwqeZEKsQtjxgkfi2bVIPGr.');
INSERT INTO user_roles("userId", "roleId") SELECT id, 3 FROM users WHERE email='account-manager@luckydino.com';
