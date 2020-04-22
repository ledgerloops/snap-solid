import { ldp } from "rdf-namespaces";
import {
  TripleDocument,
  LocalTripleDocumentForContainer,
  createDocumentInContainer
} from "tripledoc";
import { PodData } from "./PodData";

// copied from
// https://github.com/inrupt/friend-requests-exploration/blob/master/src/services/usePersonDetails.ts
export const as = {
  following: "https://www.w3.org/TR/activitypub/#following"
};

const snap = {
  ourInbox: "https://ledgerloops.com/snap/#our-in",
  ourOutbox: "https://ledgerloops.com/snap/#our-out",
  theirInbox: "https://ledgerloops.com/snap/#their-in",
  root: "https://ledgerloops.com/snap/#root"
};

export class SolidContact {
  podData: PodData;
  ourInbox: TripleDocument;
  ourOutbox: TripleDocument;
  theirInbox: string;
  constructor(
    ourInbox: TripleDocument,
    ourOutbox: TripleDocument,
    theirInbox: string,
    podData: PodData
  ) {
    console.log("Constructing Contact model", {
      ourInbox,
      ourOutbox,
      theirInbox
    });
    this.ourInbox = ourInbox;
    this.ourOutbox = ourOutbox;
    this.theirInbox = theirInbox;
    this.podData = podData;
  }

  async sendMessageTo(
    box: string,
    cb: (doc: LocalTripleDocumentForContainer) => Promise<void>
  ): Promise<void> {
    const doc = createDocumentInContainer(box);
    await cb(doc);
    doc.save();
  }

  async sendMessage(
    cb: (doc: LocalTripleDocumentForContainer) => Promise<void>
  ): Promise<void> {
    this.sendMessageTo(this.ourOutbox.asRef(), cb);
    this.sendMessageTo(this.theirInbox, cb);
  }

  async fetchMessagesFrom(box: TripleDocument): Promise<TripleDocument[]> {
    const boxSub = box.getSubject("");
    const docs: string[] = boxSub.getAllRefs(ldp.contains);
    // console.log("fetchMessagesFrom", box.asRef(), from, to, unit);
    const promises: Promise<TripleDocument>[] = docs.map(
      async (msgDocUrl: string): Promise<TripleDocument> => {
        console.log("Fetching", msgDocUrl);
        return this.podData.getDocumentAt(msgDocUrl);
      }
    );
    return Promise.all(promises);
  }

  async fetchSentMessages(): Promise<TripleDocument[]> {
    console.log("fetchSentMessages");
    return this.fetchMessagesFrom(this.ourOutbox);
  }
  async fetchReceivedMessages(): Promise<TripleDocument[]> {
    console.log("fetchReceivedMessages");
    return this.fetchMessagesFrom(this.ourInbox);
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