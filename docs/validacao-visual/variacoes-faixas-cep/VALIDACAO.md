# Validação — Variações e Faixas de CEP

As imagens originais do ZIP estão na pasta `referencias/`. São referências de layout, não dados cadastrados nem autorização para adotar fonte serifada ou botões bordô.

## Implementação

- Variações: preservados componentes, resumo dinâmico, formulário, máscara, SKU e estados compartilhados; padding desktop das linhas reduzido de 12 para 10 px.
- Faixas de CEP: tabela compacta na ordem Região, Faixa de CEP, Frete, Prazo, Status e Ações; filtro Material, menu Material e paginação compartilhada.
- Drawer Material de 540 px à direita, limitado à tela; corpo rolável e rodapé separado. Foco inicial, Escape, restauração de foco e confirmação compartilhada de descarte. Máscara monetária reutilizada; contrato numérico e centavos preservados.
- Campos inválidos e conflito de cobertura recebem mensagens associadas; falha ao alternar status mantém o valor anterior.

## Verificações realizadas

- 12 testes Angular direcionados aprovados (ShippingRanges, ProductVariants e ProductCommerceSummary).
- Build de produção aprovado após o ajuste final dos rótulos. Permanece aviso preexistente do SCSS de Promoções (15,97 kB / aviso de 14 kB).
- Chrome real, respostas HTTP em memória: criação, edição, exclusão confirmada/cancelada, moeda, limites invertidos, conflito 409, toggle com sucesso/falha, descarte/continuação, filtros, vazio e recuperação de erro aprovados. Variações com zero, uma e várias linhas, estoque zero, máscara, adição/remoção e validação aprovadas. Nenhum erro JavaScript.
- Navegação e capturas em 320, 390, 768, 1024, 1440 e 1920 px, considerando sidebar. Inspecionadas capturas de listagem, drawer, conflito e variações desktop/mobile; sem sobreposição dos inputs ou da lixeira. A tabela usa rolagem confinada nas telas estreitas, preservando todas as colunas.
- Conferência interativa adicional com Windows/Chrome: abertura do drawer, fechamento por Escape, dropdown Material e filtro Inativas, com atualização da listagem observada.
- Acessibilidade direcionada: labels estáveis, erros por aria-describedby/aria-invalid, foco no drawer e controles de 44 px. Não equivale a uma auditoria WCAG completa.

## Arquivos

- `frontend/src/app/components/admin/shipping-ranges/shipping-ranges.component.{ts,html,scss,spec.ts}` (SCSS próprio criado na pasta do componente).
- `frontend/src/app/shared/components/product-variants/product-variants.component.scss`.
- `frontend/src/styles.scss`: somente regra limitada ao painel `.box-shipping-drawer`.
- `frontend/e2e/shipping-ranges-ui.cjs`: regressões isoladas reproduzíveis; requer Playwright instalado via PLAYWRIGHT_MODULE e build de produção. Evidências definidas por EVIDENCE_DIR.

Nenhum arquivo Go, endpoint, migration ou dado PostgreSQL foi alterado. O backend não foi usado nos cenários de escrita; a validação real de integridade/sobreposição PostgreSQL não foi reexecutada nesta tarefa de UI. Servidores do usuário em 4200/8080 preservados. Runtime e janela de testes descartáveis encerrados após a validação.
