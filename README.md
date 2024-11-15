## Content-Selection-Component

This repo contains two custom 'content-selection' components for the [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer).

### ContentSelectionRedirectHttpHandler

[ContentSelectionRedirectHttpHandler](./src/ContentSelectionRedirectHttpHandler.ts) uses redirects to point the client to the resource file that best matches the requested content type. The component is only active on specified paths and uses the specified type mappings to create HTTP redirects (3xx status plus `location` header). The ContentSelectionRedirectHttpHandler extends the [HttpHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/HttpHandler.html) class similar to the [RedirectingHttpHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/RedirectingHttpHandler.html).

1. only HTTP GET
2. only on specified server paths
3. only file URIs without extension
4. (optionally) only if match between accept header and type mappings

Example: `GET 'accept: text/html' from /sensor-1/data` -> `303 'location: /sensor-1/data.html' no content`

### ContentSelectionOperationHandler

[ContentSelectionOperationHandler](./src/ContentSelectionOperationHandler.ts) directly delivers the resource file that best matches the requested content type. The component is only active on specified paths and uses the specified type mappings to determine a URI with file extension which is then loaded from the ResourceStore. ContentSelectionOperationHandler extends the abstract [OperationHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/OperationHandler.html) class similar to the [GetOperationHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/GetOperationHandler.html).

Conditions under which the [ContentSelectionOperationHandler](./src/ContentSelectionOperationHandler.ts) is active:
1. only HTTP GET
2. only on specified server paths
3. only file URIs without extension
4. only if the target resource does not exist

Example: `GET 'accept: text/html' from /sensor-1/data` -> `200 'location: /sensor-1/data.html' with file content`

The ContentSelectionOperationHandler incompletely imitates the behavior of the Apache Module [mod_negotiation](https://httpd.apache.org/docs/2.4/mod/mod_negotiation.html).

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

### Setup

Install dependencies (CSS, components.js, Jest): `npm i`

Transpile TypeScript: `npm run build`

Start the ContentSelectionRedirectHttpHandler: `npm run start:redirect`

Start the ContentSelectionOperationHandler: `npm run start:deliver`

Run the tests (for ContentSelectionRedirectHttpHandler): `npm test`

CURL example: `curl -v -L -H 'accept: text/html' http://localhost:3000/sensor-1/data`

### Use as NPM package

#### Variant 1: CSS dependency (recommended)

Create a package.json with CSS and content-selection-module as dependencies
```javascript
{
  "dependencies": {
    "@solid/community-server": "^7.1.0",
    "content-selection-module": "^1.0.2"
  }
}
```

_Recommended_: Add newer version of componentsjs to enable the use of more modular configurations: add `"componentsjs": "^5.5.1` to the dependencies above

Install dependencies: `npm i`

_With componentsjs@5.5.1 or newer_:  Start CSS with a base config and a content-selection config:
`community-solid-server -c @css:config/file.json node_modules/content-selection-module/config/contentselection-redirect.json -f .data -m .`

_With older componentsjs_: Start CSS with a complete config:
`community-solid-server -c node_modules/content-selection-module/config/complete/contentselectionredirect-file.json -f .data -m .`

> The argument `-m .` is important for the components initialization, see [CSS parameters](https://communitysolidserver.github.io/CommunitySolidServer/latest/usage/starting-server/#configuring-the-server).


#### Variant 2: With cloned CSS

Clone CSS repo: `git clone git@github.com:CommunitySolidServer/CommunitySolidServer.git`

Add [content-selection-module from NPM](https://www.npmjs.com/package/content-selection-module): `npm i content-selection-module`

_Recommended_: Install the newer version of componentsjs to enable the use of more modular configurations:
`npm i componentsjs@5.5.1` or add `"componentsjs": "^5.5.1` to the dependencies in the [package.json](package.json)

Install dependencies: `npm i`

_With componentsjs@5.5.1 or newer_: Start CSS with a base and a content-selection config:
`node ./bin/server.js -c config/file.json node_modules/content-selection-module/config/contentselection-redirect.json -f .data`  
(or `npm start -- -c config/...`)

_With older componentsjs_: Start CSS with a complete config:
`node ./bin/server.js -c node_modules/content-selection-module/config/complete/contentselectionredirect-file.json -f .data`

> __Bug?:__ Logs from the content-selection-module are not shown

#### Known Issues

* Components.js can cause problems on Windows if the file path contains a whitespace
  * Example error `Invalid term IRI WebAclMetadataCollector`

* Flexible config that can be combined with any other CSS config
  * Possible if CSS upgrades the componentsjs version to v5.5 or v6.0 (next major release)
  * Current workaround: add componentsjs@5.5.1 to dependencies of this package
