# Catálogo Travesseiros e correções de detalhes

O `bd_box` local passou da versão 20 à 23. A categoria Travesseiros não existia. A migration 21 criou a categoria, 12 produtos e quatro variantes de altura nos produtos Memória Clássica e Contorno Suave. As capas foram geradas individualmente para o catálogo fictício. Preço, materiais, composição, cuidados e estoque são dados simulados. Os IDs e caminhos de cada capa estão em `catalogo-travesseiros-demonstracao.json`.

## Composição comercial

A migration 22 reclassificou somente o produto 2, antes Jogo de Cama Essência Floral — Verde Suave. A indicação explícita de peça única prevaleceu sobre o antigo kit demonstrativo. O nome passou a Edredom Essência Floral — Verde Suave, na categoria Cama / Edredons. As variantes 1, 2 e 3 mantiveram seus IDs, preços, estoque e dimensões de referência. As composições anteriores com lençol e uma ou duas fronhas deram lugar a `1 edredom`. Os demais kits auditados permaneceram conforme o cadastro, incluindo cobre-leitos de peça única, colchas Provence com acessórios explicitamente cadastrados, mantas/peseiras e protetores.

## Galerias Cama

| ID | Produto | Antes | Depois | Arquivos novos em uploads |
|---:|---|---:|---:|---|
| 1 | Jogo de Cama Essência Floral — Verde Oliva | 1 | 4 | `cama-detalhe-023-1-1.jpg`, `cama-detalhe-023-1-2.jpg`, `cama-detalhe-023-1-3.jpg` |
| 2 | Edredom Essência Floral — Verde Suave | 1 | 5 | `cama-detalhe-023-2-capa-1448.jpg`, `cama-detalhe-023-2-1.jpg`, `cama-detalhe-023-2-2.jpg`, `cama-detalhe-023-2-3.jpg`, `cama-detalhe-023-2-4.jpg` |
| 3 | Jogo de Cama Essência Floral — Botânico | 1 | 4 | `cama-detalhe-023-3-1.jpg`, `cama-detalhe-023-3-2.jpg`, `cama-detalhe-023-3-3.jpg` |
| 5 | Jogo de Cama Aurora Floral — Vinho | 1 | 4 | `cama-detalhe-023-5-1.jpg`, `cama-detalhe-023-5-2.jpg`, `cama-detalhe-023-5-3.jpg` |
| 6 | Jogo de Cama Serenidade — Azul | 1 | 4 | `cama-detalhe-023-6-1.jpg`, `cama-detalhe-023-6-2.jpg`, `cama-detalhe-023-6-3.jpg` |
| 12 | Edredom Geométrico — Rosa Nude | 1 | 4 | `cama-detalhe-023-12-1.jpg`, `cama-detalhe-023-12-2.jpg`, `cama-detalhe-023-12-3.jpg` |

São ilustrações geradas com referência nas capas cadastradas, com inspeção da paleta, motivo e aparência da peça. Elas não certificam reprodução física exata do tecido. Os recortes tradicionais de outros produtos foram preservados. A capa antiga do produto 2 tem 742 × 990 px e foi preservada como arquivo para reversão. A nova tem 1448 × 1086 px, com uma versão otimizada de 640 px para o `srcset`. O zoom usa a versão de 1448 px. As imagens secundárias de edredons dobrados têm dobras espessas e arredondadas. As opções dobradas que pareciam edredons para produtos do tipo jogo de cama foram descartadas e refeitas como lençóis planos.

## Conferência das referências

As nove capturas da interface foram conferidas. O resumo ganhou contraste e corpo, o texto de dimensões continua vindo da variante, a composição foi corrigida no banco, Queen tem uma borda única e foco de teclado separado por preenchimento, e o erro de CEP aparece junto ao campo. A aba ativa recebeu indicador de 4 px, a tabela de atributos foi preservada e os cuidados mantêm SVGs com mais contraste. A imagem principal nova é servida com resolução real maior. As três referências fotográficas orientaram dobra, caimento e volume, e a referência de recomendações orientou o badge superior esquerdo e a ordem favorito, ampliar, carrinho.

Testes no Chrome em 1440, 1024, 768 e 390 px passaram. O roteiro compara as capturas com a referência inspecionada, com tolerância de 0,25% para pequenas diferenças de renderização. Relação entre título e fundo nos tons usados no texto: 7,65:1 ou mais para descrição e cuidados, 5,52:1 ou mais para erro de CEP. Os testes Angular cobriram sucesso, erro de rede e CEP fora de cobertura com respostas controladas. Os testes Go de carrinho/checkout por variante e faixas de entrega usaram schemas isolados. O build de produção passou com os limites existentes após separar os estilos de Detalhes do Pedido dos demais estilos de Meus Pedidos, preservando a ordem das regras. O caminho de execução está em `validacao-visual/README.md`.

