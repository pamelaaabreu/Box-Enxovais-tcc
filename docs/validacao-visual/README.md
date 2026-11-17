# Validação visual do catálogo

Com o Angular em `http://localhost:4200`, Go em `http://localhost:8080` e o catálogo demonstrativo aplicado, use Node 22 ou posterior e o Chrome local.

```powershell
$visualProfile = Join-Path $env:TEMP 'box-visual-catalogo'
Start-Process 'C:/Program Files/Google/Chrome/Application/chrome.exe' -ArgumentList '--headless=new','--remote-debugging-port=9228',('--user-data-dir="'+$visualProfile+'"'),'about:blank' -WindowStyle Hidden
node docs/validacao-visual/catalogo.cjs capturas-depois
```

Inspecione as PNGs das quatro larguras, compare com os estados anteriores e verifique as diferenças em galeria, texto, foco, CEP, recomendações e estoque. Para comparar com capturas aprovadas da mesma versão de Chrome, do mesmo ambiente de fontes e do mesmo banco, passe também o diretório anterior.

```powershell
node docs/validacao-visual/catalogo.cjs capturas-depois capturas-aprovadas
```

A comparação tolera até 0,25% de pixels com diferença acima de 10 níveis por canal para acomodar pequenas variações de antialiasing. Use o resultado com inspeção humana, pois diferenças de ambiente, foco e carregamento também podem alterar pixels. Atualize as imagens aprovadas após analisar cada diferença. A captura usa movimento reduzido e as asserções não dependem de autenticação, pedidos ou mutações no carrinho.

