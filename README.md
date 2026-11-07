# V.A.U.L.T

**Organize suas finanças, acompanhe seu patrimônio e planeje seus próximos objetivos em um só lugar.**

🌐 **[Acessar o V.A.U.L.T](https://isamu665.github.io/vault-3/)**

## Últimas atualizações

**6 de novembro de 2026**

- **Chat:** Enter envia a mensagem e limpa o campo. Shift+Enter quebra a linha. Os cálculos ficam junto da resposta correspondente.
- **Ferramentas:** compare investimentos, baixe tabelas em CSV, simule cenários e revise propostas em Ações e histórico.
- **Assistente:** a análise distingue gastos fixos confirmados, possíveis recorrências e necessidades pontuais usando o histórico e o contexto dos lançamentos.
- **Assistente:** o Panorama abre sem o aviso do Gemini. A autorização aparece ao entrar em **Conversar** se você ainda não tiver concedido acesso.
- **Renomear categorias:** o novo nome aparece nas despesas e contas a pagar já vinculadas, com seus valores e datas preservados.
- **Categorias:** clique no lápis para abrir a janela de edição. O cadastro em andamento fica preservado.
- **Orçamento:** removemos o campo “% do grupo” das categorias. Os percentuais gerais da regra de orçamento continuam configuráveis.

Para consultar todas as mudanças, clique em **[Ver histórico completo de atualizações](CHANGELOG.md)**. Você também pode abrir o arquivo `CHANGELOG.md` na lista de arquivos do repositório.

O V.A.U.L.T é um aplicativo web de finanças pessoais que reúne receitas, despesas, contas a pagar, dívidas, metas, reservas e investimentos. Funciona diretamente no navegador, no computador ou no celular: **não é necessário instalar ferramentas de programação nem rodar o projeto localmente para usar**.

## O intuito do projeto

O objetivo é ajudar você a entender para onde seu dinheiro vai, organizar os compromissos do mês e acompanhar a construção do seu patrimônio. A proposta combina o registro do dia a dia com uma visão de planejamento: comparar gastos com o orçamento, definir metas e explorar cenários futuros.

O aplicativo oferece gráficos, relatórios e um assistente para apoiar essa leitura dos dados. Os resultados dependem dos lançamentos que você mantém na sua conta.

## Como começar

1. Abra **[isamu665.github.io/vault-3](https://isamu665.github.io/vault-3/)**.
2. Crie sua conta e confirme o e-mail quando solicitado. Se o login Google estiver habilitado, você também pode entrar por ele.
3. Em **Categorias**, organize os tipos de receitas e despesas que vai utilizar.
4. Cadastre suas entradas em **Receitas** e seus gastos em **Despesas**, informando valores, datas e categorias.
5. Adicione os próximos vencimentos em **Contas a pagar**.
6. Consulte o **Painel**, a **Regra 50/30/20** e os **Relatórios** para acompanhar o mês.

No celular, abra o menu para alternar entre as telas. Você também pode escolher o tema claro ou escuro.

## O que você pode fazer

| Tela | Para que serve |
| --- | --- |
| **Painel** | Ter uma visão geral das finanças e acompanhar os indicadores do mês. |
| **Receitas** | Registrar dinheiro recebido e gerenciar previsões de receitas recorrentes. |
| **Despesas** | Registrar e organizar os gastos por data e categoria. |
| **Regra 50/30/20** | Comparar a distribuição da renda entre necessidades, desejos e patrimônio, com percentuais personalizáveis. |
| **Contas a pagar** | Acompanhar vencimentos e registrar a quitação das contas. |
| **Dívidas** | Cadastrar e acompanhar dívidas. |
| **Patrimônio** | Organizar reservas e investimentos, registrar movimentações e acompanhar valores. |
| **Metas** | Definir objetivos financeiros e acompanhar seu progresso. |
| **Categorias** | Personalizar a organização dos lançamentos. |
| **Simulacro** | Simular a evolução do patrimônio com capital inicial, aportes, prazo e hipóteses de rentabilidade. |
| **Relatórios** | Analisar receitas e despesas com gráficos e filtros de período. |
| **Seus dados** | Exportar backups e importar dados em JSON. |

### Receitas recorrentes

Ao cadastrar uma receita com recorrência, o lançamento inicial representa um valor já recebido. A programação gera previsões mensais a partir do mês seguinte ao mais recente entre a data informada e a data atual.

Em **Receitas → Receitas recorrentes**, selecione o mês e, no dia previsto ou depois, use **Confirmar recebimento** para revisar valor e data reais. **Uma previsão só entra no saldo e nos relatórios depois da confirmação.**

Use **Gerenciar repetições → Configurar** para ajustar ou encerrar a programação. Não há notificações externas nem recebimentos automáticos em segundo plano.

[Entenda as regras de recorrência](docs/RECURRING-INCOME.md).

### Contas a pagar

Cadastre a descrição, o valor previsto e o vencimento. Depois de pagar a conta, use a opção de marcar como paga, revise o valor efetivo, a categoria, a data e a forma de pagamento e confirme.

A confirmação registra a despesa vinculada à conta. Evite lançar manualmente a mesma despesa outra vez. Essa operação registra o pagamento no seu controle financeiro; o aplicativo não realiza transferências ou pagamentos bancários.

### Orçamento e patrimônio

A **Regra 50/30/20** distribui a renda entre necessidades, desejos e patrimônio. Em **Personalizar**, ajuste os percentuais à sua realidade, mantendo a soma em 100%.

Em **Patrimônio**, cadastre reservas e investimentos e registre depósitos, saques, aportes e atualizações pelos controles disponíveis. Use **Metas** para acompanhar os objetivos que deseja alcançar.

### Simulacro

Escolha o produto ou uma taxa personalizada, informe o capital inicial, o aporte mensal e o prazo. Compare a projeção do patrimônio, os tributos estimados e o efeito da inflação.

Os indicadores de referência são consultados por uma função de servidor a partir do Banco Central. A taxa atual funciona como hipótese de cálculo; os resultados são simulações e não garantem rentabilidade futura. Se os indicadores estiverem indisponíveis, revise as taxas personalizadas antes de interpretar o cenário.

## Assistente financeiro

Abra o assistente pelo botão flutuante disponível nas telas do aplicativo. Você pode consultar o panorama da conta e fazer perguntas sobre seus registros, por exemplo:

- “Quanto gastei neste mês?”
- “Quais categorias concentram minhas despesas?”
- “Quais contas tenho a pagar?”

Para conversar, é necessário autorizar a consulta à conta e o envio dos dados necessários ao **Google/Gemini**, incluindo valores, datas, categorias, descrições e notas. Essa permissão fica salva por usuário neste navegador e pode ser retirada em **Revogar permissão**. Credenciais e sessões não são enviadas.

O assistente também pode propor a criação ou atualização de **receitas, despesas, contas e metas**. Confira a prévia: a alteração só é aplicada após uma confirmação específica sua. A permissão para consultar dados não autoriza alterações automaticamente.

A conversa é temporária. O histórico de ações é separado do chat e não faz parte do backup financeiro. O serviço tem limite de 30 perguntas por usuário por dia UTC e depende da disponibilidade do provedor.

[Veja os recursos e limites do assistente](docs/ASSISTANT.md).

## Backup e importação

Em **Seus dados**, exporte seus registros em JSON para manter uma cópia de segurança. Para importar, selecione o arquivo, confira a prévia e as validações e só então confirme.

Há compatibilidade com backups do aplicativo anterior em Base44. Senhas e sessões antigas não são transferidas; é necessário usar uma conta no V.A.U.L.T atual.

- [Guia de importação e exportação](docs/DATA-TRANSFER.md)
- [Orientações de migração](docs/MIGRATION.md)

## Usar no celular

Você pode acessar pela mesma URL ou instalar o aplicativo web na tela inicial:

- **Android / Chrome:** abra o menu do navegador e escolha **Instalar aplicativo** ou **Adicionar à tela inicial**.
- **iPhone / Safari:** toque em **Compartilhar → Adicionar à Tela de Início**.

O V.A.U.L.T é uma **PWA**, sem necessidade de APK. O cache mantém os arquivos da interface; login, dados financeiros, indicadores e assistente precisam de internet.

## Dados e privacidade

Os registros são vinculados à sua conta no Supabase, com regras de acesso por usuário no banco de dados. O cache offline da interface não armazena respostas de API, dados financeiros ou respostas da IA. A sessão de login utiliza o armazenamento padrão do Supabase no navegador.

A personalização da regra de orçamento fica neste navegador, separada por usuário, e não sincroniza entre dispositivos. A autorização do assistente também é específica por usuário e navegador e não entra nos backups.

## Para quem deseja desenvolver

O uso normal acontece pelo **[GitHub Pages](https://isamu665.github.io/vault-3/)**. A base técnica usa **React 18, Vite, Tailwind CSS, Supabase Auth/Postgres, Edge Functions e Gemini**. Os esquemas em `docs/legacy-schema` são apenas referência histórica.

As instruções de configuração de uma instância, autenticação, funções e hospedagem estão em **[docs/SETUP.md](docs/SETUP.md)**. Algumas informações desse guia registram o estado da implantação original.

Para contribuir com o código, o projeto requer Node.js 22 ou superior e npm. Os comandos de verificação são:

```sh
npm ci
npm run lint
npm test
npm run build:pages
npm run typecheck
```

O projeto registra problemas de tipagem herdados nas telas e componentes antigos, além de avisos de tamanho de pacotes no build. Operações de negócio com vários registros, especialmente reservas e investimentos, ainda exigem atenção a alterações concorrentes.

Nunca inclua chaves administrativas, segredos de provedores ou dados financeiros em commits ou variáveis públicas do frontend.
