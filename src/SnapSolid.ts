import { PodData } from "./solid-models/PodData";
import { SolidContact } from "./solid-models/SolidContact";
import { SnapContact } from "./SnapContact";

export class SnapSolid {
  podData: PodData;
  constructor(sessionWebId: string) {
    const podRoot = sessionWebId.substring(
      0,
      sessionWebId.length - "profile/card#me".length
    );
    this.podData = new PodData(sessionWebId, podRoot);
  }
  async addContact(webId: string, nick: string): Promise<void> {
    await this.podData.addContact(webId, nick);
  }
  async getContacts(): Promise<SnapContact[]> {
    const solidContacts = await this.podData.getContacts();
    return solidContacts.map((solidContact: SolidContact) => {
      return new SnapContact(solidContact);
    });
  }
}
