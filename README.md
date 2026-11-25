# Reforma Simulator

Plataforma em **React 19 + Next.js 16 + TypeScript** para simular os tributos da reforma tributária com os motores abertos da Receita Federal, executados em containers.

## Iniciar com Docker

Requisitos: Docker Engine em execução, Docker Compose v2, acesso à internet na primeira construção e as portas 3000, 8080, 8082 e 8083 disponíveis. As versões dos projetos originais exigem Java 25 e Go 1.27; os Dockerfiles já selecionam essas ferramentas.

Na raiz do projeto:

```sh
docker compose up --build -d
```

Se esta máquina estiver com `DOCKER_HOST` apontando para um socket do Socktainer indisponível, selecione explicitamente o Docker Desktop, sem alterar as configurações globais:

```sh
docker --context desktop-linux compose up --build -d
```

As imagens Java usam Maven já instalado, sem depender do download do Maven Wrapper dos repositórios.

Abra **http://localhost:3000**. A primeira construção baixa dependências Java, Go e Node e pode levar vários minutos. A etapa de banco reutiliza a compilação e as dependências Maven do regime regular. O Next.js inicia quando os motores passam pelos health checks.

```sh
docker compose ps
docker compose logs -f
# Encerrar preservando o banco:
docker compose down
```

Os serviços são publicados somente em `127.0.0.1`. O ambiente entregue é local, sem autenticação; não o exponha à internet sem adicionar controle de acesso.

## O que está implementado

- Regime regular: CBS, IBS e totais de IS devolvidos pelo motor, com data, UF, município IBGE e múltiplos itens NCM/NBS.
- Simples Nacional: formulário para NF-e, CRT 1, atividade, classificação, base e alíquotas informadas de CBS/IBS. Não calcula o DAS ou a alíquota efetiva do Simples a partir de faturamento.
- Editor JSON para enviar operações completas: Imposto Seletivo, outros documentos, compras governamentais e demais campos suportados pelos motores. O editor substitui o formulário enquanto estiver ativo.
- Resultado por item, estados de observabilidade, erros, resposta completa e memória de cálculo retornada pelas APIs. Totais parciais são identificados quando há pendências.
- Exportação JSON e histórico das últimas 20 simulações no navegador. A descrição do item identifica o formulário; não integra o contrato fiscal enviado ao motor.
- Consulta de classificações, NCM, NBS e atividades do Simples.
- Upload ou colagem de XML completo de NFS-e para baixar DANFSe em PDF, com situação da nota e canhoto configuráveis. Um grupo de tributação não substitui uma NFS-e completa.
- Interface responsiva, em português, sem dependências de fontes ou imagens remotas.

Os cálculos tributários e seus arredondamentos são feitos pelos projetos originais. A plataforma não inventa resultados quando os motores estão indisponíveis.

**Vigência:** o regime regular proíbe `aliquotasNominais` antes de 2027 e exige seu preenchimento a partir de 2027. O formulário respeita essa regra. Ao selecionar o Simples Nacional, a data é ajustada para pelo menos 01/01/2027, início da vigência da base desse motor; itens sem cálculo não são exibidos como tributo zero. As alíquotas preenchidas para anos futuros são exemplos editáveis, não uma previsão de alíquota legal. O resultado e os avisos do motor identificam dados simulados. Consulte os READMEs e contratos originais para detalhes de vigência.

## Arquitetura

```text
Navegador → Next.js :3000 → rotas /api/*
                            ├─ regular :8080 (Java / Spring Boot)
                            ├─ simples :8082 (Java / Spring Boot)
                            └─ danfse  :8080 (Go; host :8083)

Migrações Flyway → volume SQLite → regular e simples (somente leitura)
```

O serviço `database` gera a base durante a construção usando as migrações oficiais do regime regular e copia o arquivo para um volume compartilhado antes de iniciar os motores. Isso atende à dependência do Simples Nacional na mesma base, sem duplicar os scripts SQL. Cada inicialização do serviço de preparação repõe a cópia da base da imagem; não há dados de usuário nesse volume. As simulações ficam apenas no armazenamento local do navegador.

Os arquivos originais estão em `services/`, com licenças preservadas. As revisões exatas estão em [services/sources.json](services/sources.json):

- [Regime regular](https://github.com/ReceitaFederal/calculadora-rtc-regime-regular)
- [Simples Nacional](https://github.com/ReceitaFederal/calculadora-rtc-simples-nacional)
- [Gerador DANFSe](https://github.com/ReceitaFederal/calculadora-rtc-gerador-danfse)

Swagger: [regular](http://localhost:8080/api/swagger-ui.html), [Simples](http://localhost:8082/api/swagger-ui.html), [DANFSe](http://localhost:8083/api/swagger-ui/index.html).

## Desenvolvimento local

```sh
npm ci
cp .env.example .env.local
# Somente os motores em containers:
docker compose up --build -d regular simples danfse
npm run dev
```

As URLs privadas dos motores são configuráveis com `REGULAR_API_URL`, `SIMPLES_API_URL` e `DANFSE_API_URL`. O navegador sempre chama o Next.js; as URLs não são recebidas do cliente. O proxy limita os corpos, define timeout e preserva os erros HTTP e o aviso de dados simulados.

## Verificação

```sh
npm test
npm run typecheck
npm run build
docker compose config --quiet
# Com a pilha em execução, valida dois exemplos oficiais e a saúde dos serviços:
node scripts/smoke.mjs
# Inclui geração de PDF com uma NFS-e completa fornecida localmente:
NFSE_XML=tests/fixtures/nfse-demo.xml node scripts/smoke.mjs
```

Os testes locais cobrem montagem dos contratos de 2026/2027, valores monetários inválidos, alíquotas, propagação de respostas e limites de corpo. O smoke compara valores conhecidos dos exemplos/testes originais: CBS de R$ 42,24 para educação no regime regular e total de R$ 88,00 no caso do Simples.

**Validação nesta entrega:** build do Next.js dentro do container, TypeScript, seis testes locais, configuração Compose e navegação na interface verificados. Os quatro serviços passaram pelos health checks; as 73 migrações do banco foram aplicadas. Os testes integrados confirmaram os totais conhecidos dos dois regimes e geraram PDF com a fixture sintética `tests/fixtures/nfse-demo.xml`, sem validade fiscal. A interface também executou uma simulação de 2026 com base de R$ 1.000,00, retornando CBS de R$ 9,00 e IBS de R$ 1,00. Não foi testada a emissão fiscal, assinatura de XML ou transmissão a ambientes fiscais, que não fazem parte da plataforma.

Esta é uma interface independente e não um serviço oficial da Receita Federal.
