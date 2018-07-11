using System;

namespace HiveMP.Api
{
    /// <summary>
    /// A callback to use with <see cref="HiveMPPromise"/>.
    /// </summary>
    /// <param name="resolve">Call this method when the callback is returning normally.</param>
    /// <param name="reject">Call this method when the callback encounters an error.</param>
    public delegate void HiveMPPromiseDelegate(Action resolve, Action<Exception> reject);
}