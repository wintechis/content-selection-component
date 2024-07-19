# Content-Selection-Component

ultimate goal: replicate behavior of [Apache Module **mod_negotiation**](https://httpd.apache.org/docs/2.4/mod/mod_negotiation.html) in specific Solid containers

The component project is based on the [hello-world-component](https://github.com/CommunitySolidServer/hello-world-component) and the [RedirectingHttpHandler](https://communitysolidserver.github.io/CommunitySolidServer/7.x/docs/classes/RedirectingHttpHandler.html) class of the [CSS](https://github.com/CommunitySolidServer/CommunitySolidServer).

### Setup

`npm i`

`npm run build`

`npm start`

### Open discussion

* if no match between accept and type mappings
  * currently: return error 406 Not Acceptable (TODO: header for possible types)
  * alternative: component not active -> 404 Not Found

* redirect vs directly return the document that best matches the request
