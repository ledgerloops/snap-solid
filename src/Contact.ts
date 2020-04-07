import {
  VirtualSubject,
  VirtualContainer,
  // describeContainer,
  // Reference,
  TripleDocument,
  fetchDocument,
  describeDocument,
  VirtualDocument,
  describeSubject,
  describeContainer
} from "plandoc";
import { StateTransition, SnapChecker } from "snap-checker";
// import { internal_fetchContainer } from "plandoc/dist/actors/container";
import { snapMessageToWeb, snapMessageFromWeb } from "./message";
import { ldp } from "rdf-namespaces";

// copied from
// https://github.com/inrupt/friend-requests-exploration/blob/master/src/services/usePersonDetails.ts
const as = {
  following: "https://www.w3.org/TR/activitypub/#following"
};

const snap = {
  ourInbox: "https://ledgerloops.com/snap/#our-in",
  ourOutbox: "https://ledgerloops.com/snap/#our-out",
  theirInbox: "https://ledgerloops.com/snap/#their-in",
  root: "https://ledgerloops.com/snap/#root"
};

export class Contact {
  addressbookEntry: VirtualSubject;
  snapChecker: SnapChecker;
  snapRoot: VirtualContainer;
  ourName: string;
  theirName: string;
  unit: string;
  constructor(
    addressbookEntry: VirtualSubject,
    snapRoot: VirtualContainer,
    ourName: string,
    theirName: string,
    unit: string
  ) {
    this.addressbookEntry = addressbookEntry;
    this.snapChecker = new SnapChecker([]);
    this.snapRoot = snapRoot;
    this.ourName = ourName;
    this.theirName = theirName;
    this.unit = unit;
  }

  async ensureMessageBoxUrl(predicate: string): Promise<TripleDocument> {
    console.log("Ensuring", predicate);
    // FIXME: Use https://gitlab.com/vincenttunru/plandoc/-/issues/8#note_318442264 here
    const box: VirtualDocument = describeDocument().isEnsuredOn(
      this.addressbookEntry,
      predicate,
      this.snapRoot
    );
    console.log("Fetching", box);
    return fetchDocument(box);
  }

  async sendMessageTo(
    msg: StateTransition,
    messageBoxPredicate: string
  ): Promise<void> {
    // const ourOutbox: TripleContainer = this.ensureMessageBoxUrl(snap.ourOutbox);
    // const ourOutboxDoc = createDocumentInContainer(ourOutbox);
    const box: TripleDocument = await this.ensureMessageBoxUrl(
      messageBoxPredicate
    );
    await snapMessageToWeb(msg, box);
  }

  async sendMessage(msg: StateTransition): Promise<void> {
    this.sendMessageTo(msg, snap.ourOutbox);
    this.sendMessageTo(msg, snap.theirInbox);
  }

  async fetchMessagesFrom(
    messageBoxPredicate: string,
    from: string,
    to: string,
    unit: string
  ): Promise<void> {
    console.log("ensuring", messageBoxPredicate);
    const box: TripleDocument = await this.ensureMessageBoxUrl(
      messageBoxPredicate
    );
    const boxSub = box.getSubject("");
    const docs: string[] = boxSub.getAllRefs(ldp.contains);
    console.log("fetchMessagesFrom", messageBoxPredicate, from, to, unit);
    const promises: Promise<void>[] = docs.map(
      async (msgDocUrl: string): Promise<void> => {
        const thisVirtualDoc = describeDocument().isFoundAt(msgDocUrl);
        console.log("Fetching", msgDocUrl);
        const thisDoc = await fetchDocument(thisVirtualDoc);
        const snapMessage = await snapMessageFromWeb(thisDoc);
        this.snapChecker.processMessage({
          from,
          to,
          unit,
          stateTransition: snapMessage,
          time: new Date()
        });
      }
    );
    await Promise.all(promises);
  }

  async fetchSentMessages(): Promise<void> {
    console.log("fetchSentMessages");
    await this.fetchMessagesFrom(
      snap.ourOutbox,
      this.ourName,
      this.theirName,
      this.unit
    );
  }
  async fetchReceivedMessages(): Promise<void> {
    console.log("fetchReceivedMessages");
    await this.fetchMessagesFrom(
      snap.ourInbox,
      this.ourName,
      this.theirName,
      this.unit
    );
  }

  async fetchMessages(): Promise<void> {
    console.log("fetchMessages");
    await Promise.all([
      this.fetchReceivedMessages()
      // this.fetchSentMessages()
    ]);
  }
  async subscribeToReceivedMessage(): Promise<void> {
    //
  }
}

export async function fetchContacts(
  sessionWebId: string
): Promise<{ [webId: string]: Contact }> {
  const addressbookEntry = describeSubject().isFoundAt("");
  const profileSub = describeSubject().isFoundAt(sessionWebId);
  const snapRoot = describeContainer().isFoundOn(profileSub, snap.root);
  if (sessionWebId === "https://lolcathost.de/storage/alice/profile/card#me") {
    return {
      "https://lolcathost.de/storage/bob/profile/card#me": new Contact(
        addressbookEntry,
        snapRoot,
        "alice",
        "bob",
        "1E-6 USD"
      )
    };
  } else {
    return {
      "https://lolcathost.de/storage/alice/profile/card#me": new Contact(
        addressbookEntry,
        snapRoot,
        "bob",
        "alice",
        "1E-6 USD"
      )
    };
  }
}
