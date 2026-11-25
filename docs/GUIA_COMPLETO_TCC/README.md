# Guia completo da Box Enxovais para o TCC

Este guia explica a implementação existente, seus limites e a relação entre interface, API e banco. Leia primeiro a visão geral e siga o roteiro de quatro dias. Os exemplos representam um comércio fictício: aprovação de pagamento e parcelamento são demonstrativos, não cobranças bancárias.

## Estado de entrega

Código e estrutura revisados em 25/11/2026. Último estado confirmado do principal: migration 54, dirty=false; 55 pendente. Documentos de implantação 52/53 e progresso mantêm histórico datado, não instrução para reaplicar migrations. Nenhum comando do guia autoriza alterações no principal. Resultados atuais: 433 Angular, Go/PostgreSQL normal/race e build aprovados; limites no AUDITORIA_FINAL.md.

## Índice

1. [Visão geral](00_VISAO_GERAL.md): problema, objetivos e limites.
2. [Arquitetura](01_ARQUITETURA.md): camadas e comunicação.
3. [Frontend Angular](02_FRONTEND_ANGULAR.md): páginas, estado e formulários.
4. [Backend Go](03_BACKEND_GO.md): HTTP, autorização e persistência.
5. [Banco de dados](04_BANCO_DE_DADOS.md): relações, dinheiro e histórico.
6. [Fluxos do sistema](05_FLUXOS_DO_SISTEMA.md): caminhos completos de usuário a banco.
7. [Segurança](06_SEGURANCA.md): proteções e limitações.
8. [Testes e qualidade](07_TESTES_E_QUALIDADE.md): resultados e reprodução segura.
9. [Decisões técnicas](08_DECISOES_TECNICAS.md): fatos e interpretações.
10. [Preparação para a banca](09_GUIA_DA_BANCA.md): apresentação e perguntas.
11. [Glossário](10_GLOSSARIO.md): conceitos com exemplos.
12. [Mapa navegável](11_MAPA_DE_ARQUIVOS.md): onde encontrar a implementação.
13. [Roteiro de estudos](12_ROTEIRO_DE_ESTUDOS.md): revisão intensiva.

O [progresso](PROGRESSO.md) diferencia trabalho concluído de pendências de implantação. O [relatório consolidado](../../AUDITORIA_FINAL.md) registra validações. A [classificação de código não utilizado](../auditoria/CODIGO_NAO_UTILIZADO.md) justifica as remoções conservadoras.
