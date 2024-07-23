import type {
  ValuePreferences,
  RepresentationPreferences
} from '@solid/community-server';

export function hasFileExtension(url: string): Boolean {
  return url.substring(url.lastIndexOf('/')+1).includes('.');
}

export function getRelativePath(path: string, baseUrl: string) {
  const baseUrlWithoutTrailingSlash = baseUrl.replace(/\/+$/,'');
  return path.replace(baseUrlWithoutTrailingSlash,'');
}

export function matchWithTypeMappings(
  preferences: RepresentationPreferences,
  typeMappings: { mimeType: RegExp; fileExtension: string;}[]) {

  const acceptTypes = getPreferencesTypes(preferences);
  // hack to keep order (Object.keys reverses the order in Node?)
  // caution: order of object keys depends on the implementation
  const acceptTypesList = Object.keys(acceptTypes).reverse();

  let result: { 
    match: RegExpMatchArray, 
    fileExtension: string 
  } | undefined = undefined;

  // Loop over accepted types in the request
  for (let i = 0; i < acceptTypesList.length; i++) {
    const acceptType = acceptTypesList[i];
    // Loop over configured type mappings
    for (const { mimeType, fileExtension } of typeMappings) {
      const match = mimeType.exec(acceptType);
      if (match) {
        result = { match, fileExtension };
        break;
      }
    }
  }

  return result;
}

function getPreferencesTypes(preferences: RepresentationPreferences): ValuePreferences {
  const DEFAULT_MIME_TYPE = {'*/*': 1};
  return preferences.type !== undefined ? preferences.type : DEFAULT_MIME_TYPE;
}