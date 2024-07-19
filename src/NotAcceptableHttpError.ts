import type { HttpErrorOptions } from '@solid/community-server';
import { generateHttpErrorClass } from '@solid/community-server';

// eslint-disable-next-line ts/naming-convention
const BaseHttpError = generateHttpErrorClass(406, 'NotAcceptableHttpError');

/**
 * The requested resource is capable of generating only content not acceptable 
 * according to the Accept headers sent in the request.
 */
export class NotAcceptableHttpError extends BaseHttpError {
  public constructor(message?: string, options?: HttpErrorOptions) {
    super(message, options);
  }
}
