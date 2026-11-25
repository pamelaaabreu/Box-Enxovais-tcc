# Checklist de aceitação manual — Box Enxovais

Data: 25/11/2026. Executar em 1920, 1440, 1280, 1024, 768, 430, 390 e 360 px, com zoom 100%. Esta lista complementa as evidências em `validacao-visual/qa-final-2026-11-25/`; não constitui uma lista de aprovações já dadas pelo usuário.

**Ambiente principal:** somente navegação e consulta. Cadastro, login de testes, alterações, favoritos, carrinho, pedidos, avaliações e exclusões devem usar uma cópia isolada com uploads próprios e SMTP capturado. O ambiente temporário desta rodada foi encerrado; não apontar testes de escrita ao `bd_box`.

| Página / cenário | Pré-condição | Passos | Resultado esperado | Aceitação |
|---|---|---|---|---|
| Home / consulta | Principal ou cópia; visitante | Percorrer os três banners, novidades, categorias e coleção | Fotos carregadas, texto legível, links corretos, sem deslocamentos ou cortes | ☐ Aprovado ☐ Reprovado |
| Catálogo / consulta | Produtos publicados | Buscar nome e SKU; ordenar; filtrar; paginar; abrir produto | Resultado coerente, filtros preservados e estados vazios claros | ☐ Aprovado ☐ Reprovado |
| Produto / consulta | Produto simples e com variantes | Trocar fotos e tamanhos; comparar preço, estoque, estrelas e dimensões | Preço/estoque correspondem à seleção; indisponíveis não compráveis | ☐ Aprovado ☐ Reprovado |
| Cadastro/login/recuperação | **Isolado**, e-mail capturado localmente | Criar conta, tentar repetição, recuperar por código, trocar senha, entrar/sair | Validações específicas, respostas privadas, senha anterior rejeitada | ☐ Aprovado ☐ Reprovado |
| Minha conta / endereços | **Isolado**, cliente autenticado | Criar/editar endereço; definir padrão; selecionar outro; excluir | Dados persistidos, seleção correta e sem acesso a endereço de outra conta | ☐ Aprovado ☐ Reprovado |
| Favoritos/carrinho | **Isolado**, cliente | Favoritar; adicionar variante; mudar quantidade; remover item | Nome, variante, imagem e total corretos; limite de estoque respeitado | ☐ Aprovado ☐ Reprovado |
| Entrega | **Isolado**, carrinho válido | CEP 87502-100, endereço salvo, CEP inválido e sem cobertura; trocar CEP | Frete/prazo recalculados; sem cobertura não avança nem finaliza via API | ☐ Aprovado ☐ Reprovado |
| Pagamento/revisão | **Isolado** | Pix, boleto e cartão em seis parcelas; revisar; confirmar uma vez | Subtotal, desconto, frete, parcelas e total persistidos; carrinho limpo | ☐ Aprovado ☐ Reprovado |
| Confirmação/histórico | **Isolado**, pedido criado | Ver ilustração; abrir detalhes; recarregar; cancelar com motivo | Imagem íntegra, dados históricos estáveis e reposição única | ☐ Aprovado ☐ Reprovado |
| Avaliações | **Isolado**, compra elegível | Avaliar compra/produto; editar produto; moderar; conferir cards/Home | Propriedade validada; edição sem duplicação; média/contagem coerentes | ☐ Aprovado ☐ Reprovado |
| Newsletter | **Isolado**, SMTP local | Inscrever e repetir; simular falha do transporte no harness | Resposta neutra; inscrição única; sem reenvio indiscriminado | ☐ Aprovado ☐ Reprovado |
| Admin / navegação | Admin da cópia | Sidebar, teclado, aliases antigos, menu móvel e logout | Destinos e item ativo corretos; Escape devolve foco | ☐ Aprovado ☐ Reprovado |
| Admin / produto simples | **Isolado** | Novo produto, preencher características/preço/estoque; salvar; enviar imagens; concluir | SKU automático e estável; fotos preservadas; retorno à listagem | ☐ Aprovado ☐ Reprovado |
| Admin / edição e variantes | **Isolado** | Editar; adicionar Solteiro/Casal/Queen; alterar valores; remover; testar inválidos | Resumos automáticos; máscara monetária; validações individuais; conflito de edição rejeitado | ☐ Aprovado ☐ Reprovado |
| Admin / galeria | **Isolado** | Enviar JPEG/PNG/WebP; definir capa; reordenar; remover vínculo | Ordem/capa persistem; imagem de variante mantém vínculo; erros claros | ☐ Aprovado ☐ Reprovado |
| Admin / descarte e exclusão | **Isolado** | Continuar edição/descartar; excluir sem vínculo; arquivar com pedido | Confirmação acessível; sem perda de histórico, SKU ou estoque indevido | ☐ Aprovado ☐ Reprovado |
| Admin / cadastros | **Isolado** | Categoria/marca/faixa de CEP: criar, editar, buscar, excluir; tentar sobreposição | Validações e integridade preservadas; dropdowns e paginação reutilizados | ☐ Aprovado ☐ Reprovado |
| Admin / campanha | **Isolado** | Criar/editar quatro abas; participantes/SKU; imagem; desconto; prévia | Payload sem auditoria de leitura; preço público coerente e original preservado | ☐ Aprovado ☐ Reprovado |
| Admin / clientes e pedidos | Consulta na cópia | Buscar, filtrar, paginar e abrir detalhes | Dados coerentes, valores históricos e frete separados | ☐ Aprovado ☐ Reprovado |
| Dashboard/relatórios | Consulta na cópia | Todos os períodos/agrupamentos; intervalo vazio; quatro relatórios e CSV disponíveis | Seis gráficos/cards; datas legíveis; tooltip Montserrat; dados conciliáveis | ☐ Aprovado ☐ Reprovado |
| Estados/teclado | Cópia; falhas controladas | Erro 503 e recarregar; vazio; carregamento; Tab, Enter e Escape | Feedback compartilhado, foco visível, sem aprisionamento indevido | ☐ Aprovado ☐ Reprovado |
| Revisão visual final | Todas as larguras | Comparar proporções, fontes, geometria dos estados, bordas, modais e alinhamentos | Sem cortes/overlays; tabela móvel em cards; layout aprovado preservado | ☐ Aprovado ☐ Reprovado |

## Ressalvas para a apresentação

- Seis links institucionais do rodapé ainda apontam para `#`; não tratá-los como páginas implementadas.
- Não foram realizados pagamento real nem entrega SMTP externa nesta rodada.
- Axe não substitui leitura assistiva manual. Conferir com leitor de tela e alto contraste se forem requisitos da banca.
- A fila de recuperação SMTP é limitada e em memória; reinício pode perder tentativas pendentes.
- A leitura direta de produto arquivado permanece disponível pelo contrato atual, embora o produto seja removido da listagem pública. Não confundir arquivamento com exclusão física.
