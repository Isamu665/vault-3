# Ativar o V.A.U.L.T

## 1. Banco e funções — já aplicados

Projeto: `mqtqwxxlaaxiazghjkcu`.
URL: https://mqtqwxxlaaxiazghjkcu.supabase.co

As migrações de `supabase/migrations` e as funções `assistant` e `market-indicators` foram publicadas neste projeto. Não rode novamente o SQL inicial em um banco que já tenha essas tabelas.

Em um projeto novo, use o SQL Editor para aplicar as migrações em ordem ou o Supabase CLI. Para as funções, publique os arquivos de `supabase/functions/<nome>/index.ts`. A verificação automática de JWT do gateway fica desativada porque cada função valida o JWT no próprio corpo, com `auth.getUser`. Não remova essa validação.

## 2. Cadastro e recuperação por e-mail

Abra [Authentication → URL Configuration](https://supabase.com/dashboard/project/mqtqwxxlaaxiazghjkcu/auth/url-configuration).

Site URL:

```text
https://isamu665.github.io/vault-3/
```

Redirect URLs:

```text
https://isamu665.github.io/vault-3/**
http://127.0.0.1:5173/**
http://localhost:5173/**
http://127.0.0.1:4173/**
```

O acesso por e-mail estava ativado e a confirmação de e-mail habilitada na verificação. Não é necessário desativar confirmação. Crie uma conta pelo aplicativo, confirme no mesmo navegador e valide o login. Recuperação usa `/vault-3/reset-password`.

Para atender outros usuários em produção, configure [SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp): o envio de e-mail padrão tem limites e restrições de destinatários. Não coloque a senha SMTP no código.

## 3. Login Google

Abra [Authentication → Providers](https://supabase.com/dashboard/project/mqtqwxxlaaxiazghjkcu/auth/providers) e selecione Google.

No [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

1. Configure a tela de consentimento OAuth e os destinatários/testadores conforme a configuração da sua conta.
2. Crie um OAuth Client do tipo Web application.
3. Adicione a origem JavaScript `https://isamu665.github.io` e as origens locais usadas em testes.
4. Cadastre exatamente este Authorized redirect URI:

```text
https://mqtqwxxlaaxiazghjkcu.supabase.co/auth/v1/callback
```

5. Insira Client ID e Client Secret diretamente no provedor Google do Supabase e ative-o. Não compartilhe o secret nem o versione.

O botão Google fica indisponível enquanto o provedor estiver desativado. Após ativar, recarregue a tela de login. O retorno do Supabase deve estar na lista de Redirect URLs da etapa anterior.

Referência: https://supabase.com/docs/guides/auth/social-sign-in/auth-google

## 4. Assistente Gemini

Crie sua chave em https://aistudio.google.com/apikey e cadastre em [Edge Functions → Secrets](https://supabase.com/dashboard/project/mqtqwxxlaaxiazghjkcu/functions/secrets):

```text
GEMINI_API_KEY=<sua-chave-privada>
GEMINI_MODEL=gemini-2.5-flash
```

As funções já estão implantadas; a leitura do segredo acontece a cada requisição. Não adicione a chave em GitHub, `.env.local` do frontend ou variáveis `VITE_*`.

O modelo pode ser trocado por `GEMINI_MODEL` sem recompilar a interface. Confira a disponibilidade e os custos na sua conta Google. A função limita pedidos a 30 por usuário por dia UTC; falhas do provedor após consumir cota também contam.

A pergunta é enviada ao Google quando o usuário pressiona Enviar. Totais do mês, contas pendentes e totais de seis meses só são enviados quando o usuário marca a opção do painel. Descrições, nomes de lançamentos e categorias não são enviados automaticamente. Tudo que o usuário digitar na própria pergunta faz parte da mensagem enviada.

Se publicar em outro domínio, adicione a origem em `ALLOWED_ORIGINS` nos segredos do servidor.

## 5. Hospedar no GitHub Pages

O repositório permanece privado. Antes de publicar, abra [Settings → Pages](https://github.com/Isamu665/vault-3/settings/pages). Pages em repositórios privados exige plano compatível. Não foi alterada a visibilidade. No GitHub Free, tornar o código público é uma decisão sua.

1. Em Pages, selecione Source → GitHub Actions.
2. Em Settings → Secrets and variables → Actions → Variables, crie `ENABLE_PAGES=true`.
3. Execute Actions → Build and publish V.A.U.L.T → Run workflow na branch main.
4. O endereço previsto é https://isamu665.github.io/vault-3/.

URL e chave pública do Supabase estão no workflow, com possibilidade de sobrescrever pelas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Isso não expõe uma chave administrativa; os dados são protegidos pelas regras do banco.

Não há publicação automática de funções Supabase pelo GitHub: alterações de backend precisam de implantação separada. O workflow do Pages verifica e publica somente a interface.

## 6. Instalar no celular

Após a publicação HTTPS, abra o endereço no Chrome Android e use “Instalar aplicativo” / “Adicionar à tela inicial”. No iPhone, use Compartilhar → Adicionar à Tela de Início.

Esta entrega é PWA, não APK: não há assinatura Android nem publicação na Play Store. O cache guarda a interface; cadastro, dados, indicadores e IA continuam online. Para um APK futuro, pode-se empacotar esta base com Capacitor ou TWA, mas será necessário configurar OAuth no Android, links de retorno, assinatura e testar num aparelho.

## 7. Validar antes de convidar usuários

Faça cadastro e recuperação por e-mail, login Google e teste com duas contas. Cada conta deve enxergar apenas os próprios lançamentos. Teste criação/edição/exclusão, importação, relatórios, reservas/investimentos e respostas da IA com e sem compartilhamento.

O painel de assistente foi revisado com dados fictícios. Não foram criadas contas de teste reais nem enviados dados financeiros à IA durante a preparação.
