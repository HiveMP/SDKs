import * as hivemp from 'hivemp';

async function test() {
  try {
    const tempSessionClient = new hivemp.TemporarySession.TemporarySessionClient("b2124be3f61adf918b6bc7e1e1abdbf8");
    const tempSession = await tempSessionClient.sessionPUT({});

    const lobbyClient = new hivemp.Lobby.LobbyClient(tempSession.apiKey);
    const lobby = await lobbyClient.lobbyPUT({
      name: 'Test Lobby',
      maxSessions: 4,
    });
    console.log('TEST PASS');
    process.exit(0);
  } catch (e) {
    console.log('TEST FAIL');
    console.error(e);
    process.exit(1);
  }
}

test();
