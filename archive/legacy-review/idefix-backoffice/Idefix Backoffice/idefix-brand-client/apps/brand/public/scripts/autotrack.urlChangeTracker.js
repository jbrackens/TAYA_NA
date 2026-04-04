(function () {
  var f =
      "function" == typeof Object.defineProperties
        ? Object.defineProperty
        : function (a, b, d) {
            if (d.get || d.set)
              throw new TypeError("ES3 does not support getters and setters.");
            a != Array.prototype && a != Object.prototype && (a[b] = d.value);
          },
    g =
      "undefined" != typeof window && window === this
        ? this
        : "undefined" != typeof global && null != global
        ? global
        : this;
  function h() {
    h = function () {};
    g.Symbol || (g.Symbol = k);
  }
  var m = 0;
  function k(a) {
    return "jscomp_symbol_" + (a || "") + m++;
  }
  function n() {
    h();
    var a = g.Symbol.iterator;
    a || (a = g.Symbol.iterator = g.Symbol("iterator"));
    "function" != typeof Array.prototype[a] &&
      f(Array.prototype, a, {
        configurable: !0,
        writable: !0,
        value: function () {
          return q(this);
        }
      });
    n = function () {};
  }
  function q(a) {
    var b = 0;
    return r(function () {
      return b < a.length ? { done: !1, value: a[b++] } : { done: !0 };
    });
  }
  function r(a) {
    n();
    a = { next: a };
    a[g.Symbol.iterator] = function () {
      return this;
    };
    return a;
  }
  function t(a) {
    if (!(a instanceof Array)) {
      n();
      var b = a[Symbol.iterator];
      a = b ? b.call(a) : q(a);
      for (var d = []; !(b = a.next()).done; ) d.push(b.value);
      a = d;
    }
    return a;
  }
  var u = [];
  function v(a, b) {
    var d = this;
    this.context = a;
    this.h = b;
    this.f = (this.c = /Task$/.test(b)) ? a.get(b) : a[b];
    this.a = [];
    this.b = [];
    this.g = function (a) {
      for (var b = [], c = 0; c < arguments.length; ++c)
        b[c - 0] = arguments[c];
      return d.b[d.b.length - 1].apply(null, [].concat(t(b)));
    };
    this.c ? a.set(b, this.g) : (a[b] = this.g);
  }
  function w(a, b) {
    b = a.a.indexOf(b);
    -1 < b &&
      (a.a.splice(b, 1),
      0 < a.a.length
        ? x(a)
        : ((b = u.indexOf(a)),
          -1 < b &&
            (u.splice(b, 1),
            a.c ? a.context.set(a.h, a.f) : (a.context[a.h] = a.f))));
  }
  function x(a) {
    a.b = [];
    for (var b, d = 0; (b = a.a[d]); d++) {
      var c = a.b[d - 1] || a.f.bind(a.context);
      a.b.push(b(c));
    }
  }
  function y(a) {
    var b = history,
      d = u.filter(function (c) {
        return c.context == b && c.h == a;
      })[0];
    d || ((d = new v(b, a)), u.push(d));
    return d;
  }
  function z(a, b, d) {
    var c = { transport: "beacon" };
    if ("function" == typeof d) {
      var e = b.get("buildHitTask");
      return {
        buildHitTask: function (b) {
          b.set(c, null, !0);
          b.set(a, null, !0);
          d(b, void 0, void 0);
          e(b);
        }
      };
    }
    return A({}, c, a);
  }
  var A =
      Object.assign ||
      function (a, b) {
        for (var d = [], c = 1; c < arguments.length; ++c)
          d[c - 1] = arguments[c];
        for (var c = 0, e = d.length; c < e; c++) {
          var p = Object(d[c]),
            l;
          for (l in p)
            Object.prototype.hasOwnProperty.call(p, l) && (a[l] = p[l]);
        }
        return a;
      },
    B = { l: 1, m: 2, o: 3, u: 4, v: 5, w: 6, A: 7, B: 8, j: 9, s: 10 },
    C = Object.keys(B).length;
  function D(a, b) {
    var d = B.j;
    a.set("\x26_av", "2.4.1");
    var c = a.get("\x26_au"),
      c = parseInt(c || "0", 16).toString(2);
    if (c.length < C) for (var e = C - c.length; e; ) (c = "0" + c), e--;
    d = C - d;
    c = c.substr(0, d) + 1 + c.substr(d + 1);
    a.set("\x26_au", parseInt(c || "0", 2).toString(16));
    history.pushState &&
      window.addEventListener &&
      ((this.b = A(
        {
          shouldTrackUrlChange: this.shouldTrackUrlChange,
          trackReplaceState: !1,
          fieldsObj: {},
          hitFilter: null
        },
        b
      )),
      (this.g = a),
      (this.i = location.pathname + location.search),
      (this.c = this.c.bind(this)),
      (this.f = this.f.bind(this)),
      (this.a = this.a.bind(this)),
      (a = this.c),
      (b = y("pushState")),
      b.a.push(a),
      x(b),
      (a = this.f),
      (b = y("replaceState")),
      b.a.push(a),
      x(b),
      window.addEventListener("popstate", this.a));
  }
  D.prototype.c = function (a) {
    var b = this;
    return function (d) {
      for (var c = [], e = 0; e < arguments.length; ++e)
        c[e - 0] = arguments[e];
      a.apply(null, [].concat(t(c)));
      E(b, !0);
    };
  };
  D.prototype.f = function (a) {
    var b = this;
    return function (d) {
      for (var c = [], e = 0; e < arguments.length; ++e)
        c[e - 0] = arguments[e];
      a.apply(null, [].concat(t(c)));
      E(b, !1);
    };
  };
  D.prototype.a = function () {
    E(this, !0);
  };
  function E(a, b) {
    setTimeout(function () {
      var d = a.i,
        c = location.pathname + location.search;
      d != c &&
        a.b.shouldTrackUrlChange.call(a, c, d) &&
        ((a.i = c),
        a.g.set({ page: c, title: document.title }),
        (b || a.b.trackReplaceState) &&
          a.g.send("pageview", z(a.b.fieldsObj, a.g, a.b.hitFilter)));
    }, 0);
  }
  D.prototype.shouldTrackUrlChange = function (a, b) {
    return !(!a || !b);
  };
  D.prototype.remove = function () {
    var a = this.c;
    w(y("pushState"), a);
    a = this.f;
    w(y("replaceState"), a);
    window.removeEventListener("popstate", this.a);
  };
  (function (a, b) {
    var d = window.GoogleAnalyticsObject || "ga";
    window[d] =
      window[d] ||
      function (a) {
        for (var b = [], c = 0; c < arguments.length; ++c)
          b[c - 0] = arguments[c];
        (window[d].q = window[d].q || []).push(b);
      };
    window.gaDevIds = window.gaDevIds || [];
    0 > window.gaDevIds.indexOf("i5iSjo") && window.gaDevIds.push("i5iSjo");
    window[d]("provide", a, b);
    window.gaplugins = window.gaplugins || {};
    window.gaplugins[a.charAt(0).toUpperCase() + a.slice(1)] = b;
  })("urlChangeTracker", D);
})();
