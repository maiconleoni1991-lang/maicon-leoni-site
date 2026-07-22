# Maicon Leoni — Site Oficial

Código completo do site oficial de **Maicon Leoni**, produtor e criador de músicas gospel e personalizadas.

## Site publicado

[maicon-leoni.maiconleoni1991.chatgpt.site](https://maicon-leoni.maiconleoni1991.chatgpt.site)

## GitHub Pages

[maiconleoni1991-lang.github.io/maicon-leoni-site](https://maiconleoni1991-lang.github.io/maicon-leoni-site/)

A versão estática e navegável do GitHub Pages está na pasta `docs/`.

## Recursos

- apresentação profissional do produtor musical;
- lançamentos e carrossel de músicas recentes;
- player persistente do lançamento principal;
- atalhos para Spotify, YouTube, YouTube Music, Deezer, Instagram e Facebook;
- identidade visual em preto, prata e dourado;
- layout responsivo para computador e celular;
- logo oficial e imagens incluídas no projeto.

## Tecnologias

- React 19
- Next.js 16
- Vinext/Vite
- TypeScript
- Tailwind CSS
- Cloudflare Workers

## Executar localmente

Requisitos: Node.js `22.13.0` ou superior e npm.

```bash
npm ci
npm run dev
```

## Gerar a versão de produção

```bash
npm run build
```

Para atualizar a versão estática do GitHub Pages:

```bash
npm run build:pages
```

## Estrutura principal

- `app/page.tsx`: conteúdo e interações da página;
- `app/globals.css`: identidade visual e responsividade;
- `public/`: logos e arquivos públicos;
- `scripts/`: instalação, compilação e validação;
- `worker/`: ponto de entrada para publicação;
- `.github/workflows/build.yml`: verificação automática do projeto no GitHub.

## Direitos

© 2026 Maicon Leoni. Todos os direitos reservados.
