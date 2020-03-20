import {
  TripleDocument,
  Reference,
  fetchDocument,
  TripleSubject
} from "tripledoc";

const promises: { [iri: string]: Promise<TripleDocument> } = {};

export function getDocument(url: string): Promise<TripleDocument> {
  // Remove fragment identifiers (e.g. `#me`) from the URI:
  const docUrl = new URL(url);
  const documentRef: Reference =
    docUrl.origin + docUrl.pathname + docUrl.search;

  if (typeof promises[documentRef] !== "undefined") {
    return promises[documentRef];
  }

  const documentPromise = fetchDocument(url).then(document => {
    // Overwrite the `.save()` method on the Document to make sure the cache is updated when it's called:
    const actualSave = document.save;
    const cachingSave = async (
      subjects?: TripleSubject[]
    ): Promise<TripleDocument> => {
      const updatedDocument = await actualSave(subjects);
      promises[documentRef] = Promise.resolve(updatedDocument);
      return updatedDocument;
    };

    return {
      ...document,
      save: cachingSave
    };
  });
  promises[documentRef] = documentPromise;

  return documentPromise;
}
