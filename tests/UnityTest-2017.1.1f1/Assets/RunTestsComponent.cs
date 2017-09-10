using HiveMP.Api;
using HiveMP.Lobby.Api;
using HiveMP.TemporarySession.Api;
using System;
using System.Threading.Tasks;
using UnityEngine;

public class RunTestsComponent : MonoBehaviour
{
    private bool _shouldExit = false;

    public void Start()
    {
        Debug.Log("Creating client...");
        // Create new temporary session.
        var temporaryClient = new TemporarySessionClient("test");

        Debug.Log("Running async task...");
        Task.Run(async () =>
        {
            Debug.Log("Entering try / catch...");
            try
            {
                Debug.Log("Creating session...");
                var session = await temporaryClient.SessionPUTAsync(new HiveMP.TemporarySession.Api.SessionPUTRequest());
                Debug.Log("Session created " + session.Id);

                // Create a game lobby.
                var gameLobbiesClient = new LobbyClient(session.ApiKey);
                var lobby = await gameLobbiesClient.LobbyPUTAsync(new LobbyPUTRequest
                {
                    Name = "Test Lobby",
                    MaxSessions = 4,
                });
                Debug.Log("Created game lobby " + lobby.Id);
                _shouldExit = true;
            }
            catch (Exception ex)
            {
                Debug.LogException(ex);
                _shouldExit = true;
            }
            _shouldExit = true;
        });
    }

    public void Update()
    {
        if (_shouldExit)
        {
            Application.Quit();
        }
    }
}
