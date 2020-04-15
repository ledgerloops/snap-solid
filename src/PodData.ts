import {
  TripleDocument,
  TripleSubject,
  createDocument,
  fetchDocument as fetchDocumentTripleDoc,
  LocalTripleDocumentWithRef
} from "tripledoc";
import { acl, ldp, rdf, space, schema, vcard } from "rdf-namespaces";

// copied from
// https://github.com/inrupt/friend-requests-exploration/blob/master/src/services/usePersonDetails.ts
export const as = {
  following: "https://www.w3.org/TR/activitypub/#following"
};

export const contacts = {
  webId: "https://ledgerloops.com/contacts/#webId",
  nick: "https://ledgerloops.com/contacts/#nick"
};

const snap = {
  ourInbox: "https://ledgerloops.com/snap/#our-in",
  ourOutbox: "https://ledgerloops.com/snap/#our-out",
  theirInbox: "https://ledgerloops.com/snap/#their-in",
  root: "https://ledgerloops.com/snap/#root"
};

export class PodData {
  sessionWebId: string;
  podRoot: string;
  promises: {
    [url: string]: Promise<TripleDocument>;
  };
  constructor(sessionWebId: string, podRoot: string) {
    this.sessionWebId = sessionWebId;
    this.podRoot = podRoot;
    this.promises = {};
  }

  async createDocumentOrContainer(url: string) {
    if (url.substr(-1) === "/") {
      const dummy = createDocument(url + ".dummy");
      await dummy.save();
      return fetchDocumentTripleDoc(url);
    }
    return createDocument(url);
  }
  async fetchOrCreate(
    url: string,
    initIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    const fetched: TripleDocument | null = await fetchDocumentTripleDoc(url);
    if (fetched === null) {
      const newDoc = await this.createDocumentOrContainer(url);
      if (initIfMissing) {
        await initIfMissing(newDoc);
      }
      return newDoc.save();
    }
    return fetched;
  }
  getDocumentAt(
    url: string,
    initIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    if (!this.promises[url]) {
      this.promises[url] = this.fetchOrCreate(url, initIfMissing);
    }
    return this.promises[url];
  }
  async getSubjectAt(
    uri: string,
    initIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleSubject> {
    const doc = await this.getDocumentAt(uri, initIfMissing);
    return doc.getSubject(uri);
  }
  async followOrLink(
    s: TripleSubject,
    p: string,
    defaultLocation: string
  ): Promise<string> {
    const followed: string | null = s.getRef(p);
    if (followed === null) {
      s.addRef(p, defaultLocation);
      await (s.getDocument() as TripleDocument).save();
      return defaultLocation;
    }
    return followed;
  }
  async getDocumentOn(
    s: TripleSubject,
    p: string,
    defaultLocation: string,
    initDocIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    const uri = await this.followOrLink(s, p, defaultLocation);
    return this.getDocumentAt(uri, initDocIfMissing);
  }
  async getContainerOn(
    s: TripleSubject,
    p: string,
    defaultLocation: string,
    initDocIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    const uri = await this.followOrLink(s, p, defaultLocation);
    return this.getDocumentAt(uri, initDocIfMissing);
  }
  async getSubjectOn(
    s: TripleSubject,
    p: string,
    defaultLocation: string,
    initDocIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleSubject> {
    const uri = await this.followOrLink(s, p, defaultLocation);
    return this.getSubjectAt(uri, initDocIfMissing);
  }

  /**
   * This will fetch or create the profile doc
   */
  async getProfileSub(): Promise<TripleSubject> {
    const profileDoc = await this.getDocumentAt(
      this.sessionWebId,
      async (newDoc: LocalTripleDocumentWithRef) => {
        const newProfileSub = newDoc.addSubject({
          identifier: this.sessionWebId
        });
        newProfileSub.addRef(rdf.type, schema.Person);
        newProfileSub.addRef(space.storage, this.podRoot);
      }
    );
    return profileDoc.getSubject(this.sessionWebId);
  }

  /**
   * This will fetch or create the addressbook
   */
  async getContacts(): Promise<string[]> {
    const profileSub = await this.getProfileSub();
    const addressBookSub = await this.getSubjectOn(
      profileSub,
      as.following,
      this.podRoot + "contacts.ttl#friends"
    );
    return addressBookSub.getAllRefs(vcard.hasMember);
  }

  async getContact(
    uri: string
  ): Promise<{
    ourInbox: TripleDocument;
    ourOutbox: TripleDocument;
    theirInbox: string;
  }> {
    const contactSub = await this.getSubjectAt(uri);
    const theirWebId = contactSub.getRef(contacts.webId);
    const nick = contactSub.getRef(contacts.nick);
    const theirProfileDoc = await fetchDocumentTripleDoc(theirWebId);
    const theirInbox = theirProfileDoc.getSubject(theirWebId).getRef(ldp.inbox);

    const ourInbox = await this.getDocumentOn(
      contactSub,
      snap.ourInbox,
      `${this.podRoot}snap/${nick}/our-in/`
    );
    const ourOutbox = await this.getDocumentOn(
      contactSub,
      snap.ourOutbox,
      `${this.podRoot}snap/${nick}/our-out/`
    );
    return {
      ourInbox,
      ourOutbox,
      theirInbox
    };
  }
}
