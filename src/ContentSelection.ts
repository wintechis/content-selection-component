import type {
  ResponseWriter,
  HttpHandlerInput,
  HttpRequest
} from '@solid/community-server';
import {
  getLoggerFor,
  RedirectHttpError, 
  NotImplementedHttpError, MethodNotAllowedHttpError, BadRequestHttpError, 
  AcceptPreferenceParser,
  HttpHandler
} from '@solid/community-server';
import { RedirectResponseDescription } from './RedirectResponseDescription';

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
 * based on the MIME types in the request's 'accept' header.
 */
export class ContentSelection extends HttpHandler {
  private readonly logger = getLoggerFor(this);
  private readonly typeMappings: {
    mimeType: RegExp;
    fileExtension: string;
  }[];
  private readonly acceptPreferenceParser = new AcceptPreferenceParser();

  /**
   * Creates a handler for the provided redirects.
   *
   * @param typeMappings - A mapping between MIME type RegEx and file extensions.
   * @param statusCode - Desired 30x redirection code (defaults to 307).
   * @param responseWriter - To write the redirect to the response.
   */
  public constructor(
    typeMappings: Record<string, string>,
    private readonly statusCode: 301 | 302 | 303 | 307 | 308 = 307,
    private readonly responseWriter: ResponseWriter,
  ) {
    super();

    // Create an array of {mimeType,fileExtension} objects
    this.typeMappings = Object.keys(typeMappings).map(
      (pattern): { mimeType: RegExp; fileExtension: string } => ({
        mimeType: new RegExp(pattern, ''),
        fileExtension: typeMappings[pattern].startsWith('.') ? typeMappings[pattern] : `.${typeMappings[pattern]}`,
      }),
    );
  }

  public async canHandle({ request }: HttpHandlerInput): Promise<void> {
    // Only for HTTP GET
    if (request.method !== 'GET') {
      throw new MethodNotAllowedHttpError(['GET'], 'Content selection redirect only for GET requests.');
    }

    // Only for files without extension
    if (!request.url || request.url.endsWith('/') || this.hasFileExtension(request.url)) {
      throw new BadRequestHttpError('Content selection redirect only for files without extensions.');
    }

    // Try to find redirect for target URL
    await this.findRedirect(request);
  }

  private hasFileExtension(url: string): Boolean {
    return url.substring(url.lastIndexOf('/')+1).includes('.');
  }

  public async handle({ request, response }: HttpHandlerInput): Promise<void> {
    // Try to find redirect for target URL
    const redirect = await this.findRedirect(request);

    // Send redirect response
    this.logger.info(`Redirecting ${request.url} to ${redirect}`);
    const result = new RedirectResponseDescription(redirectErrorFactories[this.statusCode](redirect));
    await this.responseWriter.handleSafe({ response, result });
  }

  private async findRedirect(request: HttpRequest): Promise<string> {

    // 1. Process 'accept' header
    const acceptHeaderContent = request.headers.accept;
    this.logger.info(`Accept: ${acceptHeaderContent || 'none'}`);

    const DEFAULT_MIME_TYPE = {'*/*': 1};
    const preferences = await this.acceptPreferenceParser.handle({ request });
    const highestPrefMimeType = Object.keys(preferences.type || DEFAULT_MIME_TYPE)[0];

    // 2. Decide the redirect
    console.log(preferences);
    console.log(this.typeMappings);

    // 2.1 Find match between accept header and type mappings found
    let result;
    for (const { mimeType, fileExtension } of this.typeMappings) {
      const match = mimeType.exec(highestPrefMimeType);
      if (match) {
        result = { match, fileExtension };
        break;
      }
    }

    // 2.2 Only redirect if match found
    if (!result) {
      throw new NotImplementedHttpError(`No type mapping configured for ${highestPrefMimeType}`);
    }

    // 3. Build and return redirect URL
    const redirectURL = request.url + result.fileExtension;

    return redirectURL;
  }
}
