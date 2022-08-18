interface CustomElementsLazyLoader extends MutationObserver
{
    new(options: CustomElementsLazyLoaderInit): CustomElementsLazyLoader;

    observe(target: Node, options?: CustomElementsObserveInit): void;
}

interface CustomElementsLazyLoaderInit
{
    /** Filter to match custom-elements names to be loaded. */
    filter?: CustomElementFilter|string[];

    /** Method to resolve the URL of a custom-element module for a given name. */
    urlResolver?: CustomElementUrlResolver|Map<string,URL|string>;

    /** Method to load and register custom-elements by their name */
    loader?: CustomElementLoader;
}

interface CustomElementsObserveInit
{
    /** Set to `true` (_default_) if the target's DOM is to be scanned for custom-element immediately. */
    scan?: boolean;

    /** Set to `true` (_default_) if mutations to not just target, but also target's descendants are to be observed. */
    subtree?: boolean;
}

/**
 * Applies logic to an elements name to see if it matches the criteria to be loaded.
 */
interface CustomElementFilter
{
    /**
     * @param name Lower-case name of the custom-element.
     *             The name may reflect the elements' tag-name or value of it's `is`-Attribute.
     * @return `true` if the tag-name matches the criteria.
     */
    (name: string): boolean;
}

/**
 * Method to resolve the URL of a custom-element module for a given name.
 */
interface CustomElementUrlResolver
{
    /**
     * @param name Lower-case name of the custom-element.
     *             The name may reflect the elements' tag-name or value of it's `is`-Attribute.
     * @return The URL to load the module from.
     */
    (name: string): URL|string;
}

/**
 * Fetches the constructor for a specific custom-element by its tag-name
 * and registers it at the `customElements`-Registry.
 *
 * The default-loader expects the module to export the element's constructor as _default_.
 */
interface CustomElementLoader
{
    (url: URL): Promise<CustomElementConstructor>;
}