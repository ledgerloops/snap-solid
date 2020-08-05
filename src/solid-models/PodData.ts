import {
  TripleDocument,
  createDocument,
  LocalTripleDocumentWithRef,
  fetchDocument,
  LocalTripleDocumentForContainer,
  createDocumentInContainer,
  TripleSubject
} from "tripledoc";
import {
  acl as aclUpstream,
  ldp,
  rdf,
  space,
  schema,
  vcard
} from "rdf-namespaces";
import { v4 as uuid } from "uuid";
import { SolidContact } from "./SolidContact";
import SolidAuthClient from "solid-auth-client";

const acl = Object.assign(
  {
    default: "http://www.w3.org/ns/auth/acl#default"
  },
  aclUpstream
);

// copied from
// https://github.com/inrupt/friend-requests-exploration/blob/master/src/services/usePersonDetails.ts
export const as = {
  following: "https://www.w3.org/TR/activitypub/#following"
};

export const contacts = {
  webId: "https://ledgerloops.com/contacts/#webId",
  nick: "https://ledgerloops.com/contacts/#nick"
};

const solid = {
  ourInbox: "http://www.w3.org/ns/solid/terms#our-in",
  ourOutbox: "http://www.w3.org/ns/solid/terms#our-out",
  theirInbox: "http://www.w3.org/ns/solid/terms#their-in"
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

  async createDocumentOrContainer(
    url: string
  ): Promise<LocalTripleDocumentWithRef> {
    if (url.substr(-1) === "/") {
      const dummy = createDocument(url + ".dummy");
      await dummy.save();
      return fetchDocument(url);
    }
    return createDocument(url);
  }
  async fetchOrCreate(
    url: string,
    initIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    let fetched: TripleDocument | null = null;
    try {
      fetched = await fetchDocument(url);
    } catch (e) {
      if (e.message === "Fetching the Document failed: 401 Unauthorized.") {
        console.log("Throwing fetch error");
        throw e;
      }
      console.log("Swallowing fetch error", e.message);
      // e.g. 404 etc.
    }
    if (fetched === null) {
      const newDoc = await this.createDocumentOrContainer(url);
      if (initIfMissing) {
        await initIfMissing(newDoc);
      }
      return newDoc.save();
    }
    return fetched;
  }
  async getDocumentAt(
    url: string,
    initIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    const urlNoFrag = url.split("#")[0];
    if (!this.promises[urlNoFrag]) {
      this.promises[urlNoFrag] = this.fetchOrCreate(url, initIfMissing);
    }
    try {
      await this.promises[urlNoFrag];
    } catch (e) {
      if (e.message === "Fetching the Document failed: 401 Unauthorized.") {
        throw new Error("Try clearing your cookie!");
      }
      throw e;
    }
    return this.promises[urlNoFrag];
  }

  async savePodDataSubject(sub: TripleSubject): Promise<void> {
    const docUri = await (sub.getDocument() as LocalTripleDocumentWithRef).asRef();
    const doc = await this.getDocumentAt(docUri);
    await (doc as LocalTripleDocumentWithRef).save();
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
    defaultLocation?: string
  ): Promise<string> {
    const followed: string | null = s.getRef(p);
    if (followed === null) {
      if (!defaultLocation) {
        throw new Error("link not found");
      }
      s.addRef(p, defaultLocation);
      await (s.getDocument() as TripleDocument).save();
      return defaultLocation;
    }
    return followed;
  }
  async getDocumentOn(
    s: TripleSubject,
    p: string,
    defaultLocation?: string,
    initDocIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleDocument> {
    const uri = await this.followOrLink(s, p, defaultLocation);
    return this.getDocumentAt(uri, initDocIfMissing);
  }
  async getSubjectOn(
    s: TripleSubject,
    p: string,
    defaultLocation?: string,
    initDocIfMissing?: (newDoc: LocalTripleDocumentWithRef) => Promise<void>
  ): Promise<TripleSubject> {
    const uri = await this.followOrLink(s, p, defaultLocation);
    return this.getSubjectAt(uri, initDocIfMissing);
  }

  /**
   * This will fetch or create the profile doc
   */
  async getProfileSub(): Promise<TripleSubject> {
    const webIdParts = this.sessionWebId.split("#");
    let webIdFragment = "";
    if (webIdParts.length == 2) {
      webIdFragment = webIdParts[1];
    }
    const profileDoc = await this.getDocumentAt(
      this.sessionWebId,
      async (newDoc: LocalTripleDocumentWithRef) => {
        const newProfileSub = newDoc.addSubject({
          identifier: webIdFragment
        });
        newProfileSub.addRef(rdf.type, schema.Person);
        newProfileSub.addRef(space.storage, this.podRoot);
      }
    );
    return profileDoc.getSubject(this.sessionWebId);
  }

  async getGlobalInboxDocs(): Promise<TripleDocument[]> {
    const ourProfileSub = await this.getProfileSub();
    const ourGlobalInbox = await this.getDocumentOn(
      ourProfileSub,
      ldp.inbox,
      "/inbox/"
    );
    const boxSub = ourGlobalInbox.getSubject("");
    const docs: string[] = boxSub.getAllRefs(ldp.contains);
    const promises: Promise<TripleDocument>[] = docs.map(
      async (msgDocUrl: string): Promise<TripleDocument> => {
        console.log("fetching msg from our global inbox", msgDocUrl);
        return this.getDocumentAt(msgDocUrl);
      }
    );
    return Promise.all(promises);
  }

  async sendMessageTo(
    box: string,
    cb: (doc: LocalTripleDocumentForContainer) => Promise<void>
  ): Promise<TripleDocument> {
    console.log("creating doc in container", box);
    const doc = createDocumentInContainer(box);
    console.log("executing callback", doc);
    await cb(doc);
    console.log("Saving doc");
    return doc.save();
  }

  async sendFriendRequest(theirWebId: string, ourInbox: string): Promise<void> {
    const friendRequestDoc = await this.sendMessageTo(
      this.podRoot,
      async (doc: LocalTripleDocumentForContainer) => {
        const sub = doc.addSubject({
          identifier: "this"
        });
        sub.addRef(rdf.type, "https://www.w3.org/ns/activitystreams#Follow");
        sub.addRef("http://www.w3.org/ns/solid/terms#p2pInbox", ourInbox);
        sub.addRef("http://www.w3.org/ns/solid/terms#webId", this.sessionWebId);
        sub.addString("http://www.w3.org/ns/solid/terms#nick", "Call me Al");
      }
    );
    this.ensureAcl(friendRequestDoc, { [theirWebId]: [acl.Read] }, {});
    const theirProfileDoc = await this.getDocumentAt(theirWebId);
    const theirProfileSub = theirProfileDoc.getSubject(theirWebId);
    const theirGlobalInbox: string = theirProfileSub.getRef(ldp.inbox);
    return void this.sendMessageTo(
      theirGlobalInbox,
      async (doc: LocalTripleDocumentForContainer) => {
        const sub = doc.addSubject({
          identifier: "this"
        });
        sub.addRef(rdf.type, "https://www.w3.org/ns/activitystreams#Follow");
        sub.addRef(
          "http://www.w3.org/ns/solid/terms#dataAtSource",
          friendRequestDoc.asRef()
        );
      }
    );
  }

  /**
   * This will fetch or create the addressbook
   */
  async getAddressBookSub(): Promise<TripleSubject> {
    const profileSub = await this.getProfileSub();
    return this.getSubjectOn(
      profileSub,
      as.following,
      this.podRoot + "contacts.ttl#friends"
    );
  }
  async getContactSubs(): Promise<TripleSubject[]> {
    const addressBookSub = await this.getAddressBookSub();
    const contactUris = addressBookSub.getAllRefs(vcard.hasMember);
    const promises: Promise<TripleSubject>[] = contactUris.map(
      (contactUri: string) => {
        return this.getSubjectAt(contactUri);
      }
    );
    return Promise.all(promises);
  }
  async getContacts(): Promise<SolidContact[]> {
    const contactSubs = await this.getContactSubs();
    const promises = contactSubs.map((contactSub: TripleSubject) => {
      return this.getContact(contactSub);
    });
    return Promise.all(promises);
  }

  generateSubUri(ref: string): string {
    const fragment = `#${uuid()}`;
    return new URL(fragment, ref).toString();
  }

  async generateContactSubUri(): Promise<string> {
    const addressBookSub = await this.getAddressBookSub();
    const ref: string = addressBookSub.asRef();
    return this.generateSubUri(ref);
  }

  async getContact(contactSub: TripleSubject): Promise<SolidContact> {
    const theirWebId = contactSub.getRef(contacts.webId);
    const nick = contactSub.getString(contacts.nick);
    const theirProfileDoc = await fetchDocument(theirWebId);
    const theirGlobalInbox = theirProfileDoc
      .getSubject(theirWebId)
      .getRef(ldp.inbox);

    const ourInbox = await this.getDocumentOn(
      contactSub,
      solid.ourInbox,
      `${this.podRoot}snap/${encodeURIComponent(nick)}/our-in/`
    );
    const ourOutbox = await this.getDocumentOn(
      contactSub,
      solid.ourOutbox,
      `${this.podRoot}snap/${encodeURIComponent(nick)}/our-out/`
    );
    const theirInbox = contactSub.getRef(solid.theirInbox);

    return new SolidContact(
      theirWebId,
      ourInbox,
      ourOutbox,
      theirGlobalInbox,
      nick,
      this,
      theirInbox
    );
  }

  async findContact(webId: string): Promise<TripleSubject | undefined> {
    const contactSubs = await this.getContactSubs();
    const found = contactSubs.filter((contactSub: TripleSubject) => {
      console.log("comparing", contactSub.getRef(contacts.webId), webId);
      return contactSub.getRef(contacts.webId) == webId;
    });
    if (found.length >= 1) {
      return found[0];
    }
  }
  addAuthorization(
    doc: LocalTripleDocumentWithRef,
    targetDocUrl: string,
    subFragStr: string,
    webId: string,
    preds: string[],
    modes: string[]
  ): void {
    const sub = doc.addSubject({
      identifier: subFragStr
    });
    sub.addRef(rdf.type, acl.Authorization);
    sub.addRef(acl.agent, webId);
    preds.forEach((pred: string) => {
      sub.addRef(pred, targetDocUrl);
    });
    modes.forEach((mode: string) => {
      sub.addRef(acl.mode, mode);
    });
  }
  addAuthorizations(
    doc: LocalTripleDocumentWithRef,
    targetDocUrl: string,
    map: { [wedId: string]: string[] },
    preds: string[]
  ): void {
    Object.keys(map).forEach((webId: string) => {
      this.addAuthorization(
        doc,
        targetDocUrl,
        uuid(),
        webId,
        preds,
        map[webId]
      );
    });
  }
  async ensureAcl(
    forDoc: TripleDocument,
    access: { [wedId: string]: string[] },
    defaults: { [wedId: string]: string[] }
  ): Promise<void> {
    const targetDocUrl: string = forDoc.asRef();
    const aclDocUrl: string = forDoc.getAclRef();
    await this.getDocumentAt(
      aclDocUrl,
      async (newDoc: LocalTripleDocumentWithRef): Promise<void> => {
        // FIXME: leave out acl.default if ACL is not for a container.
        const ownerPreds = [acl.accessTo, acl.default];
        this.addAuthorization(
          newDoc,
          targetDocUrl,
          "owner",
          this.sessionWebId,
          ownerPreds,
          [acl.Read, acl.Write, acl.Control]
        );
        this.addAuthorizations(newDoc, targetDocUrl, access, [acl.accessTo]);
        this.addAuthorizations(newDoc, targetDocUrl, defaults, [acl.default]);
      }
    );
  }

  async addContact(
    theirWebId: string,
    nick: string,
    theirInboxUrl?: string
  ): Promise<SolidContact> {
    const uri = await this.generateContactSubUri();
    const addressBookSub: TripleSubject = await this.getAddressBookSub();
    addressBookSub.addRef(vcard.hasMember, uri);
    const contactSub = await this.getSubjectAt(uri);
    contactSub.addRef(contacts.webId, theirWebId);

    contactSub.addString(contacts.nick, nick);
    const theirProfileDoc = await fetchDocument(theirWebId);
    const theirGlobalInbox = theirProfileDoc
      .getSubject(theirWebId)
      .getRef(ldp.inbox);
    const ourInbox = await this.getDocumentOn(
      contactSub,
      solid.ourInbox,
      `${this.podRoot}snap/${encodeURIComponent(nick)}/our-in/`
    );
    await this.ensureAcl(ourInbox, { [theirWebId]: [acl.Append] }, {});
    const ourOutbox = await this.getDocumentOn(
      contactSub,
      solid.ourOutbox,
      `${this.podRoot}snap/${encodeURIComponent(nick)}/our-out/`
    );
    await this.ensureAcl(ourOutbox, {}, {});
    await this.savePodDataSubject(addressBookSub);
    const newContact = new SolidContact(
      theirWebId,
      ourInbox,
      ourOutbox,
      theirGlobalInbox,
      nick,
      this,
      theirInboxUrl
    );
    await this.sendFriendRequest(theirWebId, ourInbox.asRef());
    return newContact;
  }
  async processFriendRequest(
    theirWebId: string,
    theirNick: string,
    theirInboxUrl: string
  ): Promise<void> {
    console.log("processFriendRequest", theirWebId, theirNick, theirInboxUrl);
    const existingContactSub = await this.findContact(theirWebId);
    if (existingContactSub) {
      if (existingContactSub.getRef(solid.theirInbox) !== theirInboxUrl) {
        console.log(
          "updating their inbox url",
          existingContactSub.getRef(solid.theirInbox),
          theirInboxUrl
        );
        existingContactSub.addRef(solid.theirInbox, theirInboxUrl);
        await (existingContactSub.getDocument() as TripleDocument).save();
      }
    } else {
      const newContact = await this.addContact(
        theirWebId,
        theirNick,
        theirInboxUrl
      );
      this.sendFriendRequest(theirWebId, newContact.ourInbox.asRef());
    }
  }
  async checkFriendRequests(): Promise<void> {
    console.log("checking friend requests!", this.sessionWebId);
    const inboxDocs = await this.getGlobalInboxDocs();
    const promises = inboxDocs.map(async (inboxDoc: TripleDocument) => {
      const sub = inboxDoc.getSubject("#this");
      const subType = sub.getRef(rdf.type);
      if (subType === "https://www.w3.org/ns/activitystreams#Follow") {
        const docAtSourceUrl = sub.getRef(
          "http://www.w3.org/ns/solid/terms#dataAtSource"
        );
        console.log("yes", docAtSourceUrl);
        const docAtSource = await this.getDocumentAt(docAtSourceUrl);
        if (!docAtSource) {
          console.log("no doc at source");
          return;
        }
        const subAtSource = docAtSource.getSubject("#this");
        if (!subAtSource) {
          console.log("no sub at source");
          return;
        }
        const theirWebId = subAtSource.getRef(
          "http://www.w3.org/ns/solid/terms#webId"
        );
        if (!theirWebId) {
          console.log("no theirWebId at source");
          return;
        }
        const theirProfileDoc = await this.getDocumentAt(theirWebId);
        const theirProfileSub = theirProfileDoc.getSubject(theirWebId);
        const theirPodRoot = theirProfileSub.getRef(space.storage);
        console.log("comparing", docAtSource.asRef(), theirPodRoot);
        if (!docAtSource.asRef().startsWith(theirPodRoot)) {
          console.log("not under their pod root");
          return;
        }
        const theirNick = subAtSource.getString(
          "http://www.w3.org/ns/solid/terms#nick"
        );
        const theirInboxUrl = subAtSource.getRef(
          "http://www.w3.org/ns/solid/terms#p2pInbox"
        );
        await this.processFriendRequest(theirWebId, theirNick, theirInboxUrl);
        console.log("successfully processed inbox doc, deleting it");
        await SolidAuthClient.fetch(inboxDoc.asRef(), { method: "DELETE" });
      } else {
        console.log("no", subType);
      }
    });
    await Promise.all(promises);
  }
}
