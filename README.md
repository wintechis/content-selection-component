# Content-Selection-Component

ultimate goal: replicate behavior of [Apache Module **mod_negotiation**](https://httpd.apache.org/docs/2.4/mod/mod_negotiation.html) in specific Solid containers

### PoC development steps

1. inject own module into CSS
2. redirect based on requested `content-type` header
    1. hard-coded "type map" and redirect paths
    2. config values
3. select und directly return the document that best matches the request


## Setup

`npm i`

`npm run build`

`npm start`