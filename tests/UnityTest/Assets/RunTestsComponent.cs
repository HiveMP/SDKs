using HiveMP.Api;
using HiveMP.TemporarySession.Api;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class RunTestsComponent : MonoBehaviour
{
    public void Start()
    {
        var temporaryClient = new TemporarySessionClient("test");
        var promise = new HiveMPUnityPromise<TempSessionWithSecrets>(() =>
        {
            return temporaryClient.SessionPUT();
        }, session =>
        {
            Debug.Log(session.Id);
        }, error =>
        {
            Debug.LogException(error);
        });
    }
}
