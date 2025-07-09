# Melhorias no Sistema de NSU

## Problemas Identificados e Soluções

### 1. NSU Travado no 171

**Problema**: O sistema parava quando recebia o status 656 (Consumo Indevido) da SEFAZ, não conseguindo chegar ao máximo NSU disponível (178).

**Solução**:

- Implementado tratamento específico para o status 656
- Sistema aguarda 1 hora após 3 tentativas consecutivas
- Continua a busca até chegar ao máximo NSU disponível

### 2. Falta de Validação do Último NSU Salvo

**Problema**: O sistema não verificava quais documentos já haviam sido processados, reprocessando documentos desnecessariamente.

**Solução**:

- Implementada função `validarUltimoNSUSalvo()` que consulta o banco
- Busca incremental que processa apenas documentos novos
- Evita reprocessamento de documentos já salvos

### 3. Erro de Chave de Acesso Undefined

**Problema**: Documentos de evento (procEventoNFe) não têm chave de acesso, causando erro de validação.

**Solução**:

- Filtro para ignorar documentos de evento
- Verificação de chave de acesso antes de salvar
- Logs informativos sobre documentos ignorados

## Novas Funcionalidades

### 1. Busca Incremental (Padrão)

```javascript
GET /api/nfe/consultar-notas/:certificadoId
```

- Verifica o último NSU salvo no banco
- Busca apenas documentos novos
- Mais eficiente e rápido

### 2. Busca Completa

```javascript
GET /api/nfe/consultar-notas/:certificadoId?tipo=completa
```

- Busca todos os documentos desde o início
- Útil para sincronização inicial ou correção de dados

### 3. Busca Forçada

```javascript
GET /api/nfe/consultar-notas/:certificadoId?forcarNSU=172
```

- Força a busca a partir de um NSU específico
- Útil para corrigir problemas pontuais

### 4. Consulta de Status

```javascript
GET /api/nfe/status-nsu/:certificadoId
```

- Retorna o status atual do NSU do certificado
- Útil para monitoramento

## Melhorias na Lógica de Busca

### Tratamento de Status 656

```javascript
if (statusCode === "656") {
  status656Count++;
  if (status656Count >= maxStatus656Retries) {
    // Aguardar 1 hora
    await new Promise((resolve) => setTimeout(resolve, 3600000));
    status656Count = 0;
  } else {
    // Aguardar 5 segundos e tentar novamente
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  continue; // Tentar novamente com o mesmo NSU
}
```

### Validação de Documentos Já Processados

```javascript
const ultimoNSUSalvo = await validarUltimoNSUSalvo(certificado._id);
if (nsuDocumento > ultimoNSUSalvo) {
  // Processar apenas documentos novos
  const dadosNota = await processarNotaFiscal(docZip);
  if (dadosNota && dadosNota.chaveAcesso) {
    todasNotas.push(dadosNota);
  }
} else {
  console.log(`Documento NSU ${nsuDocumento} já processado, pulando...`);
}
```

## Script de Teste

Criado script `scripts/testNSU.js` com opções interativas:

1. **Busca incremental** - Apenas documentos novos
2. **Busca completa** - Todos os documentos
3. **Busca forçada** - A partir de NSU específico
4. **Consulta de status** - Apenas verificar

## Como Usar

### Via API

```bash
# Busca incremental (padrão)
curl "http://localhost:3000/api/nfe/consultar-notas/6849d8bdd24daf1b5a3560c2"

# Busca completa
curl "http://localhost:3000/api/nfe/consultar-notas/6849d8bdd24daf1b5a3560c2?tipo=completa"

# Busca forçada
curl "http://localhost:3000/api/nfe/consultar-notas/6849d8bdd24daf1b5a3560c2?forcarNSU=172"

# Consultar status
curl "http://localhost:3000/api/nfe/status-nsu/6849d8bdd24daf1b5a3560c2"
```

### Via Script

```bash
node scripts/testNSU.js
```

## Benefícios

1. **Performance**: Busca incremental é muito mais rápida
2. **Confiabilidade**: Melhor tratamento de erros da SEFAZ
3. **Flexibilidade**: Múltiplas opções de busca
4. **Monitoramento**: Consulta de status em tempo real
5. **Eficiência**: Evita reprocessamento desnecessário

## Logs Melhorados

O sistema agora fornece logs mais detalhados:

- NSU inicial e final
- Documentos novos vs já processados
- Status de cada tentativa
- Tempo de espera para status 656
- Contadores de documentos processados
