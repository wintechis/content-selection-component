import type {
  TargetExtractor,
  ResponseWriter,
  HttpHandlerInput,
  HttpRequest,
  ValuePreferences,
  RepresentationPreferences
} from '@solid/community-server';
import {
  getLoggerFor,
  getRelativeUrl,
  RedirectHttpError, 
  NotImplementedHttpError, MethodNotAllowedHttpError, BadRequestHttpError, 
  AcceptPreferenceParser,
  ResponseDescription,
  HttpHandler
} from '@solid/community-server';
import { RedirectResponseDescription } from './RedirectResponseDescription';
import { NotAcceptableHttpError } from './NotAcceptableHttpError';

/* eslint-disable ts/naming-convention */
const redirectErrorFactories: Record<301 | 302 | 303 | 307 | 308, (location: string) => RedirectHttpError> = {
  301: (location: string): RedirectHttpError => new RedirectHttpError(301, 'MovedPermanentlyHttpError', location),
  302: (location: string): RedirectHttpError => new RedirectHttpError(302, 'FoundHttpError', location),
  303: (location: string): RedirectHttpError => new RedirectHttpError(303, 'SeeOtherHttpError', location),
  307: (location: string): RedirectHttpError => new RedirectHttpError(307, 'TemporaryRedirectHttpError', location),
  308: (location: string): RedirectHttpError => new RedirectHttpError(308, 'PermanentRedirectHttpError', location),
};
/* eslint-enable ts/naming-convention */

/**
 * Handler that redirects to specified file extensions 
 * based on the MIME types in the request's 'accept' header
 * for specified server paths.
 */
export class ContentSelection extends HttpHandler {
  private readonly logger = getLoggerFor(this);
  private readonly activePaths: RegExp[];
  private readonly typeMappings: {
    mimeType: RegExp;
    fileExtension: string;
  }[];
  private readonly acceptPreferenceParser = new AcceptPreferenceParser();

  /**
   * Creates a handler for the provided redirects.
   *
   * @param activePaths - Server paths where the component is active.
   * @param baseUrl - Base URL of the server.
   * @param targetExtractor - To extract the target from the request.
   * @param typeMappings - A mapping between MIME type RegEx and file extensions.
   * @param statusCode - Desired 30x redirection code (defaults to 307).
   * @param responseWriter - To write the redirect to the response.
   */
  public constructor(
    activePaths: string[],
    private readonly baseUrl: string,
    private readonly targetExtractor: TargetExtractor,
    typeMappings: Record<string, string>,
    private readonly statusCode: 301 | 302 | 303 | 307 | 308 = 307,
    private readonly responseWriter: ResponseWriter,
  ) {
    super();

    this.activePaths = activePaths.map(pathExp => new RegExp(pathExp, 'i'));
    // Create an array of {mimeType,fileExtension} objects
    this.typeMappings = Object.keys(typeMappings).map(
      (pattern): { mimeType: RegExp; fileExtension: string } => ({
        mimeType: new RegExp(pattern, 'i'),
        fileExtension: typeMappings[pattern].startsWith('.') ? typeMappings[pattern] : `.${typeMappings[pattern]}`,
      }),
    );
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    // Condition 1: only HTTP GET
    if (request.method !== 'GET') {
      throw new MethodNotAllowedHttpError(['GET'], 'Content selection redirect only for GET requests.');
    }

    // Condition 3: only specified paths
    // Retrieve target relative to base URL
    const target = await getRelativeUrl(this.baseUrl, request, this.targetExtractor);
    // Match against specified paths
    if (!this.activePaths.some(pathRegex => pathRegex.test(target))) {
      throw new NotImplementedHttpError(`No redirect configured for ${target}`);
    }

    // Condition 4: only files/paths without extension
    if (!request.url || request.url.endsWith('/') || this.hasFileExtension(request.url)) {
      throw new BadRequestHttpError('Content selection redirect only for files without extensions.');
    }

    // // Condition 5: only if match between accept header and type mappings
    // await this.findRedirect(request);
  }

  private hasFileExtension(url: string): Boolean {
    return url.substring(url.lastIndexOf('/')+1).includes('.');
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    // Try to find redirect for target URL
    let redirect,result;
    try {
      redirect = await this.findRedirect(request);

      // Send redirect response
      this.logger.info(`Redirecting ${request.url} to ${redirect}`);
      result = new RedirectResponseDescription(redirectErrorFactories[this.statusCode](redirect));

    } catch (error) {
      // No mapping matches the accept preference
      if (error instanceof NotAcceptableHttpError) {
         // Send error response
        this.logger.info(error.message);
        // TODO: subclass of ResponseDescription that add header for possible MIME types
        result = new ResponseDescription(error.statusCode);
      } else {
        throw error;
      }
    }
    await this.responseWriter.handleSafe({ response, result });
  }

  private async findRedirect(request: HttpRequest): Promise<string> {

    // 1. Process 'accept' header
    const acceptHeaderContent = request.headers.accept;
    this.logger.info(`Accept: ${acceptHeaderContent || 'none'}`);
    const preferences = await this.acceptPreferenceParser.handle({ request });

    console.log(preferences);
    console.log(this.typeMappings);

    // 2 Find match between accept header and type mappings found
    const result = this.matchWithTypeMappings(this.getPreferencesTypes(preferences));

    // 3. Build and return redirect URL
    const redirectURL = request.url + result.fileExtension;

    return redirectURL;
  }

  private getPreferencesTypes(preferences: RepresentationPreferences): ValuePreferences {
    const DEFAULT_MIME_TYPE = {'*/*': 1};
    return preferences.type !== undefined ? preferences.type : DEFAULT_MIME_TYPE;
  }

  private matchWithTypeMappings(acceptTypes: ValuePreferences) {
    let result: { 
      match: RegExpMatchArray, 
      fileExtension: string 
    } | undefined = undefined;

    // hack to keep order (Object.keys reverses the order in Node?)
    // caution: order of object keys depends on the implementation
    const acceptTypesList = Object.keys(acceptTypes).reverse();

    // Loop over accepted types in the request
    for (let i = 0; i < acceptTypesList.length; i++) {
      const acceptType = acceptTypesList[i];
      // Loop over configured type mappings
      for (const { mimeType, fileExtension } of this.typeMappings) {
        const match = mimeType.exec(acceptType);
        if (match) {
          result = { match, fileExtension };
          break;
        }
      }
    }

    // Error if no matches at all
    if (!result) {
      throw new NotAcceptableHttpError(
        `No type mapping configured for '${acceptTypesList.join(',')}'`);
    }

    return result;
  }
}
