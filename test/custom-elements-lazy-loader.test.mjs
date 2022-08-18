import CustomElementsLazyLoader from "../src/custom-elements-lazy-loader.mjs";

const resolveNull = () => new Promise(( resolve ) => { resolve(null); });

describe('CustomElementsLazyLoader Tests', () =>
{
    describe('CustomElementsLazyLoader Constructor', () =>
    {
        test('constructor processes CustomElementsLazyLoaderInit', () =>
        {
            expect(() => { new CustomElementsLazyLoader(); }).not.toThrow();
            expect(() => { new CustomElementsLazyLoader({}); }).not.toThrow();

            expect(() => { new CustomElementsLazyLoader({ filter: () => {} }); }).not.toThrow();
            expect(() => { new CustomElementsLazyLoader({ filter: ['x-element'] }); }).not.toThrow();
            expect(() => { new CustomElementsLazyLoader({ filter: "invalid"}); }).toThrow(TypeError);

            expect(() => { new CustomElementsLazyLoader({ urlResolver: () => {} }); }).not.toThrow();
            expect(() => { new CustomElementsLazyLoader({ urlResolver: new Map([['x-element', '/js/x-element-element.js']]) }); }).not.toThrow();
            expect(() => { new CustomElementsLazyLoader({ urlResolver: "invalid"}); }).toThrow(TypeError);

            expect(() => { new CustomElementsLazyLoader({ loader: () => {} }); }).not.toThrow();
            expect(() => { new CustomElementsLazyLoader({ loader: "invalid"}); }).toThrow(TypeError);
        });
    });

    describe('CustomElementsLazyLoader.observe()', () =>
    {
        const scope = document.createElement('div');

        beforeAll(() =>
        {
            // Various valid, invalid and prohibited elements / element-names
            scope.innerHTML = `
                <x-element></x-element>
                <div is="is-x-element"></div>
                <xelement></xelement>
                <1-invalid></1-invalid>
                <div is="1-invalid"></div>
                <annotation-xml></annotation-xml>
                <color-profile name=""></color-profile>
                <font-face></font-face>
                <font-face-src></font-face-src>
                <font-face-uri></font-face-uri>
                <font-face-format></font-face-format>
                <font-face-name></font-face-name>
                <missing-glyph></missing-glyph>
                <div is="annotation-xml"></div>
                <div is="color-profile"></div>
                <div is="font-face"></div>
                <div is="font-face-src"></div>
                <div is="font-face-uri"></div>
                <div is="font-face-format"></div>
                <div is="font-face-name"></div>
                <div is="missing-glyph"></div>
                <div>
                    <y-element></y-element>
                    <div is="is-y-element"></div>
                </div>
            `;
        });

        /**
         * Tests if disabling scanning upon observation start works as expected.
         */
        test('Doesn\'t scan, if { scan: false }', () =>
        {
            let   names    = [];
            const filter   = ( name ) => { names.push(name); }
            const observer = new CustomElementsLazyLoader({ filter: filter, loader: resolveNull });

            observer.observe(scope, { scan: false });

            expect(names).toEqual([]);

            observer.disconnect();
        });

        /** Tests if scanning of the Element upon observation start works as expected. */
        test('Scans target, if { scan: true, subtree: false }', () =>
        {
            let   names    = [];
            const filter   = ( name ) => { names.push(name); }
            const observer = new CustomElementsLazyLoader({ filter: filter, loader: resolveNull });
            const target   = document.createElement('x-element');

            observer.observe(target, { scan: true, subtree: false });

            expect(names).toEqual(['x-element']);

            observer.disconnect();
        });

        /** Tests if scanning of the DOM upon observation start works as expected. */
        test('Scans descendants, if { scan: true, subtree: true }', () =>
        {
            let   names    = [];
            const filter   = ( name ) => { names.push(name); }
            const observer = new CustomElementsLazyLoader({ filter: filter, loader: resolveNull });

            observer.observe(scope, { scan: true, subtree: true });

            expect(names).toEqual(['x-element', 'is-x-element', 'y-element', 'is-y-element']);

            observer.disconnect();
        });

        /** Tests if mutations of the Element while the observation is running works as expected. */
        test('Observes target only, if { subtree: false }', async () =>
        {
            let   names    = [];
            const filter   = ( name ) => { names.push(name); }
            const observer = new CustomElementsLazyLoader({ filter: filter, loader: resolveNull });
            const target   = document.createElement('div');

            observer.observe(target, { scan: false, subtree: false });

            target.setAttribute('is', 'is-x-element');

            await Promise.resolve();
            expect(names).toEqual(['is-x-element']);

            observer.disconnect();
        });

        /** Tests if mutations of the DOM while the observation is running works as expected. */
        test('Observes descendants, if { subtree: true }', async () =>
        {
            let   names    = [];
            const filter   = ( name ) => { names.push(name); }
            const observer = new CustomElementsLazyLoader({ filter: filter, loader: resolveNull });

            observer.observe(scope, { scan: false, subtree:  true });

            const zElement  = document.createElement('z-element');
            const isElement = document.createElement('div');

            isElement.setAttribute('is', 'is-z-element'); // is-Attribute set before attachment

            scope.append(zElement, isElement);

            await Promise.resolve();
            expect(names).toEqual(['z-element', 'is-z-element']);

            isElement.setAttribute('is', 'is-zz-element'); // is-Attribute changed after attachment

            await Promise.resolve();
            expect(names).toEqual(['z-element', 'is-z-element', 'is-zz-element']);

            observer.disconnect();

            zElement.remove();
            isElement.remove();
        });
    });

    describe('Filtering names', () =>
    {
        const scope = document.createElement('div');

        beforeAll(() =>
        {
            scope.innerHTML = `
                <x-element></x-element>
                <div is="y-element"></div>
                <z-element></z-element>
            `;
        });

        /** Tests if the filtering by name works as expected. */
        test('Filters by name', async () =>
        {
            let   names    = [];
            const filter   = ['x-element', 'y-element'];
            const resolver = ( name ) => { names.push(name); return `${name}.js` }
            const observer = new CustomElementsLazyLoader({ filter: filter, urlResolver: resolver, loader: resolveNull });

            observer.observe(scope, { scan: true });

            await Promise.resolve();
            expect(names).toEqual(['x-element', 'y-element']);

            observer.disconnect();
        });

        /** Tests if the filtering by function works as expected. */
        test('Filters by function', () =>
        {
            let   names    = [];
            const filter   = ( name ) => ['x-element', 'y-element'].includes(name);
            const resolver = ( name ) => { names.push(name); return `${name}.js` }
            const observer = new CustomElementsLazyLoader({ filter: filter, urlResolver: resolver, loader: resolveNull });

            observer.observe(scope, { scan: true });

            expect(names).toEqual(['x-element', 'y-element']);

            observer.disconnect();
        });
    });

    describe('Resolving URLs', () =>
    {
        const scope = document.createElement('div');

        beforeAll(() =>
        {
            scope.innerHTML = `
                <x-element></x-element>
                <div is="y-element"></div>
            `;
        });

        /** Tests if the resolving from mapping works as expected. */
        test('Resolve from mapping', () =>
        {
            let   urls     = [];
            const resolver = new Map([
                                ['x-element', 'http://domain.tld/x-element.js'],
                                ['y-element', 'http://domain.tld/y-element.js']
                            ]);
            const loader   = ( url ) => { urls.push('' + url); return resolveNull(); }
            const observer = new CustomElementsLazyLoader({ urlResolver: resolver, loader: loader });

            observer.observe(scope, { scan: true });

            expect(urls).toEqual(['http://domain.tld/x-element.js', 'http://domain.tld/y-element.js']);

            observer.disconnect();
        });

        /** Tests if the resolving by function works as expected. */
        test('Resolve from mapping', () =>
        {
            let   urls     = [];
            const resolver = ( name ) => `${name}.js`;
            const loader   = ( url ) => { urls.push(url); return resolveNull(); }
            const observer = new CustomElementsLazyLoader({ urlResolver: resolver, loader: loader });

            observer.observe(scope, { scan: true });

            expect(urls).toEqual(['x-element.js', 'y-element.js']);

            observer.disconnect();
        });
    });

    describe('Loading custom-element constructors', () =>
    {
        const scope = document.createElement('div');
        const repo  = new Map([
            ['http://domain.tld/x-element.js', class XElement extends HTMLElement { constructor() { super(); } }],
            ['http://domain.tld/y-element.js', class YElement extends HTMLDivElement { constructor() { super(); } }]
        ]);

        beforeAll(() =>
        {
            class AElement extends HTMLElement { constructor() { super(); } }

            customElements.define('a-element', AElement);

            scope.innerHTML = `
                <a-element></a-element>
                <x-element></x-element>
                <div is="y-element"></div>
            `;
        });

        /** Tests if the loading of constructors works as expected. */
        test('Resolve from mapping', async () =>
        {
            const resolver = new Map([
                                ['a-element', 'http://domain.tld/a-element.js'],
                                ['x-element', 'http://domain.tld/x-element.js'],
                                ['y-element', 'http://domain.tld/y-element.js'],
                            ]);
            const urls     = [];
            const loader   = async ( url ) => { urls.push('' + url); return repo.get('' + url); }
            const observer = new CustomElementsLazyLoader({ urlResolver: resolver, loader: loader });

            observer.observe(scope, { scan: true });

            await Promise.all([
                customElements.whenDefined('x-element'),
                customElements.whenDefined('y-element'),
            ]);

            customElements.upgrade(scope);
            customElements.upgrade(scope.querySelector('[is="y-element"]'));

            expect(urls).toEqual(['http://domain.tld/x-element.js', 'http://domain.tld/y-element.js']); // Did not attempt to load a-element.js
            expect(customElements.get('x-element')).toBe(repo.get('http://domain.tld/x-element.js'));
            expect(scope.querySelector('x-element')).toBeInstanceOf(repo.get('http://domain.tld/x-element.js'));
            expect(customElements.get('y-element')).toBe(repo.get('http://domain.tld/y-element.js'));
            expect(scope.querySelector('[is="y-element"]')).toBeInstanceOf(repo.get('http://domain.tld/y-element.js'));

            observer.disconnect();
        });
    });
});