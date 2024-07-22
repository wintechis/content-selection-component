import { DataFactory } from 'n3';
import type {
  ResourceStore, 
  ResponseDescription, 
  OperationHandlerInput,
  ValuePreferences,
  RepresentationPreferences
} from '@solid/community-server';
import {
  getLoggerFor,
  NotImplementedHttpError, NotFoundHttpError,
  OkResponseDescription, 
  OperationHandler,
  SOLID_HTTP
} from '@solid/community-server';
import { NotAcceptableHttpError } from './NotAcceptableHttpError';

/**
 * Handles GET {@link Operation}s based on the requested content-type.
 * @param store - {@link ResourceStore}.
 * @param activePaths - Server paths where the component is active.
 * @param typeMappings - A mapping between MIME type RegEx and file extensions.
 */
export class ContentSelectionOperationHandler extends OperationHandler {
  private readonly logger = getLoggerFor(this);
  private readonly store: ResourceStore;
  private readonly activePaths: RegExp[];
  private readonly typeMappings: {
    mimeType: RegExp;
    fileExtension: string;
  }[];

  public constructor(
    store: ResourceStore,
    private readonly baseUrl: string,
    activePaths: string[],
    typeMappings: Record<string, string>,
  ) {
    super();
    this.store = store;

    this.activePaths = activePaths.map(pathExp => new RegExp(pathExp, 'i'));
    // Create an array of {mimeType,fileExtension} objects
    this.typeMappings = Object.keys(typeMappings).map(
      (pattern): { mimeType: RegExp; fileExtension: string } => ({
        mimeType: new RegExp(pattern, 'i'),
        fileExtension: typeMappings[pattern].startsWith('.') ? typeMappings[pattern] : `.${typeMappings[pattern]}`,
      }),
    );
  }

  public async canHandle({ operation }: OperationHandlerInput): Promise<void> {
    const relpath = this.getRelativePath(operation.target.path, this.baseUrl);

    // Condition 1: only HTTP GET
    if (operation.method !== 'GET') {
      throw new NotImplementedHttpError('This handler only supports GET operations');
    }

    // Condition 2: only specified paths
    if (!this.activePaths.some(pathRegex => pathRegex.test(relpath))) {
      throw new NotImplementedHttpError(`No redirect configured for ${relpath}`);
    }

    // Condition 3: only files/paths without extension
    if (relpath.endsWith('/') || this.hasFileExtension(relpath)) {
      throw new NotImplementedHttpError('Content selection only for files without extensions.');
    }

    // Condition 4: only if target not exists
    if (await this.store.hasResource(operation.target)) {
      throw new NotImplementedHttpError(`Existing resource for ${relpath}.`);      
    } 
  }

  private getRelativePath(path: string, baseUrl: string) {
    const baseUrlWithoutTrailingSlash = this.baseUrl.replace(/\/+$/,'');
    return path.replace(baseUrlWithoutTrailingSlash,'');
  }

  private hasFileExtension(url: string): Boolean {
    return url.substring(url.lastIndexOf('/')+1).includes('.');
  }

  public async handle({ operation }: OperationHandlerInput): Promise<ResponseDescription> {
    // Find match between accept header and type mappings
    const result = this.matchWithTypeMappings(this.getPreferencesTypes(operation.preferences));

    // Create new ResourceIdentifier instance
    const newIdentifier = { 
      path: operation.target.path + result.fileExtension 
    };
    this.logger.info(`Try to fetch resource from ${newIdentifier.path}`);

    // Fetch resource
    try {
      const body = await this.store.getRepresentation(newIdentifier, {}, operation.conditions);

      // Add location header
      body.metadata.set(SOLID_HTTP.terms.location, DataFactory.namedNode(newIdentifier.path));

      return new OkResponseDescription(body.metadata, body.data);
    } catch (error) {
      // If resource with extension not found -> 406 response
      if (error instanceof NotFoundHttpError) {
        throw new NotAcceptableHttpError('error.message');
      } else {
        throw error;
      }
    }
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
