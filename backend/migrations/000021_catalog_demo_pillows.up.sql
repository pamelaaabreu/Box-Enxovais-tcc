BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_types, products IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_pillows_seed_000021 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL
);
CREATE TABLE catalog_pillow_category_seed_000021 (category_id INTEGER PRIMARY KEY);
WITH added AS (
    INSERT INTO product_types(name) VALUES ('Travesseiros')
    ON CONFLICT (name) DO NOTHING RETURNING id
)
INSERT INTO catalog_pillow_category_seed_000021 SELECT id FROM added;
WITH demo(name, description, care, measurements, price_cents, quantity, image_path) AS (
    VALUES
    ('Travesseiro Nuvem Leve', 'Travesseiro com enchimento de fibra siliconada de poliéster para compor a cama.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Fibra siliconada","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 5990, 14, 'uploads/travesseiro-demo-1.png'),
    ('Travesseiro Brisa Macia', 'Travesseiro com enchimento de fibra siliconada de poliéster para compor a cama.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Fibra siliconada","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 6990, 3, 'uploads/travesseiro-demo-2.png'),
    ('Travesseiro Aconchego Firme', 'Travesseiro com enchimento de fibra siliconada de poliéster para compor a cama.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Fibra siliconada","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 7990, 9, 'uploads/travesseiro-demo-3.png'),
    ('Travesseiro Pluma Serena', 'Travesseiro com enchimento de fibra siliconada de poliéster para compor a cama.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Fibra siliconada","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 7490, 0, 'uploads/travesseiro-demo-4.png'),
    ('Travesseiro Memória Clássica', 'Travesseiro com enchimento de espuma viscoelástica para compor a cama.', 'Lavar somente a capa removível à mão em água fria.
Não lavar ou torcer a espuma.
Secar à sombra.', '{"Tipo":"Travesseiro","Formato":"Viscoelástico","Material":"Espuma viscoelástica","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 13990, 0, 'uploads/travesseiro-demo-5.png'),
    ('Travesseiro Memória Fresca', 'Travesseiro com enchimento de espuma viscoelástica para compor a cama.', 'Lavar somente a capa removível à mão em água fria.
Não lavar ou torcer a espuma.
Secar à sombra.', '{"Tipo":"Travesseiro","Formato":"Viscoelástico","Material":"Espuma viscoelástica","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 15990, 7, 'uploads/travesseiro-demo-6.png'),
    ('Travesseiro Memória Compacta', 'Travesseiro com enchimento de espuma viscoelástica para compor a cama.', 'Lavar somente a capa removível à mão em água fria.
Não lavar ou torcer a espuma.
Secar à sombra.', '{"Tipo":"Travesseiro","Formato":"Viscoelástico","Material":"Espuma viscoelástica","Tecido externo":"Malha de poliéster","Tamanho":"40 × 60 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 11990, 2, 'uploads/travesseiro-demo-7.png'),
    ('Travesseiro Contorno Suave', 'Travesseiro de perfil curvo com capa removível.', 'Lavar somente a capa removível à mão em água fria.
Não lavar ou torcer a espuma.
Secar à sombra.', '{"Tipo":"Travesseiro","Formato":"Anatômico","Material":"Espuma viscoelástica","Tecido externo":"Malha de poliéster","Tamanho":"40 × 60 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 14990, 0, 'uploads/travesseiro-demo-8.png'),
    ('Travesseiro Curva Serena', 'Travesseiro de perfil curvo com capa removível.', 'Lavar somente a capa removível à mão em água fria.
Não lavar ou torcer a espuma.
Secar à sombra.', '{"Tipo":"Travesseiro","Formato":"Anatômico","Material":"Espuma viscoelástica","Tecido externo":"Malha de poliéster","Tamanho":"40 × 60 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 12990, 0, 'uploads/travesseiro-demo-9.png'),
    ('Travesseiro Apoio Lateral', 'Travesseiro com enchimento de fibra siliconada de poliéster para compor a cama.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Apoio","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 9990, 12, 'uploads/travesseiro-demo-10.png'),
    ('Travesseiro Conforto Duplo', 'Travesseiro com enchimento de fibra siliconada de poliéster para compor a cama.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Apoio","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"50 × 70 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 10990, 0, 'uploads/travesseiro-demo-11.png'),
    ('Travesseiro Apoio Versátil', 'Travesseiro em formato rolo com capa têxtil.', 'Lavar à mão em água fria.
Não usar alvejante.
Secar completamente à sombra.', '{"Tipo":"Travesseiro","Formato":"Apoio","Material":"Fibra siliconada de poliéster","Tecido externo":"Malha de poliéster","Tamanho":"18 × 50 cm","Conteúdo":"1 travesseiro","Origem dos dados":"Dados simulados para demonstração"}'::jsonb, 8990, 4, 'uploads/travesseiro-demo-12.png')
), added AS (
    INSERT INTO products(name, description, care_instructions, measurements, price, quantity, product_type_id, status)
    SELECT d.name, d.description, d.care, d.measurements, d.price_cents / 100.0, d.quantity, t.id, 'active'
    FROM demo d CROSS JOIN product_types t
    WHERE t.name = 'Travesseiros' AND NOT EXISTS (
        SELECT 1 FROM products p WHERE p.name = d.name AND p.product_type_id = t.id
    )
    RETURNING id, name
)
INSERT INTO catalog_pillows_seed_000021
SELECT a.id, d.image_path FROM added a JOIN demo d USING(name);
INSERT INTO product_images(product_id, image_path, alt_text, is_primary)
SELECT s.product_id, s.image_path, left('Imagem ilustrativa de ' || p.name,100), true
FROM catalog_pillows_seed_000021 s JOIN products p ON p.id = s.product_id;
WITH variants(name, size, price_cents, quantity, dimensions) AS (
    VALUES
    ('Travesseiro Memória Clássica', 'Altura baixa', 13990, 4, '50 × 70 cm · 10 cm de altura'),
    ('Travesseiro Memória Clássica', 'Altura média', 15490, 6, '50 × 70 cm · 13 cm de altura'),
    ('Travesseiro Contorno Suave', 'Altura baixa', 14990, 3, '40 × 60 cm · 10 cm de altura'),
    ('Travesseiro Contorno Suave', 'Altura média', 16490, 4, '40 × 60 cm · 13 cm de altura')
)
INSERT INTO product_variants(product_id,size,price,quantity,dimensions,included_items,simulated)
SELECT p.id, v.size, v.price_cents / 100.0, v.quantity, v.dimensions, '["1 travesseiro"]'::jsonb, true
FROM variants v JOIN products p ON p.name = v.name
JOIN catalog_pillows_seed_000021 s ON s.product_id = p.id;
COMMIT;
