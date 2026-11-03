# NeoX Studio

Site estático dos jogos e da equipe NeoX, em português e inglês.

## Arquivos

- `index.html`: estrutura, estilos e textos iniciais em português.
- `assets/js/site.js`: traduções, navegação, formulário e estatísticas do Roblox.
- `assets/js/config.js`: destino público do formulário e endpoint opcional de estatísticas.
- `assets/js/frame-guard.js`: proteção complementar contra abertura em frames.
- `assets/js/loading.js`: carregamento inicial e fontes.
- `vercel.json`: cabeçalhos de segurança e cache na Vercel.

Os caminhos dos scripts são relativos para funcionar tanto na raiz de um domínio quanto em `/NeoX-Inc/`, no GitHub Pages.

## Formulário

O formulário faz um POST normal ao FormSubmit. O visitante continua no serviço para passar pela verificação e confirmar o envio. O site não desativa o CAPTCHA, não declara sucesso antes da confirmação, não apaga a mensagem e não repete o POST automaticamente.

O endereço público é configurado em `assets/js/config.js` e no atributo `action` do formulário, no HTML. Ao trocar o identificador do formulário, atualizar os dois. O identificador não é uma senha; não colocar senhas ou chaves privadas em nenhum arquivo publicado.

O campo `_honey` é enviado ao fornecedor. A validação dos campos no navegador ajuda o visitante, mas não equivale a uma limitação de frequência no servidor. O GitHub Pages hospeda arquivos estáticos e não executa um backend. Uma limitação própria e persistente de envios exige um serviço de backend, com armazenamento e verificação contra bots no servidor.

O proprietário precisa manter o formulário ativado no FormSubmit. A alteração do código não comprova a ativação, a entrega de e-mails nem os limites antispam internos do fornecedor. Não realizar envios de teste em massa.

## Segurança e hospedagem

A CSP permite JavaScript apenas da própria origem e bloqueia handlers inline. Manter o JavaScript nos arquivos externos, sem `onclick`, `eval` ou scripts executáveis inline. O CSS ainda permite estilos inline porque a interface usa estilos e animações dinâmicos.

A política está no HTML e em `vercel.json`; manter as duas versões alinhadas. O GitHub Pages não aplica `vercel.json`. Nesse host, a política disponível no HTML não substitui os cabeçalhos `frame-ancestors` e `X-Frame-Options`, que precisam ser configurados no servidor ou em um proxy. O frame guard é complementar.

O endereço canônico usa `https://www.neoxinc.website/`, o domínio personalizado informado para o projeto. Se o endereço principal mudar, atualizar também os metadados sociais e os dados estruturados.

## Verificação local

Com Node.js instalado, executar na raiz do repositório:

```sh
node --test
node --check assets/js/site.js
```

Os testes cobrem a política de scripts, os caminhos do GitHub Pages, o encaminhamento do formulário, envios inválidos ou duplicados e a consistência entre os textos iniciais e as traduções. Eles não enviam mensagens ao FormSubmit.
