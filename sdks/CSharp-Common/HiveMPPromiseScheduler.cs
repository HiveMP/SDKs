using System;
using System.Threading;

namespace HiveMP.Api
{
    public class HiveMPPromiseScheduler
    {
        /// <summary>
        /// Executes a promise on a background thread, then executes the registered resolve
        /// and reject handlers on the main thread.
        /// </summary>
        /// <param name="promise">The promise to execute on the background thread.</param>
        public static void ExecuteWithMainThreadCallbacks(HiveMPPromise promise)
        {
            new HiveMPPromiseMainThreadReturnHandler(promise.Handler, promise.Resolve, promise.Reject);
        }

        /// <summary>
        /// Executes a promise on a background thread, then executes the registered resolve
        /// and reject handlers on the main thread.
        /// </summary>
        /// <param name="promise">The promise to execute on the background thread.</param>
        public static void ExecuteWithMainThreadCallbacks<T>(HiveMPPromise<T> promise)
        {
            new HiveMPPromiseMainThreadReturnHandler<T>(promise.Handler, promise.Resolve, promise.Reject);
        }

        /// <summary>
        /// Executes a promise on a background thread, then executes the registered resolve
        /// and reject handlers on a background thread.
        /// </summary>
        /// <param name="promise">The promise to execute on the background thread.</param>
        public static void Execute(HiveMPPromise promise)
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    promise.Handler(promise.Resolve, promise.Reject);
                }
                catch (Exception ex)
                {
                    promise.Reject(ex);
                }
            });
        }

        /// <summary>
        /// Executes a promise on a background thread, then executes the registered resolve
        /// and reject handlers on a background thread.
        /// </summary>
        /// <param name="promise">The promise to execute on the background thread.</param>
        public static void Execute<T>(HiveMPPromise<T> promise)
        {
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    promise.Handler(promise.Resolve, promise.Reject);
                }
                catch (Exception ex)
                {
                    promise.Reject(ex);
                }
            });
        }
    }
}