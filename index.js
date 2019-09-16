const Prop = {
  STATE: Symbol(`state`),
  EVENT: Symbol(`event`),
  LISTENERS: Symbol(`listeners`),
  ON_ALL: Symbol(`on all`),
  EMIT: Symbol(`emit`),
  EMITTER: Symbol(`emmiter`),
  MERGE: Symbol(`merge`),
};

const Type = {
  ARRAY: `Array`,
  OBJECT: `Object`,
  FUNCTION: `Function`,
};

const is = (arg, type) => Object.prototype.toString.call(arg).slice(8, -1) === type;

export default class State {
  constructor(defaultState = {}, separator = `.`) {
    this[Prop.STATE] = {
      ...defaultState,
    };
    this[Prop.LISTENERS] = {};

    this.listened = [];
    this.separator = separator;
  }

  get state() {
    return this[Prop.STATE];
  }

  setState(newState) {
    if (!is(newState, Type.OBJECT)) {
      throw new TypeError(`The argument must be an object`);
    }

    const diffState = this[Prop.MERGE](this[Prop.STATE], newState);
    this[Prop.EMITTER](diffState);
  }

  on(key, callback) {
    const listeners = this[Prop.LISTENERS];
    const value = listeners[key];

    if (value) {
      value.push(callback);
      return;
    }

    listeners[key] = [callback];
  }

  off(key, callback) {
    const listeners = this[Prop.LISTENERS];
    const value = listeners[key];

    if (value && callback && is(callback, Type.FUNCTION)) {
      const index = value.indexOf(callback);

      if (~index) {
        value.splice(index, 1);
      }
    }
  }

  onAll(callback) {
    this.on(Prop.ON_ALL, callback);
  }

  offAll(callback) {
    this.off(Prop.ON_ALL, callback);
  }

  listen(stateEl) {
    if (this.listened.includes(stateEl)) {
      return;
    }

    stateEl.onAll((key, value) => this.setState({
      [key]: value,
    }));

    this.listened.push(stateEl);
  }

  sync(stateEl) {
    State.sync(this, stateEl);
  }

  triggerState(propsArr) {
    if (!propsArr) {
      this[Prop.EMITTER](this.state);
      return;
    }

    const state = Object.keys(this.state)
      .filter(key => propsArr.includes(key))
      .reduce((obj, prop) => ({
        ...obj,
        [prop]: this.state[prop],
      }), {});

    this[Prop.EMITTER](state);
  }

  [Prop.EMIT](key, value) {
    const listeners = this[Prop.LISTENERS][key];
    if (listeners) {
      listeners.forEach((cb) => cb(value));
    }

    if (!key.includes(this.separator)) {
      const allListener = this[Prop.LISTENERS][Prop.ON_ALL];
      if (allListener) {
        allListener.forEach((cb) => cb(key, value));
      }
    }
  }

  [Prop.MERGE](oldState, newState, changed = {}) {
    for (let prop in newState) {
      if (newState.hasOwnProperty(prop)) {
        const newValue = newState[prop];

        if (oldState.hasOwnProperty(prop)) {
          const oldValue = oldState[prop];

          if (oldValue === newValue) {
            continue;
          }

          if (is(newValue, Type.OBJECT)) {
            changed[prop] = this[Prop.MERGE](oldValue, newValue);
            continue;
          }
        }

        oldState[prop] = newValue;
        changed[prop] = newValue;
      }
    }

    return changed;
  }

  [Prop.EMITTER](obj, propArr = []) {
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        const value = obj[prop];
        propArr.push(prop);

        this[Prop.EMIT](propArr.join(this.separator), value);

        if (is(value, Type.OBJECT)) {
          this[Prop.EMITTER](value, propArr);
        }

        propArr = [];
      }
    }
  }

  static sync(first, second) {
    first.listen(second);
    second.listen(first);
  }
}
