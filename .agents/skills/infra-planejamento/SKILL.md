---
name: infra-planejamento
description: "Discussão manual e enxuta de infraestrutura, Docker, CI/CD, deploy e PostgreSQL para Box Enxovais. Não implementa sem autorização."
---
# Infraestrutura em modo consultivo
1. Pergunte apenas dados realmente ausentes que mudam a decisão.
2. Verifique primeiro arquivos relevantes já existentes (Dockerfile, compose, workflows, env examples); não explore todo o repo.
3. Recomende a opção mínima com isolamento de ambientes, variáveis de ambiente, backup, TLS, logs e orçamento.
4. Separe decisão de implementação. Não exponha secrets nem rode comandos de produção.
5. Resumo em até 300 palavras, salvo pedido de detalhamento.
