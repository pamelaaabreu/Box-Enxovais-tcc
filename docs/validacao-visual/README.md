# Validação visual da página de produto

1. Inicie o Go e o Angular com os dados de desenvolvimento. Use o mesmo navegador, zoom de 100% e uma sessão sem login. Aguarde o carregamento das fontes e das imagens.
2. Abra `/produto/protetor-softcare-27` no catálogo local e selecione a segunda miniatura. Capture do topo da página com viewport de 1080 px de altura, nas larguras de 1440, 1024, 768 e 390 px. As referências desta revisão ficam em [produto](produto/).
3. Compare as capturas lado a lado. Confira breadcrumb, nitidez, enquadramento, miniaturas, alinhamento do bloco de compra, campo de CEP, as colunas de descrição e os cards de recomendação. Verifique que a largura do documento não ultrapassa a viewport.
4. Abra e feche o zoom com mouse e teclado. Confira que a imagem ampliada é a mesma miniatura selecionada. Repita com produto de uma só imagem e com os estados disponíveis no ambiente de teste.
5. Exercite CEP inválido, simulação com CEP atendido e consulta sem cobertura. Use uma faixa de teste controlada. Execute os testes Angular de detalhe, galeria e catálogo e os testes Go de frete e carrinho em schema isolado.
6. Para dados ausentes no catálogo de desenvolvimento, valide os estados com os testes isolados correspondentes. Registre no resultado quais interações foram feitas no navegador e quais dependeram de fixtures.
7. Atualize as referências somente após revisar e aceitar as diferenças visuais. Guarde o produto, a foto selecionada e as dimensões junto das capturas para permitir comparação em revisões futuras.
