using HiveMP.Api;
using HiveMP.Lobby.Api;
using HiveMP.TemporarySession.Api;
using System.Threading.Tasks;
using UnityEngine;

public class RunTestsComponent : MonoBehaviour
{
    public void Start()
    {
        // Create new temporary session.
        var temporaryClient = new TemporarySessionClient("test");
        Task.Run(async () =>
        {
            try
            {
                var session = await temporaryClient.SessionPUTAsync(new HiveMP.TemporarySession.Api.SessionPUTRequest());

                // Create a game lobby.
                var gameLobbiesClient = new LobbyClient(session.ApiKey);
                var lobby = await gameLobbiesClient.LobbyPUTAsync(new LobbyPUTRequest
                {
                    Name = "Test Lobby",
                    MaxSessions = 4,
                });
                Debug.Log("Created game lobby " + lobby.Id);
                Application.Quit();
            }
            catch (HiveMPException ex)
            {
                Bail(ex);
            }
        });
    }

    private void Bail(HiveMPException ex)
    {
        Debug.LogException(ex);
        Application.Quit();
    }
}
