import { DataFactory } from 'n3';
import type { RedirectHttpError } from '@solid/community-server';
import { ResponseDescription, SOLID_HTTP } from '@solid/community-server';

/**
 * Corresponds to a redirect response, containing the relevant location metadata.
 */
export class RedirectResponseDescription extends ResponseDescription {
  public constructor(error: RedirectHttpError) {
    error.metadata.set(SOLID_HTTP.terms.location, DataFactory.namedNode(error.location));
    super(error.statusCode, error.metadata);
  }
}
