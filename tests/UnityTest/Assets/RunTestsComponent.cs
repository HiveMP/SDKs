using HiveMP.Api;
using HiveMP.Lobby.Api;
using HiveMP.TemporarySession.Api;
using UnityEngine;

public class RunTestsComponent : MonoBehaviour
{
    public void Start()
    {
        // Create new temporary session.
        var temporaryClient = new TemporarySessionClient("test");
        temporaryClient.SessionPUTPromise(new HiveMP.TemporarySession.Api.SessionPUTRequest(), session =>
        {
            // Create a game lobby.
            var gameLobbiesClient = new LobbyClient(session.ApiKey);
            gameLobbiesClient.LobbyPUTPromise(new LobbyPUTRequest
            {
                Name = "Test Lobby",
                MaxSessions = 4,
            }, lobby =>
            {
                Debug.Log("Created game lobby " + lobby.Id);
                Application.Quit();
            }, Bail);
        }, Bail);
    }

    private void Bail(HiveMPException ex)
    {
        Debug.LogException(ex);
        Application.Quit();
    }
}
