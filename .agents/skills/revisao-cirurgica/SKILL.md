---
name: revisao-cirurgica
description: "Revisão sob demanda de diff ou arquivos específicos do Box Enxovais, focada em bugs e segurança, sem alterações. Use quando a pessoa pedir revisão de código."
---
# Revisão cirúrgica
1. Identifique arquivos alterados com `git diff --name-only` quando houver diff; caso contrário use os arquivos informados.
2. Leia apenas o diff e dependências indispensáveis.
3. Verifique contratos API, validação Go, permissões, Angular guards/interceptors, casos de erro e regressões.
4. Entregue até cinco achados com severidade, arquivo/linha e sugestão. Não reescreva o código nem faça melhorias cosméticas.
