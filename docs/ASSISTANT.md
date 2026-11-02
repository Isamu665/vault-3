# Assistente financeiro

Autorize o acesso aos dados na conversa. O servidor consulta registros com JWT do usuário, filtro de proprietário e RLS. Envia campos financeiros conhecidos, descrições e notas ao Google/Gemini. Não envia credenciais, sessões ou preferências do navegador. Sem autorização, não consulta registros.

Cálculos mensais em código separam recorrentes, essenciais, interseção, união, sem classificação e aportes. Contas previstas ficam separadas das despesas realizadas. A interface mostra os lançamentos usados.

Uma proposta por vez: criar/atualizar receita, despesa, conta ou meta. Prévia antes/depois, confirmação explícita, histórico por conta, expiração em 15 minutos e desfazer com bloqueio se houver edição posterior. Clique repetido não duplica. Não há pagamentos, ações em lote, agendamentos nem alterações de reservas/investimentos/dívidas pelo chat.

Limites: 10.000 registros e 300.000 caracteres de contexto, sem envio parcial. Histórico de ações não integra o backup JSON financeiro. Conversa temporária; histórico recente enviado somente com autorização. O histórico registra ações do aplicativo, mas não é inviolável contra o próprio usuário com acesso direto à API.

20 testes cobrem cálculos, servidor simulado, paginação, consentimento, RLS, confirmação, desfazer e conflitos. Nenhuma ação de teste foi aplicada às finanças reais. Typecheck mantém problemas de tipagem herdados.

# Permissão de consulta

No primeiro uso de Conversar, o usuário autoriza a consulta à conta e o envio dos
dados necessários ao Google/Gemini. A permissão é necessária para enviar perguntas
e sugestões e fica salva por usuário neste navegador. Ao fechar o painel,
iniciar nova conversa ou recarregar a página, não é necessário marcar novamente.
Em outro navegador/dispositivo ou após limpar o armazenamento, autorize novamente.

O rodapé confirma a permissão salva e oferece **Revogar permissão**. A revogação
bloqueia novas perguntas e limpa a conversa atual. O estado é conferido novamente
antes de enviar, e alterações em outras abas atualizam o painel. A permissão não
entra em backups nem é transferida a outro usuário. Se o navegador bloquear o
armazenamento, a permissão não é concedida e aparece uma mensagem de erro.

O servidor mantém a verificação `shareAccount: true` por requisição; a permissão
salva apenas substitui a necessidade de marcar a caixa a cada abertura. A prévia
e confirmação de ações financeiras continuam separadas da permissão de consulta.
