import { PodData } from "./solid-models/PodData";
import { SolidContact } from "./solid-models/SolidContact";
import { SnapContact } from "./SnapContact";

export class SnapSolid {
  podData: PodData;
  snapContacts: SnapContact[] | undefined;
  constructor(sessionWebId: string) {
    const podRoot = sessionWebId.substring(
      0,
      sessionWebId.length - "profile/card#me".length
    );
    this.podData = new PodData(sessionWebId, podRoot);
  }
  async addContact(webId: string, nick: string): Promise<void> {
    const newSolidContact = await this.podData.addContact(webId, nick);
    this.snapContacts.push(new SnapContact(newSolidContact));
  }
  async getContacts(): Promise<SnapContact[]> {
    if (this.snapContacts === undefined) {
      const solidContacts = await this.podData.getContacts();
      this.snapContacts = solidContacts.map((solidContact: SolidContact) => {
        return new SnapContact(solidContact);
      });
    }
    return this.snapContacts;
  }
}
