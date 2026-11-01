# Trazer os registros antigos

O código não acessa mais o Base44. Os registros antigos continuam onde estavam; nada foi apagado.

1. Exporte os dados na conta Base44 que tem autorização para consultá-los.
2. Prepare um JSON com uma lista por entidade. Cada registro precisa de um `id` estável.
3. Inclua no mesmo arquivo as reservas/investimentos referenciados por transações e despesas.
4. Entre na conta nova do V.A.U.L.T e abra “Seus dados”.
5. Escolha o JSON, confira a quantidade e confirme.

Exemplo estrutural, sem dados reais:

```json
{
  "Income": [
    { "id": "origem-receita-1", "description": "Exemplo", "amount": 100, "date": "2026-11-01" }
  ],
  "Expense": []
}
```

Não importe registros de outros usuários na sua conta. A ferramenta vincula todos os registros do arquivo à conta que confirma a importação.

O limite é 10.000 registros e 10 MB por arquivo. IDs antigos são convertidos em UUIDs estáveis por conta e entidade. Repetir a mesma importação não duplica esses IDs; registros já existentes não são sobrescritos. Se faltarem vínculos, a prévia rejeita o arquivo antes de enviar.

Exportações em CSV precisam ser convertidas para esse formato com tipos corretos (números JSON, datas ISO). A importação não adivinha números formatados nem copia credenciais.

Depois, confira os totais com a origem antes de encerrar o serviço antigo. Faça um backup pelo próprio V.A.U.L.T. Senhas, sessões e conversas antigas do assistente não são migradas.
