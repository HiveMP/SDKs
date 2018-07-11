using System;

namespace HiveMP.Api
{
    /// <summary>
    /// A callback to use with <see cref="HiveMPPromise{T}"/>.
    /// </summary>
    /// <typeparam name="T">The return value of the callback.</typeparam>
    /// <param name="resolve">Call this method when the callback is returning a result.</param>
    /// <param name="reject">Call this method when the callback encounters an error.</param>
    public delegate void HiveMPPromiseDelegate<T>(Action<T> resolve, Action<Exception> reject);
}