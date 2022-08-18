/**
 * This implementation of the `MutationObserver` interface provides the ability
 * to use custom-elements as if they were browser native.
 * The necessary scripts are lazy loaded upon first occurrence in the DOM.
 */
export default class CustomElementsLazyLoader extends MutationObserver
{
    /** @type {CustomElementLoader} */      #loader      = null;
    /** @type {CustomElementFilter} */      #filter      = null;
    /** @type {CustomElementUrlResolver} */ #urlResolver = null;

    /**
     * This implementation of the `MutationObserver` interface provides the ability
     * to use custom-elements as if they were browser native.
     * The necessary scripts are lazy loaded upon first occurrence in the DOM.
     *
     * @param {CustomElementsLazyLoaderInit} [options]
     */
    constructor( options )
    {
        let onElementAdded;
        let onIsAttributeChange;

        /**
         * @type {MutationCallback}
         * @param {MutationRecord[]} records
         */
        const mutationCallback = ( records ) =>
        {
            for (let ri = 0, record = records[ri]; ri < records.length; record = records[++ri])
            {
                if(record.type === 'attributes') { onIsAttributeChange(record.target); }
                else // we did not register for characterData, so a check for childList is unnecessary.
                {
                    for (const node of record.addedNodes)
                    {
                        if (node.nodeType === Node.ELEMENT_NODE) { onElementAdded(node); }
                    }
                }
            }
        }

        super(mutationCallback);
        onElementAdded      = this.#onElementAdded.bind(this);
        onIsAttributeChange = this.#onIsAttributeChanged.bind(this);

        options = this.#resolveConstructorOptions(
            options,
            {
                filter     : null,
                loader     : CustomElementsLazyLoader.#loadDefault,
                urlResolver: CustomElementsLazyLoader.#resolveUrlDefault,
            }
        );

