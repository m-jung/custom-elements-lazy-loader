# CustomElementsLazyLoader
Provides the ability to use custom-elements as if they were natively supported by the browser.\
Necessary modules are lazily loaded upon first occurrence of the element in the DOM.

## Use Case
Mainly a proof of concept for environments where the smaller initial footprint
of JavaScript resources is more important than fewer requests.

## Bundlers
Bundlers like Webpack are explicitly not supported as the use case for lazy-loading is
contradictory to bundling anything beforehand.

However, browser-native Web-Bundles (see: https://web.dev/web-bundles/) should work. 

## Requirements

- ES6 compliance
- [`MutationObserver`](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver) support
- [`import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import)-Operator support

## Getting started

To get startet, each custom-elements module must provide a default export in a js-file located in _/js_.\
Eg.: _domain.tld/js/my-element.js_\
Also `CustomElementsLazyLoader` must be provided in a way the browser can handle, which may be a module also.

```
domain.tld
│   index.html    
└───js
│   │   main.js
│   │   custom-elements-lazy-loader.mjs
│   │   my-h1-element.js
│   │   my-h2-element.js
│   │   my-section-element.js
│   │   my-article-element.js
```

```javascript
<!-- my-h1-element.js -->
export default class MyHeadingElement extends HTMLHeadingElement
{
    //...
}
```

```html
<!-- index.html ... -->
<body>
    <h1 is="my-h1">Hello i'm a custom heading</h1>
    <my-section>I'm a autonomous custom-element.</my-section>
</body>

<script type="module">
    import CustomElementsLazyLoader from "/js/custom-elements-lazy-loader.mjs";

    new CustomElementsLazyLoader().observe(document.body);
    
    const customHeading = document.createElement('h2');
    customHeading.setAttribute('is', 'my-h2');
    
    document.body.append(customHeading, document.createElement('my-article'));
    
    customElements.whenDefined('my-section')
            .then(( name ) => { console.log(name); });
</script>
```

If everything is set up correctly, `my-h1`, `my-h2`, `my-section` and `my-article` get defined automatically,
without the need to do this beforehand.\
You may use [CustomElementRegisty::whenDefined()](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined) to do something when an Element is defined.

## Customization
* `filter`: `CustomElementsLazyLoader({ filter: (name: String):boolean })`\
  Customize filtering. Say you'd want to load only element with a specific prefix:\
  Example: `(name) => name.startsWith('prefix-')`
* `urlResolver`: `CustomElementsLazyLoader({ urlResolver: function(name: String): URL|String })`\
  Customize URLs. Load _*-element.mjs_ from _/js/modules_:\
  Example: ``(name) => new URL(`/js/modules/${name}-element.js`,  window.location)``
* `loader`: `CustomElementsLazyLoader({ loader: (url: URL):CustomElementConstructor })`\
  Customize the actual loading (rarely needed).\
  Example: `(url) =>  return import(url).default`

See JS / TS Docs und Unit-Test for further details.

## Observation

* `element`: `.observe(element)` narrows the scope of observation to the element and its subtree.
* `subtree`: `.observe(element, { subtree: false })` limits the observation to the element itself.
* `scan`: `.observe(element, { scan: false })` disables scanning the element's existing DOM, only newly added descendants will be handled.
* `.disconnect()`: `.disconnect()` stops the observation.

## Notes

### Performance
Beware that scanning / observing the DOM may have noticeable performance drawbacks,
so keep the scope as narrow as possible.

### Shadow DOM
The scanning / observing does not pierce the Shadow DOM of elements, even if configured `{mode: 'open')`.\
If you want to enable lazy loading in Shadow DOM, you need do observe each `ShadowRoot`.

## Testing

This module uses [Jest](https://facebook.github.io/jest/) with _jest-environment-jsdom_.\
If you run anything in NodeJS, be sure to use the `--experimental-vm-modules`-Parameter since were dealing with native ES-Modules.\
Eg.: `node --experimental-vm-modules node_modules/jest/bin/jest.js` for testing.

```
npm test
```