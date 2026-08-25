# DG Cobranças — Landing Page

Landing page estática de página única. HTML, CSS e JavaScript vanilla,
sem dependências, sem etapa de build.

## Estrutura

```
.
├── index.html              única página do site
├── assets/
│   ├── css/style.css       tokens de design + seções, na ordem do HTML
│   ├── js/script.js        reveal on scroll, header, tabs, carrossel, acordeão
│   ├── fonts/              SF Pro Display (Regular, Medium, Semibold)
│   ├── img/                fotos das seções
│   └── svg/                logos do header e do footer
├── vercel.json             cache e headers de segurança
└── .gitignore
```

`style.css` e `script.js` seguem a mesma ordem das seções do `index.html`,
cada bloco com o comentário da seção correspondente.

## Rodar localmente

O site é estático; qualquer servidor HTTP serve. Abrir o `index.html`
direto pelo `file://` funciona, mas o carregamento das fontes pode falhar
por CORS — prefira subir um servidor:

```bash
python3 -m http.server 3000
# http://localhost:3000
```

## Deploy na Vercel

O projeto não tem build. Ao importar o repositório:

- **Framework Preset:** Other
- **Build Command:** vazio
- **Output Directory:** vazio (a raiz do repositório já é o site)
- **Install Command:** vazio

Cada push na `main` publica em produção; pushes em outras branches geram
uma preview.

Alternativa por linha de comando:

```bash
npx vercel        # preview
npx vercel --prod # produção
```

## Cache

`vercel.json` marca `assets/fonts`, `assets/img` e `assets/svg` como
imutáveis por um ano. **Ao trocar um desses arquivos, use um nome novo** —
substituir em cima mantém a versão antiga no cache dos visitantes.
`assets/css` e `assets/js` são revalidados a cada carregamento, então
podem ser editados no lugar.
