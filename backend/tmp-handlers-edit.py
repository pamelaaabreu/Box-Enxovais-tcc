from pathlib import Path
import re
root=Path('backend/src/handlers')
# Replace complete decoder/EOF blocks, keeping independent business-field checks.
for name in ['catalog_registration.go','home_reviews.go','order_history.go','product_reviews.go','product_variants.go','promotion_campaigns.go','promotion_products.go','shipping_ranges.go']:
 p=root/name;s=p.read_text(encoding='utf-8-sig');cursor=0
 while True:
  start=s.find('decoder := json.NewDecoder',cursor)
  if start<0:break
  match=re.search(r'(?m)^(\s*)if [^\n]*decoder.Decode.*? \{\n',s[start:],re.S)
  if not match:raise Exception(name)
  condStart=start+match.start();condEnd=start+match.end();indent=match.group(1).split('\n')[-1]
  end=re.search(r'(?m)^'+re.escape(indent)+r'}',s[condEnd:]);endPos=condEnd+end.end()
  condition=s[condStart:condEnd];body=s[condEnd:endPos-len(indent)-1]
  target=re.search(r'decoder.Decode\((&\w+)\)',condition).group(1)
  msg=re.search(r'response.Error\(w,.*?,\s*("[^"\n]+")\)',body,re.S).group(1)
  pre=s[start:condStart];limitMatch=re.search(r'r.Body,\s*([^,)]+)',pre);limit=limitMatch.group(1).strip() if limitMatch else 'smallJSONLimit'
  if name=='promotion_campaigns.go':limit='campaignJSONLimit'
  tail=''
  if 'io.EOF ||' in condition:tail=condition.split('io.EOF ||',1)[1].rsplit(' {',1)[0].strip()
  replacement='if !decodeBody(w, r, '+target+', '+limit+', '+msg+') { return }'
  if tail: replacement+='\n'+indent+'if '+tail+' {\n'+body+indent+'}'
  s=s[:start]+replacement+s[endPos:];cursor=start+len(replacement)
 p.write_text(s,encoding='utf-8')
# Older boolean adapters: each failure writes exactly once in decodeBody.
for name in ['cart_handler.go','account.go','checkout_handler.go']:
 p=root/name;s=p.read_text(encoding='utf-8-sig')
 if name=='cart_handler.go':s=s[:s.index('// Decodifica e valida o corpo JSON')]
 pattern=r'if !decodeCartBody\(w, r, (&\w+)\)(\s*\|\|)?'
 while re.search(pattern,s):
  m=re.search(pattern,s);target=m.group(1)
  if m.group(2):s=s[:m.start()]+'if !decodeBody(w,r,'+target+',smallJSONLimit,"Dados inválidos.") {return}\n if '+s[m.end():].lstrip()+''
  else:
   a=s.index('{',m.end());b=s.index('\n\t\t}',a) if name=='account.go' else s.index('\n\t}',a)
   s=s[:m.start()]+'if !decodeBody(w,r,'+target+',smallJSONLimit,"Dados inválidos.") {return}'+s[b+len('\n\t\t}' if name=='account.go' else '\n\t}'):]
 p.write_text(s,encoding='utf-8')
