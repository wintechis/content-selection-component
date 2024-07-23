import { 
  App, AppRunner, 
  joinFilePath, joinUrl 
} from '@solid/community-server';

describe('ContentSelection-Redirect Integration Test', (): void => {
  let app: App;
  const PORT = 3000;
  let serverUrl = `http://localhost:${PORT}`;

  beforeAll(async(): Promise<void> => {
    // Create a CSS instance
    app = await new AppRunner().create(
      {
        // Custom configuration that runs the server in memory
        config: joinFilePath(__dirname, '../config/contentselectionredirect-memory.json'),
        loaderProperties: {
          mainModulePath: joinFilePath(__dirname, '../../'),
          dumpErrorState: false,
        },
        // Use CLI options to set the server port
        shorthand: {
          port: PORT,
          // loggingLevel: 'off',
        },
        // We do not use any custom Components.js variable bindings and 
        // set our values through the CLI options below.
        // Note that this parameter is optional, so you can just drop it.
        variableBindings: {}
      }
    );
    await app.start();
  });

  afterAll(async(): Promise<void> => {
    await app.stop();
  });

  it('starts the server.', async(): Promise<void> => {
    const response = await fetch(serverUrl);
    expect(response.status).toBe(200);
  });

  it('uses the component only on active paths.', async(): Promise<void> => {
    const responseActivePath = await fetch(joinUrl(serverUrl, '/sensor-1/data'), { redirect: 'manual' });
    expect(responseActivePath.status).toBe(303);
    const responseOtherPath = await fetch(joinUrl(serverUrl, '/this/is/not/active/data'), { redirect: 'manual' });
    expect(responseOtherPath.status).toBe(404);
  });

  it('redirects to the requested content.', async(): Promise<void> => {
    const activePath = '/sensor-1/data';
    // HTML
    const responseHTMLRequest = await fetch(joinUrl(serverUrl, activePath), {
      headers: { 'accept': 'text/html,text/turtle' },
      redirect: 'manual'
    });
    expect(responseHTMLRequest.status).toBe(303);
    expect(responseHTMLRequest.headers.get('location')).toBeDefined();
    expect(responseHTMLRequest.headers.get('location')).toBe(joinUrl(serverUrl, activePath + '.html'));
    // JSON
    const responseJSONRequest = await fetch(joinUrl(serverUrl, activePath), {
      headers: { 'accept': 'text/html;q=0.8,application/json+ld' },
      redirect: 'manual'
    });
    expect(responseJSONRequest.status).toBe(303);
    expect(responseJSONRequest.headers.get('location')).toBeDefined();
    expect(responseJSONRequest.headers.get('location')).toBe(joinUrl(serverUrl, activePath + '.json'));
  });

  it('returns 406 on missing type mappings.', async(): Promise<void> => {
    const activePath = '/sensor-1/data';    
    const responseHTMLRequest = await fetch(joinUrl(serverUrl, activePath), {
      headers: { 'accept': 'application/xml' },
      redirect: 'manual'
    });
    expect(responseHTMLRequest.status).toBe(406);
  });

});
