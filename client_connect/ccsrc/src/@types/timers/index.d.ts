declare module "timers" {
    interface Timer { }

    function setImmediate(callback: () => void): Timer;
    function setTimeout(callback: () => void, ms: number): Timer;
    function setInterval(callback: () => void, ms: number): Timer;
    function clearImmediate(timer: Timer): void;
    function clearTimeout(timer: Timer): void;
    function clearInterval(timer: Timer): void;
}