p=root/'product_admin.go';s=p.read_text();a=s.index('// Decodifica os dados administrativos');b=s.index('func (h ProductHandler) AdminProduct',a);s=s[:a]+s[b:];s=s.replace('!decodeProductRequest(w, r, &request)','!decodeBody(w, r, &request, productJSONLimit, "Dados inválidos. Envie somente os campos editáveis do produto.")');needle='\t\tresponse.JSON(w, 200, products[0])';s=s.replace(needle,'\t\tif len(products)==0 {adminProductError(w,sql.ErrNoRows);return}\n'+needle);p.write_text(s)
p=root/'product_images_admin.go';s=p.read_text().replace('!decodeProductRequest(w, r, &order)','!decodeBody(w,r,&order,productJSONLimit,"Dados inválidos.")');p.write_text(s)
# Direct unbounded decoders in authentication and registration.
p=root/'auth_handler.go';s=p.read_text();a=s.index('\t// Cria um decodificador');b=s.index('\t// Encaminha as credenciais',a);s=s[:a]+'\tif !decodeBody(w,r,&creds,smallJSONLimit,"Corpo da requisição inválido") {return}\n\n'+s[b:];p.write_text(s)
p=root/'user_handler.go';s=p.read_text();a=s.index('\t// Interpreta o JSON');b=s.index('\t// Encaminha os dados',a);s=s[:a]+'\tif !decodeBody(w,r,&user,smallJSONLimit,"Corpo da requisição inválido") {return}\n\n'+s[b:];p.write_text(s)
p=root/'auth_password_reset.go';s=p.read_text();a=s.index('\terr := json.NewDecoder');b=s.index('\terr = h.Service.SendRecoveryCode',a);s=s[:a]+'\tif !decodeBody(w,r,&req,smallJSONLimit,"Email inválido") {return}\n\n'+s[b:];s=s.replace('err = h.Service.SendRecoveryCode','err := h.Service.SendRecoveryCode');a=s.index('\terr := json.NewDecoder');b=s.index('\ttokenStatus, err :=',a);s=s[:a]+'\tif !decodeBody(w,r,&req,smallJSONLimit,"Requisição inválida") {return}\n\n'+s[b:];s=re.sub(r'if err := json.NewDecoder\(r.Body\).Decode\(&req\); err != nil \|\| req.Email == "" \|\| req.Code == "" \{','if !decodeBody(w,r,&req,smallJSONLimit,"Código inválido") {return}\n if req.Email == "" || req.Code == "" {',s);p.write_text(s)
p=root/'auth_reset_token.go';s=p.read_text();s=re.sub(r'if err := json.NewDecoder\(r.Body\).Decode\(&req\); err != nil \|\| req.ResetToken == "" \{','if !decodeBody(w,r,&req,smallJSONLimit,"Token não informado") {return}\n if req.ResetToken == "" {',s);a=s.index('\tif status == services.PasswordResetTokenExpired');b=s.index('\n\tresponse.Success',a);s=s[:a]+'\tif status != services.PasswordResetTokenValid {resetTokenError(w,status);return}\n'+s[b:];p.write_text(s)
p=root/'newsletter.go';s=p.read_text();a=s.index('\tif err := json.NewDecoder');b=s.index('\n\t// Encaminha',a);s=s[:a]+'\tif !decodeBody(w,r,&subReq,smallJSONLimit,"Corpo da requisição inválido") {return}\n'+s[b:];p.write_text(s)
# Create DTO accepts existing SKU for compatibility, but it never reaches the model used for persistence.
p=root/'product_create.go';s=p.read_text();a=s.index('\tvar body struct');b=s.index('\n\t// Encaminha',a);s=s[:a]+'''var body struct {
 Name string `json:"name"`
 Description *string `json:"description"`
 CareInstructions *string `json:"care_instructions"`
 Measurements map[string]string `json:"measurements"`
 Price float64 `json:"price"`
 Quantity *int32 `json:"quantity"`
 BrandID *int `json:"brand_id"`
 ProductTypeID *int `json:"product_type_id"`
 Status string `json:"status"`
 PurchaseSummary *string `json:"purchase_summary"`
 Variants []models.ProductVariant `json:"variants"`
 SKU string `json:"sku"`
 }
 if !decodeBody(w,r,&body,productJSONLimit,"Dados do produto inválidos. Confira os campos e os tipos informados.") {return}
 product:=models.Product{Name:body.Name,Description:body.Description,CareInstructions:body.CareInstructions,Measurements:body.Measurements,Price:body.Price,BrandID:body.BrandID,ProductTypeID:body.ProductTypeID,Status:body.Status,PurchaseSummary:body.PurchaseSummary,Variants:body.Variants}
'''+s[b:];s=s.replace('body.Product,','product,');p.write_text(s)
# Remove imports made obsolete by the common decoder.
for p in root.glob('*.go'):
 if p.name.endswith('_test.go'):continue
 s=p.read_text(encoding='utf-8-sig')
 for package in ['encoding/json','io']:
  identifier=package.split('/')[-1]
  if not re.search(r'\b'+identifier+r'\.',s):s=s.replace('\t"'+package+'"\n','')
 p.write_text(s,encoding='utf-8')
