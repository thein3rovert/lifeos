In Go, `html/template` is a built-in package that lets you write HTML files with dynamic data injected into them. So for example your photos page could render an actual HTML page showing your photos instead of just saying "photos page".

The flow is:
1. Handler fetches some data
2. Passes it to a template
3. Template renders it as HTML and sends it back to the browser

> The {{template "content" .}} part is where each page injects its own content into the base layout.
The browser requests a page → Go handler processes it → renders the template → sends back HTML to the browser.
