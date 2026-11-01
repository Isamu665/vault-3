# V.A.U.L.T — independente do Base44

Finanças pessoais em React/Vite, Supabase Auth/Postgres e funções de servidor. Não há SDK, proxy, assets ou chamadas de execução ao Base44.

## Iniciar no VS Code

Requer Node.js 22 ou superior com npm.

```sh
npm ci
```

Copie `.env.example` para `.env.local`. As duas variáveis são públicas; não use a chave secret/service_role.

```sh
npm run dev -- --host 127.0.0.1
```

Para validar a mesma versão usada no GitHub:

```sh
npm run lint
npm test
npm run build:pages
npm run preview -- --mode github-pages --host 127.0.0.1
```

Abra o endereço terminado em `/vault-3/`. O build comum para hospedagem na raiz usa `npm run build`.

## O que foi implementado

- Cadastro, confirmação de e-mail, recuperação de senha e login Google por Supabase.
- Dados por conta, protegidos por RLS no Postgres, sem dependência de filtros do navegador para segurança.
- Receitas, despesas, categorias, contas, dívidas, metas, reservas e investimentos usando o novo banco.
- Atualizações ao vivo e cache de consultas separado por usuário.
- Assistente com panorama, gráficos mensais, ranking por categoria, Markdown, exportação/cópia e links para ações.
- Função Gemini autenticada, segredo no servidor, limite de 30 perguntas por usuário por dia UTC e consentimento para enviar totais.
- Indicadores consultados diretamente do BCB por função de servidor; nenhuma taxa é gerada por IA.
- Backup/importação JSON com IDs estáveis e preservação de vínculos.
- Aplicativo web instalável (PWA), ícones locais e cache apenas dos arquivos da interface.

## Ativação

Veja [docs/SETUP.md](docs/SETUP.md) para login Google, links de e-mail, chave Gemini e GitHub Pages. O projeto Supabase já recebeu as migrações e as duas funções; as credenciais de Google/Gemini e a hospedagem ainda dependem das configurações da sua conta.

Não foi gerado APK. A entrega escolhida é a web no GitHub Pages, instalável pelo navegador. Depois de publicar, no Chrome Android use “Adicionar à tela inicial” / “Instalar aplicativo”. Dados e IA precisam de internet.

## Dados antigos e portabilidade

O novo banco começa vazio. O aplicativo antigo e os registros no Base44 não foram alterados. Exporte seus dados autorizados e use “Seus dados” para importar o JSON. Consulte [docs/MIGRATION.md](docs/MIGRATION.md). Senhas e sessões antigas não são transferidas; cada usuário deve criar sua conta nova.

Os esquemas antigos estão em `docs/legacy-schema` apenas como referência histórica. Não são usados pelo aplicativo. A regra de orçamento é guardada neste navegador, separada por usuário; não sincroniza entre dispositivos. O chat é temporário e é descartado ao fechar o painel; cada pergunta é independente.

## Verificação e limites

Os testes cobrem isolamento entre contas em Postgres/PGlite, bloqueio de acesso anônimo, identidade imutável, atualizações atômicas de campos, importação idempotente, vínculos e cálculos do assistente. A proteção contra chamadas sem autenticação e tokens inválidos foi verificada no Supabase implantado.

`npm run typecheck` permanece disponível e ainda aponta problemas de tipagem herdados nas telas/componentes antigos. A checagem não foi desativada. O build avisa sobre o tamanho de alguns pacotes. Fluxos reais de confirmação de e-mail, recuperação e Google precisam ser testados após configurar as URLs e credenciais externas.

O modelo não altera dados financeiros. O cache offline não armazena respostas de API, dados financeiros, tokens, senhas ou respostas da IA. A sessão de login usa o armazenamento padrão do Supabase no navegador.

As funções de formulário que movimentam múltiplos registros continuam seguindo os passos do app original; o merge de campos é atômico, mas operações de negócio com vários registros ainda não são uma transação única. Alterações concorrentes em reservas/investimentos devem ser validadas antes de uso em larga escala.
