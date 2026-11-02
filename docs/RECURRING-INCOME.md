# Receitas recorrentes

Ao salvar uma receita com “Receita recorrente” ativada, o lançamento inicial é
uma receita recebida na data informada. Uma programação mensal independente
é guardada em `Income.income_schedule`, começando no mês seguinte ao mais
recente entre a data do lançamento e hoje. Marcar uma receita antiga não gera
previsões retroativas automaticamente.

Em **Receitas → Receitas recorrentes**, as previsões do mês selecionado são
calculadas a partir dessa programação. Não são registros financeiros e não entram
no saldo, gráficos, relatórios nem nos totais do assistente. Não é necessário
deixar o aplicativo aberto: ao voltar, as previsões são calculadas novamente.
O seletor de mês permite consultar meses anteriores ou futuros. Não há notificações
externas nem execução em segundo plano.

No dia previsto ou depois, **Confirmar recebimento** permite revisar valor e data
reais. Só essa confirmação cria uma nova receita recebida. O servidor usa a data
de São Paulo, verifica o usuário, bloqueia a origem durante a transação e garante
um único recebimento por programação/mês. Alterar o dia não recria meses já
confirmados. Uma programação alterada depois de abrir a confirmação exige
atualizar a página e revisar os dados novamente.

O dia original é preservado: dia 31 vira 28/29 em fevereiro e volta para 31 em
março. Em **Gerenciar repetições → Configurar**, é possível mudar descrição,
categoria, valor previsto, dia, início e fim. Isso altera apenas previsões ainda
não recebidas. Desativar encerra as previsões e mantém os recebimentos. Para
reativar sem recuperar previsões antigas, ajuste a data inicial.

Marcações antigas de recorrência continuam disponíveis, mas só produzem
previsões depois de ativar/configurar a programação. Recebimentos gerados não
viram novas programações. Editar seu valor/data não muda a programação.

Excluir um recebimento confirmado torna sua previsão disponível novamente.
Excluir a receita que originou a programação encerra a repetição e desliga os
vínculos dos recebimentos restantes, preservando seus valores/datas. Backup e
importação preservam a programação e remapeiam vínculos entre contas.

Antes de publicar a interface, aplicar a migração `recurring_income_forecasts`.
Ela acrescenta validação, índice de unicidade e funções com privilégios do usuário;
não ativa programações nem gera receitas para contas existentes.
