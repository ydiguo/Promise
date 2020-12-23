const PENDING_STATE = "pending";
const FULFILLED_STATE = "fulfilled";
const REJECTED_STATE = "rejected";

function isFunction(fun) {
  return typeof fun === "function";
}

function isObject(value) {
  return value && typeof value === "object";
}

// function isThenable(value) {
//   return (isObject(value) || isFunction(value)) && isFunction(value.then);
// }

function Promise(fun) {
  // 1. 基本的判断
  // 1.1 判断是否是通过new调用
  if (!this || this.constructor !== Promise) {
    throw new TypeError("Promise must be called by new");
  }
  // 1.2 判断参数fun是否是一个函数
  if (!isFunction(fun)) {
    throw new TypeError("Promise constructor's argument must be a function");
  }

  // 2. 定义基本属性
  this.state = PENDING_STATE;
  this.value = void 0;
  this.reason = void 0;
  this.onFulfilledCallbacks = [];
  this.onRejectedCallbacks = [];

  // 3. 定义resolve方法
  let resolve = (value) => {
    // 3.1 如果value是一个promise，则等待value决议之后，再用其决议值去处理this上保存的then中的回调
    if (value instanceof Promise) {
      value.then(resolve, reject);
      return;
    }

    // 3.2 如果value是一个thenable，则对其进行展开，直到value不是thenable为止
    // if (isThenable(value)) {
    //   value.then(resolve, reject);
    //   return;
    // }

    // 3.3 其他情况，则直接利用value值决议promise
    if (this.state === PENDING_STATE) {
      this.state = FULFILLED_STATE;
      this.value = value;
      this.onFulfilledCallbacks.forEach((callback) => callback());
    }
  };

  // 4. 定义reject方法（reject方法不会解析接收到的值，接收到啥值就直接拿该值作为拒绝的理由）
  let reject = (reason) => {
    if (this.state === PENDING_STATE) {
      this.state = REJECTED_STATE;
      this.reason = reason;
      this.onRejectedCallbacks.forEach((callback) => callback());
    }
  };

  // 5. 执行fun函数
  try {
    fun(resolve, reject);
  } catch (error) {
    reject(error);
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  // 1. 处理onFulfilled或者onRejected不是函数的情况
  onFulfilled = isFunction(onFulfilled) ? onFulfilled : (value) => value;
  onRejected = isFunction(onRejected)
    ? onRejected
    : (error) => {
        throw error;
      };

  // 2. 返回一个新的promise实例
  let promise2 = new Promise((resolve, reject) => {
    // 2.1 包装onFulfilled和onRejected为异步函数
    let wrapOnFulfilled = () => {
      setTimeout(() => {
        try {
          let x = onFulfilled(this.value);
          this.resolvePromise(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };
    let wrapOnRejected = () => {
      setTimeout(() => {
        try {
          let x = onRejected(this.reason);
          this.resolvePromise(promise2, x, resolve, reject);
        } catch (error) {
          reject(error);
        }
      }, 0);
    };

    // 2.2 判断状态
    // 2.2.1 若为fulfilled，则执行onFulfilled
    if (this.state === FULFILLED_STATE) {
      wrapOnFulfilled();
    } else if (this.state === REJECTED_STATE) {
      // 2.2.2 若为rejected，则执行onRejected
      wrapOnRejected();
    } else {
      // 2.2.3 否则，则为pending，将回调保存在onFulfilledCallbacks和onRejectedCallbacks，待resolve之后执行对应回调；
      this.onFulfilledCallbacks.push(wrapOnFulfilled);
      this.onRejectedCallbacks.push(wrapOnRejected);
    }
  });
  return promise2;
};

Promise.prototype.resolvePromise = function (promise, value, resolve, reject) {
  // 1. 判断value是否是promise自身
  if (value === promise) {
    return reject(new TypeError("Promise can not resolved with it seft"));
  }

  // 2. 判断value是否是promise
  // if (value instanceof Promise) {
  //   return value.then(resolve, reject);
  // }

  // 3. 判断是否是thenable
  if (isObject(value) || isFunction(value)) {
    let called = false;
    try {
      let then = value.then;
      if (isFunction(then)) {
        then.call(
          value,
          (x) => {
            if (called) {
              return;
            }
            called = true;
            this.resolvePromise(promise, x, resolve, reject);
          },
          (error) => {
            if (called) {
              return;
            }
            called = true;
            reject(error);
          }
        );
      } else {
        resolve(value);
      }
    } catch (error) {
      if (called) {
        return;
      }
      called = true;
      reject(error);
    }
  } else {
    // 4. value为其他js基础值，直接决议
    resolve(value);
  }
};
Promise.prototype.resolveThenAble = function () {};

Promise.prototype.catch = function (callback) {
  return this.then(null, callback);
};

Promise.resolve = function (value) {
  return value instanceof Promise
    ? value
    : new Promise((resolve) => resolve(value));
};

Promise.reject = function (reason) {
  return new Promise((resolve, reject) => reject(reason));
};

Promise.race = function (promises) {
  return new Promise((resolve, reject) => {
    promises.forEach((promise) => {
      Promise.resolve(promise).then(resolve, reject);
    });
  });
};

Promise.all = function (promises) {
  return new Promise((resolve, reject) => {
    if (!promises.length) {
      resolve([]);
    }
    let result = [];
    let resolvedPro = 0;
    for (let index = 0, length = promises.length; index < length; index++) {
      Promise.resolve(promises[index]).then(
        (data) => {
          result[index] = data;
          if (++resolvedPro === length) {
            resolve(result);
          }
        },
        (error) => {
          reject(error);
        }
      );
    }
  });
};

module.exports = Promise;
