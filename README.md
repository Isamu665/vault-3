# V.A.U.L.T

Aplicativo de finanças em React, Vite e Tailwind. Preparado para publicar a interface no GitHub Pages, mantendo autenticação, banco e integrações no Base44.

## Desenvolvimento local

Requer Node.js 22 e npm. Abra esta pasta no VS Code:

```sh
npm ci
```

Copie `.env.example` para `.env.local` e execute:

```sh
npm run dev
```

As variáveis `VITE_*` são públicas e entram no JavaScript do navegador. Nunca coloque senhas, tokens de usuário ou chaves de serviço nelas.

## Publicar no GitHub Pages

Repositório: https://github.com/Isamu665/vault-3
Endereço previsto após ativação: https://isamu665.github.io/vault-3/

1. Em Settings → Pages, confirme que seu plano permite Pages neste repositório privado e selecione Source → GitHub Actions. Não é necessário tornar o código público se seu plano oferece Pages privado. A página publicada normalmente fica pública, mesmo com código privado.
2. Em Settings → Secrets and variables → Actions → Variables, adicione `ENABLE_PAGES` com valor `true`.
3. Em Actions → Build and publish V.A.U.L.T → Run workflow, execute na branch `main`.
4. Depois de ativado, novos commits em `main` verificam, compilam e publicam automaticamente.

Até configurar `ENABLE_PAGES`, o workflow apenas verifica e gera o artefato. A publicação fica desativada para evitar falhas enquanto Pages não estiver configurado. GitHub Free oferece Pages em repositórios públicos; um repositório privado exige plano compatível. Não mude a visibilidade sem decidir se deseja expor o código.

## Build e validação

```sh
npm run lint
npm test
npm run build:pages
npm run preview -- --mode github-pages
```

Abra o endereço mostrado pelo preview, terminado em `/vault-3/`. `npm run build` continua disponível para o fluxo original na raiz.

A versão Pages usa `/vault-3/` nos assets, manifesto, roteamento e retornos de login. `404.html` carrega a aplicação em links diretos; o GitHub pode responder HTTP 404 ao abrir uma rota interna, embora a tela funcione. O modo Pages não injeta as ferramentas do editor Base44.

Build, lint e os testes de retorno seguro passaram na preparação. `npm run typecheck` ainda apresenta inconsistências herdadas; elas não foram desativadas. Login autenticado, Google, recuperação de senha e telas com dados precisam ser validados no domínio final. A inspeção visual local foi interrompida pela ferramenta do navegador e não foi concluída.

## Backend e autenticação

- `src/api/base44Client.js`: cliente SDK com API remota explícita, sem depender de proxy no Pages.
- `src/lib/AuthContext.jsx`: consulta configurações públicas diretamente em `https://base44.app`.
- `.env.example`: identificador público, domínio do aplicativo Base44 e servidor da API.
- `base44/entities`: esquemas e regras existentes, sem registros financeiros.
- `base44/agents`: definição do assistente.

O Pages hospeda arquivos estáticos e não executa servidor ou banco. Os serviços continuam no Base44. As consultas públicas de configuração responderam com CORS `*` para a origem prevista; isso não comprova todos os fluxos autenticados. Não foram usadas credenciais nem modificados dados em produção durante a preparação.

Ao usar o site e alterar receitas, despesas ou outros cadastros, você continuará alterando os dados reais no Base44. Google e recuperação de senha dependem das regras de redirecionamento do Base44. Se o retorno for recusado, será necessário autorizar o domínio de publicação na configuração do provedor. A rota OAuthConsent herdada não está registrada no roteador atual; integrações MCP não foram ativadas nesta migração.

## Arquivos fora do Git

`.env.local`, `node_modules`, `dist`, `.tools`, backups e dados financeiros não devem ser enviados. Para trabalhar depois em outro computador, clone o repositório e siga o desenvolvimento local acima.

## Referências

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll
- https://docs.base44.com/developers/references/sdk/getting-started/client
