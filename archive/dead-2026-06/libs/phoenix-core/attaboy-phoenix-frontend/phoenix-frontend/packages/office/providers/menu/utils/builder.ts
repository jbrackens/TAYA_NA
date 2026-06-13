import { extend, isNil, clone, pick, isEmpty } from "lodash";

export const MenuBuilder: any = {
  _path: "/",
  _parent: null,

  get: function(path: string) {
    if (path && path in this) {
      return this[path];
    }
    return this;
  },

  set: function(path: string, parametrizedPath?: string) {
    this[path] = extend(pick(this, ["get", "set", "path", "render"]), {
      _parent: this,
      _path: parametrizedPath || path,
    });
    return this;
  },

  path: function(stripSlash: boolean = false) {
    const { _path } = this;
    if (_path === "/") {
      return stripSlash ? "" : _path;
    }
    return `/${_path}`;
  },

  render: function(props?: any) {
    const { _parent } = this;
    const path = `${!isNil(_parent) ? _parent.render() : ""}${this.path(true)}`;
    if (!isEmpty(props)) {
      return Object.keys(props).reduce(
        (prev: string, curr: string) => prev.replace(`:${curr}`, props[curr]),
        path,
      );
    }
    return path;
  },
};

export const initMenuBuilder = () => clone(MenuBuilder);
