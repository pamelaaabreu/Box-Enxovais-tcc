# 08 — Decisões técnicas observadas

Uma decisão pode estar comprovada no código, enquanto a explicação de seu benefício é uma interpretação técnica. A tabela separa as duas coisas. Não atribua à equipe uma motivação histórica que não está documentada.

| Solução comprovada | Benefício técnico interpretado | Custo ou limite |
|---|---|---|
| Componentes Angular standalone e rotas lazy | Dependências locais e carregamento por funcionalidade | Convivem com módulo administrativo; não significa aplicação inteira sem módulos |
| Go com net/http | Controle explícito do servidor, métodos e middleware sem framework adicional | Exige disciplina para padronizar validações e respostas |
| PostgreSQL relacional | FKs, unicidade e transações protegem relações comerciais | Não elimina a necessidade de validar regras no Go |
| Migrations incrementais | Schema reproduzível e rastreável | Down pode ser inseguro após uso; há guardas deliberadas em 52/53 |
| JWT HS256 e bcrypt | Autenticação verificável e senha não armazenada em texto | Expiração, segredo e proteção contra XSS continuam necessários |
| Inteiros em centavos no checkout | Soma e rateio exatos, sem arredondamentos acumulados | Catálogo decimal e contrato HTTP precisam de conversão explícita |
| JSONB em características e endereço histórico | Flexibilidade técnica e snapshot do destino | Não deve substituir tabelas de variantes, estoque ou relacionamentos |
| Repositories com transações | Concentra SQL e permite atomicidade da compra | Checkout usa repository diretamente; camadas não são uniformes em todos os fluxos |
| Campos esperados em edição e reordenação | Detecta alterações concorrentes em vez de sobrescrever silenciosamente | Interface precisa apresentar conflito e permitir recarregar |
| Pagamento demonstrativo | Permite estudar compra sem coletar dados financeiros sensíveis | Não comprova cobrança, aprovação bancária ou liquidação |
| Componentes compartilhados de confirmação, estados e avaliação | Mesma semântica e aparência em diferentes telas | Uma alteração global exige avaliar consumidores existentes |
| Compatibilidade por reexportação de tipos | Organização por domínio sem migração arriscada de todos os imports | Fachada antiga permanece e pode ser descontinuada gradualmente |

## Por que não refazer tudo antes da defesa

O pedido prioriza estabilidade. Tipos privados de uma consulta Go não foram movidos apenas para uniformizar pastas. Componentes fora do grafo de produção com testes/referências foram classificados como incertos, preservados e documentados. Não houve atualização oportunista de bibliotecas ou remoção de arquivos comerciais.

## Escolha do parcelamento

Persistir quantidade e total histórico é suficiente para reproduzir o plano demonstrativo. Não é necessário criar uma tabela de cobranças para cada parcela quando não existe integração financeira. A regra de divisão é determinística: parcelas recebem o quociente e as primeiras recebem um centavo do resto. Em uma integração real, datas, liquidações e identificadores da adquirente exigiriam outro modelo.

## Evoluções recomendadas

Depois da apresentação, centralizar URL de API por ambiente, atualizar dependências com análise de compatibilidade, estudar SSR apenas se houver objetivo de SEO, ampliar testes assistivos e planejar armazenamento de mídia/backup para produção. São recomendações futuras, não funcionalidades implementadas por esta tarefa.
