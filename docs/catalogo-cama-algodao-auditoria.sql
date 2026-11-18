SELECT p.id,p.name,p.status,t.name AS category_name,
       p.measurements->>'Tipo' AS product_kind,
       p.measurements->>'Tecido externo' AS outer_fabric,
       p.measurements->>'Composição têxtil' AS textile_composition,
       p.measurements->>'Composição do tecido externo' AS outer_fabric_composition,
       p.measurements->>'Enchimento' AS filling,
       p.description,p.purchase_summary
FROM products p JOIN product_types t ON t.id=p.product_type_id
WHERE t.name IN ('Cama / Jogos de cama','Cama / Edredons','Cama / Colchas e cobre-leitos',
                 'Cama / Mantas e peseiras','Cama / Protetores de colchão')
ORDER BY p.id;