        this.#filter      = options.filter;
        this.#loader      = options.loader;
        this.#urlResolver = options.urlResolver;
    }

    /**
     * Starts the observation of the `target` for newly added custom-elements.<br/>
     * Use `options` to control whether the `target` will be scanned for existing custom-elements.
     * @param {Node}                      target    Node to observe
     * @param {CustomElementsObserveInit} [options] Options to configure observation
     */
    observe( target, options )
    {
        options = this.#resolveObserveOptions(options, { scan: true, subtree: true });

        super.observe(target, { attributes: true, attributeFilter: ['is'], childList: options.subtree, subtree: options.subtree });

        if (options.scan) { this.#scan(target, options.subtree); }
    }

    /**
     * Returns sanitized options.
     * @param {CustomElementsLazyLoaderInit} options
     * @param {CustomElementsLazyLoaderInit} defaults
     * @return {CustomElementsLazyLoaderInit}
     * @throws {TypeError}
     */
    #resolveConstructorOptions( options, defaults )
    {
        if(!options) { return { ...defaults }; }

        let filter      = null;
        let urlResolver = null;
        let loader      = null;

        if (!options.filter)                           { filter = defaults.filter; }
        else if (typeof options.filter === 'function') { filter = options.filter; }
        else if (Array.isArray(options.filter))        { filter = ( name ) => options.filter.includes(name); }
        else { throw new TypeError(`Expecting provided filter to be type of function or string[].`); }

        if (!options.urlResolver)                           { urlResolver = defaults.urlResolver; }
        else if (typeof options.urlResolver === 'function') { urlResolver = options.urlResolver; }
        else if (options.urlResolver instanceof Map)        { urlResolver = ( name ) => (/** @type {Map<string,URL|string>}*/ options.urlResolver).get(name); }
        else { throw new TypeError(`Expecting provided urlResolver to be type of function.`); }

        if (!options.loader)                           { loader = defaults.loader; }
        else if (typeof options.loader === 'function') { loader = options.loader; }
        else { throw new TypeError(`Expecting provided loader to be type of function.`); }

        return {
            filter     : filter,
            urlResolver: urlResolver,
            loader     : loader,
        };
    }

    /**
     * Returns sanitized options.
     * @param {CustomElementsObserveInit} options
     * @param {CustomElementsObserveInit} defaults
     * @returns {CustomElementsObserveInit}
     */
    #resolveObserveOptions( options, defaults )
    {
        if (!options) { return { ...defaults }; }

        return {
            scan   : options.scan !== void 0 ? !!options.scan : defaults.scan,
            subtree: options.subtree !== void 0 ? !!options.subtree : defaults.subtree,
        };
    }

    /**
     * Callback for each newly added element.
     * @param {Element} element
     */
    #onElementAdded( element )
    {
        const names = this.#resolveNames(element);

        if (!this.#shouldHandle(names.elementName)) { return; }

        this.#define(names);
    }

    /**
     * Callback for each change to the elements' `is`-Attribute.
     * @param {Element} element
     */
    #onIsAttributeChanged( element )
    {
        const names = this.#resolveNames(element);

        if (!this.#shouldHandle(names.elementName)) { return; }

        this.#define(names);
    }

    /**
     * Scans the nodes' direct children for custom-elements.
     * @param {Element|Iterable<Element>|HTMLCollection} elements Target element / elements to scan
     * @param {boolean}                                  subtree  Scan the subtree recursively
     */
    #scan( elements, subtree )
    {
        if (!elements[Symbol.iterator]) { elements = [/** @type {Element} */ elements]; }

        for (const element of elements)
        {
            const names = this.#resolveNames(element);
            if (this.#shouldHandle(names.elementName)) { this.#define(names); }

            if (subtree)
            {
                for (const child of element.children)
                {
                    const childNames = this.#resolveNames(child);
                    if (this.#shouldHandle(childNames.elementName)) { this.#define(childNames) }

                    this.#scan(child.children, true);
                }
            }
        }
    }

    /**
     * Resolves the custom-element name for the given `element` by analyzing its tag-name and `is`-Attribute.
     * @param {Element} element
     * @returns {ElementNames}
     */
    #resolveNames( element )
    {
        const tagName = ((/** @type {Element}*/ element).tagName).toLowerCase();
        let   isAttr  = (/** @type {Element}*/ element).getAttribute('is');
        const names   = {
                            elementName: tagName,
                            tagName    : tagName,
                        };

        if(typeof isAttr === 'string')
        {
            isAttr = isAttr.toLowerCase();
            names.elementName = isAttr;
            names.isAttr      = isAttr;
        }

        return names;
    }

    /**
     * Tests the `name` is to be handled by this instance.
     * @param {string} name Name
     * @return {boolean} `true` if the `name` is a valid custom-element name, not already registered and is to be handled by this instance.
     */
    #shouldHandle( name )
    {
        return !!name
            && this.#isCustomElementName(name)
            && !this.#isRegistered(name)
            && (!this.#filter || !!this.#filter(name));
    }

    /**
     * Tests if the `name` is a valid custom-element name.
     * @param {string|null} [name] Lower-case name
     * @return {boolean} `true` if the name is valid.
     */
    #isCustomElementName( name )
    {
        if (typeof name !== 'string') { return false; }

        const firstChar                    = name.charCodeAt(0);
        const A_CHAR                       = 'a'.codePointAt(0);
        const Z_CHAR                       = 'z'.codePointAt(0);
        const INVALID_CUSTOM_ELEMENT_NAMES = [ 'annotation-xml', 'color-profile', 'font-face', 'font-face-src', 'font-face-uri', 'font-face-format', 'font-face-name', 'missing-glyph', ];

        // We could validate against https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name,
        // but loose checking seems to be sufficient for out purposes.
        return A_CHAR <= firstChar && firstChar <= Z_CHAR
            && name.indexOf('-') > 0
            && !INVALID_CUSTOM_ELEMENT_NAMES.includes(name);
    }

    /**
     * Test if the element-name is already registered.
     * @param {string} [name]
     * @return {boolean} `true` if the element-name is registered.
     */
    #isRegistered( name )
    {
        return !!name && !!customElements.get(name);
    }

    /**
     * @param {ElementNames} names
     * @throws
     */
    #define( names )
    {
        this.#load(names.elementName)
            .then(( ctor ) =>
            {
                const options = {};

                if (typeof names.isAttr === 'string') { options.extends = names.tagName; }

                // If the constructor is explicitly null, we assume that this is intentionally to avoid the actual definition.
                if (ctor === null) { console.warn(`Custom-Element constructor for '${names.elementName}' is null, skipping definition!`); }
                else               { customElements.define(names.elementName, ctor, options); }
            })
            .catch(( error ) =>
            {
                throw new Error(`Error defining element '${names.elementName}'.`, { cause: error });
            });
    }

    /**
     * Loads the module for the custom-element with the given `element-name`.
     * @param {string} elementName Lower-case element-name
     * @return Promise<CustomElementConstructor>
     * @throws
     */
    async #load( elementName )
    {
        let url = this.#urlResolver(elementName);

        if (typeof url === 'string')
        {
            try { url = new URL(url,  window.location); }
            catch ( error ) { throw new SyntaxError(`Cannot parse provided URL '${url}' for '${elementName}'.`, { cause: error }); }
        }

        if (!(url instanceof URL)) { throw new TypeError(`Configured CustomElementUrlResolver did not provide an valid URL for '${elementName}'.`); }

        try { return await this.#loader(url); }
        catch ( error ) { throw new Error(`Error loading constructor for custom-element '${elementName}' from '${url}'.`, { cause: error }); }
    }

    /**
     * Default CustomElementUrlResolver
     * @type {CustomElementUrlResolver}
     * @param {string} name Element-Name
     * @return {URL} URL (_protocol://domain.tld/js/<name>-element.js_)
     */
    static #resolveUrlDefault( name )
    {
        return new URL(`/js/${name}-element.js`,  window.location);
    }

    /**
     * Default CustomElementLoader
     * @type {CustomElementLoader}
     * @param {URL} url
     * @return Promise<CustomElementConstructor>
     * @throws {TypeError}
     */
    static async #loadDefault( url )
    {
        // Leverage native dynamic import to load the module.
        const module = await import(url);

        if (!module || !module.default) { throw new TypeError(`URL '${url}' does not point do an ES-Module with default export.`); }

        return module.default;
    }
}

/**
 * Resolved element-names, all lower-case.
 * @typedef {Object} ElementNames
 *
 * @property {string|""} elementName
 * @property {string}    tagName
 * @property {string|""} [isAttr]
 */