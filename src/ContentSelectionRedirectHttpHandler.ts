import type {
  TargetExtractor,
  ResponseWriter,
  HttpHandlerInput,
  HttpRequest
} from '@solid/community-server';
import {
  getLoggerFor,
  joinUrl, getRelativeUrl,
  RedirectHttpError, NotImplementedHttpError, MethodNotAllowedHttpError, BadRequestHttpError, 
  AcceptPreferenceParser, 
  ResponseDescription,
  HttpHandler
} from '@solid/community-server';
import { RedirectResponseDescription } from './RedirectResponseDescription';
import { NotAcceptableHttpError } from './NotAcceptableHttpError';
import * as csutil from './contentselection-util';

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
 * HttpHandler that redirects to specified file extensions 
 * based on the MIME types in the request's 'accept' header
 * for specified server paths.
 */
export class ContentSelectionRedirectHttpHandler extends HttpHandler {
  private readonly logger = getLoggerFor(this);
  private readonly activePaths: RegExp[];
  private readonly typeMappings: {
    mimeType: RegExp;
    fileExtension: string;
  }[];
  private readonly acceptPreferenceParser = new AcceptPreferenceParser();

  /**
   * Creates a redirect handler for the provided type mappings.
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
    // Placed in constructor so that errors occur during server initialization
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

    // Condition 2: only specified paths
    // Retrieve target relative to base URL
    const target = await getRelativeUrl(this.baseUrl, request, this.targetExtractor);
    // Match against specified paths
    if (!this.activePaths.some(pathRegex => pathRegex.test(target))) {
      throw new NotImplementedHttpError(`No redirect configured for ${target}`);
    }

    // Condition 3: only files/paths without extension
    if (!request.url || request.url.endsWith('/') || csutil.hasFileExtension(request.url)) {
      throw new BadRequestHttpError('Content selection redirect only for files without extensions.');
    }

    // // Condition 4: only if match between accept header and type mappings
    // await this.findRedirect(request);
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
      if (error instanceof NotAcceptableHttpError) { // No mapping matches the accept preference
        this.logger.info(error.message);
        result = new ResponseDescription(error.statusCode);
      } else {
        throw error;
      }
    }
    await this.responseWriter.handleSafe({ response, result });
  }

  private async findRedirect(request: HttpRequest): Promise<string> {

    // 1. Process 'accept' header
    const acceptHeaderContent = request.headers.accept || '';
    this.logger.info(`Accept: ${acceptHeaderContent}`);
    const preferences = await this.acceptPreferenceParser.handle({ request });

    // 2 Find match between accept header and type mappings found
    const result = csutil.matchWithTypeMappings(preferences, this.typeMappings);
    if (!result) {
      throw new NotAcceptableHttpError(
        `No type mapping configured for '${acceptHeaderContent}'`);
    }

    // 3. Build and return redirect URL
    const redirectURL = joinUrl(this.baseUrl, request.url + result.fileExtension);

    return redirectURL;
  }

}
