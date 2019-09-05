const Prop = {
  STATE: Symbol(`state`),
  EVENT: Symbol(`event`),
  LISTENERS: Symbol(`listeners`),
  ON_ALL: Symbol(`on all`),
};

const Type = {
  ARRAY: `Array`,
  OBJECT: `Object`,
  FUNCTION: `Function`,
};

const is = (arg, type) => Object.prototype.toString.call(arg).slice(8, -1) === type;

export default class State {
  constructor(
    defaultState = {},
    separator = `.`
  ) {
    this[Prop.STATE] = defaultState;
    this[Prop.LISTENERS] = {};

    this.listened = [];
    this.separator = separator;
  }

  get state() {
    return this[Prop.STATE];
  }

  setState(newState) {
    if (!is(newState, Type.OBJECT)) {
      throw new TypeError(`The argument must be an object`)
    }

    const diffState = this._merge(this[Prop.STATE], newState);
    this._emitter(diffState);
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

  emit(key, value) {
    const listeners = this[Prop.LISTENERS][key];
    listeners && listeners.forEach((cb) => cb(value));

    if (!key.includes(this.separator)) {
      const allListener = this[Prop.LISTENERS][Prop.ON_ALL];
      allListener && allListener.forEach((cb) => cb(key, value));
    }
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

  _merge(oldState, newState, changed = {}) {
    for (let prop in newState) {
      if (newState.hasOwnProperty(prop)) {
        const newValue = newState[prop];

        if (oldState.hasOwnProperty(prop)) {
          const oldValue = oldState[prop];

          if (oldValue === newValue) {
            continue;
          }

          if (is(newValue, Type.OBJECT)) {
            changed[prop] = this._merge(oldValue, newValue);
            continue;
          }
        }

        oldState[prop] = newValue;
        changed[prop] = newValue;
      }
    }

    return changed;
  };

  _emitter(obj, propArr = []) {
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        const value = obj[prop];
        propArr.push(prop);

        this.emit(
          propArr.join(this.separator),
          value
        );

        if (is(value, Type.OBJECT)) {
          this._emitter(value, propArr);
        }

        propArr = [];
      }
    }
  };

  static sync(first, second) {
    first.listen(second);
    second.listen(first);
  }
}
