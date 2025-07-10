# Configuração de E-mail - Sistema de Gestão

## Problema Identificado

O sistema não está enviando e-mails automaticamente devido à falta de configuração das variáveis de ambiente necessárias.

## Solução

### 1. Criar arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Email Configuration (SMTP Hostinger)
EMAIL_USER=modernaedificacoes@gmail.com
EMAIL_PASS=sua_senha_de_app_aqui
EMAIL_FROM=modernaedificacoes@gmail.com

# MongoDB Configuration
MONGO_URI=mongodb://Nexus_wayfallpan:84e7091321e8c8bbdd74986f5dadd8abf919018e@5f7qa.h.filess.io:27018/Nexus_wayfallpan

# Server Configuration
PORT=5000
```

### 2. Configurar Senha de App do Gmail

Para usar o Gmail como servidor SMTP, você precisa criar uma "senha de app":

1. Acesse sua conta Google
2. Vá em "Segurança" > "Verificação em duas etapas"
3. Ative a verificação em duas etapas se não estiver ativa
4. Vá em "Senhas de app"
5. Gere uma nova senha de app para "Email"
6. Use essa senha no campo `EMAIL_PASS`

### 3. Testar a Configuração

Execute os seguintes comandos para testar:

```bash
# Testar configuração de e-mail
node scripts/testEmail.js

# Testar scheduler
node scripts/testScheduler.js
```

### 4. Verificar Status via API

Acesse a rota para verificar o status:

```
GET /api/scheduler/status
```

### 5. Testar Manualmente

Para testar o envio manual:

```
POST /api/scheduler/test
```

## Logs de Debug

O sistema agora inclui logs detalhados para debug:

- ✅ Verificação de conexão MongoDB
- ✅ Verificação de configuração de e-mail
- ✅ Logs de execução do scheduler
- ✅ Tratamento de erros melhorado

## Cronograma

O scheduler está configurado para executar:

- **Horário**: 08:00 (horário de Brasília)
- **Frequência**: Diariamente
- **Timezone**: America/Sao_Paulo

## Troubleshooting

### Erro de Autenticação

```
❌ Falha na autenticação SMTP
```

**Solução**: Verifique se a senha de app está correta

### Erro de Conexão

```
❌ Falha na conexão com o servidor SMTP
```

**Solução**: Verifique sua conexão com a internet

### MongoDB não conectado

```
❌ MongoDB não está conectado
```

**Solução**: Verifique se o servidor está rodando e acessível

## Melhorias Implementadas

1. **Logs detalhados** para debug
2. **Verificação de conexão** MongoDB
3. **Tratamento de erros** melhorado
4. **Teste automático** na inicialização
5. **Rotas de status** para monitoramento
6. **Scripts de teste** independentes
