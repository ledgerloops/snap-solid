import { SnapTransactionState } from "snap-checker";
import { fetchContacts, Contact } from "./Contact";

window.onload = (): void => {
  console.log("document ready");
  ((window as unknown) as {
    solid: {
      auth: {
        trackSession: (callback: (session: { webId: string }) => void) => void;
      };
    };
  }).solid.auth.trackSession(async (session: { webId: string }) => {
    if (!session) {
      console.log("The user is not logged in");
      document.getElementById(
        "loginBanner"
      ).innerHTML = `<button onclick="solid.auth.login(window.location.toString())">Log in or register</button>`;
      document.getElementById("ui").style.display = "none";
    } else {
      console.log(`Logged in as ${session.webId}`);
      const contacts: { [webId: string]: Contact } = await fetchContacts(
        session.webId
      );
      // (window as any).getDocument = getDocument;
      (window as any).sendSomething = async (): Promise<void> => {
        await Promise.all(
          Object.keys(contacts).map(async (webId: string) => {
            const contact = contacts[webId];
            console.log("Loading bilateral message history", contact);
            await contact.fetchMessages();
            // console.log("Sending a message", contact);
            // return contact.sendMessage({
            //   transId: 1,
            //   newState: SnapTransactionState.Proposing,
            //   amount: 20
            // });
          })
        );
      };
      document.getElementById(
        "loginBanner"
      ).innerHTML = `Logged in as ${session.webId} <button onclick="solid.auth.logout()">Log out</button>`;
      document.getElementById("ui").style.display = "block";
    }
  });
};
