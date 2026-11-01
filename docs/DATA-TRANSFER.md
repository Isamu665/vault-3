# Importação e exportação de dados

Acesse **Seus dados** no menu do aplicativo. Para migrar, exporte o JSON na página **Importar e exportar dados** do Base44 e selecione esse arquivo no V.A.U.L.T. independente. Confira a conta de destino e a prévia antes de confirmar.

## Compatibilidade e comportamento

- Formato Base44: vault-backup, versão 1, exportedAt, entities e preferences.localStorage. Também aceita o formato antigo de listas por entidade.
- Receitas, despesas, categorias, contas, dívidas, metas, reservas, transações, investimentos, atualizações e planos de orçamento. Backups nativos incluem ainda indicadores salvos, seu histórico e a entidade Preference.
- Limites: 8 MiB por arquivo, 10.000 registros e 64 KiB por registro. Se a exportação ultrapassar os limites, nenhum arquivo parcial é oferecido.
- Validação de formato, versão, IDs, campos obrigatórios, números, opções, datas do calendário e vínculos. Arquivos inválidos não gravam registros. Campos fora do esquema financeiro não são transferidos.
- A confirmação só adiciona. Não apaga nem sobrescreve dados existentes. IDs estáveis por conta e entidade evitam duplicação ao repetir o arquivo, inclusive após exportar novamente os registros importados. A prévia é estimativa; o resumo do servidor informa a quantidade realmente adicionada.
- Os vínculos são reconstruídos usando os pais do arquivo ou registros já importados nesta conta. Um vínculo ausente bloqueia o lote; nunca é removido silenciosamente.
- Uma única chamada import_vault_backup grava o lote em uma transação Postgres. Validações e checagem de vínculos também ocorrem no servidor. A função usa SECURITY INVOKER e as políticas RLS existentes; a conta vem de auth.uid(), nunca do arquivo. O parâmetro expected_user impede aplicar uma prévia após trocar de conta.
- Restaurar tema e regra de orçamento é opcional e começa desmarcado. Só os campos conhecidos e válidos são aceitos. A regra é salva na chave vinculada ao usuário atual. Preferências podem ser restauradas mesmo quando todos os registros já existem. Falhas no armazenamento local são informadas separadamente.
- Senhas, sessões, credenciais, timestamps internos e ownership do Base44 não são migrados. ownerId no backup nativo é apenas uma dica para manter IDs; não concede acesso a outra conta. O arquivo financeiro permanece no dispositivo e só seus registros validados são enviados ao Supabase ao confirmar.

## Origem e revisão do código

Em 01/11/2026, foram lidos e copiados pelo editor do Base44: DataTransfer.jsx, ExportCard.jsx, ImportCard.jsx, ImportPreview.jsx, ImportSummary.jsx, schema.js, preferences.js, exportBackup.js, importBackup.js e validateBackup.js. O esquema de entidades e a interface de prévia foram portados; os adaptadores de leitura/gravação e as preferências foram reconstruídos para o backend independente.

Foram reproduzidos em um backend fictício três problemas da implementação original: 2026-02-31 aceita como data, remoção de vínculo opcional ausente e registro salvo sem controle de duplicação quando uma gravação individual é seguida de limite 429. Há também risco de dados salvos sem ledger quando essa segunda etapa falha. A versão independente usa validação de calendário, vínculos obrigatoriamente resolvidos e IDs/transação únicos, sem ledger separado. O suporte do SDK original à paginação por objeto de opções foi conferido; ele não é uma falha.

## Verificação

Testes automatizados cobrem compatibilidade Base44, restauração nativa, mudança de conta, reexportação, repetição, metadados removidos, mais de 1.000 registros, datas inválidas, limites e preferências. Postgres/PGlite executa as migrações e verifica rollback, duplicação, preservação de valores, RLS, links e acesso anônimo.

Na interface isolada, sem conexão ao banco, foram verificados seleção de JSON, bloqueio de arquivo inválido, prévia de três entidades vinculadas, confirmação, resumo, reconhecimento de duplicados e download de JSON. No Supabase real foi executada uma importação vazia dentro de uma transação revertida, sem inserir dados. Os registros financeiros reais do Base44 não foram exportados nem importados durante os testes. A migração real dos seus dados continua sendo uma ação sua na página Seus dados.

## Executar e hospedar

As instruções de desenvolvimento estão no README; a nova função está na migração vault_backup_import em supabase/migrations. Ela já foi aplicada no projeto configurado. Em outro projeto, aplique todas as migrações em ordem. Não há SDK Base44, ledger externo, serviço adicional ou nova variável de ambiente.

O typecheck mantém os problemas de tipagem herdados dos componentes visuais; lint, testes e build são verificados separadamente. A publicação usa o workflow já existente de GitHub Pages.
