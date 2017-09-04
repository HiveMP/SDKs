using HiveMP.Api;
using HiveMP.TemporarySession.Api;
using System.Diagnostics;

namespace TestHive
{
    class Program
    {
        static void Main(string[] args)
        {
            /*
            HiveMPSDKSetup.SetClientConnectCustomInit(System.Text.Encoding.ASCII.GetBytes(@"
function sessionHotpatch(id, endpoint, api_key, parameters_json)
    return 200, '{""id"": ""hello""}'
end

register_hotpatch(""temp-session:sessionPUT"", ""sessionHotpatch"");
"));
            */

            // Same as code above, but compiled with Luac 5.3 then base64-encoded.
            HiveMPSDKSetup.SetClientConnectCustomInit(System.Convert.FromBase64String(
                "G0x1YVMAGZMNChoKBAQECAh4VgAAAAAAAAAAAAAAKHdAAQpAdGVzdC5sdWEAAAAAAAAAAAA" +
                "BAwcAAAAsAAAACAAAgAZAQABBgAAAgQAAACRAgAEmAIAAAwAAAAQQc2Vzc2lvbkhvdHBhdG" +
                "NoBBJyZWdpc3Rlcl9ob3RwYXRjaAQYdGVtcC1zZXNzaW9uOnNlc3Npb25QVVQBAAAAAQABA" +
                "AAAAAEAAAADAAAABAAGBAAAAAEBAABBQQAAJgGAASYAgAACAAAAE8gAAAAAAAAABBB7Imlk" +
                "IjogImhlbGxvIn0AAAAAAAAAAAQAAAACAAAAAgAAAAIAAAADAAAABAAAAANpZAAAAAAEAAA" +
                "ACWVuZHBvaW50AAAAAAQAAAAIYXBpX2tleQAAAAAEAAAAEHBhcmFtZXRlcnNfanNvbgAAAA" +
                "AEAAAAAAAAAAcAAAADAAAAAQAAAAUAAAAFAAAABQAAAAUAAAAFAAAAAAAAAAEAAAAFX0VOV" +
                "g=="));

            var stopwatch = Stopwatch.StartNew();
            var temporarySessionClient = new TemporarySessionClient("test");
            System.Console.WriteLine(stopwatch.Elapsed);
            stopwatch = Stopwatch.StartNew();
            var session = temporarySessionClient.SessionPUT(new SessionPUTRequest
            {
            });
            System.Console.WriteLine(session.Id);
            System.Console.WriteLine(stopwatch.Elapsed);
            stopwatch = Stopwatch.StartNew();
            session = temporarySessionClient.SessionPUT(new SessionPUTRequest
            {
            });
            System.Console.WriteLine(session.Id);
            System.Console.WriteLine(stopwatch.Elapsed);
        }
    }
}
