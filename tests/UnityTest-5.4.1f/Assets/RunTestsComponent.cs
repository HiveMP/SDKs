using HiveMP.Api;
using HiveMP.Lobby.Api;
using HiveMP.TemporarySession.Api;
using HiveMP.ClientConnect.Api;
using UnityEngine;

public class RunTestsComponent : MonoBehaviour
{
    public void Start()
    {
        // Create new temporary session.
        var temporaryClient = new TemporarySessionClient("b2124be3f61adf918b6bc7e1e1abdbf8");
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

                var serviceClient = new ServiceClient();
                serviceClient.ServiceEnabledGETPromise(new ServiceEnabledGETRequest
                {
                }, result =>
                {
                    if (!result)
                    {
                        Bail(new System.Exception("HiveMP Client Connect is not enabled!"));
                    }
                    else
                    {
                        serviceClient.ServiceTestPUTPromise(new ServiceTestPUTRequest
                        {
                            TestName = "test-1",
                        }, testResult =>
                        {
                            if (!testResult)
                            {
                                Bail(new System.Exception("HiveMP Client Connect test did not pass!"));
                            }
                            else
                            {
                                Debug.Log("TEST PASS");
                                Application.Quit();
                            }
                        }, Bail);
                    }
                }, Bail);
            }, Bail);
        }, Bail);
    }

    private void Bail(System.Exception ex)
    {
        Debug.LogException(ex);
        Debug.Log("TEST FAIL");
        Application.Quit();
    }
}
