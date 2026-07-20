# Carta para Luiza

Página estática, responsiva e mobile first, preparada para o GitHub Pages.

## Publicar rapidamente

1. Extraia o arquivo ZIP.
2. Crie um repositório novo no GitHub.
3. Envie **os arquivos que estão dentro da pasta** para a raiz do repositório:
   `index.html`, `styles.css`, `script.js`, `.nojekyll` e `README.md`.
4. No repositório, abra **Settings → Pages**.
5. Em **Build and deployment**, escolha **Deploy from a branch**.
6. Selecione a branch `main`, a pasta `/ (root)` e clique em **Save**.
7. Aguarde cerca de um minuto. O endereço aparecerá nessa mesma tela.

Não é necessário instalar pacotes, executar build ou configurar domínio.

## Testar no computador

Você também pode abrir `index.html` diretamente no navegador. Para um teste mais fiel, dentro da pasta execute:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000`.
