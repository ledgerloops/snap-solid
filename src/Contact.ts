import { StateTransition, SnapChecker } from "snap-checker";
import { snapMessageToWeb, snapMessageFromWeb } from "./message";
import { ldp } from "rdf-namespaces";
import { TripleDocument } from "tripledoc";
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

export class Contact {
  snapChecker: SnapChecker;
  podData: PodData;
  ourInbox: TripleDocument;
  ourOutbox: TripleDocument;
  theirInbox: TripleDocument;
  ourName: string;
  theirName: string;
  unit: string;
  constructor(
    ourInbox: TripleDocument,
    ourOutbox: TripleDocument,
    theirInbox: TripleDocument,
    ourName: string,
    theirName: string,
    unit: string,
    podData: PodData
  ) {
    this.snapChecker = new SnapChecker([]);
    this.ourName = ourName;
    this.theirName = theirName;
    this.unit = unit;
    this.podData = podData;
  }

  async sendMessageTo(
    msg: StateTransition,
    box: TripleDocument
  ): Promise<void> {
    await snapMessageToWeb(msg, box);
  }

  async sendMessage(msg: StateTransition): Promise<void> {
    this.sendMessageTo(msg, this.ourOutbox);
    this.sendMessageTo(msg, this.theirInbox);
  }

  async fetchMessagesFrom(
    box: TripleDocument,
    from: string,
    to: string,
    unit: string
  ): Promise<void> {
    const boxSub = box.getSubject("");
    const docs: string[] = boxSub.getAllRefs(ldp.contains);
    console.log("fetchMessagesFrom", box.asRef(), from, to, unit);
    const promises: Promise<void>[] = docs.map(
      async (msgDocUrl: string): Promise<void> => {
        console.log("Fetching", msgDocUrl);
        const thisDoc = await this.podData.getDocumentAt(msgDocUrl);
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
      this.ourOutbox,
      this.ourName,
      this.theirName,
      this.unit
    );
  }
  async fetchReceivedMessages(): Promise<void> {
    console.log("fetchReceivedMessages");
    await this.fetchMessagesFrom(
      this.ourInbox,
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
