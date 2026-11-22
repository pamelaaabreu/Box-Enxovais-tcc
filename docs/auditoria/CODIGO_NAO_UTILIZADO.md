# Auditoria de uso de código — 22/11/2026

## Método e limites

O grafo foi obtido pelo compilador TypeScript a partir de `frontend/tsconfig.app.json`, incluindo imports dinâmicos das rotas. Foram analisados 118 arquivos TypeScript próprios de produção (sem specs); 11 estavam fora do grafo. Isso não foi tratado automaticamente como ausência de uso. Foram cruzados símbolos, seletores, testes, scripts, documentação e configuração. Não houve remoção em massa por extensão, ausência de import direto ou ausência na Home.

## Remoção segura comprovada

| Candidato | Ação e evidência |
| --- | --- |
| `frontend/src/app/features/catalog/data/catalog.mock.ts` | Removido. Export `CATALOG_MOCK` sem consumidor em código, testes, rotas, scripts ou SQL. Somente o README antigo citava o protótipo. `CatalogService` usa `ProductService` e a API; README substituído por descrição atual. Nenhuma imagem referenciada pelo mock foi removida. |
| Injeção privada `productService` de `FeaturedProductsComponent` | Removidos o campo não utilizado e seu import. Confirmado por `noUnusedLocals`; o construtor de `ProductService` apenas injeta HttpClient, sem operação necessária à vitrine. |
| Parâmetros `route` de `AdminGuard` | Renomeados para `_route`, preservando as assinaturas dos guards e a lógica de autorização. `noUnusedParameters` apontou as duas ocorrências. |
| Script `serve:ssr:frontend` | Removido de package.json. O builder atual produz SPA, sem entrada/configuração SSR que gere `dist/frontend/server/server.mjs`; nenhuma chamada desse script foi encontrada fora do próprio package.json. Não foram removidas dependências ou configurações de servidor em massa. |

## Uso incerto: manter

Os caminhos abaixo ficaram fora do grafo atual. Foram preservados para não descartar testes válidos, compatibilidade ou configurações ainda documentadas antes da defesa:

| Candidato | Evidência e decisão |
| --- | --- |
| `app.config.server.ts`, `app.routes.server.ts` | Configurações de servidor se referenciam. SSR não está ativado no build atual; eventual retomada exige configuração própria. Manter como uso incerto, sem anunciar SSR como funcionalidade pronta. |
| `core/services/sweet-alert.service.ts` | Fora do grafo principal, mas possui testes de escape de conteúdo e referência documental. Manter. O fluxo atual prioriza CustomAlertService. |
| `features/add-to-promotion/add-to-promotion.component.*` | Wrapper com teste próprio; rota antiga hoje redireciona para Promoções. Manter a compatibilidade testada. |
| `features/catalog/components/product-filters/*`, `product-sort/*` | Componentes legados documentados, substituídos pela composição atual de catálogo. Manter nesta rodada; futura remoção deve consolidar a documentação e examinar consumidores externos. |
| `features/promo-grid/*`, `features/testimonials/*` | Vitrines legadas; promo-grid tem teste próprio. Não confundir com a vitrine de campanhas e depoimentos efetivamente conectada à Home. Manter. |
| `shared/ui/cards/*`, `shared/ui/titulo-decorado/*` | Componentes antigos, com testes/referências próprios em parte da estrutura. Manter até uma descontinuação específica. |
| Dependências npm não importadas diretamente na entrada | Há adaptadores de ferramentas, ícones, CSS de bibliotecas e componentes legados. Nenhuma remoção/atualização de pacote foi feita por mera ausência de import no grafo principal. Isso evita alterar lockfile e ferramentas às vésperas do TCC. |

## Recursos necessários: preservar

- Rotas lazy, guards, interceptor JWT, módulos administrativos e endpoints públicos/administrativos: fazem parte de contratos, testes e possíveis consumidores HTTP. Não foram apagados porque uma página específica não os chama.
- `backend/uploads`, imagens públicas, ícones, imagens referenciadas no PostgreSQL, `backend/demo-assets`, manifestos/importadores: uso por URLs e scripts; o grafo TypeScript não comprova ausência de uso desses arquivos.
- Migrations 1–53, backups, .env, configurações de agentes e evidências acadêmicas: preservados. As migrations 52 e 53 permanecem pendentes no principal.
- Testes existentes: preservados e adaptados quando o contrato funcional exigiu. `go mod tidy -diff` passou sem indicar alterações de dependências Go.

## Artefatos temporários

O schema de auditoria deixado pela interrupção anterior foi identificado pelo nome registrado no log e removido somente depois de confirmar ausência do servidor na porta 8086. As ferramentas, logs e executáveis desta rodada são temporários e serão encerrados/removidos na validação final. Nenhum diretório externo foi limpo.

## Validação

Os testes, compilação e verificação final de referências estão registrados no [relatório de auditoria](../../AUDITORIA_FINAL.md) e no [guia de testes](../GUIA_COMPLETO_TCC/07_TESTES_E_QUALIDADE.md). O objetivo desta limpeza é reduzir inconsistências comprovadas, não maximizar a quantidade de arquivos excluídos.
