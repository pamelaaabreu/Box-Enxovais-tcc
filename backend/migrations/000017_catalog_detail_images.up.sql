BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_image_seed_000017 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE
);

WITH catalog(product_name, category, source_path, detail_path, alt_text, ordinal) AS (
    VALUES
    ('Edredom Aconchego — Creme', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-creme--6aac05e3161e3f58c67eb8f2111cdba655bb96a6ef8caea6716827a389ddcecd.jpg', 'uploads/box-detail-017-8-1.webp', 'Recorte superior da imagem do produto', 1),
    ('Edredom Aconchego — Creme', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-creme--6aac05e3161e3f58c67eb8f2111cdba655bb96a6ef8caea6716827a389ddcecd.jpg', 'uploads/box-detail-017-8-2.webp', 'Recorte central da imagem do produto', 2),
    ('Edredom Aconchego — Creme', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-creme--6aac05e3161e3f58c67eb8f2111cdba655bb96a6ef8caea6716827a389ddcecd.jpg', 'uploads/box-detail-017-8-3.webp', 'Recorte inferior da imagem do produto', 3),
    ('Edredom Aconchego — Marrom Cacau', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-marrom-cacau--38f4d9675e28478615a4e4db18376f24b6be18468470db50d9952391d8851952.jpg', 'uploads/box-detail-017-9-1.webp', 'Recorte superior da imagem do produto', 4),
    ('Edredom Aconchego — Marrom Cacau', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-marrom-cacau--38f4d9675e28478615a4e4db18376f24b6be18468470db50d9952391d8851952.jpg', 'uploads/box-detail-017-9-2.webp', 'Recorte central da imagem do produto', 5),
    ('Edredom Aconchego — Marrom Cacau', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-marrom-cacau--38f4d9675e28478615a4e4db18376f24b6be18468470db50d9952391d8851952.jpg', 'uploads/box-detail-017-9-3.webp', 'Recorte inferior da imagem do produto', 6),
    ('Edredom Aconchego — Verde Oliva', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-verde-oliva--30dda27e6686f5790306be9decbecd6ab71e0f26747a1e2d364306cf82da47eb.jpg', 'uploads/box-detail-017-10-1.webp', 'Recorte superior da imagem do produto', 7),
    ('Edredom Aconchego — Verde Oliva', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-verde-oliva--30dda27e6686f5790306be9decbecd6ab71e0f26747a1e2d364306cf82da47eb.jpg', 'uploads/box-detail-017-10-2.webp', 'Recorte central da imagem do produto', 8),
    ('Edredom Aconchego — Verde Oliva', 'Cama / Edredons', 'uploads/catalog-cama-aconchego-verde-oliva--30dda27e6686f5790306be9decbecd6ab71e0f26747a1e2d364306cf82da47eb.jpg', 'uploads/box-detail-017-10-3.webp', 'Recorte inferior da imagem do produto', 9),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 'uploads/catalog-cama-aurora-vermelho-minimalista.png', 'uploads/box-detail-017-4-1.webp', 'Recorte superior da imagem do produto', 10),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 'uploads/catalog-cama-aurora-vermelho-minimalista.png', 'uploads/box-detail-017-4-2.webp', 'Recorte central da imagem do produto', 11),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 'uploads/catalog-cama-aurora-vermelho-minimalista.png', 'uploads/box-detail-017-4-3.webp', 'Recorte inferior da imagem do produto', 12),
    ('Edredom Geométrico — Azul Petróleo', 'Cama / Edredons', 'uploads/catalog-cama-geometrico-azul-petroleo--66867e5c1df2a35e0442155d561318e3e1a27fec12dc78ec651c7b87b938237f.jpg', 'uploads/box-detail-017-11-1.webp', 'Recorte superior da imagem do produto', 13),
    ('Edredom Geométrico — Azul Petróleo', 'Cama / Edredons', 'uploads/catalog-cama-geometrico-azul-petroleo--66867e5c1df2a35e0442155d561318e3e1a27fec12dc78ec651c7b87b938237f.jpg', 'uploads/box-detail-017-11-2.webp', 'Recorte central da imagem do produto', 14),
    ('Edredom Geométrico — Azul Petróleo', 'Cama / Edredons', 'uploads/catalog-cama-geometrico-azul-petroleo--66867e5c1df2a35e0442155d561318e3e1a27fec12dc78ec651c7b87b938237f.jpg', 'uploads/box-detail-017-11-3.webp', 'Recorte inferior da imagem do produto', 15),
    ('Edredom Geométrico — Verde Sálvia', 'Cama / Edredons', 'uploads/catalog-cama-geometrico-verde-salvia--fafc66b32f4e850c88b783b76d994e11bc7c13237b07dabc88a8913ab7ca26fd.jpg', 'uploads/box-detail-017-13-1.webp', 'Recorte superior da imagem do produto', 16),
    ('Edredom Geométrico — Verde Sálvia', 'Cama / Edredons', 'uploads/catalog-cama-geometrico-verde-salvia--fafc66b32f4e850c88b783b76d994e11bc7c13237b07dabc88a8913ab7ca26fd.jpg', 'uploads/box-detail-017-13-2.webp', 'Recorte central da imagem do produto', 17),
    ('Edredom Geométrico — Verde Sálvia', 'Cama / Edredons', 'uploads/catalog-cama-geometrico-verde-salvia--fafc66b32f4e850c88b783b76d994e11bc7c13237b07dabc88a8913ab7ca26fd.jpg', 'uploads/box-detail-017-13-3.webp', 'Recorte inferior da imagem do produto', 18),
    ('Edredom Jardim — Azul Lavanda', 'Cama / Edredons', 'uploads/catalog-cama-jardim-azul-lavanda--455239a27c31e32ba7c478531f94b44562c271258f89b0292744d552604a61e7.jpg', 'uploads/box-detail-017-14-1.webp', 'Recorte superior da imagem do produto', 19),
    ('Edredom Jardim — Azul Lavanda', 'Cama / Edredons', 'uploads/catalog-cama-jardim-azul-lavanda--455239a27c31e32ba7c478531f94b44562c271258f89b0292744d552604a61e7.jpg', 'uploads/box-detail-017-14-2.webp', 'Recorte central da imagem do produto', 20),
    ('Edredom Jardim — Azul Lavanda', 'Cama / Edredons', 'uploads/catalog-cama-jardim-azul-lavanda--455239a27c31e32ba7c478531f94b44562c271258f89b0292744d552604a61e7.jpg', 'uploads/box-detail-017-14-3.webp', 'Recorte inferior da imagem do produto', 21),
    ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', 'uploads/catalog-cama-jardim-verde-musgo--b7bc322dd0bcea41ef904a14f4377c3fe7e49f74973c57213ff7ed4ec2a768ee.jpg', 'uploads/box-detail-017-15-1.webp', 'Recorte superior da imagem do produto', 22),
    ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', 'uploads/catalog-cama-jardim-verde-musgo--b7bc322dd0bcea41ef904a14f4377c3fe7e49f74973c57213ff7ed4ec2a768ee.jpg', 'uploads/box-detail-017-15-2.webp', 'Recorte central da imagem do produto', 23),
    ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', 'uploads/catalog-cama-jardim-verde-musgo--b7bc322dd0bcea41ef904a14f4377c3fe7e49f74973c57213ff7ed4ec2a768ee.jpg', 'uploads/box-detail-017-15-3.webp', 'Recorte inferior da imagem do produto', 24),
    ('Manta Tricot Conforto — Areia', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-areia--871ea993801711f992836c74786676473a0084b21964ac2efcbd170d1ea7bd96.jpg', 'uploads/box-detail-017-21-1.webp', 'Recorte superior da imagem do produto', 25),
    ('Manta Tricot Conforto — Areia', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-areia--871ea993801711f992836c74786676473a0084b21964ac2efcbd170d1ea7bd96.jpg', 'uploads/box-detail-017-21-2.webp', 'Recorte central da imagem do produto', 26),
    ('Manta Tricot Conforto — Areia', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-areia--871ea993801711f992836c74786676473a0084b21964ac2efcbd170d1ea7bd96.jpg', 'uploads/box-detail-017-21-3.webp', 'Recorte inferior da imagem do produto', 27),
    ('Manta Tricot Conforto — Terracota', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-terracota--539889fbebb8d5c278ef45c04944e151f7673f715cb263c2b6f27f64e94fef14.jpg', 'uploads/box-detail-017-23-1.webp', 'Recorte superior da imagem do produto', 28),
    ('Manta Tricot Conforto — Terracota', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-terracota--539889fbebb8d5c278ef45c04944e151f7673f715cb263c2b6f27f64e94fef14.jpg', 'uploads/box-detail-017-23-2.webp', 'Recorte central da imagem do produto', 29),
    ('Manta Tricot Conforto — Terracota', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-terracota--539889fbebb8d5c278ef45c04944e151f7673f715cb263c2b6f27f64e94fef14.jpg', 'uploads/box-detail-017-23-3.webp', 'Recorte inferior da imagem do produto', 30),
    ('Manta Tricot Conforto — Verde Oliva', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-verde-oliva--6aad74b8e610295cf0a60a5b4bc7a4dabd5adbba559aeca6cc5fe5204defe448.jpg', 'uploads/box-detail-017-22-1.webp', 'Recorte superior da imagem do produto', 31),
    ('Manta Tricot Conforto — Verde Oliva', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-verde-oliva--6aad74b8e610295cf0a60a5b4bc7a4dabd5adbba559aeca6cc5fe5204defe448.jpg', 'uploads/box-detail-017-22-2.webp', 'Recorte central da imagem do produto', 32),
    ('Manta Tricot Conforto — Verde Oliva', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-manta-tricot-conforto-verde-oliva--6aad74b8e610295cf0a60a5b4bc7a4dabd5adbba559aeca6cc5fe5204defe448.jpg', 'uploads/box-detail-017-22-3.webp', 'Recorte inferior da imagem do produto', 33),
    ('Cobre-Leito Natural — Botânico Neutro', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-botanico-neutro--764b56d409bc8b285da4c8bf4d2472d1474b0491c5e1d3a4f9dc96914d0b5068.jpg', 'uploads/box-detail-017-18-1.webp', 'Recorte superior da imagem do produto', 34),
    ('Cobre-Leito Natural — Botânico Neutro', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-botanico-neutro--764b56d409bc8b285da4c8bf4d2472d1474b0491c5e1d3a4f9dc96914d0b5068.jpg', 'uploads/box-detail-017-18-2.webp', 'Recorte central da imagem do produto', 35),
    ('Cobre-Leito Natural — Botânico Neutro', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-botanico-neutro--764b56d409bc8b285da4c8bf4d2472d1474b0491c5e1d3a4f9dc96914d0b5068.jpg', 'uploads/box-detail-017-18-3.webp', 'Recorte inferior da imagem do produto', 36),
    ('Cobre-Leito Natural — Folhagens Suaves', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-folhagens-suaves--15d61b5157a1605794196683432f93a1c761139e0ef38fc965091bf76d61c5bf.jpg', 'uploads/box-detail-017-17-1.webp', 'Recorte superior da imagem do produto', 37),
    ('Cobre-Leito Natural — Folhagens Suaves', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-folhagens-suaves--15d61b5157a1605794196683432f93a1c761139e0ef38fc965091bf76d61c5bf.jpg', 'uploads/box-detail-017-17-2.webp', 'Recorte central da imagem do produto', 38),
    ('Cobre-Leito Natural — Folhagens Suaves', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-folhagens-suaves--15d61b5157a1605794196683432f93a1c761139e0ef38fc965091bf76d61c5bf.jpg', 'uploads/box-detail-017-17-3.webp', 'Recorte inferior da imagem do produto', 39),
    ('Cobre-Leito Natural — Verde Botânico', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-verde-botanico--5b7de09f869a38c13c1973bfe8872773924b1a11ea54a894b64baacbf319f98e.jpg', 'uploads/box-detail-017-16-1.webp', 'Recorte superior da imagem do produto', 40),
    ('Cobre-Leito Natural — Verde Botânico', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-verde-botanico--5b7de09f869a38c13c1973bfe8872773924b1a11ea54a894b64baacbf319f98e.jpg', 'uploads/box-detail-017-16-2.webp', 'Recorte central da imagem do produto', 41),
    ('Cobre-Leito Natural — Verde Botânico', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-verde-botanico--5b7de09f869a38c13c1973bfe8872773924b1a11ea54a894b64baacbf319f98e.jpg', 'uploads/box-detail-017-16-3.webp', 'Recorte inferior da imagem do produto', 42),
    ('Peseira Textura — Azul Acinzentado', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-azul-acinzentado--c70340c740758d83047e8c57da500f6ac5518afa882e62d8020f474a3ab2c989.jpg', 'uploads/box-detail-017-25-1.webp', 'Recorte superior da imagem do produto', 43),
    ('Peseira Textura — Azul Acinzentado', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-azul-acinzentado--c70340c740758d83047e8c57da500f6ac5518afa882e62d8020f474a3ab2c989.jpg', 'uploads/box-detail-017-25-2.webp', 'Recorte central da imagem do produto', 44),
    ('Peseira Textura — Azul Acinzentado', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-azul-acinzentado--c70340c740758d83047e8c57da500f6ac5518afa882e62d8020f474a3ab2c989.jpg', 'uploads/box-detail-017-25-3.webp', 'Recorte inferior da imagem do produto', 45),
    ('Peseira Textura — Marrom Taupe', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-marrom-taupe--4499e3be80c08b64d7a5c3e368a363979fd451e2776c822d07ee8cde6b21f7f7.jpg', 'uploads/box-detail-017-26-1.webp', 'Recorte superior da imagem do produto', 46),
    ('Peseira Textura — Marrom Taupe', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-marrom-taupe--4499e3be80c08b64d7a5c3e368a363979fd451e2776c822d07ee8cde6b21f7f7.jpg', 'uploads/box-detail-017-26-2.webp', 'Recorte central da imagem do produto', 47),
    ('Peseira Textura — Marrom Taupe', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-marrom-taupe--4499e3be80c08b64d7a5c3e368a363979fd451e2776c822d07ee8cde6b21f7f7.jpg', 'uploads/box-detail-017-26-3.webp', 'Recorte inferior da imagem do produto', 48),
    ('Peseira Textura — Off-White', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-off-white--1446e3c36a14f1d2339ee852baa3edd8004b4e00115fc8bdcd7f2a17581c38f1.jpg', 'uploads/box-detail-017-24-1.webp', 'Recorte superior da imagem do produto', 49),
    ('Peseira Textura — Off-White', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-off-white--1446e3c36a14f1d2339ee852baa3edd8004b4e00115fc8bdcd7f2a17581c38f1.jpg', 'uploads/box-detail-017-24-2.webp', 'Recorte central da imagem do produto', 50),
    ('Peseira Textura — Off-White', 'Cama / Mantas e peseiras', 'uploads/catalog-cama-peseira-textura-off-white--1446e3c36a14f1d2339ee852baa3edd8004b4e00115fc8bdcd7f2a17581c38f1.jpg', 'uploads/box-detail-017-24-3.webp', 'Recorte inferior da imagem do produto', 51),
    ('Protetor Protege', 'Cama / Protetores de colchão', 'uploads/catalog-cama-protege--c8ef925dfd10287057b884b6889956c5d7f40c3c1d2d169f9a76f2769a22310b.jpg', 'uploads/box-detail-017-28-1.webp', 'Recorte superior da imagem do produto', 52),
    ('Protetor Protege', 'Cama / Protetores de colchão', 'uploads/catalog-cama-protege--c8ef925dfd10287057b884b6889956c5d7f40c3c1d2d169f9a76f2769a22310b.jpg', 'uploads/box-detail-017-28-2.webp', 'Recorte central da imagem do produto', 53),
    ('Protetor Protege', 'Cama / Protetores de colchão', 'uploads/catalog-cama-protege--c8ef925dfd10287057b884b6889956c5d7f40c3c1d2d169f9a76f2769a22310b.jpg', 'uploads/box-detail-017-28-3.webp', 'Recorte inferior da imagem do produto', 54),
    ('Colcha Provence — Lilás', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-provence-floral-lilas--8df03f7e1c2b3eabbc31eeed9690685c53fd5567ea7a146c6e912bac2406f858.jpg', 'uploads/box-detail-017-19-1.webp', 'Recorte superior da imagem do produto', 55),
    ('Colcha Provence — Lilás', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-provence-floral-lilas--8df03f7e1c2b3eabbc31eeed9690685c53fd5567ea7a146c6e912bac2406f858.jpg', 'uploads/box-detail-017-19-2.webp', 'Recorte central da imagem do produto', 56),
    ('Colcha Provence — Lilás', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-provence-floral-lilas--8df03f7e1c2b3eabbc31eeed9690685c53fd5567ea7a146c6e912bac2406f858.jpg', 'uploads/box-detail-017-19-3.webp', 'Recorte inferior da imagem do produto', 57),
    ('Colcha Provence — Rosa', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-provence-floral-rosa--4d13fcd03b6656aa9933bfe23135e3eb035532e6c1a252d6136b7c8918b3c36f.jpg', 'uploads/box-detail-017-20-1.webp', 'Recorte superior da imagem do produto', 58),
    ('Colcha Provence — Rosa', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-provence-floral-rosa--4d13fcd03b6656aa9933bfe23135e3eb035532e6c1a252d6136b7c8918b3c36f.jpg', 'uploads/box-detail-017-20-2.webp', 'Recorte central da imagem do produto', 59),
    ('Colcha Provence — Rosa', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-provence-floral-rosa--4d13fcd03b6656aa9933bfe23135e3eb035532e6c1a252d6136b7c8918b3c36f.jpg', 'uploads/box-detail-017-20-3.webp', 'Recorte inferior da imagem do produto', 60),
    ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 'uploads/catalog-cama-serenidade-azul-claro-minimalista.png', 'uploads/box-detail-017-7-1.webp', 'Recorte superior da imagem do produto', 61),
    ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 'uploads/catalog-cama-serenidade-azul-claro-minimalista.png', 'uploads/box-detail-017-7-2.webp', 'Recorte central da imagem do produto', 62),
    ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 'uploads/catalog-cama-serenidade-azul-claro-minimalista.png', 'uploads/box-detail-017-7-3.webp', 'Recorte inferior da imagem do produto', 63),
    ('Protetor SoftCare', 'Cama / Protetores de colchão', 'uploads/catalog-cama-softcare--31bb938b596130fdcba1439f8d8584d9a7bccf4631069915bc877e6908fab8aa.jpg', 'uploads/box-detail-017-27-1.webp', 'Recorte superior da imagem do produto', 64),
    ('Protetor SoftCare', 'Cama / Protetores de colchão', 'uploads/catalog-cama-softcare--31bb938b596130fdcba1439f8d8584d9a7bccf4631069915bc877e6908fab8aa.jpg', 'uploads/box-detail-017-27-2.webp', 'Recorte central da imagem do produto', 65),
    ('Protetor SoftCare', 'Cama / Protetores de colchão', 'uploads/catalog-cama-softcare--31bb938b596130fdcba1439f8d8584d9a7bccf4631069915bc877e6908fab8aa.jpg', 'uploads/box-detail-017-27-3.webp', 'Recorte inferior da imagem do produto', 66)
), added AS (
    INSERT INTO product_images (product_id, image_path, alt_text, is_primary)
    SELECT p.id, c.detail_path, c.alt_text, false
    FROM catalog c
    JOIN product_types t ON t.name = c.category
    JOIN products p ON p.name = c.product_name AND p.product_type_id = t.id
    WHERE EXISTS (
        SELECT 1 FROM product_images cover
        WHERE cover.product_id = p.id AND cover.image_path = c.source_path
          AND cover.is_primary AND cover.variant_id IS NULL
    ) AND NOT EXISTS (
        SELECT 1 FROM product_images existing WHERE existing.image_path = c.detail_path
    )
    ORDER BY c.ordinal
    RETURNING id
)
INSERT INTO catalog_image_seed_000017 SELECT id FROM added;
COMMIT;
