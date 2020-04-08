import { fetchDocument, TripleDocument, TripleSubject } from "tripledoc";
import { space } from "rdf-namespaces";

const promises: { [url: string]: Promise<TripleDocument> } = {};

export async function getDocument(url: string): Promise<TripleDocument> {
  if (!promises[url]) {
    promises[url] = fetchDocument(url);
  }
  return promises[url];
}

export async function ensureLink(
  fromSub: TripleSubject,
  withPredicate: string,
  createTarget: () => Promise<string>
): Promise<void> {
  const link = fromSub.getRef(withPredicate);
  if (link === null) {
    const target = await createTarget();
    fromSub.addRef(withPredicate, target);
    await (fromSub.getDocument() as TripleDocument).save();
  }
}

export async function ensureData(sessionWebId: string): Promise<void> {
  const profileDoc = await getDocument(sessionWebId);
  const profileSub = profileDoc.getSubject(sessionWebId);
  const podRoot = await ensureLink(profileSub, space.storage, async () => {
    return sessionWebId.substring(
      0,
      sessionWebId.length - "profile/card#me".length
    );
  });
}
