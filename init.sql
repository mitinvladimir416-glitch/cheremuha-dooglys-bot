-- === Схема БД для "Черёмуха Street" ===
-- Запускается один раз при первом старте (см. docker-compose.yml)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    login VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(20) NOT NULL DEFAULT 'staff'
        CHECK (role IN ('admin', 'manager', 'staff', 'cashier')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingredients (
    id SERIAL PRIMARY KEY,
    dooglys_id VARCHAR(100) UNIQUE,      -- id этого ингредиента в Dooglys, если синхронизируем
    name VARCHAR(200) NOT NULL,
    unit VARCHAR(20) NOT NULL,           -- кг, л, шт...
    cost_per_unit NUMERIC(10,2) DEFAULT 0,
    min_stock NUMERIC(10,2) DEFAULT 0,   -- минимальный остаток для уведомлений
    current_stock NUMERIC(10,2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    dooglys_id VARCHAR(100) UNIQUE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

-- Рецептура: сколько какого ингредиента нужно на 1 единицу товара
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity NUMERIC(10,3) NOT NULL,     -- количество ингредиента на 1 товар
    UNIQUE(product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    dooglys_sale_id VARCHAR(100) UNIQUE, -- id продажи из Dooglys, если синхронизируем
    product_id INTEGER REFERENCES products(id),
    quantity NUMERIC(10,2) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    total NUMERIC(10,2) NOT NULL,
    sold_at TIMESTAMP NOT NULL DEFAULT now(),
    created_by INTEGER REFERENCES users(id)
);

-- Лог всех значимых действий (кто, что, когда) — для отчётности и аудита
CREATE TABLE IF NOT EXISTS logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE INDEX IF NOT EXISTS idx_ingredients_stock ON ingredients(current_stock);
