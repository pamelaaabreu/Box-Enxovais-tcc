from pathlib import Path
import re
r=Path('backend/src/handlers')
p=r/'product_create.go';s=p.read_text().replace('SKU             string','SKU             string')
s=s.replace('SKU             string', 'PromotionalPrice float64 `json:"promotional_price"`\n\t\tSKU             string') if 'SKU             string' in s else s.replace('SKU ', 'PromotionalPrice float64 `json:"promotional_price"`\n SKU ',1)
p.write_text(s)
# Move shared business validation, retaining compatibility delegates used by existing tests.
p=r/'account.go';s=p.read_text();a=s.index('// Formato de celular');b=s.index('type AccountHandler',a);phone=s[a:b];a2=s.index('// Aceita CPF');validation=s[a2:];s=s[:a]+s[b:a2];s=s.replace('"backend/src/response"','"backend/src/response"\n "backend/src/services"');s+='''
func normalizeContactPhone(raw string)(string,bool){return services.NormalizeContactPhone(raw)}
func validateProfilePatch(p *models.AccountProfilePatch)string{return services.ValidateProfilePatch(p)}
func validCPF(cpf string)bool{return services.ValidCPF(cpf)}
''';p.write_text(s)
validation=validation.replace('func validCPF(cpf string) bool {','func ValidCPF(cpf string) bool {\n if len(cpf)!=11 {return false}\n for _,digit:=range cpf {if digit<\'0\'||digit>\'9\' {return false}}').replace('validCPF(cpf)','ValidCPF(cpf)').replace('func validateProfilePatch','func ValidateProfilePatch').replace('normalizeContactPhone(','NormalizeContactPhone(')
phone=phone.replace('func normalizeContactPhone','func NormalizeContactPhone').replace('regexp.MustCompile("^[1-9][0-9][0-9]{8,9}$").MatchString(normalized)','contactPhone.MatchString(normalized)')
phone+='\nvar contactPhone=regexp.MustCompile("^[1-9][0-9][0-9]{8,9}$")\n'
Path('backend/src/services/account_validation.go').write_text('package services\nimport("backend/src/models";"regexp";"strings";"time";"unicode/utf8")\n'+phone+validation)
p=r/'checkout_handler.go';s=p.read_text();a=s.index('// Valida e normaliza os campos do endere');address=s[a:];s=s[:a]+'func validShippingAddress(address *models.ShippingAddress)bool{return services.ValidShippingAddress(address)}\n';s=s.replace('"backend/src/response"','"backend/src/response"\n "backend/src/services"');s=s.replace('regexp.MustCompile(`^[a-zA-Z0-9-]{16,80}$`).MatchString','requestKeyPattern.MatchString');s+='\nvar requestKeyPattern=regexp.MustCompile(`^[a-zA-Z0-9-]{16,80}$`)\n';p.write_text(s)
address=address.replace('func validShippingAddress','func ValidShippingAddress').replace('a *models.ShippingAddress) bool {','a *models.ShippingAddress) bool {\n if a==nil {return false}').replace('regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`).MatchString','shippingCEPPattern.MatchString')
Path('backend/src/services/address_validation.go').write_text('package services\nimport("backend/src/models";"regexp";"strings")\nvar shippingCEPPattern=regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`)\n'+address)
# Authenticated responses include error paths; public assets keep existing cache behavior.
p=Path('backend/src/routes/route_helpers.go');s=p.read_text().replace('publicRoute(mux, pattern, middlewares.AuthMiddleware(handler))','publicRoute(mux, pattern, func(w http.ResponseWriter,r *http.Request){\n w.Header().Set("Cache-Control","no-store")\n middlewares.AuthMiddleware(handler)(w,r)\n})');p.write_text(s)
# Explicit checks for actor IDs, even if a handler is invoked without route middleware.
for p in r.glob('*.go'):
 if p.name.endswith('_test.go'):continue
 s=p.read_text(encoding='utf-8-sig')
 s=re.sub(r'(\w+), _ := middlewares.GetUserIDFromContext\(r.Context\(\)\)',lambda m:m.group(1)+', authenticated := middlewares.GetUserIDFromContext(r.Context())\n if !authenticated || '+m.group(1)+'<=0 {response.Error(w,http.StatusUnauthorized,"Faça login para continuar.");return}',s)
 s=s.replace('if !ok {\n\t\tresponse.Error(w, 401','if !ok || userID <= 0 {\n\t\tresponse.Error(w, 401').replace('if !ok {\n\t\tresponse.Error(w, http.StatusUnauthorized','if !ok || userID <= 0 {\n\t\tresponse.Error(w, http.StatusUnauthorized')
 p.write_text(s)
