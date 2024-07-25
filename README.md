## Content-Selection-Component

This repo contains two custom 'content-selection' components for the [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer).

### ContentSelectionRedirectHttpHandler

[ContentSelectionRedirectHttpHandler](./src/ContentSelectionRedirectHttpHandler.ts) uses redirects to point the client to the resource file that best matches the requested content type. The component is only active on specified paths and uses the specified type mappings to create HTTP redirects (3xx status plus `location` header). The ContentSelectionRedirectHttpHandler extends the [HttpHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/HttpHandler.html) class similar to the [RedirectingHttpHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/RedirectingHttpHandler.html).

1. only HTTP GET
2. only on specified server paths
3. only file URIs without extension
4. (optionally) only if match between accept header and type mappings

Example: GET 'text/html' from /sensor-1/data --> 303 location: /sensor-1/data.html

### ContentSelectionOperationHandler

[ContentSelectionOperationHandler](./src/ContentSelectionOperationHandler.ts) directly delivers the resource file that best matches the requested content type. The component is only active on specified paths and uses the specified type mappings to determine a URI with file extension which is then loaded from the ResourceStore. ContentSelectionOperationHandler extends the abstract [OperationHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/OperationHandler.html) class similar to the [GetOperationHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/GetOperationHandler.html).

Conditions under which the [ContentSelectionOperationHandler](./src/ContentSelectionOperationHandler.ts) is active:
1. only HTTP GET
2. only on specified server paths
3. only file URIs without extension
4. only if the target resource does not exist

The ContentSelectionOperationHandler incompletely imitates the behavior of the Apache Module [mod_negotiation](https://httpd.apache.org/docs/2.4/mod/mod_negotiation.html).

### Setup

Install dependencies (CSS, components.js, Jest): `npm i`

Transpile TypeScript: `npm run build`

Start the ContentSelectionRedirectHttpHandler: `npm run start:redirect`

Start the ContentSelectionOperationHandler: `npm run start:deliver`

Run the tests (for ContentSelectionRedirectHttpHandler): `npm test`

CURL example: `curl -v -H 'accept: text/html' http://localhost:3000/sensor-1/data`

#### Known Issues

* In general, the project can be built on Linux and Windows but components.js works better on Linux.
  * Importing the config `css:config/ldp/authorization/allow-all.json` runs on both OS whereas `css:config/ldp/authorization/webacl.json` only starts on Linux.
  * On Windows, components.js aborts with an error `Invalid term IRI WebAclMetadataCollector`.

* Flexible config that can be combined with any other CSS config
  * Possible if CSS upgrades the componentsjs version to v5.5 or v6.0 (next major release)
  * Current workaround: add componentsjs@5.5.1 to dependencies of this package

### Future Work

Conceptual:
* Consider [Mapping between HTTP URLs and filenames on a server](https://www.w3.org/DesignIssues/HTTPFilenameMapping.html) by TimBL
  * [ExtensionBasedMapper](https://github.com/CommunitySolidServer/CommunitySolidServer/blob/main/src/storage/mapping/ExtensionBasedMapper.ts) maps URLs to files with extensions
* Remove limitation to GET requests
* Behavior if no specific content type is requested by the user
  * Currently: type mapping should include mapping for default `*/*`
  * Better: HTTP 300 with HTML overview of available data representations

Technical:
* Default type mapings
  * Using the [mime-types](https://www.npmjs.com/package/mime-types) module that CSS uses
  * Derived from Apache httpd [mime.types](https://svn.apache.org/repos/asf/httpd/httpd/trunk/docs/conf/mime.types)
* Publish components as NPM package
