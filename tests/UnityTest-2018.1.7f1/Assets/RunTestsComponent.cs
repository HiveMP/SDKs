using HiveMP.Api;
using HiveMP.Lobby.Api;
using HiveMP.TemporarySession.Api;
using HiveMP.ClientConnect.Api;
using System;
using System.Threading.Tasks;
using UnityEngine;

public class RunTestsComponent : MonoBehaviour
{
    private bool _shouldExit = false;

    public void Start()
    {
        try
        {
            // We must create the temporary session client here, as the HiveMP SDK
            // needs to initialise on the main thread.
            Debug.Log("Creating client...");
            var temporaryClient = new TemporarySessionClient("b2124be3f61adf918b6bc7e1e1abdbf8");

            Task.Run(async () => await RunTest(temporaryClient));
        }
        catch (Exception ex)
        {
            Debug.LogException(ex);
            Debug.Log("TEST FAIL");
            _shouldExit = true;
        }
    }

    private async Task RunTest(TemporarySessionClient temporaryClient)
    {
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

            // Test HiveMP Client Connect.
            Debug.Log("Creating service client...");
            var serviceClient = new ServiceClient("");

            Debug.Log("Testing if HiveMP Client Connect is enabled...");
            if (!(await serviceClient.ServiceEnabledGETAsync(new ServiceEnabledGETRequest())))
            {
                throw new System.Exception("HiveMP Client Connect is not enabled!");
            }

            Debug.Log("Testing if HiveMP Client Connect will execute correctly...");
            if (!(await serviceClient.ServiceTestPUTAsync(new ServiceTestPUTRequest { TestName = "test-1" })))
            {
                throw new System.Exception("HiveMP Client Connect test did not pass!");
            }

            Debug.Log("TEST PASS");
            _shouldExit = true;
        }
        catch (Exception ex)
        {
            Debug.LogException(ex);
            Debug.Log("TEST FAIL");
            _shouldExit = true;
        }
    }

    public void Update()
    {
        if (_shouldExit)
        {
            Application.Quit();
        }
    }
}
