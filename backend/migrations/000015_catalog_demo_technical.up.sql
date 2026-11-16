BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_technical_seed_000015 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    measurements_were_null BOOLEAN NOT NULL,
    added_measurements JSONB NOT NULL,
    previous_care TEXT,
    added_care TEXT
);

WITH profiles(collection, attributes, care) AS (
    VALUES
    ('Essência Floral', '{"Material":"Percal de algodão","Acabamento":"Bainha simples"}'::jsonb,
        'Lavar à máquina até 30 °C em ciclo suave.|Não usar alvejante.|Secar à sombra.|Passar em temperatura média.'),
    ('Aurora Floral', '{"Material":"Tecido misto de algodão e poliéster","Acabamento":"Bainha costurada"}'::jsonb,
        'Lavar à máquina até 30 °C com cores semelhantes.|Não usar alvejante.|Secar à sombra.|Passar em temperatura baixa.'),
    ('Serenidade', '{"Material":"Cetim de algodão","Acabamento":"Bainha dobrada"}'::jsonb,
        'Lavar à máquina até 30 °C em ciclo delicado.|Não usar alvejante.|Secar à sombra.|Passar pelo avesso em temperatura baixa.'),
    ('Aconchego', '{"Material":"Microfibra de poliéster","Acabamento":"Costura acolchoada","Enchimento":"Fibra de poliéster"}'::jsonb,
        'Lavar à máquina em ciclo delicado até 30 °C, se houver capacidade para a peça.|Não usar alvejante.|Secar na horizontal à sombra.|Não passar.'),
    ('Geométrico', '{"Material":"Tecido misto de algodão e poliéster","Acabamento":"Matelassê geométrico","Enchimento":"Manta de poliéster"}'::jsonb,
        'Lavar à máquina em ciclo delicado até 30 °C, se houver capacidade para a peça.|Não usar alvejante.|Não usar secadora.|Não passar.'),
    ('Jardim', '{"Material":"Tecido externo de algodão","Acabamento":"Costura acolchoada","Enchimento":"Fibra de poliéster"}'::jsonb,
        'Lavar à mão em água fria.|Não usar alvejante.|Secar na horizontal à sombra.|Não lavar a seco.'),
    ('Natural', '{"Material":"Tecido misto de algodão e poliéster","Acabamento":"Matelassê leve","Enchimento":"Manta fina de poliéster"}'::jsonb,
        'Lavar à máquina até 30 °C em ciclo suave.|Não usar alvejante.|Secar à sombra.|Não passar.'),
    ('Provence', '{"Material":"Microfibra de poliéster","Acabamento":"Costura em matelassê","Enchimento":"Manta leve de poliéster"}'::jsonb,
        'Lavar à máquina até 30 °C em ciclo delicado.|Não usar alvejante.|Secar à sombra.|Não usar secadora.'),
    ('Tricot Conforto', '{"Material":"Tricô de acrílico","Acabamento":"Borda em malha"}'::jsonb,
        'Lavar à mão em água fria.|Não usar alvejante.|Secar na horizontal à sombra.|Não passar.'),
    ('Textura', '{"Material":"Tecido misto de algodão e poliéster","Acabamento":"Trama em relevo"}'::jsonb,
        'Lavar à mão em água fria.|Não torcer.|Secar na horizontal à sombra.|Passar pelo avesso em temperatura baixa.'),
    ('SoftCare', '{"Material":"Malha de poliéster","Acabamento":"Borda com elástico"}'::jsonb,
        'Lavar à máquina até 30 °C em ciclo suave.|Não usar alvejante.|Secar à sombra.|Não passar.'),
    ('Protege', '{"Material":"Tecido misto de algodão e poliéster","Acabamento":"Borda com elástico"}'::jsonb,
        'Lavar à mão em água fria.|Não usar alvejante.|Não usar secadora.|Não passar.'),
    ('Toalha', '{"Material":"100% algodão","Acabamento":"Tecido felpudo"}'::jsonb,
        'Lavar à máquina até 40 °C com cores semelhantes.|Não usar alvejante.|Secar em local ventilado.|Não lavar a seco.')
), candidates AS (
    SELECT p.id, p.measurements, p.care_instructions,
           profile.attributes || '{"Origem dos materiais":"Dados simulados para demonstração"}'::jsonb AS attributes,
           CASE WHEN COALESCE(p.care_instructions, '') !~ '[^[:space:]]' THEN
               replace(profile.care, '|', chr(10)) || chr(10) ||
                   'Cuidados simulados para demonstração. Consulte a etiqueta para produtos reais.'
           END AS added_care
    FROM products p
    JOIN product_types t ON t.id = p.product_type_id
    JOIN profiles profile
      ON (t.name, p.measurements->>'Coleção') IN (
          ('Cama / Jogos de cama', 'Essência Floral'), ('Cama / Jogos de cama', 'Aurora Floral'),
          ('Cama / Jogos de cama', 'Serenidade'), ('Cama / Edredons', 'Aconchego'),
          ('Cama / Edredons', 'Geométrico'), ('Cama / Edredons', 'Jardim'),
          ('Cama / Colchas e cobre-leitos', 'Natural'), ('Cama / Colchas e cobre-leitos', 'Provence'),
          ('Cama / Mantas e peseiras', 'Tricot Conforto'), ('Cama / Mantas e peseiras', 'Textura'),
          ('Cama / Protetores de colchão', 'SoftCare'), ('Cama / Protetores de colchão', 'Protege')
      ) AND profile.collection = p.measurements->>'Coleção'
      OR profile.collection = 'Toalha' AND p.name = 'Toalha de Banho Premium 100% Algodão'
          AND t.name = 'Cama / Colchas e cobre-leitos'
    WHERE p.status = 'active' OR profile.collection = 'Toalha'
), changes AS (
    SELECT c.*, COALESCE((
        SELECT jsonb_object_agg(a.key, a.value)
        FROM jsonb_each(c.attributes) a
        WHERE NOT COALESCE(c.measurements ? a.key, false)
          AND (a.key <> 'Origem dos materiais' OR EXISTS (
              SELECT 1 FROM jsonb_object_keys(c.attributes) AS k(key)
              WHERE k.key <> a.key AND NOT COALESCE(c.measurements ? k.key, false)
          ))
    ), '{}'::jsonb) AS added_measurements
    FROM candidates c
)
INSERT INTO catalog_technical_seed_000015
SELECT id, measurements IS NULL, added_measurements, care_instructions, added_care
FROM changes
WHERE added_measurements <> '{}'::jsonb OR added_care IS NOT NULL;

UPDATE products p
SET measurements = CASE WHEN s.added_measurements = '{}'::jsonb THEN p.measurements
                        ELSE COALESCE(p.measurements, '{}'::jsonb) || s.added_measurements END,
    care_instructions = COALESCE(s.added_care, p.care_instructions)
FROM catalog_technical_seed_000015 s
WHERE p.id = s.product_id;

COMMIT;

