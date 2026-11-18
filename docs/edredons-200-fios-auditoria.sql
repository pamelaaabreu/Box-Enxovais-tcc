SELECT p.id,t.name AS category_name,p.status,p.name,
       p.measurements->>'Material' AS material,
       p.measurements->>'Tecido externo' AS outer_fabric,
       p.measurements->>'Contagem de fios' AS thread_count,
       p.measurements->>'Enchimento' AS filling,
       p.measurements->>'catalog_slug' AS legacy_slug,
       p.description,p.purchase_summary
FROM products p JOIN product_types t ON t.id=p.product_type_id
WHERE t.name='Cama / Edredons'
ORDER BY p.id;

SELECT j.product_id,j.previous_data->>'name' AS previous_name,j.revised_data->>'name' AS revised_name
FROM catalog_comforter_titles_000035 j ORDER BY j.product_id;

SELECT count(*) AS total_comforters,
       count(*) FILTER (WHERE right(p.name,8)='200 Fios') AS matching_titles,
       count(*) FILTER (WHERE p.measurements->>'Contagem de fios'='200 fios') AS matching_attributes,
       count(*) FILTER (WHERE p.name ~* '200[[:space:]]+fios.*200[[:space:]]+fios') AS duplicated_suffix
FROM products p JOIN product_types t ON t.id=p.product_type_id
WHERE t.name='Cama / Edredons';
