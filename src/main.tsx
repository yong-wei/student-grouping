import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { unstableSetRender } from 'antd/es/config-provider/UnstableContext';
import * as echarts from 'echarts';
import './index.css';
import App from './App.tsx';
import { initLogger } from './utils/logger';

if (typeof window !== 'undefined' && typeof window.Promise === 'undefined') {
  const asyncRun =
    typeof queueMicrotask === 'function'
      ? queueMicrotask
      : (cb: () => void) => {
          setTimeout(cb, 0);
        };

  class SimplePromise<T> {
    private state: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    private value: unknown;
    private handlers: {
      onFulfilled?: (value: unknown) => unknown;
      onRejected?: (reason: unknown) => unknown;
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
    }[] = [];

    constructor(
      executor: (
        resolve: (value?: T | PromiseLike<T>) => void,
        reject: (reason?: unknown) => void
      ) => void
    ) {
      const resolve = (value?: T | PromiseLike<T>) => {
        this.transition('fulfilled', value);
      };
      const reject = (reason?: unknown) => {
        this.transition('rejected', reason);
      };
      try {
        executor(resolve, reject);
      } catch (error) {
        reject(error);
      }
    }

    private transition(state: 'fulfilled' | 'rejected', value: unknown) {
      if (this.state !== 'pending') {
        return;
      }
      this.state = state;
      this.value = value;
      this.flushHandlers();
    }

    private flushHandlers() {
      if (this.state === 'pending') {
        return;
      }
      const currentHandlers = [...this.handlers];
      this.handlers = [];
      currentHandlers.forEach((handler) => {
        asyncRun(() => {
          const callback = this.state === 'fulfilled' ? handler.onFulfilled : handler.onRejected;
          if (typeof callback !== 'function') {
            if (this.state === 'fulfilled') {
              handler.resolve(this.value);
            } else {
              handler.reject(this.value);
            }
            return;
          }
          try {
            const result = callback(this.value);
            handler.resolve(result);
          } catch (error) {
            handler.reject(error);
          }
        });
      });
    }

    then<TResult1 = T, TResult2 = never>(
      onFulfilled?: (value: T) => TResult1 | PromiseLike<TResult1>,
      onRejected?: (reason: unknown) => TResult2 | PromiseLike<TResult2>
    ): SimplePromise<TResult1 | TResult2> {
      return new SimplePromise<TResult1 | TResult2>((resolve, reject) => {
        this.handlers.push({
          onFulfilled,
          onRejected,
          resolve,
          reject,
        });
        this.flushHandlers();
      });
    }
    catch<TResult = never>(
      onRejected?: (reason: unknown) => TResult | PromiseLike<TResult>
    ): SimplePromise<T | TResult> {
      return this.then(undefined, onRejected);
    }

    finally(onFinally?: () => void | PromiseLike<void>) {
      const run = () => SimplePromise.resolve(onFinally?.());
      return this.then(
        (value) => run().then(() => value as T),
        (reason) =>
          run().then(() => {
            throw reason;
          })
      );
    }

    static resolve<T>(value: T | PromiseLike<T>) {
      if (value instanceof SimplePromise) {
        return value;
      }
      return new SimplePromise<T>((resolve) => resolve(value));
    }

    static reject(reason?: unknown) {
      return new SimplePromise<never>((_, reject) => reject(reason));
    }

    static all<T>(values: Iterable<T | PromiseLike<T>>) {
      return new SimplePromise<T[]>((resolve, reject) => {
        const entries = Array.from(values);
        if (entries.length === 0) {
          resolve([]);
          return;
        }
        const results: T[] = new Array(entries.length);
        let remaining = entries.length;
        entries.forEach((entry, index) => {
          SimplePromise.resolve(entry).then(
            (val) => {
              results[index] = val;
              remaining -= 1;
              if (remaining === 0) {
                resolve(results);
              }
            },
            (error) => reject(error)
          );
        });
      });
    }

    static race<T>(values: Iterable<T | PromiseLike<T>>) {
      return new SimplePromise<T>((resolve, reject) => {
        for (const entry of values) {
          SimplePromise.resolve(entry).then(resolve, reject);
        }
      });
    }
  }

  (window as unknown as { Promise: PromiseConstructor }).Promise =
    SimplePromise as unknown as PromiseConstructor;
  if (typeof globalThis !== 'undefined') {
    (globalThis as { Promise?: PromiseConstructor }).Promise =
      SimplePromise as unknown as PromiseConstructor;
  }
}

// 兼容 React 19：为 antd 提供自定义 render，避免兼容性警告
const antContainerRoots = new WeakMap<Element, Root>();
unstableSetRender((node, container) => {
  let root = antContainerRoots.get(container);
  if (!root) {
    root = createRoot(container as HTMLElement);
    antContainerRoots.set(container, root);
  }

  root.render(node);

  return () => {
    root?.unmount();
    antContainerRoots.delete(container);
  };
});

// 初始化日志系统
initLogger();

if (typeof echarts.setLogLevel === 'function') {
  echarts.setLogLevel('error');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
