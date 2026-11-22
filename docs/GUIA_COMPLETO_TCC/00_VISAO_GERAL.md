# 00 — Visão geral

## Problema e público

A Box Enxovais organiza a venda de artigos para casa em um catálogo com categorias, imagens, medidas, materiais e combinações visuais. O problema central não é apenas expor fotografias: o cliente precisa identificar a peça correta, escolher uma variante disponível, conhecer a entrega e concluir uma compra coerente com estoque e preço. O administrador precisa manter esse catálogo sem comprometer pedidos anteriores.

O público demonstrado é formado por consumidores de enxovais e administradores da loja fictícia. A interface pública oferece navegação por categorias, busca, favoritos, carrinho e histórico. O painel reúne produtos, cadastros auxiliares, promoções, pedidos, clientes, métricas e relatórios. A consulta de clientes administrativos não deve ser apresentada como um CRM completo nem como autorização para editar arbitrariamente contas.

## Objetivos verificáveis

O sistema conecta Angular, Go e PostgreSQL por HTTP/JSON. Sua principal demonstração é um fluxo de compra completo: autenticar, escolher produto/tamanho, adicionar ao carrinho, validar cobertura de CEP, conferir subtotal/desconto/frete, simular pagamento e consultar o pedido. Um cancelamento autorizado repõe o estoque sem apagar o histórico.

Produtos simples usam preço e estoque próprios. Produtos com variantes possuem medidas e saldos específicos. O SKU da loja é separado do ID interno e gerado no backend/banco; editar o nome não deve gerar uma nova identificação. Fotografias permanecem em arquivos e seus vínculos são armazenados no banco.

## O que é demonstrativo

O catálogo e parte das fichas comerciais foram construídos para o TCC. Há materiais, composições e valores demonstrativos identificados nos registros e documentação de origem. A interface não representa certificação de fabricante. Fretes são valores acadêmicos configurados em faixas reais de CEP, não cotações contratadas de transportadoras.

A compra usa o estado `simulated_approved`. Não há gateway adquirente, captura de cartão, aprovação bancária ou boleto liquidado. O seletor de cartão oferece até seis parcelas sem juros, calculadas em centavos, sem solicitar número ou código de segurança. E-mails dependem do SMTP configurado; teste de template não prova entrega real na caixa do destinatário.

## Funcionalidades e limites

Avaliações de experiência são ligadas a um pedido confirmado do próprio cliente, com nota geral, comentário opcional e consentimento separado para publicação. A moderação administrativa não transforma consentimento ausente em autorização. A mesma avaliação aparece na confirmação e no histórico, sem permitir duas gravações para um pedido.

A loja não implementa rastreamento logístico real, conciliação financeira, emissão fiscal ou antifraude de pagamento. São evoluções possíveis, junto de observabilidade de produção, acessibilidade auditada por usuários e atualização de dependências. Essas limitações não invalidam o fluxo acadêmico, mas precisam ser explicitadas na defesa.

Leia [arquitetura](01_ARQUITETURA.md) para conectar esses objetivos às camadas e [testes](07_TESTES_E_QUALIDADE.md) para saber o que foi efetivamente verificado.
