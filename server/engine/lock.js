// server/engine/lock.js
// Promise-based FIFO mutex guaranteeing strict serialized execution of state check-and-mutate operations

let queue = Promise.resolve();

/**
 * Executes an async function exclusively in strict FIFO order.
 * Ensures state mutations never interleave or race.
 * @template T
 * @param {() => Promise<T>|T} fn
 * @returns {Promise<T>}
 */
export function withLock(fn) {
  const next = queue.catch(() => {}).then(async () => {
    return await fn();
  });
  queue = next.catch(() => {});
  return next;
}
