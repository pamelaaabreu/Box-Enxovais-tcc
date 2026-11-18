import json, pathlib, unicodedata, shutil, hashlib
root=pathlib.Path(__file__).resolve().parents[1]
source=pathlib.Path(r'C:\Users\vitor\Downloads\box_enxovais_mesa_codex\BOX_ENXOVAIS_MESA_CODEX')
dest=root/'backend/demo-assets/mesa-2026'
dest.mkdir(parents=True,exist_ok=True)
images=dest/'imagens'; images.mkdir(exist_ok=True)
products=json.loads((source/'catalogo_mesa.json').read_text(encoding='utf-8-sig'))
shutil.copy2(source/'catalogo_mesa.json',dest/'catalogo-origem.json')
def slug(s): return '-'.join(''.join(c for c in unicodedata.normalize('NFD',s.lower()) if not unicodedata.combining(c)).split())
def sql(s): return "'"+str(s).replace("'","''")+"'"
care='Lavar em ciclo delicado a até 30 °C, com cores semelhantes\nNão usar alvejante\nNão deixar de molho\nSecar à sombra, sem torcer\nNão usar secadora\nPassar pelo avesso em temperatura média, até 150 °C\nNão lavar a seco'
rows=[]
for p in products:
 p['slug']=slug(p['nome']); p['key']='mesa-2026-'+p['slug']
 p['attributes']={'Tipo':{'toalha de mesa':'Toalhas de mesa','caminho de mesa':'Caminhos de mesa','jogo americano':'Jogos americanos'}[p['tipo']], 'Cor':p['cor'],'Coleção':p['colecao'],'collection_slug':'mesa-'+slug(p['colecao']),'Dimensões':p['medida'],'Material':'Tecido misto de algodão e linho','Composição têxtil':'55% algodão e 45% linho','Acabamento':'Bainha costurada','Conteúdo':p['conteudo'],'catalog_import_key':p['key'],'catalog_slug':p['slug']}
 p['summary']=f"Trama de algodão e linho em {p['cor'].lower()}, com bainha costurada. {p['conteudo'].capitalize()}."
 p['description']=f"{p['nome']} traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor {p['cor'].lower()} permite coordenar a peça com outros itens da coleção {p['colecao']}. Dimensões: {p['medida']}. Acompanha {p['conteudo']}. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto."
 p['care']=care
 p['images']=[]
 if p['imagem_capa']:
  for n in [1,2]:
   name=p['imagem_capa'].replace('_01','_%02d'%n); target=p['key']+'-%02d.png'%n
   shutil.copy2(source/'imagens'/name,images/target)
   p['images'].append({'file':target,'origin':'fornecida','position':n,'alt':p['nome']+(' — vista principal' if n==1 else ' — segunda vista')})
 rows.append('('+','.join([sql(p['nome']),sql(p['description']),sql(p['summary']),sql(care),sql(json.dumps(p['attributes'],ensure_ascii=False)),str(p['preco_centavos'])+'::numeric/100',str(p['estoque'])])+')')
up='''BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_types,product_images,product_variants IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_mesa_category_000040(category_id INTEGER PRIMARY KEY REFERENCES product_types(id) ON DELETE CASCADE);
CREATE TABLE catalog_mesa_seed_000040(
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 import_key TEXT NOT NULL UNIQUE, product_snapshot JSONB, images_snapshot JSONB
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM brands WHERE name='Box Enxovais') THEN
  RAISE EXCEPTION 'Marca Box Enxovais ausente; cadastro interrompido.';
 END IF;
END $$;
WITH created AS (
 INSERT INTO product_types(name) SELECT 'Mesa' WHERE NOT EXISTS(SELECT 1 FROM product_types WHERE name='Mesa') RETURNING id
) INSERT INTO catalog_mesa_category_000040 SELECT id FROM created;
WITH approved(name,description,summary,care,attributes,price,quantity) AS (VALUES
'''+',\n'.join(rows)+'''
), inserted AS (
 INSERT INTO products(name,description,purchase_summary,care_instructions,measurements,price,quantity,brand_id,product_type_id,status)
 SELECT a.name,a.description,a.summary,a.care,a.attributes::jsonb,a.price,a.quantity,b.id,t.id,'active'
 FROM approved a CROSS JOIN brands b CROSS JOIN product_types t
 WHERE b.name='Box Enxovais' AND t.name='Mesa'
 AND NOT EXISTS(SELECT 1 FROM products p WHERE lower(btrim(p.name))=lower(a.name)
 OR p.measurements->>'catalog_import_key'=a.attributes::jsonb->>'catalog_import_key'
 OR p.measurements->>'catalog_slug'=a.attributes::jsonb->>'catalog_slug')
 ORDER BY a.name RETURNING id,measurements->>'catalog_import_key' AS import_key
) INSERT INTO catalog_mesa_seed_000040(product_id,import_key) SELECT id,import_key FROM inserted;
'''
(dest/'catalogo.json').write_text(json.dumps(products,ensure_ascii=False,indent=2),encoding='utf8')
(root/'tmp/mesa-up-prefix.sql').write_text(up,encoding='utf8')
down=(root/'backend/migrations/000039_catalog_cushion_covers.down.sql').read_text(encoding='utf8').replace('catalog_cushion','catalog_mesa').replace('000039','000040').replace('Capas possuem','Produtos Mesa possuem')
(root/'backend/migrations/000040_catalog_mesa.down.sql').write_text(down,encoding='utf8')