# Business validation returned by the review service has a typed error.
p=Path('backend/src/services/product_review_service.go');s=p.read_text().replace('return err\n\t}\n\n\treturn service.Store.Save','return ValidationError(err.Error())\n\t}\n\n\treturn service.Store.Save');p.write_text(s)
p=r/'product_reviews.go';s=p.read_text();a=s.index('\t// Valida os campos da avalia');b=s.index('\t// Define o cadastro',a);s=s[:a]+s[b:];s=s.replace('switch {\n','var validation services.ValidationError\n switch {\n case errors.As(err,&validation):response.Error(w,http.StatusBadRequest,validation.Error())\n',1);p.write_text(s)
# Uniform recovery response covers missing account, cooldown and SMTP failures.
p=r/'auth_password_reset.go';s=p.read_text();a=s.index('\terr := h.Service.SendRecoveryCode');b=s.index('\n}\n',a);s=s[:a]+'''err := h.Service.SendRecoveryCode(r.Context(), req.Email)
 var validation services.ValidationError
 if errors.As(err,&validation){response.Error(w,http.StatusBadRequest,"Email inválido");return}
 if err!=nil && !errors.Is(err,services.ErrUserNotFound) && !errors.Is(err,services.ErrResetCodeCooldown) {log.Println("Falha interna na solicitação de recuperação")}
 w.Header().Set("Retry-After",strconv.Itoa(int(services.ResetResendCooldown.Seconds())))
 response.Success(w,http.StatusOK,"Se o e-mail estiver cadastrado, você receberá um código de recuperação.",nil)'''+s[b:];s=s.replace('"net/http"','"net/http"\n "log"\n "strconv"');p.write_text(s)
p=Path('backend/src/services/verification_code.go');s=p.read_text();s+='\n// Compartilhado com o cabeçalho HTTP, sem alterar a política de reenvio.\nconst ResetResendCooldown = resetResendCooldown\n';p.write_text(s)
# Shared decoder adapters are gone; set no-store on every auth endpoint.
for name in ['auth_handler.go','auth_password_reset.go','auth_reset_token.go','user_handler.go']:
 p=r/name;s=p.read_text();s=re.sub(r'(func \(h \w+\) \w+\(w http.ResponseWriter, r \*http.Request\) \{)',r'\1\n w.Header().Set("Cache-Control","no-store")',s);p.write_text(s)
# Direct handler method checks complement ServeMux, which continues to enforce route-specific methods.
allowed={
 'LoginUser':['POST'],'SendVerificationCode':['POST'],'ResetPassword':['POST'],'ValidateVerificationCode':['POST'],'ValidateResetToken':['POST'],'CreateUser':['POST'],
 'CreateProduct':['POST'],'AdminProduct':['GET','PATCH','DELETE'],'SaveProductVariants':['PUT'],'AdminImages':['GET','PUT','DELETE'],
 'UploadProductImage':['POST'],'UploadImage':['POST'],'CreatePromotion':['POST'],'List':['GET'],'Update':['PUT'],'AddProductToPromotion':['POST'],
 'Mine':['GET'],'Reviewable':['GET'],'Public':['GET'],'Home':['GET'],'Summaries':['GET'],'Save':['POST','PATCH'],'Admin':['GET'],'Moderate':['PATCH'],
 'AdminReviews':['GET'],'Reviews':['GET'],'Review':['GET','POST'],'GetDashboard':['GET'],
 'ListProducts':['GET'],'ListAdminProducts':['GET'],'GetProduct':['GET'],'ListRelatedProducts':['GET'],'ListProductBrands':['GET'],'ListProductTypes':['GET'],'GetPromotionalProducts':['GET'],
 'Highlights':['GET'],'Featured':['GET'],'Categories':['GET'],'Campaign':['GET'],'CampaignDetail':['GET'],
}
# Check real moderation route verbs instead of assuming PATCH.
for file in ['product_reviews.go','reviews.go']:
 print(Path('backend/src/routes',file).read_text())
for p in r.glob('*.go'):
 if p.name.endswith('_test.go'):continue
 s=p.read_text(encoding='utf-8-sig')
 def guard(m):
  receiver,name=m.group(1),m.group(2)
  methods=allowed.get(name)
  if name=='ServeHTTP':methods={'AccountHandler':['GET','PATCH','POST','PUT','DELETE'],'CheckoutHandler':['GET','POST'],'CartHandler':['GET','POST','PATCH','DELETE'],'FavoritesHandler':['GET','PUT','DELETE'],'OrderHistoryHandler':['GET','POST'],'AdminOrdersHandler':['GET','POST'],'AdminCustomerHandler':['GET']}.get(receiver)
  if not methods:return m.group(0)
  return m.group(0)+'\n if !allowMethods(w,r,'+','.join('http.Method'+x.title() for x in methods)+'){return}'
 s=re.sub(r'func \(h (\w+)\) (\w+)\(w http.ResponseWriter, r \*http.Request\) \{',guard,s)
 p.write_text(s)
