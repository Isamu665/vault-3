# Assistente financeiro

Autorize o acesso aos dados na conversa. O servidor consulta registros com JWT do usuário, filtro de proprietário e RLS. Envia campos financeiros conhecidos, descrições e notas ao Google/Gemini. Não envia credenciais, sessões ou preferências do navegador. Sem autorização, não consulta registros.

Cálculos mensais em código separam recorrentes, essenciais, interseção, união, sem classificação e aportes. Contas previstas ficam separadas das despesas realizadas. A interface mostra os lançamentos usados.

Uma proposta por vez: criar/atualizar receita, despesa, conta ou meta. Prévia antes/depois, confirmação explícita, histórico por conta, expiração em 15 minutos e desfazer com bloqueio se houver edição posterior. Clique repetido não duplica. Não há pagamentos, ações em lote, agendamentos nem alterações de reservas/investimentos/dívidas pelo chat.

Limites: 10.000 registros e 300.000 caracteres de contexto, sem envio parcial. Histórico de ações não integra o backup JSON financeiro. Conversa temporária; histórico recente enviado somente com autorização. O histórico registra ações do aplicativo, mas não é inviolável contra o próprio usuário com acesso direto à API.

20 testes cobrem cálculos, servidor simulado, paginação, consentimento, RLS, confirmação, desfazer e conflitos. Nenhuma ação de teste foi aplicada às finanças reais. Typecheck mantém problemas de tipagem herdados.

