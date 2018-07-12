using System;
using System.Collections.Generic;

namespace HiveMP.Api
{
    /// <summary>
    /// A C# promise, which encapsulates asynchronous work to be done and allows it to
    /// be chained with other promises or resolved on a background thread.
    /// </summary>
    public class HiveMPPromise
    {
        private readonly HiveMPPromiseDelegate _handler;
        private List<Action> _then;
        private List<Action<Exception>> _catch;

        /// <summary>
        /// Creates a new C# promise with no result value.
        /// </summary>
        /// <param name="handler">The callback handler to execute with this promise.</param>
        public HiveMPPromise(HiveMPPromiseDelegate handler)
        {
            _handler = handler;
            _then = new List<Action>();
            _catch = new List<Action<Exception>>();
        }

        /// <summary>
        /// The callback handler. This is provided so that a scheduler can execute it
        /// on a background thread when desired by the user.
        /// </summary>
        public HiveMPPromiseDelegate Handler { get { return _handler; } }

        /// <summary>
        /// The resolve method which calls all of the registered "then" chains. This should
        /// only be used inside the scheduler code, and never called directly by the user.
        /// </summary>
        public void Resolve()
        {
            foreach (var then in _then)
            {
                then();
            }
        }

        /// <summary>
        /// The reject method which calls all of the registered "catch" chains. This should
        /// only be used inside the scheduler code, and never called directly by the user.
        /// </summary>
        /// <param name="error">The promise exception.</param>
        public void Reject(Exception error)
        {
            foreach (var @catch in _catch)
            {
                @catch(error);
            }
        }

        /// <summary>
        /// Chains an action to be called when this promise resolves successfully.
        /// </summary>
        /// <param name="next">The action to be called.</param>
        /// <returns>The promise instance.</returns>
        public HiveMPPromise Then(Action next)
        {
            _then.Add(next);
            return this;
        }

        /// <summary>
        /// Chains an action to be called when this promise is rejected with an exception.
        /// </summary>
        /// <param name="error">The action to be called.</param>
        /// <returns>The promise instance.</returns>
        public HiveMPPromise Catch(Action<Exception> error)
        {
            _catch.Add(error);
            return this;
        }
    }
}