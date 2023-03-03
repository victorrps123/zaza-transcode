# ZAZA Transcode

Esse bot fere TOTALMENTE o TOS do YT e Discord (por proxy). 




## Informacoes

Esse projeto ficou online por mais de 2 anos com o minimo de manutencao, por me dar muita dor de cabeca estou abrindo o codigo e desligando o bot. Utilizar o PM2 vai te salvar muito tempo. EU NAO DOU SUPORTE PARA O BOT.
## Funcionalidade do BOT

- Baixar videos do YT e hospedar o audio publicamente


## Requisitos

 - [Redis](https://redis.io/)
 - [NodeJS](https://nodejs.org/en/) (LTS)
 - [Caddy](https://caddyserver.com/)


## Ideia de infraestrutura

Eu nao vou perder tempo explicando o passo a passo, voce deve ir ler o codigo para saber como subir o BOT.

O bot hospeda os arquivos usando o Caddy. Por utilizar o modulo da cloudflare, voce deve buildar o Caddy com o modulo do Cloudflare. A versao ja compilada nao vai funcionar. O arquivo de configuracao do Caddy esta na pasta raiz do GIT.
O bot utiliza Discord.JS na sua ultima versao e todas as variaveis de ambiente estao expostas no arquivo `ecosystem.config.js`. 

O arquivo `ecosystem.config.js` também serve para rodar o BOT utilizando PM2 como gerenciador.
```bash
  pm2 start --environment production
```
A lib ytdl-core é praticamente morta e um dos motivos desse bot ter sido desligado, mas nada impede voce de mudar o sistema para utilizar FFMPEG e extrair a faixa de audio sem depender de lib.
Atualmente para burlar o sistema de cotas de API do YT é utilizado varios IPV6, essa implementacao esta dentro do arquivo transcode.js na linha 112. Um endereco IPV6 é gerado e passado para o miniget utilizar na requisicao. (Caso voce nao va escalar o bot, utilizar somente um IPV4 ja vai resolver sua vida).
O Redis é utilizado para guardar o periodo em que a musica vai ficar disponivel, sendo possivel configurar quanto tempo a musica fica disponivel no arquivo index.js, linha 35. Essa funcionalidade foi feita para salvar espaco em disco.


