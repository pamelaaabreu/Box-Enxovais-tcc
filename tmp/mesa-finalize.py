exec((__import__('pathlib').Path(__file__).parent/'mesa-prepare.py').read_text(encoding='utf8'))
generated=json.loads((root/'tmp/mesa-generated.json').read_text(encoding='utf8'))
for g in generated:
 p=products[g['index']]; name=p['key']+'-01.png'
 shutil.copy2(g['path'],images/name)
 p['images']=[{'file':name,'origin':'gerada com image_gen','position':1,'alt':p['nome']+' — vista principal','prompt':g['prompt']}]
 p['imagem_pendente']=False
image_rows=[]; assets=[]
for p in products:
 for i in p['images']:
  file=images/i['file']; shutil.copy2(file,root/'backend/uploads'/file.name)
  assets.append({**i,'product':p['nome'],'url':'http://localhost:8080/uploads/'+file.name,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
  image_rows.append('('+','.join([sql(p['key']),sql('uploads/'+file.name),str(i['position']),sql(i['alt'])])+')')
up+='''INSERT INTO product_images(product_id,image_path,is_primary,alt_text)
SELECT j.product_id,v.path,v.position=1,v.alt FROM catalog_mesa_seed_000040 j
JOIN (VALUES
'''+',\n'.join(image_rows)+'''
) v(key,path,position,alt) ON v.key=j.import_key ORDER BY j.product_id,v.position;
UPDATE catalog_mesa_seed_000040 j SET product_snapshot=to_jsonb(p),
 images_snapshot=(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=p.id)
FROM products p WHERE p.id=j.product_id;
COMMIT;
'''
(root/'backend/migrations/000040_catalog_mesa.up.sql').write_text(up,encoding='utf8')
(dest/'catalogo.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf8')
(dest/'imagens.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2),encoding='utf8')
