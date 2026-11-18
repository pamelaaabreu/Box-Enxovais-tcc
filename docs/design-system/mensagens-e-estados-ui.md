# Mensagens e estados de interface

Use Montserrat, paleta oliva e superfícies creme do projeto. Reutilize os controles e tokens usados em cadastro e Minha Conta. Mantenha feedback de campo junto ao input, com cor terracota, texto de 12–13 px e peso 500. Associe erro ao campo com `aria-invalid` e `aria-describedby`, depois de interação ou tentativa de envio.

Use `CustomAlertService` para confirmações assíncronas globais e uma região de status para resultados do próprio fluxo. Preserve os valores em caso de falha. Diferencie formato inválido, CEP inexistente, cobertura indisponível e falha de conexão. Use um foco de teclado visível e controles que permanecem alinhados durante o carregamento.

Os dados comerciais e o frete de demonstração são identificados na documentação e nos pontos institucionais do projeto.

Separe estoque físico, quantidade na sacola e limite de inclusão por produto e variante. Use o toast compartilhado para confirmar inclusão. Quando a quantidade atingir o limite, ofereça **Ver sacola**. Quando superar o estoque atual, oriente o ajuste do item.

A sacola não reserva estoque. O checkout revalida e baixa as unidades na transação que grava o pedido como `simulated_approved`. Repetir a mesma chave devolve o pedido existente. O cancelamento só repõe unidades quando o pedido tem baixa registrada e muda de estado.

O foco de teclado é centralizado em `frontend/src/app/shared/css/focus.css`: anel de 2 px, afastamento de 3 px e tokens `--box-focus-color`, `--box-focus-on-dark` e `--box-focus-offset`. Fundos escuros utilizam oliva claro. Não combine o anel com sombras de foco. Em campos Material e controles compostos, apenas a superfície externa recebe o anel por `:has(:focus-visible)`; o controle interno continua recebendo o foco real. Use um afastamento interno nos controles sujeitos a recorte. Estados de erro conservam suas bordas, sem substituir o foco. Cores forçadas usam `Highlight`.
