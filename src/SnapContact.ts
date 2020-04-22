import { StateTransition, SnapChecker } from "snap-checker";
import { snapMessageToWeb, snapMessageFromWeb } from "./message";
import { ldp } from "rdf-namespaces";
import { TripleDocument } from "tripledoc";
import { PodData } from "./PodData";
import { SolidContact } from "./solid-models/SolidContact";

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

export class SnapContact {
  snapChecker: SnapChecker;
  solidContact: SolidContact;
  ourName: string;
  theirName: string;
  unit: string;
  constructor(
    ourInbox: TripleDocument,
    ourOutbox: TripleDocument,
    theirInbox: string,
    ourName: string,
    theirName: string,
    unit: string,
    podData: PodData
  ) {
    console.log("Constructing Contact model", {
      ourInbox,
      ourOutbox,
      theirInbox,
      ourName,
      theirName,
      unit
    });
    this.solidContact = new SolidContact(
      ourInbox,
      ourOutbox,
      theirInbox,
      podData
    );
    this.ourName = ourName;
    this.theirName = theirName;
    this.unit = unit;
  }

  async sendMessage(msg: StateTransition): Promise<void> {
    await this.solidContact.sendMessage(msg);
  }

  async fetchMessagesFrom(
    box: TripleDocument,
    from: string,
    to: string,
    unit: string
  ): Promise<TripleDocument[]> {
    const boxSub = box.getSubject("");
    const docs: string[] = boxSub.getAllRefs(ldp.contains);
    console.log("fetchMessagesFrom", box.asRef(), from, to, unit);
    const promises: Promise<TripleDocument>[] = docs.map(
      async (msgDocUrl: string): Promise<TripleDocument> => {
        console.log("Fetching", msgDocUrl);
        return this.podData.getDocumentAt(msgDocUrl);
      }
    );
    docs.map((doc: TripleDocument) => {
      const snapMessage = await snapMessageFromWeb(doc);
      this.snapChecker.processMessage({
        from,
        to,
        unit,
        stateTransition: snapMessage,
        time: new Date()
      });
    });
    return Promise.all(promises);
  }

  async fetchSentMessages(): Promise<TripleDocument[]> {
    console.log("fetchSentMessages");
    return this.solidContact.fetchSentMessages();
  }
  async fetchReceivedMessages(): Promise<TripleDocument[]> {
    console.log("fetchReceivedMessages");
    return this.solidContact.fetchReceivedMessages();
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
