(function(){
///<reference path="../typings/angularjs/angular.d.ts"/>
/*
 * decorates $compileProvider so that we have access to routing metadata
 */
function compilerProviderDecorator($compileProvider, $$directiveIntrospectorProvider) {
    var directive = $compileProvider.directive;
    $compileProvider.directive = function (name, factory) {
        $$directiveIntrospectorProvider.register(name, factory);
        return directive.apply(this, arguments);
    };
}
/*
 * private service that holds route mappings for each controller
 */
var DirectiveIntrospectorProvider = (function () {
    function DirectiveIntrospectorProvider() {
        this.directiveBuffer = [];
        this.directiveFactoriesByName = {};
        this.onDirectiveRegistered = null;
    }
    DirectiveIntrospectorProvider.prototype.register = function (name, factory) {
        if (angular.isArray(factory)) {
            factory = factory[factory.length - 1];
        }
        this.directiveFactoriesByName[name] = factory;
        if (this.onDirectiveRegistered) {
            this.onDirectiveRegistered(name, factory);
        }
        else {
            this.directiveBuffer.push({ name: name, factory: factory });
        }
    };
    DirectiveIntrospectorProvider.prototype.$get = function () {
        var _this = this;
        var fn = function (newOnControllerRegistered) {
            _this.onDirectiveRegistered = newOnControllerRegistered;
            while (_this.directiveBuffer.length > 0) {
                var directive = _this.directiveBuffer.pop();
                _this.onDirectiveRegistered(directive.name, directive.factory);
            }
        };
        fn.getTypeByName = function (name) { return _this.directiveFactoriesByName[name]; };
        return fn;
    };
    return DirectiveIntrospectorProvider;
})();
/**
 * @name ngOutlet
 *
 * @description
 * An ngOutlet is where resolved content goes.
 *
 * ## Use
 *
 * ```html
 * <div ng-outlet="name"></div>
 * ```
 *
 * The value for the `ngOutlet` attribute is optional.
 */
function ngOutletDirective($animate, $q, $rootRouter) {
    var rootRouter = $rootRouter;
    return {
        restrict: 'AE',
        transclude: 'element',
        terminal: true,
        priority: 400,
        require: ['?^^ngOutlet', 'ngOutlet'],
        link: outletLink,
        controller: (function () {
            function class_1() {
            }
            return class_1;
        })(),
        controllerAs: '$$ngOutlet'
    };
    function outletLink(scope, element, attrs, ctrls, $transclude) {
        var Outlet = (function () {
            function Outlet(controller, router) {
                this.controller = controller;
                this.router = router;
            }
            Outlet.prototype.cleanupLastView = function () {
                var _this = this;
                if (this.previousLeaveAnimation) {
                    $animate.cancel(this.previousLeaveAnimation);
                    this.previousLeaveAnimation = null;
                }
                if (this.currentScope) {
                    this.currentScope.$destroy();
                    this.currentScope = null;
                }
                if (this.currentElement) {
                    this.previousLeaveAnimation = $animate.leave(this.currentElement);
                    this.previousLeaveAnimation.then(function () { return _this.previousLeaveAnimation = null; });
                    this.currentElement = null;
                }
            };
            Outlet.prototype.reuse = function (instruction) {
                var next = $q.when(true);
                var previousInstruction = this.currentInstruction;
                this.currentInstruction = instruction;
                if (this.currentController && this.currentController.$routerOnReuse) {
                    next = $q.when(this.currentController.$routerOnReuse(this.currentInstruction, previousInstruction));
                }
                return next;
            };
            Outlet.prototype.routerCanReuse = function (nextInstruction) {
                var result;
                if (!this.currentInstruction ||
                    this.currentInstruction.componentType !== nextInstruction.componentType) {
                    result = false;
                }
                else if (this.currentController && this.currentController.$routerCanReuse) {
                    result = this.currentController.$routerCanReuse(nextInstruction, this.currentInstruction);
                }
                else {
                    result = nextInstruction === this.currentInstruction ||
                        angular.equals(nextInstruction.params, this.currentInstruction.params);
                }
                return $q.when(result);
            };
            Outlet.prototype.routerCanDeactivate = function (instruction) {
                if (this.currentController && this.currentController.$routerCanDeactivate) {
                    return $q.when(this.currentController.$routerCanDeactivate(instruction, this.currentInstruction));
                }
                return $q.when(true);
            };
            Outlet.prototype.deactivate = function (instruction) {
                if (this.currentController && this.currentController.$routerOnDeactivate) {
                    return $q.when(this.currentController.$routerOnDeactivate(instruction, this.currentInstruction));
                }
                return $q.when();
            };
            Outlet.prototype.activate = function (instruction) {
                var _this = this;
                this.previousInstruction = this.currentInstruction;
                this.currentInstruction = instruction;
                var componentName = this.controller.$$componentName = instruction.componentType;
                if (typeof componentName !== 'string') {
                    throw new Error('Component is not a string for ' + instruction.urlPath);
                }
                this.controller.$$template = '<' + dashCase(componentName) + ' $router="::$$router"></' +
                    dashCase(componentName) + '>';
                this.controller.$$router = this.router.childRouter(instruction.componentType);
                this.controller.$$outlet = this;
                var newScope = scope.$new();
                newScope.$$router = this.controller.$$router;
                this.deferredActivation = $q.defer();
                var clone = $transclude(newScope, function (clone) {
                    $animate.enter(clone, null, _this.currentElement || element);
                    _this.cleanupLastView();
                });
                this.currentElement = clone;
                this.currentScope = newScope;
                return this.deferredActivation.promise;
            };
            return Outlet;
        })();
        var parentCtrl = ctrls[0], myCtrl = ctrls[1], router = (parentCtrl && parentCtrl.$$router) || rootRouter;
        myCtrl.$$currentComponent = null;
        router.registerPrimaryOutlet(new Outlet(myCtrl, router));
    }
}
/**
 * This directive is responsible for compiling the contents of ng-outlet
 */
function ngOutletFillContentDirective($compile) {
    return {
        restrict: 'EA',
        priority: -400,
        require: 'ngOutlet',
        link: function (scope, element, attrs, ctrl) {
            var template = ctrl.$$template;
            element.html(template);
            $compile(element.contents())(scope);
        }
    };
}
function routerTriggerDirective($q) {
    return {
        require: '^ngOutlet',
        priority: -1000,
        link: function (scope, element, attr, ngOutletCtrl) {
            var promise = $q.when();
            var outlet = ngOutletCtrl.$$outlet;
            var currentComponent = outlet.currentController =
                element.controller(ngOutletCtrl.$$componentName);
            if (currentComponent.$routerOnActivate) {
                promise = $q.when(currentComponent.$routerOnActivate(outlet.currentInstruction, outlet.previousInstruction));
            }
            promise.then(outlet.deferredActivation.resolve, outlet.deferredActivation.reject);
        }
    };
}
/**
 * @name ngLink
 * @description
 * Lets you link to different parts of the app, and automatically generates hrefs.
 *
 * ## Use
 * The directive uses a simple syntax: `ng-link="componentName({ param: paramValue })"`
 *
 * ### Example
 *
 * ```js
 * angular.module('myApp', ['ngComponentRouter'])
 *   .controller('AppController', ['$rootRouter', function($rootRouter) {
 *     $rootRouter.config({ path: '/user/:id', component: 'user' });
 *     this.user = { name: 'Brian', id: 123 };
 *   });
 * ```
 *
 * ```html
 * <div ng-controller="AppController as app">
 *   <a ng-link="user({id: app.user.id})">{{app.user.name}}</a>
 * </div>
 * ```
 */
function ngLinkDirective($rootRouter, $parse) {
    return { require: '?^^ngOutlet', restrict: 'A', link: ngLinkDirectiveLinkFn };
    function ngLinkDirectiveLinkFn(scope, element, attrs, ctrl) {
        var router = (ctrl && ctrl.$$router) || $rootRouter;
        if (!router) {
            return;
        }
        var instruction = null;
        var link = attrs.ngLink || '';
        function getLink(params) {
            instruction = router.generate(params);
            return './' + angular.stringifyInstruction(instruction);
        }
        var routeParamsGetter = $parse(link);
        // we can avoid adding a watcher if it's a literal
        if (routeParamsGetter.constant) {
            var params = routeParamsGetter();
            element.attr('href', getLink(params));
        }
        else {
            scope.$watch(function () { return routeParamsGetter(scope); }, function (params) { return element.attr('href', getLink(params)); }, true);
        }
        element.on('click', function (event) {
            if (event.which !== 1 || !instruction) {
                return;
            }
            $rootRouter.navigateByInstruction(instruction);
            event.preventDefault();
        });
    }
}
function dashCase(str) {
    return str.replace(/[A-Z]/g, function (match) { return '-' + match.toLowerCase(); });
}
/*
 * A module for adding new a routing system Angular 1.
 */
angular.module('ngComponentRouter', [])
    .directive('ngOutlet', ['$animate', '$q', '$rootRouter', ngOutletDirective])
    .directive('ngOutlet', ['$compile', ngOutletFillContentDirective])
    .directive('ngLink', ['$rootRouter', '$parse', ngLinkDirective])
    .directive('$router', ['$q', routerTriggerDirective]);
/*
 * A module for inspecting controller constructors
 */
angular.module('ng')
    .provider('$$directiveIntrospector', DirectiveIntrospectorProvider)
    .config(['$compileProvider', '$$directiveIntrospectorProvider', compilerProviderDecorator]);

angular.module('ngComponentRouter').
    value('$route', null). // can be overloaded with ngRouteShim
    // Because Angular 1 has no notion of a root component, we use an object with unique identity
    // to represent this. Can be overloaded with a component name
    value('$routerRootComponent', new Object()).
    factory('$rootRouter', ['$q', '$location', '$$directiveIntrospector', '$browser', '$rootScope', '$injector', '$routerRootComponent', routerFactory]);

function routerFactory($q, $location, $$directiveIntrospector, $browser, $rootScope, $injector, $routerRootComponent) {

  // When this file is processed, the line below is replaced with
  // the contents of `../lib/facades.es5`.
  function CONST() {
  return (function(target) {
    return target;
  });
}

function CONST_EXPR(expr) {
  return expr;
}

function isPresent (x) {
  return !!x;
}

function isBlank (x) {
  return !x;
}

function isString(obj) {
  return typeof obj === 'string';
}

function isType (x) {
  return typeof x === 'function';
}

function isStringMap(obj) {
  return typeof obj === 'object' && obj !== null;
}

function isArray(obj) {
  return Array.isArray(obj);
}

function getTypeNameForDebugging (fn) {
  return fn.name || 'Root';
}

var PromiseWrapper = {
  resolve: function (reason) {
    return $q.when(reason);
  },

  reject: function (reason) {
    return $q.reject(reason);
  },

  catchError: function (promise, fn) {
    return promise.then(null, fn);
  },
  all: function (promises) {
    return $q.all(promises);
  }
};

var RegExpWrapper = {
  create: function(regExpStr, flags) {
    flags = flags ? flags.replace(/g/g, '') : '';
    return new RegExp(regExpStr, flags + 'g');
  },
  firstMatch: function(regExp, input) {
    regExp.lastIndex = 0;
    return regExp.exec(input);
  },
  matcher: function (regExp, input) {
    regExp.lastIndex = 0;
    return { re: regExp, input: input };
  }
};

var reflector = {
  annotations: function (fn) {
    //TODO: implement me
    return fn.annotations || [];
  }
};

var MapWrapper = {
  create: function() {
    return new Map();
  },

  get: function(m, k) {
    return m.get(k);
  },

  set: function(m, k, v) {
    return m.set(k, v);
  },

  contains: function (m, k) {
    return m.has(k);
  },

  forEach: function (m, fn) {
    return m.forEach(fn);
  }
};

var StringMapWrapper = {
  create: function () {
    return {};
  },

  set: function (m, k, v) {
    return m[k] = v;
  },

  get: function (m, k) {
    return m.hasOwnProperty(k) ? m[k] : undefined;
  },

  contains: function (m, k) {
    return m.hasOwnProperty(k);
  },

  keys: function(map) {
    return Object.keys(map);
  },

  isEmpty: function(map) {
    for (var prop in map) {
      if (map.hasOwnProperty(prop)) {
        return false;
      }
    }
    return true;
  },

  delete: function(map, key) {
    delete map[key];
  },

  forEach: function (m, fn) {
    for (var prop in m) {
      if (m.hasOwnProperty(prop)) {
        fn(m[prop], prop);
      }
    }
  },

  equals: function (m1, m2) {
    var k1 = Object.keys(m1);
    var k2 = Object.keys(m2);
    if (k1.length != k2.length) {
      return false;
    }
    var key;
    for (var i = 0; i < k1.length; i++) {
      key = k1[i];
      if (m1[key] !== m2[key]) {
        return false;
      }
    }
    return true;
  },

  merge: function(m1, m2) {
    var m = {};
    for (var attr in m1) {
      if (m1.hasOwnProperty(attr)) {
        m[attr] = m1[attr];
      }
    }
    for (var attr in m2) {
      if (m2.hasOwnProperty(attr)) {
        m[attr] = m2[attr];
      }
    }
    return m;
  }
};

var List = Array;
var ListWrapper = {
  toJSON: function(l) {
    return JSON.stringify(l);
  },

  clear: function (l) {
    l.length = 0;
  },

  create: function () {
    return [];
  },

  push: function (l, v) {
    return l.push(v);
  },

  forEach: function (l, fn) {
    return l.forEach(fn);
  },

  first: function(array) {
    if (!array)
      return null;
    return array[0];
  },

  last: function(array) {
    return (array && array.length) > 0 ? array[array.length - 1] : null;
  },

  map: function (l, fn) {
    return l.map(fn);
  },

  join: function (l, str) {
    return l.join(str);
  },

  reduce: function(list, fn, init) {
    return list.reduce(fn, init);
  },

  filter: function(array, pred) {
    return array.filter(pred);
  },

  concat: function(a, b) {
    return a.concat(b);
  },

  slice: function(l) {
    var from = arguments[1] !== (void 0) ? arguments[1] : 0;
    var to = arguments[2] !== (void 0) ? arguments[2] : null;
    return l.slice(from, to === null ? undefined : to);
  },

  maximum: function(list, predicate) {
    if (list.length == 0) {
      return null;
    }
    var solution = null;
    var maxValue = -Infinity;
    for (var index = 0; index < list.length; index++) {
      var candidate = list[index];
      if (isBlank(candidate)) {
        continue;
      }
      var candidateValue = predicate(candidate);
      if (candidateValue > maxValue) {
        solution = candidate;
        maxValue = candidateValue;
      }
    }
    return solution;
  }
};

var StringWrapper = {
  charCodeAt: function(s, i) {
    return s.charCodeAt(i);
  },

  equals: function (s1, s2) {
    return s1 === s2;
  },

  split: function(s, re) {
    return s.split(re);
  },

  replaceAll: function(s, from, replace) {
    return s.replace(from, replace);
  },

  replaceAllMapped: function(s, from, cb) {
    return s.replace(from, function(matches) {
      // Remove offset & string from the result array
      matches.splice(-2, 2);
      // The callback receives match, p1, ..., pn
      return cb.apply(null, matches);
    });
  },

  contains: function(s, substr) {
    return s.indexOf(substr) != -1;
  }

};

//TODO: implement?
// I think it's too heavy to ask 1.x users to bring in Rx for the router...
function EventEmitter() {}

var BaseException = Error;

var ObservableWrapper = {
  callNext: function(ob, val) {
    ob.fn(val);
  },
  callEmit: function(ob, val) {
    ob.fn(val);
  },

  subscribe: function(ob, fn) {
    ob.fn = fn;
  }
};

// TODO: https://github.com/angular/angular.js/blob/master/src/ng/browser.js#L227-L265
var $__router_47_location__ = {
  Location: Location
};

function Location(){}
Location.prototype.subscribe = function () {
  //TODO: implement
};
Location.prototype.path = function () {
  return $location.url();
};
Location.prototype.go = function (path, query) {
  return $location.url(path + query);
};


  var exports = {
    Injectable: function () {},
    OpaqueToken: function () {},
    Inject: function () {}
  };
  var require = function () {return exports;};

  // When this file is processed, the line below is replaced with
  // the contents of the compiled TypeScript classes.
  var TouchMap = (function () {
    function TouchMap(map) {
        var _this = this;
        this.map = {};
        this.keys = {};
        if (isPresent(map)) {
            StringMapWrapper.forEach(map, function (value, key) {
                _this.map[key] = isPresent(value) ? value.toString() : null;
                _this.keys[key] = true;
            });
        }
    }
    TouchMap.prototype.get = function (key) {
        StringMapWrapper.delete(this.keys, key);
        return this.map[key];
    };
    TouchMap.prototype.getUnused = function () {
        var _this = this;
        var unused = {};
        var keys = StringMapWrapper.keys(this.keys);
        keys.forEach(function (key) { return unused[key] = StringMapWrapper.get(_this.map, key); });
        return unused;
    };
    return TouchMap;
})();
exports.TouchMap = TouchMap;
function normalizeString(obj) {
    if (isBlank(obj)) {
        return null;
    }
    else {
        return obj.toString();
    }
}
exports.normalizeString = normalizeString;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
function convertUrlParamsToArray(urlParams) {
    var paramsArray = [];
    if (isBlank(urlParams)) {
        return [];
    }
    StringMapWrapper.forEach(urlParams, function (value, key) { paramsArray.push((value === true) ? key : key + '=' + value); });
    return paramsArray;
}
exports.convertUrlParamsToArray = convertUrlParamsToArray;
// Convert an object of url parameters into a string that can be used in an URL
function serializeParams(urlParams, joiner) {
    if (joiner === void 0) { joiner = '&'; }
    return convertUrlParamsToArray(urlParams).join(joiner);
}
exports.serializeParams = serializeParams;
/**
 * This class represents a parsed URL
 */
var Url = (function () {
    function Url(path, child, auxiliary, params) {
        if (child === void 0) { child = null; }
        if (auxiliary === void 0) { auxiliary = CONST_EXPR([]); }
        if (params === void 0) { params = CONST_EXPR({}); }
        this.path = path;
        this.child = child;
        this.auxiliary = auxiliary;
        this.params = params;
    }
    Url.prototype.toString = function () {
        return this.path + this._matrixParamsToString() + this._auxToString() + this._childString();
    };
    Url.prototype.segmentToString = function () { return this.path + this._matrixParamsToString(); };
    /** @internal */
    Url.prototype._auxToString = function () {
        return this.auxiliary.length > 0 ?
            ('(' + this.auxiliary.map(function (sibling) { return sibling.toString(); }).join('//') + ')') :
            '';
    };
    Url.prototype._matrixParamsToString = function () {
        var paramString = serializeParams(this.params, ';');
        if (paramString.length > 0) {
            return ';' + paramString;
        }
        return '';
    };
    /** @internal */
    Url.prototype._childString = function () { return isPresent(this.child) ? ('/' + this.child.toString()) : ''; };
    return Url;
})();
exports.Url = Url;
var RootUrl = (function (_super) {
    __extends(RootUrl, _super);
    function RootUrl(path, child, auxiliary, params) {
        if (child === void 0) { child = null; }
        if (auxiliary === void 0) { auxiliary = CONST_EXPR([]); }
        if (params === void 0) { params = null; }
        _super.call(this, path, child, auxiliary, params);
    }
    RootUrl.prototype.toString = function () {
        return this.path + this._auxToString() + this._childString() + this._queryParamsToString();
    };
    RootUrl.prototype.segmentToString = function () { return this.path + this._queryParamsToString(); };
    RootUrl.prototype._queryParamsToString = function () {
        if (isBlank(this.params)) {
            return '';
        }
        return '?' + serializeParams(this.params);
    };
    return RootUrl;
})(Url);
exports.RootUrl = RootUrl;
function pathSegmentsToUrl(pathSegments) {
    var url = new Url(pathSegments[pathSegments.length - 1]);
    for (var i = pathSegments.length - 2; i >= 0; i -= 1) {
        url = new Url(pathSegments[i], url);
    }
    return url;
}
exports.pathSegmentsToUrl = pathSegmentsToUrl;
var SEGMENT_RE = RegExpWrapper.create('^[^\\/\\(\\)\\?;=&#]+');
function matchUrlSegment(str) {
    var match = RegExpWrapper.firstMatch(SEGMENT_RE, str);
    return isPresent(match) ? match[0] : '';
}
var UrlParser = (function () {
    function UrlParser() {
    }
    UrlParser.prototype.peekStartsWith = function (str) { return this._remaining.startsWith(str); };
    UrlParser.prototype.capture = function (str) {
        if (!this._remaining.startsWith(str)) {
            throw new BaseException("Expected \"" + str + "\".");
        }
        this._remaining = this._remaining.substring(str.length);
    };
    UrlParser.prototype.parse = function (url) {
        this._remaining = url;
        if (url == '' || url == '/') {
            return new Url('');
        }
        return this.parseRoot();
    };
    // segment + (aux segments) + (query params)
    UrlParser.prototype.parseRoot = function () {
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        if (this.peekStartsWith(';')) {
            // TODO: should these params just be dropped?
            this.parseMatrixParams();
        }
        var child = null;
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            child = this.parseSegment();
        }
        var queryParams = null;
        if (this.peekStartsWith('?')) {
            queryParams = this.parseQueryParams();
        }
        return new RootUrl(path, child, aux, queryParams);
    };
    // segment + (matrix params) + (aux segments)
    UrlParser.prototype.parseSegment = function () {
        if (this._remaining.length == 0) {
            return null;
        }
        if (this.peekStartsWith('/')) {
            this.capture('/');
        }
        var path = matchUrlSegment(this._remaining);
        this.capture(path);
        var matrixParams = null;
        if (this.peekStartsWith(';')) {
            matrixParams = this.parseMatrixParams();
        }
        var aux = [];
        if (this.peekStartsWith('(')) {
            aux = this.parseAuxiliaryRoutes();
        }
        var child = null;
        if (this.peekStartsWith('/') && !this.peekStartsWith('//')) {
            this.capture('/');
            child = this.parseSegment();
        }
        return new Url(path, child, aux, matrixParams);
    };
    UrlParser.prototype.parseQueryParams = function () {
        var params = {};
        this.capture('?');
        this.parseParam(params);
        while (this._remaining.length > 0 && this.peekStartsWith('&')) {
            this.capture('&');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseMatrixParams = function () {
        var params = {};
        while (this._remaining.length > 0 && this.peekStartsWith(';')) {
            this.capture(';');
            this.parseParam(params);
        }
        return params;
    };
    UrlParser.prototype.parseParam = function (params) {
        var key = matchUrlSegment(this._remaining);
        if (isBlank(key)) {
            return;
        }
        this.capture(key);
        var value = true;
        if (this.peekStartsWith('=')) {
            this.capture('=');
            var valueMatch = matchUrlSegment(this._remaining);
            if (isPresent(valueMatch)) {
                value = valueMatch;
                this.capture(value);
            }
        }
        params[key] = value;
    };
    UrlParser.prototype.parseAuxiliaryRoutes = function () {
        var routes = [];
        this.capture('(');
        while (!this.peekStartsWith(')') && this._remaining.length > 0) {
            routes.push(this.parseSegment());
            if (this.peekStartsWith('//')) {
                this.capture('//');
            }
        }
        this.capture(')');
        return routes;
    };
    return UrlParser;
})();
exports.UrlParser = UrlParser;
exports.parser = new UrlParser();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RouteLifecycleHook = (function () {
    function RouteLifecycleHook(name) {
        this.name = name;
    }
    RouteLifecycleHook = __decorate([
        CONST()
    ], RouteLifecycleHook);
    return RouteLifecycleHook;
})();
exports.RouteLifecycleHook = RouteLifecycleHook;
var CanActivate = (function () {
    function CanActivate(fn) {
        this.fn = fn;
    }
    CanActivate = __decorate([
        CONST()
    ], CanActivate);
    return CanActivate;
})();
exports.CanActivate = CanActivate;
exports.routerCanReuse = CONST_EXPR(new RouteLifecycleHook("routerCanReuse"));
exports.routerCanDeactivate = CONST_EXPR(new RouteLifecycleHook("routerCanDeactivate"));
exports.routerOnActivate = CONST_EXPR(new RouteLifecycleHook("routerOnActivate"));
exports.routerOnReuse = CONST_EXPR(new RouteLifecycleHook("routerOnReuse"));
exports.routerOnDeactivate = CONST_EXPR(new RouteLifecycleHook("routerOnDeactivate"));
var lifecycle_annotations_impl_1 = require('./lifecycle_annotations_impl');
function hasLifecycleHook(e, type) {
    if (!(type instanceof Type))
        return false;
    return e.name in type.prototype;
}
exports.hasLifecycleHook = hasLifecycleHook;
function getCanActivateHook(type) {
    var annotations = reflector.annotations(type);
    for (var i = 0; i < annotations.length; i += 1) {
        var annotation = annotations[i];
        if (annotation instanceof lifecycle_annotations_impl_1.CanActivate) {
            return annotation.fn;
        }
    }
    return null;
}
exports.getCanActivateHook = getCanActivateHook;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var route_definition_1 = require('../route_definition');
exports.RouteDefinition = route_definition_1.RouteDefinition;
/**
 * The `RouteConfig` decorator defines routes for a given component.
 *
 * It takes an array of {@link RouteDefinition}s.
 */
var RouteConfig = (function () {
    function RouteConfig(configs) {
        this.configs = configs;
    }
    RouteConfig = __decorate([
        CONST()
    ], RouteConfig);
    return RouteConfig;
})();
exports.RouteConfig = RouteConfig;
var AbstractRoute = (function () {
    function AbstractRoute(_a) {
        var name = _a.name, useAsDefault = _a.useAsDefault, path = _a.path, regex = _a.regex, serializer = _a.serializer, data = _a.data;
        this.name = name;
        this.useAsDefault = useAsDefault;
        this.path = path;
        this.regex = regex;
        this.serializer = serializer;
        this.data = data;
    }
    AbstractRoute = __decorate([
        CONST()
    ], AbstractRoute);
    return AbstractRoute;
})();
exports.AbstractRoute = AbstractRoute;
/**
 * `Route` is a type of {@link RouteDefinition} used to route a path to a component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `component` a component type.
 * - `name` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via {@link RouteData}.
 * - `useAsDefault` is a boolean value. If `true`, the child route will be navigated to if no child
 * route is specified during the navigation.
 *
 * ### Example
 * ```
 * import {RouteConfig, Route} from 'angular2/router';
 *
 * @RouteConfig([
 *   new Route({path: '/home', component: HomeCmp, name: 'HomeCmp' })
 * ])
 * class MyApp {}
 * ```
 */
var Route = (function (_super) {
    __extends(Route, _super);
    function Route(_a) {
        var name = _a.name, useAsDefault = _a.useAsDefault, path = _a.path, regex = _a.regex, serializer = _a.serializer, data = _a.data, component = _a.component;
        _super.call(this, {
            name: name,
            useAsDefault: useAsDefault,
            path: path,
            regex: regex,
            serializer: serializer,
            data: data
        });
        this.aux = null;
        this.component = component;
    }
    Route = __decorate([
        CONST()
    ], Route);
    return Route;
})(AbstractRoute);
exports.Route = Route;
/**
 * `AuxRoute` is a type of {@link RouteDefinition} used to define an auxiliary route.
 *
 * It takes an object with the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `component` a component type.
 * - `name` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via {@link RouteData}.
 *
 * ### Example
 * ```
 * import {RouteConfig, AuxRoute} from 'angular2/router';
 *
 * @RouteConfig([
 *   new AuxRoute({path: '/home', component: HomeCmp})
 * ])
 * class MyApp {}
 * ```
 */
var AuxRoute = (function (_super) {
    __extends(AuxRoute, _super);
    function AuxRoute(_a) {
        var name = _a.name, useAsDefault = _a.useAsDefault, path = _a.path, regex = _a.regex, serializer = _a.serializer, data = _a.data, component = _a.component;
        _super.call(this, {
            name: name,
            useAsDefault: useAsDefault,
            path: path,
            regex: regex,
            serializer: serializer,
            data: data
        });
        this.component = component;
    }
    AuxRoute = __decorate([
        CONST()
    ], AuxRoute);
    return AuxRoute;
})(AbstractRoute);
exports.AuxRoute = AuxRoute;
/**
 * `AsyncRoute` is a type of {@link RouteDefinition} used to route a path to an asynchronously
 * loaded component.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `loader` is a function that returns a promise that resolves to a component.
 * - `name` is an optional `CamelCase` string representing the name of the route.
 * - `data` is an optional property of any type representing arbitrary route metadata for the given
 * route. It is injectable via {@link RouteData}.
 * - `useAsDefault` is a boolean value. If `true`, the child route will be navigated to if no child
 * route is specified during the navigation.
 *
 * ### Example
 * ```
 * import {RouteConfig, AsyncRoute} from 'angular2/router';
 *
 * @RouteConfig([
 *   new AsyncRoute({path: '/home', loader: () => Promise.resolve(MyLoadedCmp), name:
 * 'MyLoadedCmp'})
 * ])
 * class MyApp {}
 * ```
 */
var AsyncRoute = (function (_super) {
    __extends(AsyncRoute, _super);
    function AsyncRoute(_a) {
        var name = _a.name, useAsDefault = _a.useAsDefault, path = _a.path, regex = _a.regex, serializer = _a.serializer, data = _a.data, loader = _a.loader;
        _super.call(this, {
            name: name,
            useAsDefault: useAsDefault,
            path: path,
            regex: regex,
            serializer: serializer,
            data: data
        });
        this.aux = null;
        this.loader = loader;
    }
    AsyncRoute = __decorate([
        CONST()
    ], AsyncRoute);
    return AsyncRoute;
})(AbstractRoute);
exports.AsyncRoute = AsyncRoute;
/**
 * `Redirect` is a type of {@link RouteDefinition} used to route a path to a canonical route.
 *
 * It has the following properties:
 * - `path` is a string that uses the route matcher DSL.
 * - `redirectTo` is an array representing the link DSL.
 *
 * Note that redirects **do not** affect how links are generated. For that, see the `useAsDefault`
 * option.
 *
 * ### Example
 * ```
 * import {RouteConfig, Route, Redirect} from 'angular2/router';
 *
 * @RouteConfig([
 *   new Redirect({path: '/', redirectTo: ['/Home'] }),
 *   new Route({path: '/home', component: HomeCmp, name: 'Home'})
 * ])
 * class MyApp {}
 * ```
 */
var Redirect = (function (_super) {
    __extends(Redirect, _super);
    function Redirect(_a) {
        var name = _a.name, useAsDefault = _a.useAsDefault, path = _a.path, regex = _a.regex, serializer = _a.serializer, data = _a.data, redirectTo = _a.redirectTo;
        _super.call(this, {
            name: name,
            useAsDefault: useAsDefault,
            path: path,
            regex: regex,
            serializer: serializer,
            data: data
        });
        this.redirectTo = redirectTo;
    }
    Redirect = __decorate([
        CONST()
    ], Redirect);
    return Redirect;
})(AbstractRoute);
exports.Redirect = Redirect;
var route_config_decorator_1 = require('./route_config_decorator');
/**
 * Given a JS Object that represents a route config, returns a corresponding Route, AsyncRoute,
 * AuxRoute or Redirect object.
 *
 * Also wraps an AsyncRoute's loader function to add the loaded component's route config to the
 * `RouteRegistry`.
 */
function normalizeRouteConfig(config, registry) {
    if (config instanceof route_config_decorator_1.AsyncRoute) {
        var wrappedLoader = wrapLoaderToReconfigureRegistry(config.loader, registry);
        return new route_config_decorator_1.AsyncRoute({
            path: config.path,
            loader: wrappedLoader,
            name: config.name,
            data: config.data,
            useAsDefault: config.useAsDefault
        });
    }
    if (config instanceof route_config_decorator_1.Route || config instanceof route_config_decorator_1.Redirect || config instanceof route_config_decorator_1.AuxRoute) {
        return config;
    }
    if ((+!!config.component) + (+!!config.redirectTo) + (+!!config.loader) != 1) {
        throw new BaseException("Route config should contain exactly one \"component\", \"loader\", or \"redirectTo\" property.");
    }
    if (config.as && config.name) {
        throw new BaseException("Route config should contain exactly one \"as\" or \"name\" property.");
    }
    if (config.as) {
        config.name = config.as;
    }
    if (config.loader) {
        var wrappedLoader = wrapLoaderToReconfigureRegistry(config.loader, registry);
        return new route_config_decorator_1.AsyncRoute({
            path: config.path,
            loader: wrappedLoader,
            name: config.name,
            data: config.data,
            useAsDefault: config.useAsDefault
        });
    }
    if (config.aux) {
        return new route_config_decorator_1.AuxRoute({ path: config.aux, component: config.component, name: config.name });
    }
    if (config.component) {
        if (typeof config.component == 'object') {
            var componentDefinitionObject = config.component;
            if (componentDefinitionObject.type == 'constructor') {
                return new route_config_decorator_1.Route({
                    path: config.path,
                    component: componentDefinitionObject.constructor,
                    name: config.name,
                    data: config.data,
                    useAsDefault: config.useAsDefault
                });
            }
            else if (componentDefinitionObject.type == 'loader') {
                return new route_config_decorator_1.AsyncRoute({
                    path: config.path,
                    loader: componentDefinitionObject.loader,
                    name: config.name,
                    data: config.data,
                    useAsDefault: config.useAsDefault
                });
            }
            else {
                throw new BaseException("Invalid component type \"" + componentDefinitionObject.type + "\". Valid types are \"constructor\" and \"loader\".");
            }
        }
        return new route_config_decorator_1.Route(config);
    }
    if (config.redirectTo) {
        return new route_config_decorator_1.Redirect({ path: config.path, redirectTo: config.redirectTo });
    }
    return config;
}
exports.normalizeRouteConfig = normalizeRouteConfig;
function wrapLoaderToReconfigureRegistry(loader, registry) {
    return function () {
        return loader().then(function (componentType) {
            registry.configFromComponent(componentType);
            return componentType;
        });
    };
}
function assertComponentExists(component, path) {
    if (!isType(component)) {
        throw new BaseException("Component for route \"" + path + "\" is not defined, or is not a class.");
    }
}
exports.assertComponentExists = assertComponentExists;
var instruction_1 = require('../../instruction');
var AsyncRouteHandler = (function () {
    function AsyncRouteHandler(_loader, data) {
        if (data === void 0) { data = null; }
        this._loader = _loader;
        /** @internal */
        this._resolvedComponent = null;
        this.data = isPresent(data) ? new instruction_1.RouteData(data) : instruction_1.BLANK_ROUTE_DATA;
    }
    AsyncRouteHandler.prototype.resolveComponentType = function () {
        var _this = this;
        if (isPresent(this._resolvedComponent)) {
            return this._resolvedComponent;
        }
        return this._resolvedComponent = this._loader().then(function (componentType) {
            _this.componentType = componentType;
            return componentType;
        });
    };
    return AsyncRouteHandler;
})();
exports.AsyncRouteHandler = AsyncRouteHandler;
var instruction_1 = require('../../instruction');
var SyncRouteHandler = (function () {
    function SyncRouteHandler(componentType, data) {
        this.componentType = componentType;
        /** @internal */
        this._resolvedComponent = null;
        this._resolvedComponent = PromiseWrapper.resolve(componentType);
        this.data = isPresent(data) ? new instruction_1.RouteData(data) : instruction_1.BLANK_ROUTE_DATA;
    }
    SyncRouteHandler.prototype.resolveComponentType = function () { return this._resolvedComponent; };
    return SyncRouteHandler;
})();
exports.SyncRouteHandler = SyncRouteHandler;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var url_parser_1 = require('../url_parser');
var instruction_1 = require('../instruction');
// RouteMatch objects hold information about a match between a rule and a URL
var RouteMatch = (function () {
    function RouteMatch() {
    }
    return RouteMatch;
})();
exports.RouteMatch = RouteMatch;
var PathMatch = (function (_super) {
    __extends(PathMatch, _super);
    function PathMatch(instruction, remaining, remainingAux) {
        _super.call(this);
        this.instruction = instruction;
        this.remaining = remaining;
        this.remainingAux = remainingAux;
    }
    return PathMatch;
})(RouteMatch);
exports.PathMatch = PathMatch;
var RedirectMatch = (function (_super) {
    __extends(RedirectMatch, _super);
    function RedirectMatch(redirectTo, specificity) {
        _super.call(this);
        this.redirectTo = redirectTo;
        this.specificity = specificity;
    }
    return RedirectMatch;
})(RouteMatch);
exports.RedirectMatch = RedirectMatch;
var RedirectRule = (function () {
    function RedirectRule(_pathRecognizer, redirectTo) {
        this._pathRecognizer = _pathRecognizer;
        this.redirectTo = redirectTo;
        this.hash = this._pathRecognizer.hash;
    }
    Object.defineProperty(RedirectRule.prototype, "path", {
        get: function () { return this._pathRecognizer.toString(); },
        set: function (val) { throw new BaseException('you cannot set the path of a RedirectRule directly'); },
        enumerable: true,
        configurable: true
    });
    /**
     * Returns `null` or a `ParsedUrl` representing the new path to match
     */
    RedirectRule.prototype.recognize = function (beginningSegment) {
        var match = null;
        if (isPresent(this._pathRecognizer.matchUrl(beginningSegment))) {
            match = new RedirectMatch(this.redirectTo, this._pathRecognizer.specificity);
        }
        return PromiseWrapper.resolve(match);
    };
    RedirectRule.prototype.generate = function (params) {
        throw new BaseException("Tried to generate a redirect.");
    };
    return RedirectRule;
})();
exports.RedirectRule = RedirectRule;
// represents something like '/foo/:bar'
var RouteRule = (function () {
    // TODO: cache component instruction instances by params and by ParsedUrl instance
    function RouteRule(_routePath, handler) {
        this._routePath = _routePath;
        this.handler = handler;
        this._cache = new Map();
        this.specificity = this._routePath.specificity;
        this.hash = this._routePath.hash;
        this.terminal = this._routePath.terminal;
    }
    Object.defineProperty(RouteRule.prototype, "path", {
        get: function () { return this._routePath.toString(); },
        set: function (val) { throw new BaseException('you cannot set the path of a RouteRule directly'); },
        enumerable: true,
        configurable: true
    });
    RouteRule.prototype.recognize = function (beginningSegment) {
        var _this = this;
        var res = this._routePath.matchUrl(beginningSegment);
        if (isBlank(res)) {
            return null;
        }
        return this.handler.resolveComponentType().then(function (_) {
            var componentInstruction = _this._getInstruction(res.urlPath, res.urlParams, res.allParams);
            return new PathMatch(componentInstruction, res.rest, res.auxiliary);
        });
    };
    RouteRule.prototype.generate = function (params) {
        var generated = this._routePath.generateUrl(params);
        var urlPath = generated.urlPath;
        var urlParams = generated.urlParams;
        return this._getInstruction(urlPath, url_parser_1.convertUrlParamsToArray(urlParams), params);
    };
    RouteRule.prototype.generateComponentPathValues = function (params) {
        return this._routePath.generateUrl(params);
    };
    RouteRule.prototype._getInstruction = function (urlPath, urlParams, params) {
        if (isBlank(this.handler.componentType)) {
            throw new BaseException("Tried to get instruction before the type was loaded.");
        }
        var hashKey = urlPath + '?' + urlParams.join('&');
        if (this._cache.has(hashKey)) {
            return this._cache.get(hashKey);
        }
        var instruction = new instruction_1.ComponentInstruction(urlPath, urlParams, this.handler.data, this.handler.componentType, this.terminal, this.specificity, params);
        this._cache.set(hashKey, instruction);
        return instruction;
    };
    return RouteRule;
})();
exports.RouteRule = RouteRule;
var rules_1 = require('./rules');
var route_config_impl_1 = require('../route_config/route_config_impl');
var async_route_handler_1 = require('./route_handlers/async_route_handler');
var sync_route_handler_1 = require('./route_handlers/sync_route_handler');
var param_route_path_1 = require('./route_paths/param_route_path');
var regex_route_path_1 = require('./route_paths/regex_route_path');
/**
 * A `RuleSet` is responsible for recognizing routes for a particular component.
 * It is consumed by `RouteRegistry`, which knows how to recognize an entire hierarchy of
 * components.
 */
var RuleSet = (function () {
    function RuleSet() {
        this.rulesByName = new Map();
        // map from name to rule
        this.auxRulesByName = new Map();
        // map from starting path to rule
        this.auxRulesByPath = new Map();
        // TODO: optimize this into a trie
        this.rules = [];
        // the rule to use automatically when recognizing or generating from this rule set
        this.defaultRule = null;
    }
    /**
     * Configure additional rules in this rule set from a route definition
     * @returns {boolean} true if the config is terminal
     */
    RuleSet.prototype.config = function (config) {
        var handler;
        if (isPresent(config.name) && config.name[0].toUpperCase() != config.name[0]) {
            var suggestedName = config.name[0].toUpperCase() + config.name.substring(1);
            throw new BaseException("Route \"" + config.path + "\" with name \"" + config.name + "\" does not begin with an uppercase letter. Route names should be CamelCase like \"" + suggestedName + "\".");
        }
        if (config instanceof route_config_impl_1.AuxRoute) {
            handler = new sync_route_handler_1.SyncRouteHandler(config.component, config.data);
            var routePath_1 = this._getRoutePath(config);
            var auxRule = new rules_1.RouteRule(routePath_1, handler);
            this.auxRulesByPath.set(routePath_1.toString(), auxRule);
            if (isPresent(config.name)) {
                this.auxRulesByName.set(config.name, auxRule);
            }
            return auxRule.terminal;
        }
        var useAsDefault = false;
        if (config instanceof route_config_impl_1.Redirect) {
            var routePath_2 = this._getRoutePath(config);
            var redirector = new rules_1.RedirectRule(routePath_2, config.redirectTo);
            this._assertNoHashCollision(redirector.hash, config.path);
            this.rules.push(redirector);
            return true;
        }
        if (config instanceof route_config_impl_1.Route) {
            handler = new sync_route_handler_1.SyncRouteHandler(config.component, config.data);
            useAsDefault = isPresent(config.useAsDefault) && config.useAsDefault;
        }
        else if (config instanceof route_config_impl_1.AsyncRoute) {
            handler = new async_route_handler_1.AsyncRouteHandler(config.loader, config.data);
            useAsDefault = isPresent(config.useAsDefault) && config.useAsDefault;
        }
        var routePath = this._getRoutePath(config);
        var newRule = new rules_1.RouteRule(routePath, handler);
        this._assertNoHashCollision(newRule.hash, config.path);
        if (useAsDefault) {
            if (isPresent(this.defaultRule)) {
                throw new BaseException("Only one route can be default");
            }
            this.defaultRule = newRule;
        }
        this.rules.push(newRule);
        if (isPresent(config.name)) {
            this.rulesByName.set(config.name, newRule);
        }
        return newRule.terminal;
    };
    /**
     * Given a URL, returns a list of `RouteMatch`es, which are partial recognitions for some route.
     */
    RuleSet.prototype.recognize = function (urlParse) {
        var solutions = [];
        this.rules.forEach(function (routeRecognizer) {
            var pathMatch = routeRecognizer.recognize(urlParse);
            if (isPresent(pathMatch)) {
                solutions.push(pathMatch);
            }
        });
        // handle cases where we are routing just to an aux route
        if (solutions.length == 0 && isPresent(urlParse) && urlParse.auxiliary.length > 0) {
            return [PromiseWrapper.resolve(new rules_1.PathMatch(null, null, urlParse.auxiliary))];
        }
        return solutions;
    };
    RuleSet.prototype.recognizeAuxiliary = function (urlParse) {
        var routeRecognizer = this.auxRulesByPath.get(urlParse.path);
        if (isPresent(routeRecognizer)) {
            return [routeRecognizer.recognize(urlParse)];
        }
        return [PromiseWrapper.resolve(null)];
    };
    RuleSet.prototype.hasRoute = function (name) { return this.rulesByName.has(name); };
    RuleSet.prototype.componentLoaded = function (name) {
        return this.hasRoute(name) && isPresent(this.rulesByName.get(name).handler.componentType);
    };
    RuleSet.prototype.loadComponent = function (name) {
        return this.rulesByName.get(name).handler.resolveComponentType();
    };
    RuleSet.prototype.generate = function (name, params) {
        var rule = this.rulesByName.get(name);
        if (isBlank(rule)) {
            return null;
        }
        return rule.generate(params);
    };
    RuleSet.prototype.generateAuxiliary = function (name, params) {
        var rule = this.auxRulesByName.get(name);
        if (isBlank(rule)) {
            return null;
        }
        return rule.generate(params);
    };
    RuleSet.prototype._assertNoHashCollision = function (hash, path) {
        this.rules.forEach(function (rule) {
            if (hash == rule.hash) {
                throw new BaseException("Configuration '" + path + "' conflicts with existing route '" + rule.path + "'");
            }
        });
    };
    RuleSet.prototype._getRoutePath = function (config) {
        if (isPresent(config.regex)) {
            if (isFunction(config.serializer)) {
                return new regex_route_path_1.RegexRoutePath(config.regex, config.serializer);
            }
            else {
                throw new BaseException("Route provides a regex property, '" + config.regex + "', but no serializer property");
            }
        }
        if (isPresent(config.path)) {
            // Auxiliary routes do not have a slash at the start
            var path = (config instanceof route_config_impl_1.AuxRoute && config.path.startsWith('/')) ?
                config.path.substring(1) :
                config.path;
            return new param_route_path_1.ParamRoutePath(path);
        }
        throw new BaseException('Route must provide either a path or regex property');
    };
    return RuleSet;
})();
exports.RuleSet = RuleSet;
var MatchedUrl = (function () {
    function MatchedUrl(urlPath, urlParams, allParams, auxiliary, rest) {
        this.urlPath = urlPath;
        this.urlParams = urlParams;
        this.allParams = allParams;
        this.auxiliary = auxiliary;
        this.rest = rest;
    }
    return MatchedUrl;
})();
exports.MatchedUrl = MatchedUrl;
var GeneratedUrl = (function () {
    function GeneratedUrl(urlPath, urlParams) {
        this.urlPath = urlPath;
        this.urlParams = urlParams;
    }
    return GeneratedUrl;
})();
exports.GeneratedUrl = GeneratedUrl;
var utils_1 = require('../../utils');
var url_parser_1 = require('../../url_parser');
var route_path_1 = require('./route_path');
/**
 * Identified by a `...` URL segment. This indicates that the
 * Route will continue to be matched by child `Router`s.
 */
var ContinuationPathSegment = (function () {
    function ContinuationPathSegment() {
        this.name = '';
        this.specificity = '';
        this.hash = '...';
    }
    ContinuationPathSegment.prototype.generate = function (params) { return ''; };
    ContinuationPathSegment.prototype.match = function (path) { return true; };
    return ContinuationPathSegment;
})();
/**
 * Identified by a string not starting with a `:` or `*`.
 * Only matches the URL segments that equal the segment path
 */
var StaticPathSegment = (function () {
    function StaticPathSegment(path) {
        this.path = path;
        this.name = '';
        this.specificity = '2';
        this.hash = path;
    }
    StaticPathSegment.prototype.match = function (path) { return path == this.path; };
    StaticPathSegment.prototype.generate = function (params) { return this.path; };
    return StaticPathSegment;
})();
/**
 * Identified by a string starting with `:`. Indicates a segment
 * that can contain a value that will be extracted and provided to
 * a matching `Instruction`.
 */
var DynamicPathSegment = (function () {
    function DynamicPathSegment(name) {
        this.name = name;
        this.specificity = '1';
        this.hash = ':';
    }
    DynamicPathSegment.prototype.match = function (path) { return path.length > 0; };
    DynamicPathSegment.prototype.generate = function (params) {
        if (!StringMapWrapper.contains(params.map, this.name)) {
            throw new BaseException("Route generator for '" + this.name + "' was not included in parameters passed.");
        }
        return utils_1.normalizeString(params.get(this.name));
    };
    DynamicPathSegment.paramMatcher = /^:([^\/]+)$/g;
    return DynamicPathSegment;
})();
/**
 * Identified by a string starting with `*` Indicates that all the following
 * segments match this route and that the value of these segments should
 * be provided to a matching `Instruction`.
 */
var StarPathSegment = (function () {
    function StarPathSegment(name) {
        this.name = name;
        this.specificity = '0';
        this.hash = '*';
    }
    StarPathSegment.prototype.match = function (path) { return true; };
    StarPathSegment.prototype.generate = function (params) { return utils_1.normalizeString(params.get(this.name)); };
    StarPathSegment.wildcardMatcher = /^\*([^\/]+)$/g;
    return StarPathSegment;
})();
/**
 * Parses a URL string using a given matcher DSL, and generates URLs from param maps
 */
var ParamRoutePath = (function () {
    /**
     * Takes a string representing the matcher DSL
     */
    function ParamRoutePath(routePath) {
        this.routePath = routePath;
        this.terminal = true;
        this._assertValidPath(routePath);
        this._parsePathString(routePath);
        this.specificity = this._calculateSpecificity();
        this.hash = this._calculateHash();
        var lastSegment = this._segments[this._segments.length - 1];
        this.terminal = !(lastSegment instanceof ContinuationPathSegment);
    }
    ParamRoutePath.prototype.matchUrl = function (url) {
        var nextUrlSegment = url;
        var currentUrlSegment;
        var positionalParams = {};
        var captured = [];
        for (var i = 0; i < this._segments.length; i += 1) {
            var pathSegment = this._segments[i];
            currentUrlSegment = nextUrlSegment;
            if (pathSegment instanceof ContinuationPathSegment) {
                break;
            }
            if (isPresent(currentUrlSegment)) {
                // the star segment consumes all of the remaining URL, including matrix params
                if (pathSegment instanceof StarPathSegment) {
                    positionalParams[pathSegment.name] = currentUrlSegment.toString();
                    captured.push(currentUrlSegment.toString());
                    nextUrlSegment = null;
                    break;
                }
                captured.push(currentUrlSegment.path);
                if (pathSegment instanceof DynamicPathSegment) {
                    positionalParams[pathSegment.name] = currentUrlSegment.path;
                }
                else if (!pathSegment.match(currentUrlSegment.path)) {
                    return null;
                }
                nextUrlSegment = currentUrlSegment.child;
            }
            else if (!pathSegment.match('')) {
                return null;
            }
        }
        if (this.terminal && isPresent(nextUrlSegment)) {
            return null;
        }
        var urlPath = captured.join('/');
        var auxiliary = [];
        var urlParams = [];
        var allParams = positionalParams;
        if (isPresent(currentUrlSegment)) {
            // If this is the root component, read query params. Otherwise, read matrix params.
            var paramsSegment = url instanceof url_parser_1.RootUrl ? url : currentUrlSegment;
            if (isPresent(paramsSegment.params)) {
                allParams = StringMapWrapper.merge(paramsSegment.params, positionalParams);
                urlParams = url_parser_1.convertUrlParamsToArray(paramsSegment.params);
            }
            else {
                allParams = positionalParams;
            }
            auxiliary = currentUrlSegment.auxiliary;
        }
        return new route_path_1.MatchedUrl(urlPath, urlParams, allParams, auxiliary, nextUrlSegment);
    };
    ParamRoutePath.prototype.generateUrl = function (params) {
        var paramTokens = new utils_1.TouchMap(params);
        var path = [];
        for (var i = 0; i < this._segments.length; i++) {
            var segment = this._segments[i];
            if (!(segment instanceof ContinuationPathSegment)) {
                path.push(segment.generate(paramTokens));
            }
        }
        var urlPath = path.join('/');
        var nonPositionalParams = paramTokens.getUnused();
        var urlParams = nonPositionalParams;
        return new route_path_1.GeneratedUrl(urlPath, urlParams);
    };
    ParamRoutePath.prototype.toString = function () { return this.routePath; };
    ParamRoutePath.prototype._parsePathString = function (routePath) {
        // normalize route as not starting with a "/". Recognition will
        // also normalize.
        if (routePath.startsWith("/")) {
            routePath = routePath.substring(1);
        }
        var segmentStrings = routePath.split('/');
        this._segments = [];
        var limit = segmentStrings.length - 1;
        for (var i = 0; i <= limit; i++) {
            var segment = segmentStrings[i], match;
            if (isPresent(match = RegExpWrapper.firstMatch(DynamicPathSegment.paramMatcher, segment))) {
                this._segments.push(new DynamicPathSegment(match[1]));
            }
            else if (isPresent(match = RegExpWrapper.firstMatch(StarPathSegment.wildcardMatcher, segment))) {
                this._segments.push(new StarPathSegment(match[1]));
            }
            else if (segment == '...') {
                if (i < limit) {
                    throw new BaseException("Unexpected \"...\" before the end of the path for \"" + routePath + "\".");
                }
                this._segments.push(new ContinuationPathSegment());
            }
            else {
                this._segments.push(new StaticPathSegment(segment));
            }
        }
    };
    ParamRoutePath.prototype._calculateSpecificity = function () {
        // The "specificity" of a path is used to determine which route is used when multiple routes
        // match
        // a URL. Static segments (like "/foo") are the most specific, followed by dynamic segments
        // (like
        // "/:id"). Star segments add no specificity. Segments at the start of the path are more
        // specific
        // than proceeding ones.
        //
        // The code below uses place values to combine the different types of segments into a single
        // string that we can sort later. Each static segment is marked as a specificity of "2," each
        // dynamic segment is worth "1" specificity, and stars are worth "0" specificity.
        var i, length = this._segments.length, specificity;
        if (length == 0) {
            // a single slash (or "empty segment" is as specific as a static segment
            specificity += '2';
        }
        else {
            specificity = '';
            for (i = 0; i < length; i++) {
                specificity += this._segments[i].specificity;
            }
        }
        return specificity;
    };
    ParamRoutePath.prototype._calculateHash = function () {
        // this function is used to determine whether a route config path like `/foo/:id` collides with
        // `/foo/:name`
        var i, length = this._segments.length;
        var hashParts = [];
        for (i = 0; i < length; i++) {
            hashParts.push(this._segments[i].hash);
        }
        return hashParts.join('/');
    };
    ParamRoutePath.prototype._assertValidPath = function (path) {
        if (StringWrapper.contains(path, '#')) {
            throw new BaseException("Path \"" + path + "\" should not include \"#\". Use \"HashLocationStrategy\" instead.");
        }
        var illegalCharacter = RegExpWrapper.firstMatch(ParamRoutePath.RESERVED_CHARS, path);
        if (isPresent(illegalCharacter)) {
            throw new BaseException("Path \"" + path + "\" contains \"" + illegalCharacter[0] + "\" which is not allowed in a route config.");
        }
    };
    ParamRoutePath.RESERVED_CHARS = RegExpWrapper.create('//|\\(|\\)|;|\\?|=');
    return ParamRoutePath;
})();
exports.ParamRoutePath = ParamRoutePath;
var route_path_1 = require('./route_path');
var RegexRoutePath = (function () {
    function RegexRoutePath(_reString, _serializer) {
        this._reString = _reString;
        this._serializer = _serializer;
        this.terminal = true;
        this.specificity = '2';
        this.hash = this._reString;
        this._regex = RegExpWrapper.create(this._reString);
    }
    RegexRoutePath.prototype.matchUrl = function (url) {
        var urlPath = url.toString();
        var params = {};
        var matcher = RegExpWrapper.matcher(this._regex, urlPath);
        var match = RegExpMatcherWrapper.next(matcher);
        if (isBlank(match)) {
            return null;
        }
        for (var i = 0; i < match.length; i += 1) {
            params[i.toString()] = match[i];
        }
        return new route_path_1.MatchedUrl(urlPath, [], params, [], null);
    };
    RegexRoutePath.prototype.generateUrl = function (params) { return this._serializer(params); };
    RegexRoutePath.prototype.toString = function () { return this._reString; };
    return RegexRoutePath;
})();
exports.RegexRoutePath = RegexRoutePath;
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
/**
 * `RouteParams` is an immutable map of parameters for the given route
 * based on the url matcher and optional parameters for that route.
 *
 * You can inject `RouteParams` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig, RouteParams} from
 * 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, name: 'UserCmp'},
 * ])
 * class AppCmp {}
 *
 * @Component({ template: 'user: {{id}}' })
 * class UserCmp {
 *   id: string;
 *   constructor(params: RouteParams) {
 *     this.id = params.get('id');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var RouteParams = (function () {
    function RouteParams(params) {
        this.params = params;
    }
    RouteParams.prototype.get = function (param) { return normalizeBlank(StringMapWrapper.get(this.params, param)); };
    return RouteParams;
})();
exports.RouteParams = RouteParams;
/**
 * `RouteData` is an immutable map of additional data you can configure in your {@link Route}.
 *
 * You can inject `RouteData` into the constructor of a component to use it.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig, RouteData} from
 * 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {path: '/user/:id', component: UserCmp, name: 'UserCmp', data: {isAdmin: true}},
 * ])
 * class AppCmp {}
 *
 * @Component({...})
 * @View({ template: 'user: {{isAdmin}}' })
 * class UserCmp {
 *   string: isAdmin;
 *   constructor(data: RouteData) {
 *     this.isAdmin = data.get('isAdmin');
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var RouteData = (function () {
    function RouteData(data) {
        if (data === void 0) { data = CONST_EXPR({}); }
        this.data = data;
    }
    RouteData.prototype.get = function (key) { return normalizeBlank(StringMapWrapper.get(this.data, key)); };
    return RouteData;
})();
exports.RouteData = RouteData;
exports.BLANK_ROUTE_DATA = new RouteData();
/**
 * `Instruction` is a tree of {@link ComponentInstruction}s with all the information needed
 * to transition each component in the app to a given route, including all auxiliary routes.
 *
 * `Instruction`s can be created using {@link Router#generate}, and can be used to
 * perform route changes with {@link Router#navigateByInstruction}.
 *
 * ### Example
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {bootstrap} from 'angular2/platform/browser';
 * import {Router, ROUTER_DIRECTIVES, ROUTER_PROVIDERS, RouteConfig} from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   constructor(router: Router) {
 *     var instruction = router.generate(['/MyRoute']);
 *     router.navigateByInstruction(instruction);
 *   }
 * }
 *
 * bootstrap(AppCmp, ROUTER_PROVIDERS);
 * ```
 */
var Instruction = (function () {
    function Instruction(component, child, auxInstruction) {
        this.component = component;
        this.child = child;
        this.auxInstruction = auxInstruction;
    }
    Object.defineProperty(Instruction.prototype, "urlPath", {
        get: function () { return isPresent(this.component) ? this.component.urlPath : ''; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "urlParams", {
        get: function () { return isPresent(this.component) ? this.component.urlParams : []; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Instruction.prototype, "specificity", {
        get: function () {
            var total = '';
            if (isPresent(this.component)) {
                total += this.component.specificity;
            }
            if (isPresent(this.child)) {
                total += this.child.specificity;
            }
            return total;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * converts the instruction into a URL string
     */
    Instruction.prototype.toRootUrl = function () { return this.toUrlPath() + this.toUrlQuery(); };
    /** @internal */
    Instruction.prototype._toNonRootUrl = function () {
        return this._stringifyPathMatrixAuxPrefixed() +
            (isPresent(this.child) ? this.child._toNonRootUrl() : '');
    };
    Instruction.prototype.toUrlQuery = function () { return this.urlParams.length > 0 ? ('?' + this.urlParams.join('&')) : ''; };
    /**
     * Returns a new instruction that shares the state of the existing instruction, but with
     * the given child {@link Instruction} replacing the existing child.
     */
    Instruction.prototype.replaceChild = function (child) {
        return new ResolvedInstruction(this.component, child, this.auxInstruction);
    };
    /**
     * If the final URL for the instruction is ``
     */
    Instruction.prototype.toUrlPath = function () {
        return this.urlPath + this._stringifyAux() +
            (isPresent(this.child) ? this.child._toNonRootUrl() : '');
    };
    // default instructions override these
    Instruction.prototype.toLinkUrl = function () {
        return this.urlPath + this._stringifyAux() +
            (isPresent(this.child) ? this.child._toLinkUrl() : '');
    };
    // this is the non-root version (called recursively)
    /** @internal */
    Instruction.prototype._toLinkUrl = function () {
        return this._stringifyPathMatrixAuxPrefixed() +
            (isPresent(this.child) ? this.child._toLinkUrl() : '');
    };
    /** @internal */
    Instruction.prototype._stringifyPathMatrixAuxPrefixed = function () {
        var primary = this._stringifyPathMatrixAux();
        if (primary.length > 0) {
            primary = '/' + primary;
        }
        return primary;
    };
    /** @internal */
    Instruction.prototype._stringifyMatrixParams = function () {
        return this.urlParams.length > 0 ? (';' + this.urlParams.join(';')) : '';
    };
    /** @internal */
    Instruction.prototype._stringifyPathMatrixAux = function () {
        if (isBlank(this.component)) {
            return '';
        }
        return this.urlPath + this._stringifyMatrixParams() + this._stringifyAux();
    };
    /** @internal */
    Instruction.prototype._stringifyAux = function () {
        var routes = [];
        StringMapWrapper.forEach(this.auxInstruction, function (auxInstruction, _) {
            routes.push(auxInstruction._stringifyPathMatrixAux());
        });
        if (routes.length > 0) {
            return '(' + routes.join('//') + ')';
        }
        return '';
    };
    return Instruction;
})();
exports.Instruction = Instruction;
/**
 * a resolved instruction has an outlet instruction for itself, but maybe not for...
 */
var ResolvedInstruction = (function (_super) {
    __extends(ResolvedInstruction, _super);
    function ResolvedInstruction(component, child, auxInstruction) {
        _super.call(this, component, child, auxInstruction);
    }
    ResolvedInstruction.prototype.resolveComponent = function () {
        return PromiseWrapper.resolve(this.component);
    };
    return ResolvedInstruction;
})(Instruction);
exports.ResolvedInstruction = ResolvedInstruction;
/**
 * Represents a resolved default route
 */
var DefaultInstruction = (function (_super) {
    __extends(DefaultInstruction, _super);
    function DefaultInstruction(component, child) {
        _super.call(this, component, child, {});
    }
    DefaultInstruction.prototype.toLinkUrl = function () { return ''; };
    /** @internal */
    DefaultInstruction.prototype._toLinkUrl = function () { return ''; };
    return DefaultInstruction;
})(ResolvedInstruction);
exports.DefaultInstruction = DefaultInstruction;
/**
 * Represents a component that may need to do some redirection or lazy loading at a later time.
 */
var UnresolvedInstruction = (function (_super) {
    __extends(UnresolvedInstruction, _super);
    function UnresolvedInstruction(_resolver, _urlPath, _urlParams) {
        if (_urlPath === void 0) { _urlPath = ''; }
        if (_urlParams === void 0) { _urlParams = CONST_EXPR([]); }
        _super.call(this, null, null, {});
        this._resolver = _resolver;
        this._urlPath = _urlPath;
        this._urlParams = _urlParams;
    }
    Object.defineProperty(UnresolvedInstruction.prototype, "urlPath", {
        get: function () {
            if (isPresent(this.component)) {
                return this.component.urlPath;
            }
            if (isPresent(this._urlPath)) {
                return this._urlPath;
            }
            return '';
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnresolvedInstruction.prototype, "urlParams", {
        get: function () {
            if (isPresent(this.component)) {
                return this.component.urlParams;
            }
            if (isPresent(this._urlParams)) {
                return this._urlParams;
            }
            return [];
        },
        enumerable: true,
        configurable: true
    });
    UnresolvedInstruction.prototype.resolveComponent = function () {
        var _this = this;
        if (isPresent(this.component)) {
            return PromiseWrapper.resolve(this.component);
        }
        return this._resolver().then(function (resolution) {
            _this.child = resolution.child;
            return _this.component = resolution.component;
        });
    };
    return UnresolvedInstruction;
})(Instruction);
exports.UnresolvedInstruction = UnresolvedInstruction;
var RedirectInstruction = (function (_super) {
    __extends(RedirectInstruction, _super);
    function RedirectInstruction(component, child, auxInstruction, _specificity) {
        _super.call(this, component, child, auxInstruction);
        this._specificity = _specificity;
    }
    Object.defineProperty(RedirectInstruction.prototype, "specificity", {
        get: function () { return this._specificity; },
        enumerable: true,
        configurable: true
    });
    return RedirectInstruction;
})(ResolvedInstruction);
exports.RedirectInstruction = RedirectInstruction;
/**
 * A `ComponentInstruction` represents the route state for a single component.
 *
 * `ComponentInstructions` is a public API. Instances of `ComponentInstruction` are passed
 * to route lifecycle hooks, like {@link CanActivate}.
 *
 * `ComponentInstruction`s are [hash consed](https://en.wikipedia.org/wiki/Hash_consing). You should
 * never construct one yourself with "new." Instead, rely on {@link Router/RouteRecognizer} to
 * construct `ComponentInstruction`s.
 *
 * You should not modify this object. It should be treated as immutable.
 */
var ComponentInstruction = (function () {
    /**
     * @internal
     */
    function ComponentInstruction(urlPath, urlParams, data, componentType, terminal, specificity, params) {
        if (params === void 0) { params = null; }
        this.urlPath = urlPath;
        this.urlParams = urlParams;
        this.componentType = componentType;
        this.terminal = terminal;
        this.specificity = specificity;
        this.params = params;
        this.reuse = false;
        this.routeData = isPresent(data) ? data : exports.BLANK_ROUTE_DATA;
    }
    return ComponentInstruction;
})();
exports.ComponentInstruction = ComponentInstruction;
var core_1 = require('angular2/core');
var route_config_impl_1 = require('./route_config/route_config_impl');
var rules_1 = require('./rules/rules');
var rule_set_1 = require('./rules/rule_set');
var instruction_1 = require('./instruction');
var route_config_normalizer_1 = require('./route_config/route_config_normalizer');
var url_parser_1 = require('./url_parser');
var _resolveToNull = PromiseWrapper.resolve(null);
// A LinkItemArray is an array, which describes a set of routes
// The items in the array are found in groups:
// - the first item is the name of the route
// - the next items are:
//   - an object containing parameters
//   - or an array describing an aux route
// export type LinkRouteItem = string | Object;
// export type LinkItem = LinkRouteItem | Array<LinkRouteItem>;
// export type LinkItemArray = Array<LinkItem>;
/**
 * Token used to bind the component with the top-level {@link RouteConfig}s for the
 * application.
 *
 * ### Example ([live demo](http://plnkr.co/edit/iRUP8B5OUbxCWQ3AcIDm))
 *
 * ```
 * import {Component} from 'angular2/core';
 * import {
 *   ROUTER_DIRECTIVES,
 *   ROUTER_PROVIDERS,
 *   RouteConfig
 * } from 'angular2/router';
 *
 * @Component({directives: [ROUTER_DIRECTIVES]})
 * @RouteConfig([
 *  {...},
 * ])
 * class AppCmp {
 *   // ...
 * }
 *
 * bootstrap(AppCmp, [ROUTER_PROVIDERS]);
 * ```
 */
exports.ROUTER_PRIMARY_COMPONENT = CONST_EXPR(new core_1.OpaqueToken('RouterPrimaryComponent'));
/**
 * The RouteRegistry holds route configurations for each component in an Angular app.
 * It is responsible for creating Instructions from URLs, and generating URLs based on route and
 * parameters.
 */
var RouteRegistry = (function () {
    function RouteRegistry(_rootComponent) {
        this._rootComponent = _rootComponent;
        this._rules = new Map();
    }
    /**
     * Given a component and a configuration object, add the route to this registry
     */
    RouteRegistry.prototype.config = function (parentComponent, config) {
        config = route_config_normalizer_1.normalizeRouteConfig(config, this);
        // this is here because Dart type guard reasons
        if (config instanceof route_config_impl_1.Route) {
            route_config_normalizer_1.assertComponentExists(config.component, config.path);
        }
        else if (config instanceof route_config_impl_1.AuxRoute) {
            route_config_normalizer_1.assertComponentExists(config.component, config.path);
        }
        var rules = this._rules.get(parentComponent);
        if (isBlank(rules)) {
            rules = new rule_set_1.RuleSet();
            this._rules.set(parentComponent, rules);
        }
        var terminal = rules.config(config);
        if (config instanceof route_config_impl_1.Route) {
            if (terminal) {
                assertTerminalComponent(config.component, config.path);
            }
            else {
                this.configFromComponent(config.component);
            }
        }
    };
    /**
     * Reads the annotations of a component and configures the registry based on them
     */
    RouteRegistry.prototype.configFromComponent = function (component) {
        var _this = this;
        if (!isType(component)) {
            return;
        }
        // Don't read the annotations from a type more than once –
        // this prevents an infinite loop if a component routes recursively.
        if (this._rules.has(component)) {
            return;
        }
        var annotations = reflector.annotations(component);
        if (isPresent(annotations)) {
            for (var i = 0; i < annotations.length; i++) {
                var annotation = annotations[i];
                if (annotation instanceof route_config_impl_1.RouteConfig) {
                    var routeCfgs = annotation.configs;
                    routeCfgs.forEach(function (config) { return _this.config(component, config); });
                }
            }
        }
    };
    /**
     * Given a URL and a parent component, return the most specific instruction for navigating
     * the application into the state specified by the url
     */
    RouteRegistry.prototype.recognize = function (url, ancestorInstructions) {
        var parsedUrl = url_parser_1.parser.parse(url);
        return this._recognize(parsedUrl, []);
    };
    /**
     * Recognizes all parent-child routes, but creates unresolved auxiliary routes
     */
    RouteRegistry.prototype._recognize = function (parsedUrl, ancestorInstructions, _aux) {
        var _this = this;
        if (_aux === void 0) { _aux = false; }
        var parentInstruction = ListWrapper.last(ancestorInstructions);
        var parentComponent = isPresent(parentInstruction) ? parentInstruction.component.componentType :
            this._rootComponent;
        var rules = this._rules.get(parentComponent);
        if (isBlank(rules)) {
            return _resolveToNull;
        }
        // Matches some beginning part of the given URL
        var possibleMatches = _aux ? rules.recognizeAuxiliary(parsedUrl) : rules.recognize(parsedUrl);
        var matchPromises = possibleMatches.map(function (candidate) { return candidate.then(function (candidate) {
            if (candidate instanceof rules_1.PathMatch) {
                var auxParentInstructions = ancestorInstructions.length > 0 ? [ListWrapper.last(ancestorInstructions)] : [];
                var auxInstructions = _this._auxRoutesToUnresolved(candidate.remainingAux, auxParentInstructions);
                var instruction = new instruction_1.ResolvedInstruction(candidate.instruction, null, auxInstructions);
                if (isBlank(candidate.instruction) || candidate.instruction.terminal) {
                    return instruction;
                }
                var newAncestorInstructions = ancestorInstructions.concat([instruction]);
                return _this._recognize(candidate.remaining, newAncestorInstructions)
                    .then(function (childInstruction) {
                    if (isBlank(childInstruction)) {
                        return null;
                    }
                    // redirect instructions are already absolute
                    if (childInstruction instanceof instruction_1.RedirectInstruction) {
                        return childInstruction;
                    }
                    instruction.child = childInstruction;
                    return instruction;
                });
            }
            if (candidate instanceof rules_1.RedirectMatch) {
                var instruction = _this.generate(candidate.redirectTo, ancestorInstructions.concat([null]));
                return new instruction_1.RedirectInstruction(instruction.component, instruction.child, instruction.auxInstruction, candidate.specificity);
            }
        }); });
        if ((isBlank(parsedUrl) || parsedUrl.path == '') && possibleMatches.length == 0) {
            return PromiseWrapper.resolve(this.generateDefault(parentComponent));
        }
        return PromiseWrapper.all(matchPromises).then(mostSpecific);
    };
    RouteRegistry.prototype._auxRoutesToUnresolved = function (auxRoutes, parentInstructions) {
        var _this = this;
        var unresolvedAuxInstructions = {};
        auxRoutes.forEach(function (auxUrl) {
            unresolvedAuxInstructions[auxUrl.path] = new instruction_1.UnresolvedInstruction(function () { return _this._recognize(auxUrl, parentInstructions, true); });
        });
        return unresolvedAuxInstructions;
    };
    /**
     * Given a normalized list with component names and params like: `['user', {id: 3 }]`
     * generates a url with a leading slash relative to the provided `parentComponent`.
     *
     * If the optional param `_aux` is `true`, then we generate starting at an auxiliary
     * route boundary.
     */
    RouteRegistry.prototype.generate = function (linkParams, ancestorInstructions, _aux) {
        if (_aux === void 0) { _aux = false; }
        var params = splitAndFlattenLinkParams(linkParams);
        var prevInstruction;
        // The first segment should be either '.' (generate from parent) or '' (generate from root).
        // When we normalize above, we strip all the slashes, './' becomes '.' and '/' becomes ''.
        if (ListWrapper.first(params) == '') {
            params.shift();
            prevInstruction = ListWrapper.first(ancestorInstructions);
            ancestorInstructions = [];
        }
        else {
            prevInstruction = ancestorInstructions.length > 0 ? ancestorInstructions.pop() : null;
            if (ListWrapper.first(params) == '.') {
                params.shift();
            }
            else if (ListWrapper.first(params) == '..') {
                while (ListWrapper.first(params) == '..') {
                    if (ancestorInstructions.length <= 0) {
                        throw new BaseException("Link \"" + ListWrapper.toJSON(linkParams) + "\" has too many \"../\" segments.");
                    }
                    prevInstruction = ancestorInstructions.pop();
                    params = ListWrapper.slice(params, 1);
                }
            }
            else {
                // we must only peak at the link param, and not consume it
                var routeName = ListWrapper.first(params);
                var parentComponentType = this._rootComponent;
                var grandparentComponentType = null;
                if (ancestorInstructions.length > 1) {
                    var parentComponentInstruction = ancestorInstructions[ancestorInstructions.length - 1];
                    var grandComponentInstruction = ancestorInstructions[ancestorInstructions.length - 2];
                    parentComponentType = parentComponentInstruction.component.componentType;
                    grandparentComponentType = grandComponentInstruction.component.componentType;
                }
                else if (ancestorInstructions.length == 1) {
                    parentComponentType = ancestorInstructions[0].component.componentType;
                    grandparentComponentType = this._rootComponent;
                }
                // For a link with no leading `./`, `/`, or `../`, we look for a sibling and child.
                // If both exist, we throw. Otherwise, we prefer whichever exists.
                var childRouteExists = this.hasRoute(routeName, parentComponentType);
                var parentRouteExists = isPresent(grandparentComponentType) &&
                    this.hasRoute(routeName, grandparentComponentType);
                if (parentRouteExists && childRouteExists) {
                    var msg = "Link \"" + ListWrapper.toJSON(linkParams) + "\" is ambiguous, use \"./\" or \"../\" to disambiguate.";
                    throw new BaseException(msg);
                }
                if (parentRouteExists) {
                    prevInstruction = ancestorInstructions.pop();
                }
            }
        }
        if (params[params.length - 1] == '') {
            params.pop();
        }
        if (params.length > 0 && params[0] == '') {
            params.shift();
        }
        if (params.length < 1) {
            var msg = "Link \"" + ListWrapper.toJSON(linkParams) + "\" must include a route name.";
            throw new BaseException(msg);
        }
        var generatedInstruction = this._generate(params, ancestorInstructions, prevInstruction, _aux, linkParams);
        // we don't clone the first (root) element
        for (var i = ancestorInstructions.length - 1; i >= 0; i--) {
            var ancestorInstruction = ancestorInstructions[i];
            if (isBlank(ancestorInstruction)) {
                break;
            }
            generatedInstruction = ancestorInstruction.replaceChild(generatedInstruction);
        }
        return generatedInstruction;
    };
    /*
     * Internal helper that does not make any assertions about the beginning of the link DSL.
     * `ancestorInstructions` are parents that will be cloned.
     * `prevInstruction` is the existing instruction that would be replaced, but which might have
     * aux routes that need to be cloned.
     */
    RouteRegistry.prototype._generate = function (linkParams, ancestorInstructions, prevInstruction, _aux, _originalLink) {
        var _this = this;
        if (_aux === void 0) { _aux = false; }
        var parentComponentType = this._rootComponent;
        var componentInstruction = null;
        var auxInstructions = {};
        var parentInstruction = ListWrapper.last(ancestorInstructions);
        if (isPresent(parentInstruction) && isPresent(parentInstruction.component)) {
            parentComponentType = parentInstruction.component.componentType;
        }
        if (linkParams.length == 0) {
            var defaultInstruction = this.generateDefault(parentComponentType);
            if (isBlank(defaultInstruction)) {
                throw new BaseException("Link \"" + ListWrapper.toJSON(_originalLink) + "\" does not resolve to a terminal instruction.");
            }
            return defaultInstruction;
        }
        // for non-aux routes, we want to reuse the predecessor's existing primary and aux routes
        // and only override routes for which the given link DSL provides
        if (isPresent(prevInstruction) && !_aux) {
            auxInstructions = StringMapWrapper.merge(prevInstruction.auxInstruction, auxInstructions);
            componentInstruction = prevInstruction.component;
        }
        var rules = this._rules.get(parentComponentType);
        if (isBlank(rules)) {
            throw new BaseException("Component \"" + getTypeNameForDebugging(parentComponentType) + "\" has no route config.");
        }
        var linkParamIndex = 0;
        var routeParams = {};
        // first, recognize the primary route if one is provided
        if (linkParamIndex < linkParams.length && isString(linkParams[linkParamIndex])) {
            var routeName = linkParams[linkParamIndex];
            if (routeName == '' || routeName == '.' || routeName == '..') {
                throw new BaseException("\"" + routeName + "/\" is only allowed at the beginning of a link DSL.");
            }
            linkParamIndex += 1;
            if (linkParamIndex < linkParams.length) {
                var linkParam = linkParams[linkParamIndex];
                if (isStringMap(linkParam) && !isArray(linkParam)) {
                    routeParams = linkParam;
                    linkParamIndex += 1;
                }
            }
            var routeRecognizer = (_aux ? rules.auxRulesByName : rules.rulesByName).get(routeName);
            if (isBlank(routeRecognizer)) {
                throw new BaseException("Component \"" + getTypeNameForDebugging(parentComponentType) + "\" has no route named \"" + routeName + "\".");
            }
            // Create an "unresolved instruction" for async routes
            // we'll figure out the rest of the route when we resolve the instruction and
            // perform a navigation
            if (isBlank(routeRecognizer.handler.componentType)) {
                var generatedUrl = routeRecognizer.generateComponentPathValues(routeParams);
                return new instruction_1.UnresolvedInstruction(function () {
                    return routeRecognizer.handler.resolveComponentType().then(function (_) {
                        return _this._generate(linkParams, ancestorInstructions, prevInstruction, _aux, _originalLink);
                    });
                }, generatedUrl.urlPath, url_parser_1.convertUrlParamsToArray(generatedUrl.urlParams));
            }
            componentInstruction = _aux ? rules.generateAuxiliary(routeName, routeParams) :
                rules.generate(routeName, routeParams);
        }
        // Next, recognize auxiliary instructions.
        // If we have an ancestor instruction, we preserve whatever aux routes are active from it.
        while (linkParamIndex < linkParams.length && isArray(linkParams[linkParamIndex])) {
            var auxParentInstruction = [parentInstruction];
            var auxInstruction = this._generate(linkParams[linkParamIndex], auxParentInstruction, null, true, _originalLink);
            // TODO: this will not work for aux routes with parameters or multiple segments
            auxInstructions[auxInstruction.component.urlPath] = auxInstruction;
            linkParamIndex += 1;
        }
        var instruction = new instruction_1.ResolvedInstruction(componentInstruction, null, auxInstructions);
        // If the component is sync, we can generate resolved child route instructions
        // If not, we'll resolve the instructions at navigation time
        if (isPresent(componentInstruction) && isPresent(componentInstruction.componentType)) {
            var childInstruction = null;
            if (componentInstruction.terminal) {
                if (linkParamIndex >= linkParams.length) {
                }
            }
            else {
                var childAncestorComponents = ancestorInstructions.concat([instruction]);
                var remainingLinkParams = linkParams.slice(linkParamIndex);
                childInstruction = this._generate(remainingLinkParams, childAncestorComponents, null, false, _originalLink);
            }
            instruction.child = childInstruction;
        }
        return instruction;
    };
    RouteRegistry.prototype.hasRoute = function (name, parentComponent) {
        var rules = this._rules.get(parentComponent);
        if (isBlank(rules)) {
            return false;
        }
        return rules.hasRoute(name);
    };
    RouteRegistry.prototype.generateDefault = function (componentCursor) {
        var _this = this;
        if (isBlank(componentCursor)) {
            return null;
        }
        var rules = this._rules.get(componentCursor);
        if (isBlank(rules) || isBlank(rules.defaultRule)) {
            return null;
        }
        var defaultChild = null;
        if (isPresent(rules.defaultRule.handler.componentType)) {
            var componentInstruction = rules.defaultRule.generate({});
            if (!rules.defaultRule.terminal) {
                defaultChild = this.generateDefault(rules.defaultRule.handler.componentType);
            }
            return new instruction_1.DefaultInstruction(componentInstruction, defaultChild);
        }
        return new instruction_1.UnresolvedInstruction(function () {
            return rules.defaultRule.handler.resolveComponentType().then(function (_) { return _this.generateDefault(componentCursor); });
        });
    };
    return RouteRegistry;
})();
exports.RouteRegistry = RouteRegistry;
/*
 * Given: ['/a/b', {c: 2}]
 * Returns: ['', 'a', 'b', {c: 2}]
 */
function splitAndFlattenLinkParams(linkParams) {
    var accumulation = [];
    linkParams.forEach(function (item) {
        if (isString(item)) {
            var strItem = item;
            accumulation = accumulation.concat(strItem.split('/'));
        }
        else {
            accumulation.push(item);
        }
    });
    return accumulation;
}
/*
 * Given a list of instructions, returns the most specific instruction
 */
function mostSpecific(instructions) {
    instructions = instructions.filter(function (instruction) { return isPresent(instruction); });
    if (instructions.length == 0) {
        return null;
    }
    if (instructions.length == 1) {
        return instructions[0];
    }
    var first = instructions[0];
    var rest = instructions.slice(1);
    return rest.reduce(function (instruction, contender) {
        if (compareSpecificityStrings(contender.specificity, instruction.specificity) == -1) {
            return contender;
        }
        return instruction;
    }, first);
}
/*
 * Expects strings to be in the form of "[0-2]+"
 * Returns -1 if string A should be sorted above string B, 1 if it should be sorted after,
 * or 0 if they are the same.
 */
function compareSpecificityStrings(a, b) {
    var l = Math.min(a.length, b.length);
    for (var i = 0; i < l; i += 1) {
        var ai = StringWrapper.charCodeAt(a, i);
        var bi = StringWrapper.charCodeAt(b, i);
        var difference = bi - ai;
        if (difference != 0) {
            return difference;
        }
    }
    return a.length - b.length;
}
function assertTerminalComponent(component, path) {
    if (!isType(component)) {
        return;
    }
    var annotations = reflector.annotations(component);
    if (isPresent(annotations)) {
        for (var i = 0; i < annotations.length; i++) {
            var annotation = annotations[i];
            if (annotation instanceof route_config_impl_1.RouteConfig) {
                throw new BaseException("Child routes are not allowed for \"" + path + "\". Use \"...\" on the parent's route path.");
            }
        }
    }
}
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var route_lifecycle_reflector_1 = require('./lifecycle/route_lifecycle_reflector');
var _resolveToTrue = PromiseWrapper.resolve(true);
var _resolveToFalse = PromiseWrapper.resolve(false);
/**
 * The `Router` is responsible for mapping URLs to components.
 *
 * You can see the state of the router by inspecting the read-only field `router.navigating`.
 * This may be useful for showing a spinner, for instance.
 *
 * ## Concepts
 *
 * Routers and component instances have a 1:1 correspondence.
 *
 * The router holds reference to a number of {@link RouterOutlet}.
 * An outlet is a placeholder that the router dynamically fills in depending on the current URL.
 *
 * When the router navigates from a URL, it must first recognize it and serialize it into an
 * `Instruction`.
 * The router uses the `RouteRegistry` to get an `Instruction`.
 */
var Router = (function () {
    function Router(registry, parent, hostComponent) {
        this.registry = registry;
        this.parent = parent;
        this.hostComponent = hostComponent;
        this.navigating = false;
        this._currentInstruction = null;
        this._currentNavigation = _resolveToTrue;
        this._outlet = null;
        this._auxRouters = new Map();
        this._subject = new EventEmitter();
    }
    /**
     * Constructs a child router. You probably don't need to use this unless you're writing a reusable
     * component.
     */
    Router.prototype.childRouter = function (hostComponent) {
        return this._childRouter = new ChildRouter(this, hostComponent);
    };
    /**
     * Constructs a child router. You probably don't need to use this unless you're writing a reusable
     * component.
     */
    Router.prototype.auxRouter = function (hostComponent) { return new ChildRouter(this, hostComponent); };
    /**
     * Register an outlet to be notified of primary route changes.
     *
     * You probably don't need to use this unless you're writing a reusable component.
     */
    Router.prototype.registerPrimaryOutlet = function (outlet) {
        if (isPresent(outlet.name)) {
            throw new BaseException("registerPrimaryOutlet expects to be called with an unnamed outlet.");
        }
        if (isPresent(this._outlet)) {
            throw new BaseException("Primary outlet is already registered.");
        }
        this._outlet = outlet;
        if (isPresent(this._currentInstruction)) {
            return this.commit(this._currentInstruction, false);
        }
        return _resolveToTrue;
    };
    /**
     * Unregister an outlet (because it was destroyed, etc).
     *
     * You probably don't need to use this unless you're writing a custom outlet implementation.
     */
    Router.prototype.unregisterPrimaryOutlet = function (outlet) {
        if (isPresent(outlet.name)) {
            throw new BaseException("registerPrimaryOutlet expects to be called with an unnamed outlet.");
        }
        this._outlet = null;
    };
    /**
     * Register an outlet to notified of auxiliary route changes.
     *
     * You probably don't need to use this unless you're writing a reusable component.
     */
    Router.prototype.registerAuxOutlet = function (outlet) {
        var outletName = outlet.name;
        if (isBlank(outletName)) {
            throw new BaseException("registerAuxOutlet expects to be called with an outlet with a name.");
        }
        var router = this.auxRouter(this.hostComponent);
        this._auxRouters.set(outletName, router);
        router._outlet = outlet;
        var auxInstruction;
        if (isPresent(this._currentInstruction) &&
            isPresent(auxInstruction = this._currentInstruction.auxInstruction[outletName])) {
            return router.commit(auxInstruction);
        }
        return _resolveToTrue;
    };
    /**
     * Given an instruction, returns `true` if the instruction is currently active,
     * otherwise `false`.
     */
    Router.prototype.isRouteActive = function (instruction) {
        var router = this;
        while (isPresent(router.parent) && isPresent(instruction.child)) {
            router = router.parent;
            instruction = instruction.child;
        }
        return isPresent(this._currentInstruction) &&
            this._currentInstruction.component == instruction.component;
    };
    /**
     * Dynamically update the routing configuration and trigger a navigation.
     *
     * ### Usage
     *
     * ```
     * router.config([
     *   { 'path': '/', 'component': IndexComp },
     *   { 'path': '/user/:id', 'component': UserComp },
     * ]);
     * ```
     */
    Router.prototype.config = function (definitions) {
        var _this = this;
        definitions.forEach(function (routeDefinition) { _this.registry.config(_this.hostComponent, routeDefinition); });
        return this.renavigate();
    };
    /**
     * Navigate based on the provided Route Link DSL. It's preferred to navigate with this method
     * over `navigateByUrl`.
     *
     * ### Usage
     *
     * This method takes an array representing the Route Link DSL:
     * ```
     * ['./MyCmp', {param: 3}]
     * ```
     * See the {@link RouterLink} directive for more.
     */
    Router.prototype.navigate = function (linkParams) {
        var instruction = this.generate(linkParams);
        return this.navigateByInstruction(instruction, false);
    };
    /**
     * Navigate to a URL. Returns a promise that resolves when navigation is complete.
     * It's preferred to navigate with `navigate` instead of this method, since URLs are more brittle.
     *
     * If the given URL begins with a `/`, router will navigate absolutely.
     * If the given URL does not begin with `/`, the router will navigate relative to this component.
     */
    Router.prototype.navigateByUrl = function (url, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        return this._currentNavigation = this._currentNavigation.then(function (_) {
            _this.lastNavigationAttempt = url;
            _this._startNavigating();
            return _this._afterPromiseFinishNavigating(_this.recognize(url).then(function (instruction) {
                if (isBlank(instruction)) {
                    return false;
                }
                return _this._navigate(instruction, _skipLocationChange);
            }));
        });
    };
    /**
     * Navigate via the provided instruction. Returns a promise that resolves when navigation is
     * complete.
     */
    Router.prototype.navigateByInstruction = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        if (isBlank(instruction)) {
            return _resolveToFalse;
        }
        return this._currentNavigation = this._currentNavigation.then(function (_) {
            _this._startNavigating();
            return _this._afterPromiseFinishNavigating(_this._navigate(instruction, _skipLocationChange));
        });
    };
    /** @internal */
    Router.prototype._settleInstruction = function (instruction) {
        var _this = this;
        return instruction.resolveComponent().then(function (_) {
            var unsettledInstructions = [];
            if (isPresent(instruction.component)) {
                instruction.component.reuse = false;
            }
            if (isPresent(instruction.child)) {
                unsettledInstructions.push(_this._settleInstruction(instruction.child));
            }
            StringMapWrapper.forEach(instruction.auxInstruction, function (instruction, _) {
                unsettledInstructions.push(_this._settleInstruction(instruction));
            });
            return PromiseWrapper.all(unsettledInstructions);
        });
    };
    /** @internal */
    Router.prototype._navigate = function (instruction, _skipLocationChange) {
        var _this = this;
        return this._settleInstruction(instruction)
            .then(function (_) { return _this._routerCanReuse(instruction); })
            .then(function (_) { return _this._canActivate(instruction); })
            .then(function (result) {
            if (!result) {
                return false;
            }
            return _this._routerCanDeactivate(instruction)
                .then(function (result) {
                if (result) {
                    return _this.commit(instruction, _skipLocationChange)
                        .then(function (_) {
                        _this._emitNavigationFinish(instruction.toRootUrl());
                        return true;
                    });
                }
            });
        });
    };
    Router.prototype._emitNavigationFinish = function (url) { ObservableWrapper.callEmit(this._subject, url); };
    Router.prototype._afterPromiseFinishNavigating = function (promise) {
        var _this = this;
        return PromiseWrapper.catchError(promise.then(function (_) { return _this._finishNavigating(); }), function (err) {
            _this._finishNavigating();
            throw err;
        });
    };
    /*
     * Recursively set reuse flags
     */
    /** @internal */
    Router.prototype._routerCanReuse = function (instruction) {
        var _this = this;
        if (isBlank(this._outlet)) {
            return _resolveToFalse;
        }
        if (isBlank(instruction.component)) {
            return _resolveToTrue;
        }
        return this._outlet.routerCanReuse(instruction.component)
            .then(function (result) {
            instruction.component.reuse = result;
            if (result && isPresent(_this._childRouter) && isPresent(instruction.child)) {
                return _this._childRouter._routerCanReuse(instruction.child);
            }
        });
    };
    Router.prototype._canActivate = function (nextInstruction) {
        return canActivateOne(nextInstruction, this._currentInstruction);
    };
    Router.prototype._routerCanDeactivate = function (instruction) {
        var _this = this;
        if (isBlank(this._outlet)) {
            return _resolveToTrue;
        }
        var next;
        var childInstruction = null;
        var reuse = false;
        var componentInstruction = null;
        if (isPresent(instruction)) {
            childInstruction = instruction.child;
            componentInstruction = instruction.component;
            reuse = isBlank(instruction.component) || instruction.component.reuse;
        }
        if (reuse) {
            next = _resolveToTrue;
        }
        else {
            next = this._outlet.routerCanDeactivate(componentInstruction);
        }
        // TODO: aux route lifecycle hooks
        return next.then(function (result) {
            if (result == false) {
                return false;
            }
            if (isPresent(_this._childRouter)) {
                return _this._childRouter._routerCanDeactivate(childInstruction);
            }
            return true;
        });
    };
    /**
     * Updates this router and all descendant routers according to the given instruction
     */
    Router.prototype.commit = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        this._currentInstruction = instruction;
        var next = _resolveToTrue;
        if (isPresent(this._outlet) && isPresent(instruction.component)) {
            var componentInstruction = instruction.component;
            if (componentInstruction.reuse) {
                next = this._outlet.reuse(componentInstruction);
            }
            else {
                next =
                    this.deactivate(instruction).then(function (_) { return _this._outlet.activate(componentInstruction); });
            }
            if (isPresent(instruction.child)) {
                next = next.then(function (_) {
                    if (isPresent(_this._childRouter)) {
                        return _this._childRouter.commit(instruction.child);
                    }
                });
            }
        }
        var promises = [];
        this._auxRouters.forEach(function (router, name) {
            if (isPresent(instruction.auxInstruction[name])) {
                promises.push(router.commit(instruction.auxInstruction[name]));
            }
        });
        return next.then(function (_) { return PromiseWrapper.all(promises); });
    };
    /** @internal */
    Router.prototype._startNavigating = function () { this.navigating = true; };
    /** @internal */
    Router.prototype._finishNavigating = function () { this.navigating = false; };
    /**
     * Subscribe to URL updates from the router
     */
    Router.prototype.subscribe = function (onNext) {
        return ObservableWrapper.subscribe(this._subject, onNext);
    };
    /**
     * Removes the contents of this router's outlet and all descendant outlets
     */
    Router.prototype.deactivate = function (instruction) {
        var _this = this;
        var childInstruction = null;
        var componentInstruction = null;
        if (isPresent(instruction)) {
            childInstruction = instruction.child;
            componentInstruction = instruction.component;
        }
        var next = _resolveToTrue;
        if (isPresent(this._childRouter)) {
            next = this._childRouter.deactivate(childInstruction);
        }
        if (isPresent(this._outlet)) {
            next = next.then(function (_) { return _this._outlet.deactivate(componentInstruction); });
        }
        // TODO: handle aux routes
        return next;
    };
    /**
     * Given a URL, returns an instruction representing the component graph
     */
    Router.prototype.recognize = function (url) {
        var ancestorComponents = this._getAncestorInstructions();
        return this.registry.recognize(url, ancestorComponents);
    };
    Router.prototype._getAncestorInstructions = function () {
        var ancestorInstructions = [this._currentInstruction];
        var ancestorRouter = this;
        while (isPresent(ancestorRouter = ancestorRouter.parent)) {
            ancestorInstructions.unshift(ancestorRouter._currentInstruction);
        }
        return ancestorInstructions;
    };
    /**
     * Navigates to either the last URL successfully navigated to, or the last URL requested if the
     * router has yet to successfully navigate.
     */
    Router.prototype.renavigate = function () {
        if (isBlank(this.lastNavigationAttempt)) {
            return this._currentNavigation;
        }
        return this.navigateByUrl(this.lastNavigationAttempt);
    };
    /**
     * Generate an `Instruction` based on the provided Route Link DSL.
     */
    Router.prototype.generate = function (linkParams) {
        var ancestorInstructions = this._getAncestorInstructions();
        return this.registry.generate(linkParams, ancestorInstructions);
    };
    return Router;
})();
exports.Router = Router;
var RootRouter = (function (_super) {
    __extends(RootRouter, _super);
    function RootRouter(registry, location, primaryComponent) {
        var _this = this;
        _super.call(this, registry, null, primaryComponent);
        this._location = location;
        this._locationSub = this._location.subscribe(function (change) {
            // we call recognize ourselves
            _this.recognize(change['url'])
                .then(function (instruction) {
                _this.navigateByInstruction(instruction, isPresent(change['pop']))
                    .then(function (_) {
                    // this is a popstate event; no need to change the URL
                    if (isPresent(change['pop']) && change['type'] != 'hashchange') {
                        return;
                    }
                    var emitPath = instruction.toUrlPath();
                    var emitQuery = instruction.toUrlQuery();
                    if (emitPath.length > 0 && emitPath[0] != '/') {
                        emitPath = '/' + emitPath;
                    }
                    // Because we've opted to use All hashchange events occur outside Angular.
                    // However, apps that are migrating might have hash links that operate outside
                    // angular to which routing must respond.
                    // To support these cases where we respond to hashchanges and redirect as a
                    // result, we need to replace the top item on the stack.
                    if (change['type'] == 'hashchange') {
                        if (instruction.toRootUrl() != _this._location.path()) {
                            _this._location.replaceState(emitPath, emitQuery);
                        }
                    }
                    else {
                        _this._location.go(emitPath, emitQuery);
                    }
                });
            });
        });
        this.registry.configFromComponent(primaryComponent);
        this.navigateByUrl(location.path());
    }
    RootRouter.prototype.commit = function (instruction, _skipLocationChange) {
        var _this = this;
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        var emitPath = instruction.toUrlPath();
        var emitQuery = instruction.toUrlQuery();
        if (emitPath.length > 0 && emitPath[0] != '/') {
            emitPath = '/' + emitPath;
        }
        var promise = _super.prototype.commit.call(this, instruction);
        if (!_skipLocationChange) {
            promise = promise.then(function (_) { _this._location.go(emitPath, emitQuery); });
        }
        return promise;
    };
    RootRouter.prototype.dispose = function () {
        if (isPresent(this._locationSub)) {
            ObservableWrapper.dispose(this._locationSub);
            this._locationSub = null;
        }
    };
    return RootRouter;
})(Router);
exports.RootRouter = RootRouter;
var ChildRouter = (function (_super) {
    __extends(ChildRouter, _super);
    function ChildRouter(parent, hostComponent) {
        _super.call(this, parent.registry, parent, hostComponent);
        this.parent = parent;
    }
    ChildRouter.prototype.navigateByUrl = function (url, _skipLocationChange) {
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        // Delegate navigation to the root router
        return this.parent.navigateByUrl(url, _skipLocationChange);
    };
    ChildRouter.prototype.navigateByInstruction = function (instruction, _skipLocationChange) {
        if (_skipLocationChange === void 0) { _skipLocationChange = false; }
        // Delegate navigation to the root router
        return this.parent.navigateByInstruction(instruction, _skipLocationChange);
    };
    return ChildRouter;
})(Router);
function canActivateOne(nextInstruction, prevInstruction) {
    var next = _resolveToTrue;
    if (isBlank(nextInstruction.component)) {
        return next;
    }
    if (isPresent(nextInstruction.child)) {
        next = canActivateOne(nextInstruction.child, isPresent(prevInstruction) ? prevInstruction.child : null);
    }
    return next.then(function (result) {
        if (result == false) {
            return false;
        }
        if (nextInstruction.component.reuse) {
            return true;
        }
        var hook = route_lifecycle_reflector_1.getCanActivateHook(nextInstruction.component.componentType);
        if (isPresent(hook)) {
            return hook(nextInstruction.component, isPresent(prevInstruction) ? prevInstruction.component : null);
        }
        return true;
    });
}


  //TODO: this is a hack to replace the exiting implementation at run-time
  exports.getCanActivateHook = function (directiveName) {
    var factory = $$directiveIntrospector.getTypeByName(directiveName);
    return factory && factory.$canActivate && function (next, prev) {
      return $injector.invoke(factory.$canActivate, null, {
        $nextInstruction: next,
        $prevInstruction: prev
      });
    };
  };

  // This hack removes assertions about the type of the "component"
  // property in a route config
  exports.assertComponentExists = function () {};

  angular.stringifyInstruction = function (instruction) {
    return instruction.toRootUrl();
  };

  var RouteRegistry = exports.RouteRegistry;
  var RootRouter = exports.RootRouter;

  var registry = new RouteRegistry($routerRootComponent);
  var location = new Location();

  $$directiveIntrospector(function (name, factory) {
    if (angular.isArray(factory.$routeConfig)) {
      factory.$routeConfig.forEach(function (config) {
        registry.config(name, config);
      });
    }
  });

  var router = new RootRouter(registry, location, $routerRootComponent);
  $rootScope.$watch(function () { return $location.url(); }, function (path) {
    if (router.lastNavigationAttempt !== path) {
      router.navigateByUrl(path);
    }
  });

  router.subscribe(function () {
    $rootScope.$broadcast('$routeChangeSuccess', {});
  });

  return router;
}

}());

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFuZ3VsYXJfMV9yb3V0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImRlcGVuZGVuY2llcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe1xuLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vdHlwaW5ncy9hbmd1bGFyanMvYW5ndWxhci5kLnRzXCIvPlxuLypcbiAqIGRlY29yYXRlcyAkY29tcGlsZVByb3ZpZGVyIHNvIHRoYXQgd2UgaGF2ZSBhY2Nlc3MgdG8gcm91dGluZyBtZXRhZGF0YVxuICovXG5mdW5jdGlvbiBjb21waWxlclByb3ZpZGVyRGVjb3JhdG9yKCRjb21waWxlUHJvdmlkZXIsICQkZGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIpIHtcbiAgICB2YXIgZGlyZWN0aXZlID0gJGNvbXBpbGVQcm92aWRlci5kaXJlY3RpdmU7XG4gICAgJGNvbXBpbGVQcm92aWRlci5kaXJlY3RpdmUgPSBmdW5jdGlvbiAobmFtZSwgZmFjdG9yeSkge1xuICAgICAgICAkJGRpcmVjdGl2ZUludHJvc3BlY3RvclByb3ZpZGVyLnJlZ2lzdGVyKG5hbWUsIGZhY3RvcnkpO1xuICAgICAgICByZXR1cm4gZGlyZWN0aXZlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cbi8qXG4gKiBwcml2YXRlIHNlcnZpY2UgdGhhdCBob2xkcyByb3V0ZSBtYXBwaW5ncyBmb3IgZWFjaCBjb250cm9sbGVyXG4gKi9cbnZhciBEaXJlY3RpdmVJbnRyb3NwZWN0b3JQcm92aWRlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIoKSB7XG4gICAgICAgIHRoaXMuZGlyZWN0aXZlQnVmZmVyID0gW107XG4gICAgICAgIHRoaXMuZGlyZWN0aXZlRmFjdG9yaWVzQnlOYW1lID0ge307XG4gICAgICAgIHRoaXMub25EaXJlY3RpdmVSZWdpc3RlcmVkID0gbnVsbDtcbiAgICB9XG4gICAgRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIucHJvdG90eXBlLnJlZ2lzdGVyID0gZnVuY3Rpb24gKG5hbWUsIGZhY3RvcnkpIHtcbiAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShmYWN0b3J5KSkge1xuICAgICAgICAgICAgZmFjdG9yeSA9IGZhY3RvcnlbZmFjdG9yeS5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmRpcmVjdGl2ZUZhY3Rvcmllc0J5TmFtZVtuYW1lXSA9IGZhY3Rvcnk7XG4gICAgICAgIGlmICh0aGlzLm9uRGlyZWN0aXZlUmVnaXN0ZXJlZCkge1xuICAgICAgICAgICAgdGhpcy5vbkRpcmVjdGl2ZVJlZ2lzdGVyZWQobmFtZSwgZmFjdG9yeSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICB0aGlzLmRpcmVjdGl2ZUJ1ZmZlci5wdXNoKHsgbmFtZTogbmFtZSwgZmFjdG9yeTogZmFjdG9yeSB9KTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIucHJvdG90eXBlLiRnZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9uIChuZXdPbkNvbnRyb2xsZXJSZWdpc3RlcmVkKSB7XG4gICAgICAgICAgICBfdGhpcy5vbkRpcmVjdGl2ZVJlZ2lzdGVyZWQgPSBuZXdPbkNvbnRyb2xsZXJSZWdpc3RlcmVkO1xuICAgICAgICAgICAgd2hpbGUgKF90aGlzLmRpcmVjdGl2ZUJ1ZmZlci5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgdmFyIGRpcmVjdGl2ZSA9IF90aGlzLmRpcmVjdGl2ZUJ1ZmZlci5wb3AoKTtcbiAgICAgICAgICAgICAgICBfdGhpcy5vbkRpcmVjdGl2ZVJlZ2lzdGVyZWQoZGlyZWN0aXZlLm5hbWUsIGRpcmVjdGl2ZS5mYWN0b3J5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgZm4uZ2V0VHlwZUJ5TmFtZSA9IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiBfdGhpcy5kaXJlY3RpdmVGYWN0b3JpZXNCeU5hbWVbbmFtZV07IH07XG4gICAgICAgIHJldHVybiBmbjtcbiAgICB9O1xuICAgIHJldHVybiBEaXJlY3RpdmVJbnRyb3NwZWN0b3JQcm92aWRlcjtcbn0pKCk7XG4vKipcbiAqIEBuYW1lIG5nT3V0bGV0XG4gKlxuICogQGRlc2NyaXB0aW9uXG4gKiBBbiBuZ091dGxldCBpcyB3aGVyZSByZXNvbHZlZCBjb250ZW50IGdvZXMuXG4gKlxuICogIyMgVXNlXG4gKlxuICogYGBgaHRtbFxuICogPGRpdiBuZy1vdXRsZXQ9XCJuYW1lXCI+PC9kaXY+XG4gKiBgYGBcbiAqXG4gKiBUaGUgdmFsdWUgZm9yIHRoZSBgbmdPdXRsZXRgIGF0dHJpYnV0ZSBpcyBvcHRpb25hbC5cbiAqL1xuZnVuY3Rpb24gbmdPdXRsZXREaXJlY3RpdmUoJGFuaW1hdGUsICRxLCAkcm9vdFJvdXRlcikge1xuICAgIHZhciByb290Um91dGVyID0gJHJvb3RSb3V0ZXI7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdBRScsXG4gICAgICAgIHRyYW5zY2x1ZGU6ICdlbGVtZW50JyxcbiAgICAgICAgdGVybWluYWw6IHRydWUsXG4gICAgICAgIHByaW9yaXR5OiA0MDAsXG4gICAgICAgIHJlcXVpcmU6IFsnP15ebmdPdXRsZXQnLCAnbmdPdXRsZXQnXSxcbiAgICAgICAgbGluazogb3V0bGV0TGluayxcbiAgICAgICAgY29udHJvbGxlcjogKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNsYXNzXzEoKSB7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gY2xhc3NfMTtcbiAgICAgICAgfSkoKSxcbiAgICAgICAgY29udHJvbGxlckFzOiAnJCRuZ091dGxldCdcbiAgICB9O1xuICAgIGZ1bmN0aW9uIG91dGxldExpbmsoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJscywgJHRyYW5zY2x1ZGUpIHtcbiAgICAgICAgdmFyIE91dGxldCA9IChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmdW5jdGlvbiBPdXRsZXQoY29udHJvbGxlciwgcm91dGVyKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5jb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgICAgICAgICAgICAgICB0aGlzLnJvdXRlciA9IHJvdXRlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE91dGxldC5wcm90b3R5cGUuY2xlYW51cExhc3RWaWV3ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucHJldmlvdXNMZWF2ZUFuaW1hdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAkYW5pbWF0ZS5jYW5jZWwodGhpcy5wcmV2aW91c0xlYXZlQW5pbWF0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmV2aW91c0xlYXZlQW5pbWF0aW9uID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFNjb3BlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNjb3BlLiRkZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNjb3BlID0gbnVsbDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wcmV2aW91c0xlYXZlQW5pbWF0aW9uID0gJGFuaW1hdGUubGVhdmUodGhpcy5jdXJyZW50RWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMucHJldmlvdXNMZWF2ZUFuaW1hdGlvbi50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIF90aGlzLnByZXZpb3VzTGVhdmVBbmltYXRpb24gPSBudWxsOyB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50RWxlbWVudCA9IG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIE91dGxldC5wcm90b3R5cGUucmV1c2UgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV4dCA9ICRxLndoZW4odHJ1ZSk7XG4gICAgICAgICAgICAgICAgdmFyIHByZXZpb3VzSW5zdHJ1Y3Rpb24gPSB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRDb250cm9sbGVyICYmIHRoaXMuY3VycmVudENvbnRyb2xsZXIuJHJvdXRlck9uUmV1c2UpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV4dCA9ICRxLndoZW4odGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyT25SZXVzZSh0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbiwgcHJldmlvdXNJbnN0cnVjdGlvbikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV4dDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBPdXRsZXQucHJvdG90eXBlLnJvdXRlckNhblJldXNlID0gZnVuY3Rpb24gKG5leHRJbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgIHZhciByZXN1bHQ7XG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbiB8fFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbi5jb21wb25lbnRUeXBlICE9PSBuZXh0SW5zdHJ1Y3Rpb24uY29tcG9uZW50VHlwZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5jdXJyZW50Q29udHJvbGxlciAmJiB0aGlzLmN1cnJlbnRDb250cm9sbGVyLiRyb3V0ZXJDYW5SZXVzZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLmN1cnJlbnRDb250cm9sbGVyLiRyb3V0ZXJDYW5SZXVzZShuZXh0SW5zdHJ1Y3Rpb24sIHRoaXMuY3VycmVudEluc3RydWN0aW9uKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5leHRJbnN0cnVjdGlvbiA9PT0gdGhpcy5jdXJyZW50SW5zdHJ1Y3Rpb24gfHxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFuZ3VsYXIuZXF1YWxzKG5leHRJbnN0cnVjdGlvbi5wYXJhbXMsIHRoaXMuY3VycmVudEluc3RydWN0aW9uLnBhcmFtcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKHJlc3VsdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgT3V0bGV0LnByb3RvdHlwZS5yb3V0ZXJDYW5EZWFjdGl2YXRlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudENvbnRyb2xsZXIgJiYgdGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyQ2FuRGVhY3RpdmF0ZSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbih0aGlzLmN1cnJlbnRDb250cm9sbGVyLiRyb3V0ZXJDYW5EZWFjdGl2YXRlKGluc3RydWN0aW9uLCB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbih0cnVlKTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBPdXRsZXQucHJvdG90eXBlLmRlYWN0aXZhdGUgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q29udHJvbGxlciAmJiB0aGlzLmN1cnJlbnRDb250cm9sbGVyLiRyb3V0ZXJPbkRlYWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4odGhpcy5jdXJyZW50Q29udHJvbGxlci4kcm91dGVyT25EZWFjdGl2YXRlKGluc3RydWN0aW9uLCB0aGlzLmN1cnJlbnRJbnN0cnVjdGlvbikpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbigpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIE91dGxldC5wcm90b3R5cGUuYWN0aXZhdGUgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICAgICAgICAgIHRoaXMucHJldmlvdXNJbnN0cnVjdGlvbiA9IHRoaXMuY3VycmVudEluc3RydWN0aW9uO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb247XG4gICAgICAgICAgICAgICAgdmFyIGNvbXBvbmVudE5hbWUgPSB0aGlzLmNvbnRyb2xsZXIuJCRjb21wb25lbnROYW1lID0gaW5zdHJ1Y3Rpb24uY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBvbmVudE5hbWUgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQ29tcG9uZW50IGlzIG5vdCBhIHN0cmluZyBmb3IgJyArIGluc3RydWN0aW9uLnVybFBhdGgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0aGlzLmNvbnRyb2xsZXIuJCR0ZW1wbGF0ZSA9ICc8JyArIGRhc2hDYXNlKGNvbXBvbmVudE5hbWUpICsgJyAkcm91dGVyPVwiOjokJHJvdXRlclwiPjwvJyArXG4gICAgICAgICAgICAgICAgICAgIGRhc2hDYXNlKGNvbXBvbmVudE5hbWUpICsgJz4nO1xuICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbGxlci4kJHJvdXRlciA9IHRoaXMucm91dGVyLmNoaWxkUm91dGVyKGluc3RydWN0aW9uLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgICAgIHRoaXMuY29udHJvbGxlci4kJG91dGxldCA9IHRoaXM7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1Njb3BlID0gc2NvcGUuJG5ldygpO1xuICAgICAgICAgICAgICAgIG5ld1Njb3BlLiQkcm91dGVyID0gdGhpcy5jb250cm9sbGVyLiQkcm91dGVyO1xuICAgICAgICAgICAgICAgIHRoaXMuZGVmZXJyZWRBY3RpdmF0aW9uID0gJHEuZGVmZXIoKTtcbiAgICAgICAgICAgICAgICB2YXIgY2xvbmUgPSAkdHJhbnNjbHVkZShuZXdTY29wZSwgZnVuY3Rpb24gKGNsb25lKSB7XG4gICAgICAgICAgICAgICAgICAgICRhbmltYXRlLmVudGVyKGNsb25lLCBudWxsLCBfdGhpcy5jdXJyZW50RWxlbWVudCB8fCBlbGVtZW50KTtcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuY2xlYW51cExhc3RWaWV3KCk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50RWxlbWVudCA9IGNsb25lO1xuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNjb3BlID0gbmV3U2NvcGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVmZXJyZWRBY3RpdmF0aW9uLnByb21pc2U7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmV0dXJuIE91dGxldDtcbiAgICAgICAgfSkoKTtcbiAgICAgICAgdmFyIHBhcmVudEN0cmwgPSBjdHJsc1swXSwgbXlDdHJsID0gY3RybHNbMV0sIHJvdXRlciA9IChwYXJlbnRDdHJsICYmIHBhcmVudEN0cmwuJCRyb3V0ZXIpIHx8IHJvb3RSb3V0ZXI7XG4gICAgICAgIG15Q3RybC4kJGN1cnJlbnRDb21wb25lbnQgPSBudWxsO1xuICAgICAgICByb3V0ZXIucmVnaXN0ZXJQcmltYXJ5T3V0bGV0KG5ldyBPdXRsZXQobXlDdHJsLCByb3V0ZXIpKTtcbiAgICB9XG59XG4vKipcbiAqIFRoaXMgZGlyZWN0aXZlIGlzIHJlc3BvbnNpYmxlIGZvciBjb21waWxpbmcgdGhlIGNvbnRlbnRzIG9mIG5nLW91dGxldFxuICovXG5mdW5jdGlvbiBuZ091dGxldEZpbGxDb250ZW50RGlyZWN0aXZlKCRjb21waWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgICAgIHByaW9yaXR5OiAtNDAwLFxuICAgICAgICByZXF1aXJlOiAnbmdPdXRsZXQnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSBjdHJsLiQkdGVtcGxhdGU7XG4gICAgICAgICAgICBlbGVtZW50Lmh0bWwodGVtcGxhdGUpO1xuICAgICAgICAgICAgJGNvbXBpbGUoZWxlbWVudC5jb250ZW50cygpKShzY29wZSk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuZnVuY3Rpb24gcm91dGVyVHJpZ2dlckRpcmVjdGl2ZSgkcSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlcXVpcmU6ICdebmdPdXRsZXQnLFxuICAgICAgICBwcmlvcml0eTogLTEwMDAsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0ciwgbmdPdXRsZXRDdHJsKSB7XG4gICAgICAgICAgICB2YXIgcHJvbWlzZSA9ICRxLndoZW4oKTtcbiAgICAgICAgICAgIHZhciBvdXRsZXQgPSBuZ091dGxldEN0cmwuJCRvdXRsZXQ7XG4gICAgICAgICAgICB2YXIgY3VycmVudENvbXBvbmVudCA9IG91dGxldC5jdXJyZW50Q29udHJvbGxlciA9XG4gICAgICAgICAgICAgICAgZWxlbWVudC5jb250cm9sbGVyKG5nT3V0bGV0Q3RybC4kJGNvbXBvbmVudE5hbWUpO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRDb21wb25lbnQuJHJvdXRlck9uQWN0aXZhdGUpIHtcbiAgICAgICAgICAgICAgICBwcm9taXNlID0gJHEud2hlbihjdXJyZW50Q29tcG9uZW50LiRyb3V0ZXJPbkFjdGl2YXRlKG91dGxldC5jdXJyZW50SW5zdHJ1Y3Rpb24sIG91dGxldC5wcmV2aW91c0luc3RydWN0aW9uKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBwcm9taXNlLnRoZW4ob3V0bGV0LmRlZmVycmVkQWN0aXZhdGlvbi5yZXNvbHZlLCBvdXRsZXQuZGVmZXJyZWRBY3RpdmF0aW9uLnJlamVjdCk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuLyoqXG4gKiBAbmFtZSBuZ0xpbmtcbiAqIEBkZXNjcmlwdGlvblxuICogTGV0cyB5b3UgbGluayB0byBkaWZmZXJlbnQgcGFydHMgb2YgdGhlIGFwcCwgYW5kIGF1dG9tYXRpY2FsbHkgZ2VuZXJhdGVzIGhyZWZzLlxuICpcbiAqICMjIFVzZVxuICogVGhlIGRpcmVjdGl2ZSB1c2VzIGEgc2ltcGxlIHN5bnRheDogYG5nLWxpbms9XCJjb21wb25lbnROYW1lKHsgcGFyYW06IHBhcmFtVmFsdWUgfSlcImBcbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYGpzXG4gKiBhbmd1bGFyLm1vZHVsZSgnbXlBcHAnLCBbJ25nQ29tcG9uZW50Um91dGVyJ10pXG4gKiAgIC5jb250cm9sbGVyKCdBcHBDb250cm9sbGVyJywgWyckcm9vdFJvdXRlcicsIGZ1bmN0aW9uKCRyb290Um91dGVyKSB7XG4gKiAgICAgJHJvb3RSb3V0ZXIuY29uZmlnKHsgcGF0aDogJy91c2VyLzppZCcsIGNvbXBvbmVudDogJ3VzZXInIH0pO1xuICogICAgIHRoaXMudXNlciA9IHsgbmFtZTogJ0JyaWFuJywgaWQ6IDEyMyB9O1xuICogICB9KTtcbiAqIGBgYFxuICpcbiAqIGBgYGh0bWxcbiAqIDxkaXYgbmctY29udHJvbGxlcj1cIkFwcENvbnRyb2xsZXIgYXMgYXBwXCI+XG4gKiAgIDxhIG5nLWxpbms9XCJ1c2VyKHtpZDogYXBwLnVzZXIuaWR9KVwiPnt7YXBwLnVzZXIubmFtZX19PC9hPlxuICogPC9kaXY+XG4gKiBgYGBcbiAqL1xuZnVuY3Rpb24gbmdMaW5rRGlyZWN0aXZlKCRyb290Um91dGVyLCAkcGFyc2UpIHtcbiAgICByZXR1cm4geyByZXF1aXJlOiAnP15ebmdPdXRsZXQnLCByZXN0cmljdDogJ0EnLCBsaW5rOiBuZ0xpbmtEaXJlY3RpdmVMaW5rRm4gfTtcbiAgICBmdW5jdGlvbiBuZ0xpbmtEaXJlY3RpdmVMaW5rRm4oc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBjdHJsKSB7XG4gICAgICAgIHZhciByb3V0ZXIgPSAoY3RybCAmJiBjdHJsLiQkcm91dGVyKSB8fCAkcm9vdFJvdXRlcjtcbiAgICAgICAgaWYgKCFyb3V0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5zdHJ1Y3Rpb24gPSBudWxsO1xuICAgICAgICB2YXIgbGluayA9IGF0dHJzLm5nTGluayB8fCAnJztcbiAgICAgICAgZnVuY3Rpb24gZ2V0TGluayhwYXJhbXMpIHtcbiAgICAgICAgICAgIGluc3RydWN0aW9uID0gcm91dGVyLmdlbmVyYXRlKHBhcmFtcyk7XG4gICAgICAgICAgICByZXR1cm4gJy4vJyArIGFuZ3VsYXIuc3RyaW5naWZ5SW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHZhciByb3V0ZVBhcmFtc0dldHRlciA9ICRwYXJzZShsaW5rKTtcbiAgICAgICAgLy8gd2UgY2FuIGF2b2lkIGFkZGluZyBhIHdhdGNoZXIgaWYgaXQncyBhIGxpdGVyYWxcbiAgICAgICAgaWYgKHJvdXRlUGFyYW1zR2V0dGVyLmNvbnN0YW50KSB7XG4gICAgICAgICAgICB2YXIgcGFyYW1zID0gcm91dGVQYXJhbXNHZXR0ZXIoKTtcbiAgICAgICAgICAgIGVsZW1lbnQuYXR0cignaHJlZicsIGdldExpbmsocGFyYW1zKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBzY29wZS4kd2F0Y2goZnVuY3Rpb24gKCkgeyByZXR1cm4gcm91dGVQYXJhbXNHZXR0ZXIoc2NvcGUpOyB9LCBmdW5jdGlvbiAocGFyYW1zKSB7IHJldHVybiBlbGVtZW50LmF0dHIoJ2hyZWYnLCBnZXRMaW5rKHBhcmFtcykpOyB9LCB0cnVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgaWYgKGV2ZW50LndoaWNoICE9PSAxIHx8ICFpbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRyb290Um91dGVyLm5hdmlnYXRlQnlJbnN0cnVjdGlvbihpbnN0cnVjdGlvbik7XG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5mdW5jdGlvbiBkYXNoQ2FzZShzdHIpIHtcbiAgICByZXR1cm4gc3RyLnJlcGxhY2UoL1tBLVpdL2csIGZ1bmN0aW9uIChtYXRjaCkgeyByZXR1cm4gJy0nICsgbWF0Y2gudG9Mb3dlckNhc2UoKTsgfSk7XG59XG4vKlxuICogQSBtb2R1bGUgZm9yIGFkZGluZyBuZXcgYSByb3V0aW5nIHN5c3RlbSBBbmd1bGFyIDEuXG4gKi9cbmFuZ3VsYXIubW9kdWxlKCduZ0NvbXBvbmVudFJvdXRlcicsIFtdKVxuICAgIC5kaXJlY3RpdmUoJ25nT3V0bGV0JywgWyckYW5pbWF0ZScsICckcScsICckcm9vdFJvdXRlcicsIG5nT3V0bGV0RGlyZWN0aXZlXSlcbiAgICAuZGlyZWN0aXZlKCduZ091dGxldCcsIFsnJGNvbXBpbGUnLCBuZ091dGxldEZpbGxDb250ZW50RGlyZWN0aXZlXSlcbiAgICAuZGlyZWN0aXZlKCduZ0xpbmsnLCBbJyRyb290Um91dGVyJywgJyRwYXJzZScsIG5nTGlua0RpcmVjdGl2ZV0pXG4gICAgLmRpcmVjdGl2ZSgnJHJvdXRlcicsIFsnJHEnLCByb3V0ZXJUcmlnZ2VyRGlyZWN0aXZlXSk7XG4vKlxuICogQSBtb2R1bGUgZm9yIGluc3BlY3RpbmcgY29udHJvbGxlciBjb25zdHJ1Y3RvcnNcbiAqL1xuYW5ndWxhci5tb2R1bGUoJ25nJylcbiAgICAucHJvdmlkZXIoJyQkZGlyZWN0aXZlSW50cm9zcGVjdG9yJywgRGlyZWN0aXZlSW50cm9zcGVjdG9yUHJvdmlkZXIpXG4gICAgLmNvbmZpZyhbJyRjb21waWxlUHJvdmlkZXInLCAnJCRkaXJlY3RpdmVJbnRyb3NwZWN0b3JQcm92aWRlcicsIGNvbXBpbGVyUHJvdmlkZXJEZWNvcmF0b3JdKTtcblxuYW5ndWxhci5tb2R1bGUoJ25nQ29tcG9uZW50Um91dGVyJykuXG4gICAgdmFsdWUoJyRyb3V0ZScsIG51bGwpLiAvLyBjYW4gYmUgb3ZlcmxvYWRlZCB3aXRoIG5nUm91dGVTaGltXG4gICAgLy8gQmVjYXVzZSBBbmd1bGFyIDEgaGFzIG5vIG5vdGlvbiBvZiBhIHJvb3QgY29tcG9uZW50LCB3ZSB1c2UgYW4gb2JqZWN0IHdpdGggdW5pcXVlIGlkZW50aXR5XG4gICAgLy8gdG8gcmVwcmVzZW50IHRoaXMuIENhbiBiZSBvdmVybG9hZGVkIHdpdGggYSBjb21wb25lbnQgbmFtZVxuICAgIHZhbHVlKCckcm91dGVyUm9vdENvbXBvbmVudCcsIG5ldyBPYmplY3QoKSkuXG4gICAgZmFjdG9yeSgnJHJvb3RSb3V0ZXInLCBbJyRxJywgJyRsb2NhdGlvbicsICckJGRpcmVjdGl2ZUludHJvc3BlY3RvcicsICckYnJvd3NlcicsICckcm9vdFNjb3BlJywgJyRpbmplY3RvcicsICckcm91dGVyUm9vdENvbXBvbmVudCcsIHJvdXRlckZhY3RvcnldKTtcblxuZnVuY3Rpb24gcm91dGVyRmFjdG9yeSgkcSwgJGxvY2F0aW9uLCAkJGRpcmVjdGl2ZUludHJvc3BlY3RvciwgJGJyb3dzZXIsICRyb290U2NvcGUsICRpbmplY3RvciwgJHJvdXRlclJvb3RDb21wb25lbnQpIHtcblxuICAvLyBXaGVuIHRoaXMgZmlsZSBpcyBwcm9jZXNzZWQsIHRoZSBsaW5lIGJlbG93IGlzIHJlcGxhY2VkIHdpdGhcbiAgLy8gdGhlIGNvbnRlbnRzIG9mIGAuLi9saWIvZmFjYWRlcy5lczVgLlxuICBmdW5jdGlvbiBDT05TVCgpIHtcbiAgcmV0dXJuIChmdW5jdGlvbih0YXJnZXQpIHtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gQ09OU1RfRVhQUihleHByKSB7XG4gIHJldHVybiBleHByO1xufVxuXG5mdW5jdGlvbiBpc1ByZXNlbnQgKHgpIHtcbiAgcmV0dXJuICEheDtcbn1cblxuZnVuY3Rpb24gaXNCbGFuayAoeCkge1xuICByZXR1cm4gIXg7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ3N0cmluZyc7XG59XG5cbmZ1bmN0aW9uIGlzVHlwZSAoeCkge1xuICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nTWFwKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgb2JqICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc0FycmF5KG9iaikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShvYmopO1xufVxuXG5mdW5jdGlvbiBnZXRUeXBlTmFtZUZvckRlYnVnZ2luZyAoZm4pIHtcbiAgcmV0dXJuIGZuLm5hbWUgfHwgJ1Jvb3QnO1xufVxuXG52YXIgUHJvbWlzZVdyYXBwZXIgPSB7XG4gIHJlc29sdmU6IGZ1bmN0aW9uIChyZWFzb24pIHtcbiAgICByZXR1cm4gJHEud2hlbihyZWFzb24pO1xuICB9LFxuXG4gIHJlamVjdDogZnVuY3Rpb24gKHJlYXNvbikge1xuICAgIHJldHVybiAkcS5yZWplY3QocmVhc29uKTtcbiAgfSxcblxuICBjYXRjaEVycm9yOiBmdW5jdGlvbiAocHJvbWlzZSwgZm4pIHtcbiAgICByZXR1cm4gcHJvbWlzZS50aGVuKG51bGwsIGZuKTtcbiAgfSxcbiAgYWxsOiBmdW5jdGlvbiAocHJvbWlzZXMpIHtcbiAgICByZXR1cm4gJHEuYWxsKHByb21pc2VzKTtcbiAgfVxufTtcblxudmFyIFJlZ0V4cFdyYXBwZXIgPSB7XG4gIGNyZWF0ZTogZnVuY3Rpb24ocmVnRXhwU3RyLCBmbGFncykge1xuICAgIGZsYWdzID0gZmxhZ3MgPyBmbGFncy5yZXBsYWNlKC9nL2csICcnKSA6ICcnO1xuICAgIHJldHVybiBuZXcgUmVnRXhwKHJlZ0V4cFN0ciwgZmxhZ3MgKyAnZycpO1xuICB9LFxuICBmaXJzdE1hdGNoOiBmdW5jdGlvbihyZWdFeHAsIGlucHV0KSB7XG4gICAgcmVnRXhwLmxhc3RJbmRleCA9IDA7XG4gICAgcmV0dXJuIHJlZ0V4cC5leGVjKGlucHV0KTtcbiAgfSxcbiAgbWF0Y2hlcjogZnVuY3Rpb24gKHJlZ0V4cCwgaW5wdXQpIHtcbiAgICByZWdFeHAubGFzdEluZGV4ID0gMDtcbiAgICByZXR1cm4geyByZTogcmVnRXhwLCBpbnB1dDogaW5wdXQgfTtcbiAgfVxufTtcblxudmFyIHJlZmxlY3RvciA9IHtcbiAgYW5ub3RhdGlvbnM6IGZ1bmN0aW9uIChmbikge1xuICAgIC8vVE9ETzogaW1wbGVtZW50IG1lXG4gICAgcmV0dXJuIGZuLmFubm90YXRpb25zIHx8IFtdO1xuICB9XG59O1xuXG52YXIgTWFwV3JhcHBlciA9IHtcbiAgY3JlYXRlOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gbmV3IE1hcCgpO1xuICB9LFxuXG4gIGdldDogZnVuY3Rpb24obSwgaykge1xuICAgIHJldHVybiBtLmdldChrKTtcbiAgfSxcblxuICBzZXQ6IGZ1bmN0aW9uKG0sIGssIHYpIHtcbiAgICByZXR1cm4gbS5zZXQoaywgdik7XG4gIH0sXG5cbiAgY29udGFpbnM6IGZ1bmN0aW9uIChtLCBrKSB7XG4gICAgcmV0dXJuIG0uaGFzKGspO1xuICB9LFxuXG4gIGZvckVhY2g6IGZ1bmN0aW9uIChtLCBmbikge1xuICAgIHJldHVybiBtLmZvckVhY2goZm4pO1xuICB9XG59O1xuXG52YXIgU3RyaW5nTWFwV3JhcHBlciA9IHtcbiAgY3JlYXRlOiBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9LFxuXG4gIHNldDogZnVuY3Rpb24gKG0sIGssIHYpIHtcbiAgICByZXR1cm4gbVtrXSA9IHY7XG4gIH0sXG5cbiAgZ2V0OiBmdW5jdGlvbiAobSwgaykge1xuICAgIHJldHVybiBtLmhhc093blByb3BlcnR5KGspID8gbVtrXSA6IHVuZGVmaW5lZDtcbiAgfSxcblxuICBjb250YWluczogZnVuY3Rpb24gKG0sIGspIHtcbiAgICByZXR1cm4gbS5oYXNPd25Qcm9wZXJ0eShrKTtcbiAgfSxcblxuICBrZXlzOiBmdW5jdGlvbihtYXApIHtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMobWFwKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbihtYXApIHtcbiAgICBmb3IgKHZhciBwcm9wIGluIG1hcCkge1xuICAgICAgaWYgKG1hcC5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGRlbGV0ZTogZnVuY3Rpb24obWFwLCBrZXkpIHtcbiAgICBkZWxldGUgbWFwW2tleV07XG4gIH0sXG5cbiAgZm9yRWFjaDogZnVuY3Rpb24gKG0sIGZuKSB7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBtKSB7XG4gICAgICBpZiAobS5oYXNPd25Qcm9wZXJ0eShwcm9wKSkge1xuICAgICAgICBmbihtW3Byb3BdLCBwcm9wKTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXF1YWxzOiBmdW5jdGlvbiAobTEsIG0yKSB7XG4gICAgdmFyIGsxID0gT2JqZWN0LmtleXMobTEpO1xuICAgIHZhciBrMiA9IE9iamVjdC5rZXlzKG0yKTtcbiAgICBpZiAoazEubGVuZ3RoICE9IGsyLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIga2V5O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgazEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGtleSA9IGsxW2ldO1xuICAgICAgaWYgKG0xW2tleV0gIT09IG0yW2tleV0pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBtZXJnZTogZnVuY3Rpb24obTEsIG0yKSB7XG4gICAgdmFyIG0gPSB7fTtcbiAgICBmb3IgKHZhciBhdHRyIGluIG0xKSB7XG4gICAgICBpZiAobTEuaGFzT3duUHJvcGVydHkoYXR0cikpIHtcbiAgICAgICAgbVthdHRyXSA9IG0xW2F0dHJdO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKHZhciBhdHRyIGluIG0yKSB7XG4gICAgICBpZiAobTIuaGFzT3duUHJvcGVydHkoYXR0cikpIHtcbiAgICAgICAgbVthdHRyXSA9IG0yW2F0dHJdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbTtcbiAgfVxufTtcblxudmFyIExpc3QgPSBBcnJheTtcbnZhciBMaXN0V3JhcHBlciA9IHtcbiAgdG9KU09OOiBmdW5jdGlvbihsKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGwpO1xuICB9LFxuXG4gIGNsZWFyOiBmdW5jdGlvbiAobCkge1xuICAgIGwubGVuZ3RoID0gMDtcbiAgfSxcblxuICBjcmVhdGU6IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW107XG4gIH0sXG5cbiAgcHVzaDogZnVuY3Rpb24gKGwsIHYpIHtcbiAgICByZXR1cm4gbC5wdXNoKHYpO1xuICB9LFxuXG4gIGZvckVhY2g6IGZ1bmN0aW9uIChsLCBmbikge1xuICAgIHJldHVybiBsLmZvckVhY2goZm4pO1xuICB9LFxuXG4gIGZpcnN0OiBmdW5jdGlvbihhcnJheSkge1xuICAgIGlmICghYXJyYXkpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gYXJyYXlbMF07XG4gIH0sXG5cbiAgbGFzdDogZnVuY3Rpb24oYXJyYXkpIHtcbiAgICByZXR1cm4gKGFycmF5ICYmIGFycmF5Lmxlbmd0aCkgPiAwID8gYXJyYXlbYXJyYXkubGVuZ3RoIC0gMV0gOiBudWxsO1xuICB9LFxuXG4gIG1hcDogZnVuY3Rpb24gKGwsIGZuKSB7XG4gICAgcmV0dXJuIGwubWFwKGZuKTtcbiAgfSxcblxuICBqb2luOiBmdW5jdGlvbiAobCwgc3RyKSB7XG4gICAgcmV0dXJuIGwuam9pbihzdHIpO1xuICB9LFxuXG4gIHJlZHVjZTogZnVuY3Rpb24obGlzdCwgZm4sIGluaXQpIHtcbiAgICByZXR1cm4gbGlzdC5yZWR1Y2UoZm4sIGluaXQpO1xuICB9LFxuXG4gIGZpbHRlcjogZnVuY3Rpb24oYXJyYXksIHByZWQpIHtcbiAgICByZXR1cm4gYXJyYXkuZmlsdGVyKHByZWQpO1xuICB9LFxuXG4gIGNvbmNhdDogZnVuY3Rpb24oYSwgYikge1xuICAgIHJldHVybiBhLmNvbmNhdChiKTtcbiAgfSxcblxuICBzbGljZTogZnVuY3Rpb24obCkge1xuICAgIHZhciBmcm9tID0gYXJndW1lbnRzWzFdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1sxXSA6IDA7XG4gICAgdmFyIHRvID0gYXJndW1lbnRzWzJdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1syXSA6IG51bGw7XG4gICAgcmV0dXJuIGwuc2xpY2UoZnJvbSwgdG8gPT09IG51bGwgPyB1bmRlZmluZWQgOiB0byk7XG4gIH0sXG5cbiAgbWF4aW11bTogZnVuY3Rpb24obGlzdCwgcHJlZGljYXRlKSB7XG4gICAgaWYgKGxpc3QubGVuZ3RoID09IDApIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgc29sdXRpb24gPSBudWxsO1xuICAgIHZhciBtYXhWYWx1ZSA9IC1JbmZpbml0eTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGlzdC5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBjYW5kaWRhdGUgPSBsaXN0W2luZGV4XTtcbiAgICAgIGlmIChpc0JsYW5rKGNhbmRpZGF0ZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB2YXIgY2FuZGlkYXRlVmFsdWUgPSBwcmVkaWNhdGUoY2FuZGlkYXRlKTtcbiAgICAgIGlmIChjYW5kaWRhdGVWYWx1ZSA+IG1heFZhbHVlKSB7XG4gICAgICAgIHNvbHV0aW9uID0gY2FuZGlkYXRlO1xuICAgICAgICBtYXhWYWx1ZSA9IGNhbmRpZGF0ZVZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc29sdXRpb247XG4gIH1cbn07XG5cbnZhciBTdHJpbmdXcmFwcGVyID0ge1xuICBjaGFyQ29kZUF0OiBmdW5jdGlvbihzLCBpKSB7XG4gICAgcmV0dXJuIHMuY2hhckNvZGVBdChpKTtcbiAgfSxcblxuICBlcXVhbHM6IGZ1bmN0aW9uIChzMSwgczIpIHtcbiAgICByZXR1cm4gczEgPT09IHMyO1xuICB9LFxuXG4gIHNwbGl0OiBmdW5jdGlvbihzLCByZSkge1xuICAgIHJldHVybiBzLnNwbGl0KHJlKTtcbiAgfSxcblxuICByZXBsYWNlQWxsOiBmdW5jdGlvbihzLCBmcm9tLCByZXBsYWNlKSB7XG4gICAgcmV0dXJuIHMucmVwbGFjZShmcm9tLCByZXBsYWNlKTtcbiAgfSxcblxuICByZXBsYWNlQWxsTWFwcGVkOiBmdW5jdGlvbihzLCBmcm9tLCBjYikge1xuICAgIHJldHVybiBzLnJlcGxhY2UoZnJvbSwgZnVuY3Rpb24obWF0Y2hlcykge1xuICAgICAgLy8gUmVtb3ZlIG9mZnNldCAmIHN0cmluZyBmcm9tIHRoZSByZXN1bHQgYXJyYXlcbiAgICAgIG1hdGNoZXMuc3BsaWNlKC0yLCAyKTtcbiAgICAgIC8vIFRoZSBjYWxsYmFjayByZWNlaXZlcyBtYXRjaCwgcDEsIC4uLiwgcG5cbiAgICAgIHJldHVybiBjYi5hcHBseShudWxsLCBtYXRjaGVzKTtcbiAgICB9KTtcbiAgfSxcblxuICBjb250YWluczogZnVuY3Rpb24ocywgc3Vic3RyKSB7XG4gICAgcmV0dXJuIHMuaW5kZXhPZihzdWJzdHIpICE9IC0xO1xuICB9XG5cbn07XG5cbi8vVE9ETzogaW1wbGVtZW50P1xuLy8gSSB0aGluayBpdCdzIHRvbyBoZWF2eSB0byBhc2sgMS54IHVzZXJzIHRvIGJyaW5nIGluIFJ4IGZvciB0aGUgcm91dGVyLi4uXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7fVxuXG52YXIgQmFzZUV4Y2VwdGlvbiA9IEVycm9yO1xuXG52YXIgT2JzZXJ2YWJsZVdyYXBwZXIgPSB7XG4gIGNhbGxOZXh0OiBmdW5jdGlvbihvYiwgdmFsKSB7XG4gICAgb2IuZm4odmFsKTtcbiAgfSxcbiAgY2FsbEVtaXQ6IGZ1bmN0aW9uKG9iLCB2YWwpIHtcbiAgICBvYi5mbih2YWwpO1xuICB9LFxuXG4gIHN1YnNjcmliZTogZnVuY3Rpb24ob2IsIGZuKSB7XG4gICAgb2IuZm4gPSBmbjtcbiAgfVxufTtcblxuLy8gVE9ETzogaHR0cHM6Ly9naXRodWIuY29tL2FuZ3VsYXIvYW5ndWxhci5qcy9ibG9iL21hc3Rlci9zcmMvbmcvYnJvd3Nlci5qcyNMMjI3LUwyNjVcbnZhciAkX19yb3V0ZXJfNDdfbG9jYXRpb25fXyA9IHtcbiAgTG9jYXRpb246IExvY2F0aW9uXG59O1xuXG5mdW5jdGlvbiBMb2NhdGlvbigpe31cbkxvY2F0aW9uLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAoKSB7XG4gIC8vVE9ETzogaW1wbGVtZW50XG59O1xuTG9jYXRpb24ucHJvdG90eXBlLnBhdGggPSBmdW5jdGlvbiAoKSB7XG4gIHJldHVybiAkbG9jYXRpb24udXJsKCk7XG59O1xuTG9jYXRpb24ucHJvdG90eXBlLmdvID0gZnVuY3Rpb24gKHBhdGgsIHF1ZXJ5KSB7XG4gIHJldHVybiAkbG9jYXRpb24udXJsKHBhdGggKyBxdWVyeSk7XG59O1xuXG5cbiAgdmFyIGV4cG9ydHMgPSB7XG4gICAgSW5qZWN0YWJsZTogZnVuY3Rpb24gKCkge30sXG4gICAgT3BhcXVlVG9rZW46IGZ1bmN0aW9uICgpIHt9LFxuICAgIEluamVjdDogZnVuY3Rpb24gKCkge31cbiAgfTtcbiAgdmFyIHJlcXVpcmUgPSBmdW5jdGlvbiAoKSB7cmV0dXJuIGV4cG9ydHM7fTtcblxuICAvLyBXaGVuIHRoaXMgZmlsZSBpcyBwcm9jZXNzZWQsIHRoZSBsaW5lIGJlbG93IGlzIHJlcGxhY2VkIHdpdGhcbiAgLy8gdGhlIGNvbnRlbnRzIG9mIHRoZSBjb21waWxlZCBUeXBlU2NyaXB0IGNsYXNzZXMuXG4gIHZhciBUb3VjaE1hcCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVG91Y2hNYXAobWFwKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHRoaXMubWFwID0ge307XG4gICAgICAgIHRoaXMua2V5cyA9IHt9O1xuICAgICAgICBpZiAoaXNQcmVzZW50KG1hcCkpIHtcbiAgICAgICAgICAgIFN0cmluZ01hcFdyYXBwZXIuZm9yRWFjaChtYXAsIGZ1bmN0aW9uICh2YWx1ZSwga2V5KSB7XG4gICAgICAgICAgICAgICAgX3RoaXMubWFwW2tleV0gPSBpc1ByZXNlbnQodmFsdWUpID8gdmFsdWUudG9TdHJpbmcoKSA6IG51bGw7XG4gICAgICAgICAgICAgICAgX3RoaXMua2V5c1trZXldID0gdHJ1ZTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIFRvdWNoTWFwLnByb3RvdHlwZS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIFN0cmluZ01hcFdyYXBwZXIuZGVsZXRlKHRoaXMua2V5cywga2V5KTtcbiAgICAgICAgcmV0dXJuIHRoaXMubWFwW2tleV07XG4gICAgfTtcbiAgICBUb3VjaE1hcC5wcm90b3R5cGUuZ2V0VW51c2VkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgdW51c2VkID0ge307XG4gICAgICAgIHZhciBrZXlzID0gU3RyaW5nTWFwV3JhcHBlci5rZXlzKHRoaXMua2V5cyk7XG4gICAgICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7IHJldHVybiB1bnVzZWRba2V5XSA9IFN0cmluZ01hcFdyYXBwZXIuZ2V0KF90aGlzLm1hcCwga2V5KTsgfSk7XG4gICAgICAgIHJldHVybiB1bnVzZWQ7XG4gICAgfTtcbiAgICByZXR1cm4gVG91Y2hNYXA7XG59KSgpO1xuZXhwb3J0cy5Ub3VjaE1hcCA9IFRvdWNoTWFwO1xuZnVuY3Rpb24gbm9ybWFsaXplU3RyaW5nKG9iaikge1xuICAgIGlmIChpc0JsYW5rKG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICByZXR1cm4gb2JqLnRvU3RyaW5nKCk7XG4gICAgfVxufVxuZXhwb3J0cy5ub3JtYWxpemVTdHJpbmcgPSBub3JtYWxpemVTdHJpbmc7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbmZ1bmN0aW9uIGNvbnZlcnRVcmxQYXJhbXNUb0FycmF5KHVybFBhcmFtcykge1xuICAgIHZhciBwYXJhbXNBcnJheSA9IFtdO1xuICAgIGlmIChpc0JsYW5rKHVybFBhcmFtcykpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICBTdHJpbmdNYXBXcmFwcGVyLmZvckVhY2godXJsUGFyYW1zLCBmdW5jdGlvbiAodmFsdWUsIGtleSkgeyBwYXJhbXNBcnJheS5wdXNoKCh2YWx1ZSA9PT0gdHJ1ZSkgPyBrZXkgOiBrZXkgKyAnPScgKyB2YWx1ZSk7IH0pO1xuICAgIHJldHVybiBwYXJhbXNBcnJheTtcbn1cbmV4cG9ydHMuY29udmVydFVybFBhcmFtc1RvQXJyYXkgPSBjb252ZXJ0VXJsUGFyYW1zVG9BcnJheTtcbi8vIENvbnZlcnQgYW4gb2JqZWN0IG9mIHVybCBwYXJhbWV0ZXJzIGludG8gYSBzdHJpbmcgdGhhdCBjYW4gYmUgdXNlZCBpbiBhbiBVUkxcbmZ1bmN0aW9uIHNlcmlhbGl6ZVBhcmFtcyh1cmxQYXJhbXMsIGpvaW5lcikge1xuICAgIGlmIChqb2luZXIgPT09IHZvaWQgMCkgeyBqb2luZXIgPSAnJic7IH1cbiAgICByZXR1cm4gY29udmVydFVybFBhcmFtc1RvQXJyYXkodXJsUGFyYW1zKS5qb2luKGpvaW5lcik7XG59XG5leHBvcnRzLnNlcmlhbGl6ZVBhcmFtcyA9IHNlcmlhbGl6ZVBhcmFtcztcbi8qKlxuICogVGhpcyBjbGFzcyByZXByZXNlbnRzIGEgcGFyc2VkIFVSTFxuICovXG52YXIgVXJsID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBVcmwocGF0aCwgY2hpbGQsIGF1eGlsaWFyeSwgcGFyYW1zKSB7XG4gICAgICAgIGlmIChjaGlsZCA9PT0gdm9pZCAwKSB7IGNoaWxkID0gbnVsbDsgfVxuICAgICAgICBpZiAoYXV4aWxpYXJ5ID09PSB2b2lkIDApIHsgYXV4aWxpYXJ5ID0gQ09OU1RfRVhQUihbXSk7IH1cbiAgICAgICAgaWYgKHBhcmFtcyA9PT0gdm9pZCAwKSB7IHBhcmFtcyA9IENPTlNUX0VYUFIoe30pOyB9XG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XG4gICAgICAgIHRoaXMuY2hpbGQgPSBjaGlsZDtcbiAgICAgICAgdGhpcy5hdXhpbGlhcnkgPSBhdXhpbGlhcnk7XG4gICAgICAgIHRoaXMucGFyYW1zID0gcGFyYW1zO1xuICAgIH1cbiAgICBVcmwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5wYXRoICsgdGhpcy5fbWF0cml4UGFyYW1zVG9TdHJpbmcoKSArIHRoaXMuX2F1eFRvU3RyaW5nKCkgKyB0aGlzLl9jaGlsZFN0cmluZygpO1xuICAgIH07XG4gICAgVXJsLnByb3RvdHlwZS5zZWdtZW50VG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzLnBhdGggKyB0aGlzLl9tYXRyaXhQYXJhbXNUb1N0cmluZygpOyB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBVcmwucHJvdG90eXBlLl9hdXhUb1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuYXV4aWxpYXJ5Lmxlbmd0aCA+IDAgP1xuICAgICAgICAgICAgKCcoJyArIHRoaXMuYXV4aWxpYXJ5Lm1hcChmdW5jdGlvbiAoc2libGluZykgeyByZXR1cm4gc2libGluZy50b1N0cmluZygpOyB9KS5qb2luKCcvLycpICsgJyknKSA6XG4gICAgICAgICAgICAnJztcbiAgICB9O1xuICAgIFVybC5wcm90b3R5cGUuX21hdHJpeFBhcmFtc1RvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFyYW1TdHJpbmcgPSBzZXJpYWxpemVQYXJhbXModGhpcy5wYXJhbXMsICc7Jyk7XG4gICAgICAgIGlmIChwYXJhbVN0cmluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJzsnICsgcGFyYW1TdHJpbmc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH07XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIFVybC5wcm90b3R5cGUuX2NoaWxkU3RyaW5nID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gaXNQcmVzZW50KHRoaXMuY2hpbGQpID8gKCcvJyArIHRoaXMuY2hpbGQudG9TdHJpbmcoKSkgOiAnJzsgfTtcbiAgICByZXR1cm4gVXJsO1xufSkoKTtcbmV4cG9ydHMuVXJsID0gVXJsO1xudmFyIFJvb3RVcmwgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhSb290VXJsLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFJvb3RVcmwocGF0aCwgY2hpbGQsIGF1eGlsaWFyeSwgcGFyYW1zKSB7XG4gICAgICAgIGlmIChjaGlsZCA9PT0gdm9pZCAwKSB7IGNoaWxkID0gbnVsbDsgfVxuICAgICAgICBpZiAoYXV4aWxpYXJ5ID09PSB2b2lkIDApIHsgYXV4aWxpYXJ5ID0gQ09OU1RfRVhQUihbXSk7IH1cbiAgICAgICAgaWYgKHBhcmFtcyA9PT0gdm9pZCAwKSB7IHBhcmFtcyA9IG51bGw7IH1cbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgcGF0aCwgY2hpbGQsIGF1eGlsaWFyeSwgcGFyYW1zKTtcbiAgICB9XG4gICAgUm9vdFVybC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnBhdGggKyB0aGlzLl9hdXhUb1N0cmluZygpICsgdGhpcy5fY2hpbGRTdHJpbmcoKSArIHRoaXMuX3F1ZXJ5UGFyYW1zVG9TdHJpbmcoKTtcbiAgICB9O1xuICAgIFJvb3RVcmwucHJvdG90eXBlLnNlZ21lbnRUb1N0cmluZyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMucGF0aCArIHRoaXMuX3F1ZXJ5UGFyYW1zVG9TdHJpbmcoKTsgfTtcbiAgICBSb290VXJsLnByb3RvdHlwZS5fcXVlcnlQYXJhbXNUb1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGlzQmxhbmsodGhpcy5wYXJhbXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICc/JyArIHNlcmlhbGl6ZVBhcmFtcyh0aGlzLnBhcmFtcyk7XG4gICAgfTtcbiAgICByZXR1cm4gUm9vdFVybDtcbn0pKFVybCk7XG5leHBvcnRzLlJvb3RVcmwgPSBSb290VXJsO1xuZnVuY3Rpb24gcGF0aFNlZ21lbnRzVG9VcmwocGF0aFNlZ21lbnRzKSB7XG4gICAgdmFyIHVybCA9IG5ldyBVcmwocGF0aFNlZ21lbnRzW3BhdGhTZWdtZW50cy5sZW5ndGggLSAxXSk7XG4gICAgZm9yICh2YXIgaSA9IHBhdGhTZWdtZW50cy5sZW5ndGggLSAyOyBpID49IDA7IGkgLT0gMSkge1xuICAgICAgICB1cmwgPSBuZXcgVXJsKHBhdGhTZWdtZW50c1tpXSwgdXJsKTtcbiAgICB9XG4gICAgcmV0dXJuIHVybDtcbn1cbmV4cG9ydHMucGF0aFNlZ21lbnRzVG9VcmwgPSBwYXRoU2VnbWVudHNUb1VybDtcbnZhciBTRUdNRU5UX1JFID0gUmVnRXhwV3JhcHBlci5jcmVhdGUoJ15bXlxcXFwvXFxcXChcXFxcKVxcXFw/Oz0mI10rJyk7XG5mdW5jdGlvbiBtYXRjaFVybFNlZ21lbnQoc3RyKSB7XG4gICAgdmFyIG1hdGNoID0gUmVnRXhwV3JhcHBlci5maXJzdE1hdGNoKFNFR01FTlRfUkUsIHN0cik7XG4gICAgcmV0dXJuIGlzUHJlc2VudChtYXRjaCkgPyBtYXRjaFswXSA6ICcnO1xufVxudmFyIFVybFBhcnNlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gVXJsUGFyc2VyKCkge1xuICAgIH1cbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBlZWtTdGFydHNXaXRoID0gZnVuY3Rpb24gKHN0cikgeyByZXR1cm4gdGhpcy5fcmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKTsgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLmNhcHR1cmUgPSBmdW5jdGlvbiAoc3RyKSB7XG4gICAgICAgIGlmICghdGhpcy5fcmVtYWluaW5nLnN0YXJ0c1dpdGgoc3RyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJFeHBlY3RlZCBcXFwiXCIgKyBzdHIgKyBcIlxcXCIuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX3JlbWFpbmluZyA9IHRoaXMuX3JlbWFpbmluZy5zdWJzdHJpbmcoc3RyLmxlbmd0aCk7XG4gICAgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlID0gZnVuY3Rpb24gKHVybCkge1xuICAgICAgICB0aGlzLl9yZW1haW5pbmcgPSB1cmw7XG4gICAgICAgIGlmICh1cmwgPT0gJycgfHwgdXJsID09ICcvJykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBVcmwoJycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnBhcnNlUm9vdCgpO1xuICAgIH07XG4gICAgLy8gc2VnbWVudCArIChhdXggc2VnbWVudHMpICsgKHF1ZXJ5IHBhcmFtcylcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlUm9vdCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhdGggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHBhdGgpO1xuICAgICAgICB2YXIgYXV4ID0gW107XG4gICAgICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcoJykpIHtcbiAgICAgICAgICAgIGF1eCA9IHRoaXMucGFyc2VBdXhpbGlhcnlSb3V0ZXMoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnOycpKSB7XG4gICAgICAgICAgICAvLyBUT0RPOiBzaG91bGQgdGhlc2UgcGFyYW1zIGp1c3QgYmUgZHJvcHBlZD9cbiAgICAgICAgICAgIHRoaXMucGFyc2VNYXRyaXhQYXJhbXMoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgY2hpbGQgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnLycpICYmICF0aGlzLnBlZWtTdGFydHNXaXRoKCcvLycpKSB7XG4gICAgICAgICAgICB0aGlzLmNhcHR1cmUoJy8nKTtcbiAgICAgICAgICAgIGNoaWxkID0gdGhpcy5wYXJzZVNlZ21lbnQoKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgcXVlcnlQYXJhbXMgPSBudWxsO1xuICAgICAgICBpZiAodGhpcy5wZWVrU3RhcnRzV2l0aCgnPycpKSB7XG4gICAgICAgICAgICBxdWVyeVBhcmFtcyA9IHRoaXMucGFyc2VRdWVyeVBhcmFtcygpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUm9vdFVybChwYXRoLCBjaGlsZCwgYXV4LCBxdWVyeVBhcmFtcyk7XG4gICAgfTtcbiAgICAvLyBzZWdtZW50ICsgKG1hdHJpeCBwYXJhbXMpICsgKGF1eCBzZWdtZW50cylcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlU2VnbWVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX3JlbWFpbmluZy5sZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8nKSkge1xuICAgICAgICAgICAgdGhpcy5jYXB0dXJlKCcvJyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHBhdGggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKHBhdGgpO1xuICAgICAgICB2YXIgbWF0cml4UGFyYW1zID0gbnVsbDtcbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJzsnKSkge1xuICAgICAgICAgICAgbWF0cml4UGFyYW1zID0gdGhpcy5wYXJzZU1hdHJpeFBhcmFtcygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBhdXggPSBbXTtcbiAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJygnKSkge1xuICAgICAgICAgICAgYXV4ID0gdGhpcy5wYXJzZUF1eGlsaWFyeVJvdXRlcygpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBjaGlsZCA9IG51bGw7XG4gICAgICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCcvJykgJiYgIXRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICAgICAgICAgIHRoaXMuY2FwdHVyZSgnLycpO1xuICAgICAgICAgICAgY2hpbGQgPSB0aGlzLnBhcnNlU2VnbWVudCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgVXJsKHBhdGgsIGNoaWxkLCBhdXgsIG1hdHJpeFBhcmFtcyk7XG4gICAgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlUXVlcnlQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICAgICAgdGhpcy5jYXB0dXJlKCc/Jyk7XG4gICAgICAgIHRoaXMucGFyc2VQYXJhbShwYXJhbXMpO1xuICAgICAgICB3aGlsZSAodGhpcy5fcmVtYWluaW5nLmxlbmd0aCA+IDAgJiYgdGhpcy5wZWVrU3RhcnRzV2l0aCgnJicpKSB7XG4gICAgICAgICAgICB0aGlzLmNhcHR1cmUoJyYnKTtcbiAgICAgICAgICAgIHRoaXMucGFyc2VQYXJhbShwYXJhbXMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwYXJhbXM7XG4gICAgfTtcbiAgICBVcmxQYXJzZXIucHJvdG90eXBlLnBhcnNlTWF0cml4UGFyYW1zID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgIHdoaWxlICh0aGlzLl9yZW1haW5pbmcubGVuZ3RoID4gMCAmJiB0aGlzLnBlZWtTdGFydHNXaXRoKCc7JykpIHtcbiAgICAgICAgICAgIHRoaXMuY2FwdHVyZSgnOycpO1xuICAgICAgICAgICAgdGhpcy5wYXJzZVBhcmFtKHBhcmFtcyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHBhcmFtcztcbiAgICB9O1xuICAgIFVybFBhcnNlci5wcm90b3R5cGUucGFyc2VQYXJhbSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgdmFyIGtleSA9IG1hdGNoVXJsU2VnbWVudCh0aGlzLl9yZW1haW5pbmcpO1xuICAgICAgICBpZiAoaXNCbGFuayhrZXkpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jYXB0dXJlKGtleSk7XG4gICAgICAgIHZhciB2YWx1ZSA9IHRydWU7XG4gICAgICAgIGlmICh0aGlzLnBlZWtTdGFydHNXaXRoKCc9JykpIHtcbiAgICAgICAgICAgIHRoaXMuY2FwdHVyZSgnPScpO1xuICAgICAgICAgICAgdmFyIHZhbHVlTWF0Y2ggPSBtYXRjaFVybFNlZ21lbnQodGhpcy5fcmVtYWluaW5nKTtcbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQodmFsdWVNYXRjaCkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlTWF0Y2g7XG4gICAgICAgICAgICAgICAgdGhpcy5jYXB0dXJlKHZhbHVlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBwYXJhbXNba2V5XSA9IHZhbHVlO1xuICAgIH07XG4gICAgVXJsUGFyc2VyLnByb3RvdHlwZS5wYXJzZUF1eGlsaWFyeVJvdXRlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJvdXRlcyA9IFtdO1xuICAgICAgICB0aGlzLmNhcHR1cmUoJygnKTtcbiAgICAgICAgd2hpbGUgKCF0aGlzLnBlZWtTdGFydHNXaXRoKCcpJykgJiYgdGhpcy5fcmVtYWluaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKHRoaXMucGFyc2VTZWdtZW50KCkpO1xuICAgICAgICAgICAgaWYgKHRoaXMucGVla1N0YXJ0c1dpdGgoJy8vJykpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNhcHR1cmUoJy8vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5jYXB0dXJlKCcpJyk7XG4gICAgICAgIHJldHVybiByb3V0ZXM7XG4gICAgfTtcbiAgICByZXR1cm4gVXJsUGFyc2VyO1xufSkoKTtcbmV4cG9ydHMuVXJsUGFyc2VyID0gVXJsUGFyc2VyO1xuZXhwb3J0cy5wYXJzZXIgPSBuZXcgVXJsUGFyc2VyKCk7XG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgUm91dGVMaWZlY3ljbGVIb29rID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSb3V0ZUxpZmVjeWNsZUhvb2sobmFtZSkge1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIH1cbiAgICBSb3V0ZUxpZmVjeWNsZUhvb2sgPSBfX2RlY29yYXRlKFtcbiAgICAgICAgQ09OU1QoKVxuICAgIF0sIFJvdXRlTGlmZWN5Y2xlSG9vayk7XG4gICAgcmV0dXJuIFJvdXRlTGlmZWN5Y2xlSG9vaztcbn0pKCk7XG5leHBvcnRzLlJvdXRlTGlmZWN5Y2xlSG9vayA9IFJvdXRlTGlmZWN5Y2xlSG9vaztcbnZhciBDYW5BY3RpdmF0ZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ2FuQWN0aXZhdGUoZm4pIHtcbiAgICAgICAgdGhpcy5mbiA9IGZuO1xuICAgIH1cbiAgICBDYW5BY3RpdmF0ZSA9IF9fZGVjb3JhdGUoW1xuICAgICAgICBDT05TVCgpXG4gICAgXSwgQ2FuQWN0aXZhdGUpO1xuICAgIHJldHVybiBDYW5BY3RpdmF0ZTtcbn0pKCk7XG5leHBvcnRzLkNhbkFjdGl2YXRlID0gQ2FuQWN0aXZhdGU7XG5leHBvcnRzLnJvdXRlckNhblJldXNlID0gQ09OU1RfRVhQUihuZXcgUm91dGVMaWZlY3ljbGVIb29rKFwicm91dGVyQ2FuUmV1c2VcIikpO1xuZXhwb3J0cy5yb3V0ZXJDYW5EZWFjdGl2YXRlID0gQ09OU1RfRVhQUihuZXcgUm91dGVMaWZlY3ljbGVIb29rKFwicm91dGVyQ2FuRGVhY3RpdmF0ZVwiKSk7XG5leHBvcnRzLnJvdXRlck9uQWN0aXZhdGUgPSBDT05TVF9FWFBSKG5ldyBSb3V0ZUxpZmVjeWNsZUhvb2soXCJyb3V0ZXJPbkFjdGl2YXRlXCIpKTtcbmV4cG9ydHMucm91dGVyT25SZXVzZSA9IENPTlNUX0VYUFIobmV3IFJvdXRlTGlmZWN5Y2xlSG9vayhcInJvdXRlck9uUmV1c2VcIikpO1xuZXhwb3J0cy5yb3V0ZXJPbkRlYWN0aXZhdGUgPSBDT05TVF9FWFBSKG5ldyBSb3V0ZUxpZmVjeWNsZUhvb2soXCJyb3V0ZXJPbkRlYWN0aXZhdGVcIikpO1xudmFyIGxpZmVjeWNsZV9hbm5vdGF0aW9uc19pbXBsXzEgPSByZXF1aXJlKCcuL2xpZmVjeWNsZV9hbm5vdGF0aW9uc19pbXBsJyk7XG5mdW5jdGlvbiBoYXNMaWZlY3ljbGVIb29rKGUsIHR5cGUpIHtcbiAgICBpZiAoISh0eXBlIGluc3RhbmNlb2YgVHlwZSkpXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gZS5uYW1lIGluIHR5cGUucHJvdG90eXBlO1xufVxuZXhwb3J0cy5oYXNMaWZlY3ljbGVIb29rID0gaGFzTGlmZWN5Y2xlSG9vaztcbmZ1bmN0aW9uIGdldENhbkFjdGl2YXRlSG9vayh0eXBlKSB7XG4gICAgdmFyIGFubm90YXRpb25zID0gcmVmbGVjdG9yLmFubm90YXRpb25zKHR5cGUpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgICAgdmFyIGFubm90YXRpb24gPSBhbm5vdGF0aW9uc1tpXTtcbiAgICAgICAgaWYgKGFubm90YXRpb24gaW5zdGFuY2VvZiBsaWZlY3ljbGVfYW5ub3RhdGlvbnNfaW1wbF8xLkNhbkFjdGl2YXRlKSB7XG4gICAgICAgICAgICByZXR1cm4gYW5ub3RhdGlvbi5mbjtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cbmV4cG9ydHMuZ2V0Q2FuQWN0aXZhdGVIb29rID0gZ2V0Q2FuQWN0aXZhdGVIb29rO1xudmFyIF9fZXh0ZW5kcyA9ICh0aGlzICYmIHRoaXMuX19leHRlbmRzKSB8fCBmdW5jdGlvbiAoZCwgYikge1xuICAgIGZvciAodmFyIHAgaW4gYikgaWYgKGIuaGFzT3duUHJvcGVydHkocCkpIGRbcF0gPSBiW3BdO1xuICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxuICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcbn07XG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcbn07XG52YXIgcm91dGVfZGVmaW5pdGlvbl8xID0gcmVxdWlyZSgnLi4vcm91dGVfZGVmaW5pdGlvbicpO1xuZXhwb3J0cy5Sb3V0ZURlZmluaXRpb24gPSByb3V0ZV9kZWZpbml0aW9uXzEuUm91dGVEZWZpbml0aW9uO1xuLyoqXG4gKiBUaGUgYFJvdXRlQ29uZmlnYCBkZWNvcmF0b3IgZGVmaW5lcyByb3V0ZXMgZm9yIGEgZ2l2ZW4gY29tcG9uZW50LlxuICpcbiAqIEl0IHRha2VzIGFuIGFycmF5IG9mIHtAbGluayBSb3V0ZURlZmluaXRpb259cy5cbiAqL1xudmFyIFJvdXRlQ29uZmlnID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSb3V0ZUNvbmZpZyhjb25maWdzKSB7XG4gICAgICAgIHRoaXMuY29uZmlncyA9IGNvbmZpZ3M7XG4gICAgfVxuICAgIFJvdXRlQ29uZmlnID0gX19kZWNvcmF0ZShbXG4gICAgICAgIENPTlNUKClcbiAgICBdLCBSb3V0ZUNvbmZpZyk7XG4gICAgcmV0dXJuIFJvdXRlQ29uZmlnO1xufSkoKTtcbmV4cG9ydHMuUm91dGVDb25maWcgPSBSb3V0ZUNvbmZpZztcbnZhciBBYnN0cmFjdFJvdXRlID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBYnN0cmFjdFJvdXRlKF9hKSB7XG4gICAgICAgIHZhciBuYW1lID0gX2EubmFtZSwgdXNlQXNEZWZhdWx0ID0gX2EudXNlQXNEZWZhdWx0LCBwYXRoID0gX2EucGF0aCwgcmVnZXggPSBfYS5yZWdleCwgc2VyaWFsaXplciA9IF9hLnNlcmlhbGl6ZXIsIGRhdGEgPSBfYS5kYXRhO1xuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgICAgICB0aGlzLnVzZUFzRGVmYXVsdCA9IHVzZUFzRGVmYXVsdDtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5yZWdleCA9IHJlZ2V4O1xuICAgICAgICB0aGlzLnNlcmlhbGl6ZXIgPSBzZXJpYWxpemVyO1xuICAgICAgICB0aGlzLmRhdGEgPSBkYXRhO1xuICAgIH1cbiAgICBBYnN0cmFjdFJvdXRlID0gX19kZWNvcmF0ZShbXG4gICAgICAgIENPTlNUKClcbiAgICBdLCBBYnN0cmFjdFJvdXRlKTtcbiAgICByZXR1cm4gQWJzdHJhY3RSb3V0ZTtcbn0pKCk7XG5leHBvcnRzLkFic3RyYWN0Um91dGUgPSBBYnN0cmFjdFJvdXRlO1xuLyoqXG4gKiBgUm91dGVgIGlzIGEgdHlwZSBvZiB7QGxpbmsgUm91dGVEZWZpbml0aW9ufSB1c2VkIHRvIHJvdXRlIGEgcGF0aCB0byBhIGNvbXBvbmVudC5cbiAqXG4gKiBJdCBoYXMgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogLSBgcGF0aGAgaXMgYSBzdHJpbmcgdGhhdCB1c2VzIHRoZSByb3V0ZSBtYXRjaGVyIERTTC5cbiAqIC0gYGNvbXBvbmVudGAgYSBjb21wb25lbnQgdHlwZS5cbiAqIC0gYG5hbWVgIGlzIGFuIG9wdGlvbmFsIGBDYW1lbENhc2VgIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG5hbWUgb2YgdGhlIHJvdXRlLlxuICogLSBgZGF0YWAgaXMgYW4gb3B0aW9uYWwgcHJvcGVydHkgb2YgYW55IHR5cGUgcmVwcmVzZW50aW5nIGFyYml0cmFyeSByb3V0ZSBtZXRhZGF0YSBmb3IgdGhlIGdpdmVuXG4gKiByb3V0ZS4gSXQgaXMgaW5qZWN0YWJsZSB2aWEge0BsaW5rIFJvdXRlRGF0YX0uXG4gKiAtIGB1c2VBc0RlZmF1bHRgIGlzIGEgYm9vbGVhbiB2YWx1ZS4gSWYgYHRydWVgLCB0aGUgY2hpbGQgcm91dGUgd2lsbCBiZSBuYXZpZ2F0ZWQgdG8gaWYgbm8gY2hpbGRcbiAqIHJvdXRlIGlzIHNwZWNpZmllZCBkdXJpbmcgdGhlIG5hdmlnYXRpb24uXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqIGBgYFxuICogaW1wb3J0IHtSb3V0ZUNvbmZpZywgUm91dGV9IGZyb20gJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQFJvdXRlQ29uZmlnKFtcbiAqICAgbmV3IFJvdXRlKHtwYXRoOiAnL2hvbWUnLCBjb21wb25lbnQ6IEhvbWVDbXAsIG5hbWU6ICdIb21lQ21wJyB9KVxuICogXSlcbiAqIGNsYXNzIE15QXBwIHt9XG4gKiBgYGBcbiAqL1xudmFyIFJvdXRlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUm91dGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUm91dGUoX2EpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBfYS5uYW1lLCB1c2VBc0RlZmF1bHQgPSBfYS51c2VBc0RlZmF1bHQsIHBhdGggPSBfYS5wYXRoLCByZWdleCA9IF9hLnJlZ2V4LCBzZXJpYWxpemVyID0gX2Euc2VyaWFsaXplciwgZGF0YSA9IF9hLmRhdGEsIGNvbXBvbmVudCA9IF9hLmNvbXBvbmVudDtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdDogdXNlQXNEZWZhdWx0LFxuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgICAgICAgIHNlcmlhbGl6ZXI6IHNlcmlhbGl6ZXIsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmF1eCA9IG51bGw7XG4gICAgICAgIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50O1xuICAgIH1cbiAgICBSb3V0ZSA9IF9fZGVjb3JhdGUoW1xuICAgICAgICBDT05TVCgpXG4gICAgXSwgUm91dGUpO1xuICAgIHJldHVybiBSb3V0ZTtcbn0pKEFic3RyYWN0Um91dGUpO1xuZXhwb3J0cy5Sb3V0ZSA9IFJvdXRlO1xuLyoqXG4gKiBgQXV4Um91dGVgIGlzIGEgdHlwZSBvZiB7QGxpbmsgUm91dGVEZWZpbml0aW9ufSB1c2VkIHRvIGRlZmluZSBhbiBhdXhpbGlhcnkgcm91dGUuXG4gKlxuICogSXQgdGFrZXMgYW4gb2JqZWN0IHdpdGggdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogLSBgcGF0aGAgaXMgYSBzdHJpbmcgdGhhdCB1c2VzIHRoZSByb3V0ZSBtYXRjaGVyIERTTC5cbiAqIC0gYGNvbXBvbmVudGAgYSBjb21wb25lbnQgdHlwZS5cbiAqIC0gYG5hbWVgIGlzIGFuIG9wdGlvbmFsIGBDYW1lbENhc2VgIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG5hbWUgb2YgdGhlIHJvdXRlLlxuICogLSBgZGF0YWAgaXMgYW4gb3B0aW9uYWwgcHJvcGVydHkgb2YgYW55IHR5cGUgcmVwcmVzZW50aW5nIGFyYml0cmFyeSByb3V0ZSBtZXRhZGF0YSBmb3IgdGhlIGdpdmVuXG4gKiByb3V0ZS4gSXQgaXMgaW5qZWN0YWJsZSB2aWEge0BsaW5rIFJvdXRlRGF0YX0uXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqIGBgYFxuICogaW1wb3J0IHtSb3V0ZUNvbmZpZywgQXV4Um91dGV9IGZyb20gJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQFJvdXRlQ29uZmlnKFtcbiAqICAgbmV3IEF1eFJvdXRlKHtwYXRoOiAnL2hvbWUnLCBjb21wb25lbnQ6IEhvbWVDbXB9KVxuICogXSlcbiAqIGNsYXNzIE15QXBwIHt9XG4gKiBgYGBcbiAqL1xudmFyIEF1eFJvdXRlID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoQXV4Um91dGUsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gQXV4Um91dGUoX2EpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBfYS5uYW1lLCB1c2VBc0RlZmF1bHQgPSBfYS51c2VBc0RlZmF1bHQsIHBhdGggPSBfYS5wYXRoLCByZWdleCA9IF9hLnJlZ2V4LCBzZXJpYWxpemVyID0gX2Euc2VyaWFsaXplciwgZGF0YSA9IF9hLmRhdGEsIGNvbXBvbmVudCA9IF9hLmNvbXBvbmVudDtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdDogdXNlQXNEZWZhdWx0LFxuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgICAgICAgIHNlcmlhbGl6ZXI6IHNlcmlhbGl6ZXIsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudDtcbiAgICB9XG4gICAgQXV4Um91dGUgPSBfX2RlY29yYXRlKFtcbiAgICAgICAgQ09OU1QoKVxuICAgIF0sIEF1eFJvdXRlKTtcbiAgICByZXR1cm4gQXV4Um91dGU7XG59KShBYnN0cmFjdFJvdXRlKTtcbmV4cG9ydHMuQXV4Um91dGUgPSBBdXhSb3V0ZTtcbi8qKlxuICogYEFzeW5jUm91dGVgIGlzIGEgdHlwZSBvZiB7QGxpbmsgUm91dGVEZWZpbml0aW9ufSB1c2VkIHRvIHJvdXRlIGEgcGF0aCB0byBhbiBhc3luY2hyb25vdXNseVxuICogbG9hZGVkIGNvbXBvbmVudC5cbiAqXG4gKiBJdCBoYXMgdGhlIGZvbGxvd2luZyBwcm9wZXJ0aWVzOlxuICogLSBgcGF0aGAgaXMgYSBzdHJpbmcgdGhhdCB1c2VzIHRoZSByb3V0ZSBtYXRjaGVyIERTTC5cbiAqIC0gYGxvYWRlcmAgaXMgYSBmdW5jdGlvbiB0aGF0IHJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYSBjb21wb25lbnQuXG4gKiAtIGBuYW1lYCBpcyBhbiBvcHRpb25hbCBgQ2FtZWxDYXNlYCBzdHJpbmcgcmVwcmVzZW50aW5nIHRoZSBuYW1lIG9mIHRoZSByb3V0ZS5cbiAqIC0gYGRhdGFgIGlzIGFuIG9wdGlvbmFsIHByb3BlcnR5IG9mIGFueSB0eXBlIHJlcHJlc2VudGluZyBhcmJpdHJhcnkgcm91dGUgbWV0YWRhdGEgZm9yIHRoZSBnaXZlblxuICogcm91dGUuIEl0IGlzIGluamVjdGFibGUgdmlhIHtAbGluayBSb3V0ZURhdGF9LlxuICogLSBgdXNlQXNEZWZhdWx0YCBpcyBhIGJvb2xlYW4gdmFsdWUuIElmIGB0cnVlYCwgdGhlIGNoaWxkIHJvdXRlIHdpbGwgYmUgbmF2aWdhdGVkIHRvIGlmIG5vIGNoaWxkXG4gKiByb3V0ZSBpcyBzcGVjaWZpZWQgZHVyaW5nIHRoZSBuYXZpZ2F0aW9uLlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKiBgYGBcbiAqIGltcG9ydCB7Um91dGVDb25maWcsIEFzeW5jUm91dGV9IGZyb20gJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQFJvdXRlQ29uZmlnKFtcbiAqICAgbmV3IEFzeW5jUm91dGUoe3BhdGg6ICcvaG9tZScsIGxvYWRlcjogKCkgPT4gUHJvbWlzZS5yZXNvbHZlKE15TG9hZGVkQ21wKSwgbmFtZTpcbiAqICdNeUxvYWRlZENtcCd9KVxuICogXSlcbiAqIGNsYXNzIE15QXBwIHt9XG4gKiBgYGBcbiAqL1xudmFyIEFzeW5jUm91dGUgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhBc3luY1JvdXRlLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIEFzeW5jUm91dGUoX2EpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBfYS5uYW1lLCB1c2VBc0RlZmF1bHQgPSBfYS51c2VBc0RlZmF1bHQsIHBhdGggPSBfYS5wYXRoLCByZWdleCA9IF9hLnJlZ2V4LCBzZXJpYWxpemVyID0gX2Euc2VyaWFsaXplciwgZGF0YSA9IF9hLmRhdGEsIGxvYWRlciA9IF9hLmxvYWRlcjtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywge1xuICAgICAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdDogdXNlQXNEZWZhdWx0LFxuICAgICAgICAgICAgcGF0aDogcGF0aCxcbiAgICAgICAgICAgIHJlZ2V4OiByZWdleCxcbiAgICAgICAgICAgIHNlcmlhbGl6ZXI6IHNlcmlhbGl6ZXIsXG4gICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmF1eCA9IG51bGw7XG4gICAgICAgIHRoaXMubG9hZGVyID0gbG9hZGVyO1xuICAgIH1cbiAgICBBc3luY1JvdXRlID0gX19kZWNvcmF0ZShbXG4gICAgICAgIENPTlNUKClcbiAgICBdLCBBc3luY1JvdXRlKTtcbiAgICByZXR1cm4gQXN5bmNSb3V0ZTtcbn0pKEFic3RyYWN0Um91dGUpO1xuZXhwb3J0cy5Bc3luY1JvdXRlID0gQXN5bmNSb3V0ZTtcbi8qKlxuICogYFJlZGlyZWN0YCBpcyBhIHR5cGUgb2Yge0BsaW5rIFJvdXRlRGVmaW5pdGlvbn0gdXNlZCB0byByb3V0ZSBhIHBhdGggdG8gYSBjYW5vbmljYWwgcm91dGUuXG4gKlxuICogSXQgaGFzIHRoZSBmb2xsb3dpbmcgcHJvcGVydGllczpcbiAqIC0gYHBhdGhgIGlzIGEgc3RyaW5nIHRoYXQgdXNlcyB0aGUgcm91dGUgbWF0Y2hlciBEU0wuXG4gKiAtIGByZWRpcmVjdFRvYCBpcyBhbiBhcnJheSByZXByZXNlbnRpbmcgdGhlIGxpbmsgRFNMLlxuICpcbiAqIE5vdGUgdGhhdCByZWRpcmVjdHMgKipkbyBub3QqKiBhZmZlY3QgaG93IGxpbmtzIGFyZSBnZW5lcmF0ZWQuIEZvciB0aGF0LCBzZWUgdGhlIGB1c2VBc0RlZmF1bHRgXG4gKiBvcHRpb24uXG4gKlxuICogIyMjIEV4YW1wbGVcbiAqIGBgYFxuICogaW1wb3J0IHtSb3V0ZUNvbmZpZywgUm91dGUsIFJlZGlyZWN0fSBmcm9tICdhbmd1bGFyMi9yb3V0ZXInO1xuICpcbiAqIEBSb3V0ZUNvbmZpZyhbXG4gKiAgIG5ldyBSZWRpcmVjdCh7cGF0aDogJy8nLCByZWRpcmVjdFRvOiBbJy9Ib21lJ10gfSksXG4gKiAgIG5ldyBSb3V0ZSh7cGF0aDogJy9ob21lJywgY29tcG9uZW50OiBIb21lQ21wLCBuYW1lOiAnSG9tZSd9KVxuICogXSlcbiAqIGNsYXNzIE15QXBwIHt9XG4gKiBgYGBcbiAqL1xudmFyIFJlZGlyZWN0ID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVkaXJlY3QsIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUmVkaXJlY3QoX2EpIHtcbiAgICAgICAgdmFyIG5hbWUgPSBfYS5uYW1lLCB1c2VBc0RlZmF1bHQgPSBfYS51c2VBc0RlZmF1bHQsIHBhdGggPSBfYS5wYXRoLCByZWdleCA9IF9hLnJlZ2V4LCBzZXJpYWxpemVyID0gX2Euc2VyaWFsaXplciwgZGF0YSA9IF9hLmRhdGEsIHJlZGlyZWN0VG8gPSBfYS5yZWRpcmVjdFRvO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCB7XG4gICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgdXNlQXNEZWZhdWx0OiB1c2VBc0RlZmF1bHQsXG4gICAgICAgICAgICBwYXRoOiBwYXRoLFxuICAgICAgICAgICAgcmVnZXg6IHJlZ2V4LFxuICAgICAgICAgICAgc2VyaWFsaXplcjogc2VyaWFsaXplcixcbiAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMucmVkaXJlY3RUbyA9IHJlZGlyZWN0VG87XG4gICAgfVxuICAgIFJlZGlyZWN0ID0gX19kZWNvcmF0ZShbXG4gICAgICAgIENPTlNUKClcbiAgICBdLCBSZWRpcmVjdCk7XG4gICAgcmV0dXJuIFJlZGlyZWN0O1xufSkoQWJzdHJhY3RSb3V0ZSk7XG5leHBvcnRzLlJlZGlyZWN0ID0gUmVkaXJlY3Q7XG52YXIgcm91dGVfY29uZmlnX2RlY29yYXRvcl8xID0gcmVxdWlyZSgnLi9yb3V0ZV9jb25maWdfZGVjb3JhdG9yJyk7XG4vKipcbiAqIEdpdmVuIGEgSlMgT2JqZWN0IHRoYXQgcmVwcmVzZW50cyBhIHJvdXRlIGNvbmZpZywgcmV0dXJucyBhIGNvcnJlc3BvbmRpbmcgUm91dGUsIEFzeW5jUm91dGUsXG4gKiBBdXhSb3V0ZSBvciBSZWRpcmVjdCBvYmplY3QuXG4gKlxuICogQWxzbyB3cmFwcyBhbiBBc3luY1JvdXRlJ3MgbG9hZGVyIGZ1bmN0aW9uIHRvIGFkZCB0aGUgbG9hZGVkIGNvbXBvbmVudCdzIHJvdXRlIGNvbmZpZyB0byB0aGVcbiAqIGBSb3V0ZVJlZ2lzdHJ5YC5cbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplUm91dGVDb25maWcoY29uZmlnLCByZWdpc3RyeSkge1xuICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuQXN5bmNSb3V0ZSkge1xuICAgICAgICB2YXIgd3JhcHBlZExvYWRlciA9IHdyYXBMb2FkZXJUb1JlY29uZmlndXJlUmVnaXN0cnkoY29uZmlnLmxvYWRlciwgcmVnaXN0cnkpO1xuICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5Bc3luY1JvdXRlKHtcbiAgICAgICAgICAgIHBhdGg6IGNvbmZpZy5wYXRoLFxuICAgICAgICAgICAgbG9hZGVyOiB3cmFwcGVkTG9hZGVyLFxuICAgICAgICAgICAgbmFtZTogY29uZmlnLm5hbWUsXG4gICAgICAgICAgICBkYXRhOiBjb25maWcuZGF0YSxcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdDogY29uZmlnLnVzZUFzRGVmYXVsdFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5Sb3V0ZSB8fCBjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuUmVkaXJlY3QgfHwgY29uZmlnIGluc3RhbmNlb2Ygcm91dGVfY29uZmlnX2RlY29yYXRvcl8xLkF1eFJvdXRlKSB7XG4gICAgICAgIHJldHVybiBjb25maWc7XG4gICAgfVxuICAgIGlmICgoKyEhY29uZmlnLmNvbXBvbmVudCkgKyAoKyEhY29uZmlnLnJlZGlyZWN0VG8pICsgKCshIWNvbmZpZy5sb2FkZXIpICE9IDEpIHtcbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJSb3V0ZSBjb25maWcgc2hvdWxkIGNvbnRhaW4gZXhhY3RseSBvbmUgXFxcImNvbXBvbmVudFxcXCIsIFxcXCJsb2FkZXJcXFwiLCBvciBcXFwicmVkaXJlY3RUb1xcXCIgcHJvcGVydHkuXCIpO1xuICAgIH1cbiAgICBpZiAoY29uZmlnLmFzICYmIGNvbmZpZy5uYW1lKSB7XG4gICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUm91dGUgY29uZmlnIHNob3VsZCBjb250YWluIGV4YWN0bHkgb25lIFxcXCJhc1xcXCIgb3IgXFxcIm5hbWVcXFwiIHByb3BlcnR5LlwiKTtcbiAgICB9XG4gICAgaWYgKGNvbmZpZy5hcykge1xuICAgICAgICBjb25maWcubmFtZSA9IGNvbmZpZy5hcztcbiAgICB9XG4gICAgaWYgKGNvbmZpZy5sb2FkZXIpIHtcbiAgICAgICAgdmFyIHdyYXBwZWRMb2FkZXIgPSB3cmFwTG9hZGVyVG9SZWNvbmZpZ3VyZVJlZ2lzdHJ5KGNvbmZpZy5sb2FkZXIsIHJlZ2lzdHJ5KTtcbiAgICAgICAgcmV0dXJuIG5ldyByb3V0ZV9jb25maWdfZGVjb3JhdG9yXzEuQXN5bmNSb3V0ZSh7XG4gICAgICAgICAgICBwYXRoOiBjb25maWcucGF0aCxcbiAgICAgICAgICAgIGxvYWRlcjogd3JhcHBlZExvYWRlcixcbiAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgICAgZGF0YTogY29uZmlnLmRhdGEsXG4gICAgICAgICAgICB1c2VBc0RlZmF1bHQ6IGNvbmZpZy51c2VBc0RlZmF1bHRcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGlmIChjb25maWcuYXV4KSB7XG4gICAgICAgIHJldHVybiBuZXcgcm91dGVfY29uZmlnX2RlY29yYXRvcl8xLkF1eFJvdXRlKHsgcGF0aDogY29uZmlnLmF1eCwgY29tcG9uZW50OiBjb25maWcuY29tcG9uZW50LCBuYW1lOiBjb25maWcubmFtZSB9KTtcbiAgICB9XG4gICAgaWYgKGNvbmZpZy5jb21wb25lbnQpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBjb25maWcuY29tcG9uZW50ID09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB2YXIgY29tcG9uZW50RGVmaW5pdGlvbk9iamVjdCA9IGNvbmZpZy5jb21wb25lbnQ7XG4gICAgICAgICAgICBpZiAoY29tcG9uZW50RGVmaW5pdGlvbk9iamVjdC50eXBlID09ICdjb25zdHJ1Y3RvcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5Sb3V0ZSh7XG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGNvbmZpZy5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IGNvbXBvbmVudERlZmluaXRpb25PYmplY3QuY29uc3RydWN0b3IsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjb25maWcuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgdXNlQXNEZWZhdWx0OiBjb25maWcudXNlQXNEZWZhdWx0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChjb21wb25lbnREZWZpbml0aW9uT2JqZWN0LnR5cGUgPT0gJ2xvYWRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5Bc3luY1JvdXRlKHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogY29uZmlnLnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIGxvYWRlcjogY29tcG9uZW50RGVmaW5pdGlvbk9iamVjdC5sb2FkZXIsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBjb25maWcuZGF0YSxcbiAgICAgICAgICAgICAgICAgICAgdXNlQXNEZWZhdWx0OiBjb25maWcudXNlQXNEZWZhdWx0XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkludmFsaWQgY29tcG9uZW50IHR5cGUgXFxcIlwiICsgY29tcG9uZW50RGVmaW5pdGlvbk9iamVjdC50eXBlICsgXCJcXFwiLiBWYWxpZCB0eXBlcyBhcmUgXFxcImNvbnN0cnVjdG9yXFxcIiBhbmQgXFxcImxvYWRlclxcXCIuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgcm91dGVfY29uZmlnX2RlY29yYXRvcl8xLlJvdXRlKGNvbmZpZyk7XG4gICAgfVxuICAgIGlmIChjb25maWcucmVkaXJlY3RUbykge1xuICAgICAgICByZXR1cm4gbmV3IHJvdXRlX2NvbmZpZ19kZWNvcmF0b3JfMS5SZWRpcmVjdCh7IHBhdGg6IGNvbmZpZy5wYXRoLCByZWRpcmVjdFRvOiBjb25maWcucmVkaXJlY3RUbyB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGNvbmZpZztcbn1cbmV4cG9ydHMubm9ybWFsaXplUm91dGVDb25maWcgPSBub3JtYWxpemVSb3V0ZUNvbmZpZztcbmZ1bmN0aW9uIHdyYXBMb2FkZXJUb1JlY29uZmlndXJlUmVnaXN0cnkobG9hZGVyLCByZWdpc3RyeSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBsb2FkZXIoKS50aGVuKGZ1bmN0aW9uIChjb21wb25lbnRUeXBlKSB7XG4gICAgICAgICAgICByZWdpc3RyeS5jb25maWdGcm9tQ29tcG9uZW50KGNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudFR5cGU7XG4gICAgICAgIH0pO1xuICAgIH07XG59XG5mdW5jdGlvbiBhc3NlcnRDb21wb25lbnRFeGlzdHMoY29tcG9uZW50LCBwYXRoKSB7XG4gICAgaWYgKCFpc1R5cGUoY29tcG9uZW50KSkge1xuICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkNvbXBvbmVudCBmb3Igcm91dGUgXFxcIlwiICsgcGF0aCArIFwiXFxcIiBpcyBub3QgZGVmaW5lZCwgb3IgaXMgbm90IGEgY2xhc3MuXCIpO1xuICAgIH1cbn1cbmV4cG9ydHMuYXNzZXJ0Q29tcG9uZW50RXhpc3RzID0gYXNzZXJ0Q29tcG9uZW50RXhpc3RzO1xudmFyIGluc3RydWN0aW9uXzEgPSByZXF1aXJlKCcuLi8uLi9pbnN0cnVjdGlvbicpO1xudmFyIEFzeW5jUm91dGVIYW5kbGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBBc3luY1JvdXRlSGFuZGxlcihfbG9hZGVyLCBkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhID09PSB2b2lkIDApIHsgZGF0YSA9IG51bGw7IH1cbiAgICAgICAgdGhpcy5fbG9hZGVyID0gX2xvYWRlcjtcbiAgICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgICB0aGlzLl9yZXNvbHZlZENvbXBvbmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuZGF0YSA9IGlzUHJlc2VudChkYXRhKSA/IG5ldyBpbnN0cnVjdGlvbl8xLlJvdXRlRGF0YShkYXRhKSA6IGluc3RydWN0aW9uXzEuQkxBTktfUk9VVEVfREFUQTtcbiAgICB9XG4gICAgQXN5bmNSb3V0ZUhhbmRsZXIucHJvdG90eXBlLnJlc29sdmVDb21wb25lbnRUeXBlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX3Jlc29sdmVkQ29tcG9uZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3Jlc29sdmVkQ29tcG9uZW50O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9yZXNvbHZlZENvbXBvbmVudCA9IHRoaXMuX2xvYWRlcigpLnRoZW4oZnVuY3Rpb24gKGNvbXBvbmVudFR5cGUpIHtcbiAgICAgICAgICAgIF90aGlzLmNvbXBvbmVudFR5cGUgPSBjb21wb25lbnRUeXBlO1xuICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudFR5cGU7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgcmV0dXJuIEFzeW5jUm91dGVIYW5kbGVyO1xufSkoKTtcbmV4cG9ydHMuQXN5bmNSb3V0ZUhhbmRsZXIgPSBBc3luY1JvdXRlSGFuZGxlcjtcbnZhciBpbnN0cnVjdGlvbl8xID0gcmVxdWlyZSgnLi4vLi4vaW5zdHJ1Y3Rpb24nKTtcbnZhciBTeW5jUm91dGVIYW5kbGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBTeW5jUm91dGVIYW5kbGVyKGNvbXBvbmVudFR5cGUsIGRhdGEpIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnRUeXBlID0gY29tcG9uZW50VHlwZTtcbiAgICAgICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgICAgICB0aGlzLl9yZXNvbHZlZENvbXBvbmVudCA9IG51bGw7XG4gICAgICAgIHRoaXMuX3Jlc29sdmVkQ29tcG9uZW50ID0gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZShjb21wb25lbnRUeXBlKTtcbiAgICAgICAgdGhpcy5kYXRhID0gaXNQcmVzZW50KGRhdGEpID8gbmV3IGluc3RydWN0aW9uXzEuUm91dGVEYXRhKGRhdGEpIDogaW5zdHJ1Y3Rpb25fMS5CTEFOS19ST1VURV9EQVRBO1xuICAgIH1cbiAgICBTeW5jUm91dGVIYW5kbGVyLnByb3RvdHlwZS5yZXNvbHZlQ29tcG9uZW50VHlwZSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3Jlc29sdmVkQ29tcG9uZW50OyB9O1xuICAgIHJldHVybiBTeW5jUm91dGVIYW5kbGVyO1xufSkoKTtcbmV4cG9ydHMuU3luY1JvdXRlSGFuZGxlciA9IFN5bmNSb3V0ZUhhbmRsZXI7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciB1cmxfcGFyc2VyXzEgPSByZXF1aXJlKCcuLi91cmxfcGFyc2VyJyk7XG52YXIgaW5zdHJ1Y3Rpb25fMSA9IHJlcXVpcmUoJy4uL2luc3RydWN0aW9uJyk7XG4vLyBSb3V0ZU1hdGNoIG9iamVjdHMgaG9sZCBpbmZvcm1hdGlvbiBhYm91dCBhIG1hdGNoIGJldHdlZW4gYSBydWxlIGFuZCBhIFVSTFxudmFyIFJvdXRlTWF0Y2ggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJvdXRlTWF0Y2goKSB7XG4gICAgfVxuICAgIHJldHVybiBSb3V0ZU1hdGNoO1xufSkoKTtcbmV4cG9ydHMuUm91dGVNYXRjaCA9IFJvdXRlTWF0Y2g7XG52YXIgUGF0aE1hdGNoID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUGF0aE1hdGNoLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIFBhdGhNYXRjaChpbnN0cnVjdGlvbiwgcmVtYWluaW5nLCByZW1haW5pbmdBdXgpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcyk7XG4gICAgICAgIHRoaXMuaW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbjtcbiAgICAgICAgdGhpcy5yZW1haW5pbmcgPSByZW1haW5pbmc7XG4gICAgICAgIHRoaXMucmVtYWluaW5nQXV4ID0gcmVtYWluaW5nQXV4O1xuICAgIH1cbiAgICByZXR1cm4gUGF0aE1hdGNoO1xufSkoUm91dGVNYXRjaCk7XG5leHBvcnRzLlBhdGhNYXRjaCA9IFBhdGhNYXRjaDtcbnZhciBSZWRpcmVjdE1hdGNoID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVkaXJlY3RNYXRjaCwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSZWRpcmVjdE1hdGNoKHJlZGlyZWN0VG8sIHNwZWNpZmljaXR5KSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMpO1xuICAgICAgICB0aGlzLnJlZGlyZWN0VG8gPSByZWRpcmVjdFRvO1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gc3BlY2lmaWNpdHk7XG4gICAgfVxuICAgIHJldHVybiBSZWRpcmVjdE1hdGNoO1xufSkoUm91dGVNYXRjaCk7XG5leHBvcnRzLlJlZGlyZWN0TWF0Y2ggPSBSZWRpcmVjdE1hdGNoO1xudmFyIFJlZGlyZWN0UnVsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUmVkaXJlY3RSdWxlKF9wYXRoUmVjb2duaXplciwgcmVkaXJlY3RUbykge1xuICAgICAgICB0aGlzLl9wYXRoUmVjb2duaXplciA9IF9wYXRoUmVjb2duaXplcjtcbiAgICAgICAgdGhpcy5yZWRpcmVjdFRvID0gcmVkaXJlY3RUbztcbiAgICAgICAgdGhpcy5oYXNoID0gdGhpcy5fcGF0aFJlY29nbml6ZXIuaGFzaDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJlZGlyZWN0UnVsZS5wcm90b3R5cGUsIFwicGF0aFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fcGF0aFJlY29nbml6ZXIudG9TdHJpbmcoKTsgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbiAodmFsKSB7IHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKCd5b3UgY2Fubm90IHNldCB0aGUgcGF0aCBvZiBhIFJlZGlyZWN0UnVsZSBkaXJlY3RseScpOyB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIGBudWxsYCBvciBhIGBQYXJzZWRVcmxgIHJlcHJlc2VudGluZyB0aGUgbmV3IHBhdGggdG8gbWF0Y2hcbiAgICAgKi9cbiAgICBSZWRpcmVjdFJ1bGUucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uIChiZWdpbm5pbmdTZWdtZW50KSB7XG4gICAgICAgIHZhciBtYXRjaCA9IG51bGw7XG4gICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5fcGF0aFJlY29nbml6ZXIubWF0Y2hVcmwoYmVnaW5uaW5nU2VnbWVudCkpKSB7XG4gICAgICAgICAgICBtYXRjaCA9IG5ldyBSZWRpcmVjdE1hdGNoKHRoaXMucmVkaXJlY3RUbywgdGhpcy5fcGF0aFJlY29nbml6ZXIuc3BlY2lmaWNpdHkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5yZXNvbHZlKG1hdGNoKTtcbiAgICB9O1xuICAgIFJlZGlyZWN0UnVsZS5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiVHJpZWQgdG8gZ2VuZXJhdGUgYSByZWRpcmVjdC5cIik7XG4gICAgfTtcbiAgICByZXR1cm4gUmVkaXJlY3RSdWxlO1xufSkoKTtcbmV4cG9ydHMuUmVkaXJlY3RSdWxlID0gUmVkaXJlY3RSdWxlO1xuLy8gcmVwcmVzZW50cyBzb21ldGhpbmcgbGlrZSAnL2Zvby86YmFyJ1xudmFyIFJvdXRlUnVsZSA9IChmdW5jdGlvbiAoKSB7XG4gICAgLy8gVE9ETzogY2FjaGUgY29tcG9uZW50IGluc3RydWN0aW9uIGluc3RhbmNlcyBieSBwYXJhbXMgYW5kIGJ5IFBhcnNlZFVybCBpbnN0YW5jZVxuICAgIGZ1bmN0aW9uIFJvdXRlUnVsZShfcm91dGVQYXRoLCBoYW5kbGVyKSB7XG4gICAgICAgIHRoaXMuX3JvdXRlUGF0aCA9IF9yb3V0ZVBhdGg7XG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG4gICAgICAgIHRoaXMuX2NhY2hlID0gbmV3IE1hcCgpO1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gdGhpcy5fcm91dGVQYXRoLnNwZWNpZmljaXR5O1xuICAgICAgICB0aGlzLmhhc2ggPSB0aGlzLl9yb3V0ZVBhdGguaGFzaDtcbiAgICAgICAgdGhpcy50ZXJtaW5hbCA9IHRoaXMuX3JvdXRlUGF0aC50ZXJtaW5hbDtcbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJvdXRlUnVsZS5wcm90b3R5cGUsIFwicGF0aFwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fcm91dGVQYXRoLnRvU3RyaW5nKCk7IH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkgeyB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbigneW91IGNhbm5vdCBzZXQgdGhlIHBhdGggb2YgYSBSb3V0ZVJ1bGUgZGlyZWN0bHknKTsgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgUm91dGVSdWxlLnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAoYmVnaW5uaW5nU2VnbWVudCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgcmVzID0gdGhpcy5fcm91dGVQYXRoLm1hdGNoVXJsKGJlZ2lubmluZ1NlZ21lbnQpO1xuICAgICAgICBpZiAoaXNCbGFuayhyZXMpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVyLnJlc29sdmVDb21wb25lbnRUeXBlKCkudGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgdmFyIGNvbXBvbmVudEluc3RydWN0aW9uID0gX3RoaXMuX2dldEluc3RydWN0aW9uKHJlcy51cmxQYXRoLCByZXMudXJsUGFyYW1zLCByZXMuYWxsUGFyYW1zKTtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUGF0aE1hdGNoKGNvbXBvbmVudEluc3RydWN0aW9uLCByZXMucmVzdCwgcmVzLmF1eGlsaWFyeSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUm91dGVSdWxlLnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgdmFyIGdlbmVyYXRlZCA9IHRoaXMuX3JvdXRlUGF0aC5nZW5lcmF0ZVVybChwYXJhbXMpO1xuICAgICAgICB2YXIgdXJsUGF0aCA9IGdlbmVyYXRlZC51cmxQYXRoO1xuICAgICAgICB2YXIgdXJsUGFyYW1zID0gZ2VuZXJhdGVkLnVybFBhcmFtcztcbiAgICAgICAgcmV0dXJuIHRoaXMuX2dldEluc3RydWN0aW9uKHVybFBhdGgsIHVybF9wYXJzZXJfMS5jb252ZXJ0VXJsUGFyYW1zVG9BcnJheSh1cmxQYXJhbXMpLCBwYXJhbXMpO1xuICAgIH07XG4gICAgUm91dGVSdWxlLnByb3RvdHlwZS5nZW5lcmF0ZUNvbXBvbmVudFBhdGhWYWx1ZXMgPSBmdW5jdGlvbiAocGFyYW1zKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9yb3V0ZVBhdGguZ2VuZXJhdGVVcmwocGFyYW1zKTtcbiAgICB9O1xuICAgIFJvdXRlUnVsZS5wcm90b3R5cGUuX2dldEluc3RydWN0aW9uID0gZnVuY3Rpb24gKHVybFBhdGgsIHVybFBhcmFtcywgcGFyYW1zKSB7XG4gICAgICAgIGlmIChpc0JsYW5rKHRoaXMuaGFuZGxlci5jb21wb25lbnRUeXBlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJUcmllZCB0byBnZXQgaW5zdHJ1Y3Rpb24gYmVmb3JlIHRoZSB0eXBlIHdhcyBsb2FkZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBoYXNoS2V5ID0gdXJsUGF0aCArICc/JyArIHVybFBhcmFtcy5qb2luKCcmJyk7XG4gICAgICAgIGlmICh0aGlzLl9jYWNoZS5oYXMoaGFzaEtleSkpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLl9jYWNoZS5nZXQoaGFzaEtleSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGluc3RydWN0aW9uID0gbmV3IGluc3RydWN0aW9uXzEuQ29tcG9uZW50SW5zdHJ1Y3Rpb24odXJsUGF0aCwgdXJsUGFyYW1zLCB0aGlzLmhhbmRsZXIuZGF0YSwgdGhpcy5oYW5kbGVyLmNvbXBvbmVudFR5cGUsIHRoaXMudGVybWluYWwsIHRoaXMuc3BlY2lmaWNpdHksIHBhcmFtcyk7XG4gICAgICAgIHRoaXMuX2NhY2hlLnNldChoYXNoS2V5LCBpbnN0cnVjdGlvbik7XG4gICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICB9O1xuICAgIHJldHVybiBSb3V0ZVJ1bGU7XG59KSgpO1xuZXhwb3J0cy5Sb3V0ZVJ1bGUgPSBSb3V0ZVJ1bGU7XG52YXIgcnVsZXNfMSA9IHJlcXVpcmUoJy4vcnVsZXMnKTtcbnZhciByb3V0ZV9jb25maWdfaW1wbF8xID0gcmVxdWlyZSgnLi4vcm91dGVfY29uZmlnL3JvdXRlX2NvbmZpZ19pbXBsJyk7XG52YXIgYXN5bmNfcm91dGVfaGFuZGxlcl8xID0gcmVxdWlyZSgnLi9yb3V0ZV9oYW5kbGVycy9hc3luY19yb3V0ZV9oYW5kbGVyJyk7XG52YXIgc3luY19yb3V0ZV9oYW5kbGVyXzEgPSByZXF1aXJlKCcuL3JvdXRlX2hhbmRsZXJzL3N5bmNfcm91dGVfaGFuZGxlcicpO1xudmFyIHBhcmFtX3JvdXRlX3BhdGhfMSA9IHJlcXVpcmUoJy4vcm91dGVfcGF0aHMvcGFyYW1fcm91dGVfcGF0aCcpO1xudmFyIHJlZ2V4X3JvdXRlX3BhdGhfMSA9IHJlcXVpcmUoJy4vcm91dGVfcGF0aHMvcmVnZXhfcm91dGVfcGF0aCcpO1xuLyoqXG4gKiBBIGBSdWxlU2V0YCBpcyByZXNwb25zaWJsZSBmb3IgcmVjb2duaXppbmcgcm91dGVzIGZvciBhIHBhcnRpY3VsYXIgY29tcG9uZW50LlxuICogSXQgaXMgY29uc3VtZWQgYnkgYFJvdXRlUmVnaXN0cnlgLCB3aGljaCBrbm93cyBob3cgdG8gcmVjb2duaXplIGFuIGVudGlyZSBoaWVyYXJjaHkgb2ZcbiAqIGNvbXBvbmVudHMuXG4gKi9cbnZhciBSdWxlU2V0ID0gKGZ1bmN0aW9uICgpIHtcbiAgICBmdW5jdGlvbiBSdWxlU2V0KCkge1xuICAgICAgICB0aGlzLnJ1bGVzQnlOYW1lID0gbmV3IE1hcCgpO1xuICAgICAgICAvLyBtYXAgZnJvbSBuYW1lIHRvIHJ1bGVcbiAgICAgICAgdGhpcy5hdXhSdWxlc0J5TmFtZSA9IG5ldyBNYXAoKTtcbiAgICAgICAgLy8gbWFwIGZyb20gc3RhcnRpbmcgcGF0aCB0byBydWxlXG4gICAgICAgIHRoaXMuYXV4UnVsZXNCeVBhdGggPSBuZXcgTWFwKCk7XG4gICAgICAgIC8vIFRPRE86IG9wdGltaXplIHRoaXMgaW50byBhIHRyaWVcbiAgICAgICAgdGhpcy5ydWxlcyA9IFtdO1xuICAgICAgICAvLyB0aGUgcnVsZSB0byB1c2UgYXV0b21hdGljYWxseSB3aGVuIHJlY29nbml6aW5nIG9yIGdlbmVyYXRpbmcgZnJvbSB0aGlzIHJ1bGUgc2V0XG4gICAgICAgIHRoaXMuZGVmYXVsdFJ1bGUgPSBudWxsO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBDb25maWd1cmUgYWRkaXRpb25hbCBydWxlcyBpbiB0aGlzIHJ1bGUgc2V0IGZyb20gYSByb3V0ZSBkZWZpbml0aW9uXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgdGhlIGNvbmZpZyBpcyB0ZXJtaW5hbFxuICAgICAqL1xuICAgIFJ1bGVTZXQucHJvdG90eXBlLmNvbmZpZyA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgdmFyIGhhbmRsZXI7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoY29uZmlnLm5hbWUpICYmIGNvbmZpZy5uYW1lWzBdLnRvVXBwZXJDYXNlKCkgIT0gY29uZmlnLm5hbWVbMF0pIHtcbiAgICAgICAgICAgIHZhciBzdWdnZXN0ZWROYW1lID0gY29uZmlnLm5hbWVbMF0udG9VcHBlckNhc2UoKSArIGNvbmZpZy5uYW1lLnN1YnN0cmluZygxKTtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUm91dGUgXFxcIlwiICsgY29uZmlnLnBhdGggKyBcIlxcXCIgd2l0aCBuYW1lIFxcXCJcIiArIGNvbmZpZy5uYW1lICsgXCJcXFwiIGRvZXMgbm90IGJlZ2luIHdpdGggYW4gdXBwZXJjYXNlIGxldHRlci4gUm91dGUgbmFtZXMgc2hvdWxkIGJlIENhbWVsQ2FzZSBsaWtlIFxcXCJcIiArIHN1Z2dlc3RlZE5hbWUgKyBcIlxcXCIuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLkF1eFJvdXRlKSB7XG4gICAgICAgICAgICBoYW5kbGVyID0gbmV3IHN5bmNfcm91dGVfaGFuZGxlcl8xLlN5bmNSb3V0ZUhhbmRsZXIoY29uZmlnLmNvbXBvbmVudCwgY29uZmlnLmRhdGEpO1xuICAgICAgICAgICAgdmFyIHJvdXRlUGF0aF8xID0gdGhpcy5fZ2V0Um91dGVQYXRoKGNvbmZpZyk7XG4gICAgICAgICAgICB2YXIgYXV4UnVsZSA9IG5ldyBydWxlc18xLlJvdXRlUnVsZShyb3V0ZVBhdGhfMSwgaGFuZGxlcik7XG4gICAgICAgICAgICB0aGlzLmF1eFJ1bGVzQnlQYXRoLnNldChyb3V0ZVBhdGhfMS50b1N0cmluZygpLCBhdXhSdWxlKTtcbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQoY29uZmlnLm5hbWUpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hdXhSdWxlc0J5TmFtZS5zZXQoY29uZmlnLm5hbWUsIGF1eFJ1bGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGF1eFJ1bGUudGVybWluYWw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHVzZUFzRGVmYXVsdCA9IGZhbHNlO1xuICAgICAgICBpZiAoY29uZmlnIGluc3RhbmNlb2Ygcm91dGVfY29uZmlnX2ltcGxfMS5SZWRpcmVjdCkge1xuICAgICAgICAgICAgdmFyIHJvdXRlUGF0aF8yID0gdGhpcy5fZ2V0Um91dGVQYXRoKGNvbmZpZyk7XG4gICAgICAgICAgICB2YXIgcmVkaXJlY3RvciA9IG5ldyBydWxlc18xLlJlZGlyZWN0UnVsZShyb3V0ZVBhdGhfMiwgY29uZmlnLnJlZGlyZWN0VG8pO1xuICAgICAgICAgICAgdGhpcy5fYXNzZXJ0Tm9IYXNoQ29sbGlzaW9uKHJlZGlyZWN0b3IuaGFzaCwgY29uZmlnLnBhdGgpO1xuICAgICAgICAgICAgdGhpcy5ydWxlcy5wdXNoKHJlZGlyZWN0b3IpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuUm91dGUpIHtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBuZXcgc3luY19yb3V0ZV9oYW5kbGVyXzEuU3luY1JvdXRlSGFuZGxlcihjb25maWcuY29tcG9uZW50LCBjb25maWcuZGF0YSk7XG4gICAgICAgICAgICB1c2VBc0RlZmF1bHQgPSBpc1ByZXNlbnQoY29uZmlnLnVzZUFzRGVmYXVsdCkgJiYgY29uZmlnLnVzZUFzRGVmYXVsdDtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLkFzeW5jUm91dGUpIHtcbiAgICAgICAgICAgIGhhbmRsZXIgPSBuZXcgYXN5bmNfcm91dGVfaGFuZGxlcl8xLkFzeW5jUm91dGVIYW5kbGVyKGNvbmZpZy5sb2FkZXIsIGNvbmZpZy5kYXRhKTtcbiAgICAgICAgICAgIHVzZUFzRGVmYXVsdCA9IGlzUHJlc2VudChjb25maWcudXNlQXNEZWZhdWx0KSAmJiBjb25maWcudXNlQXNEZWZhdWx0O1xuICAgICAgICB9XG4gICAgICAgIHZhciByb3V0ZVBhdGggPSB0aGlzLl9nZXRSb3V0ZVBhdGgoY29uZmlnKTtcbiAgICAgICAgdmFyIG5ld1J1bGUgPSBuZXcgcnVsZXNfMS5Sb3V0ZVJ1bGUocm91dGVQYXRoLCBoYW5kbGVyKTtcbiAgICAgICAgdGhpcy5fYXNzZXJ0Tm9IYXNoQ29sbGlzaW9uKG5ld1J1bGUuaGFzaCwgY29uZmlnLnBhdGgpO1xuICAgICAgICBpZiAodXNlQXNEZWZhdWx0KSB7XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuZGVmYXVsdFJ1bGUpKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJPbmx5IG9uZSByb3V0ZSBjYW4gYmUgZGVmYXVsdFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuZGVmYXVsdFJ1bGUgPSBuZXdSdWxlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMucnVsZXMucHVzaChuZXdSdWxlKTtcbiAgICAgICAgaWYgKGlzUHJlc2VudChjb25maWcubmFtZSkpIHtcbiAgICAgICAgICAgIHRoaXMucnVsZXNCeU5hbWUuc2V0KGNvbmZpZy5uYW1lLCBuZXdSdWxlKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3UnVsZS50ZXJtaW5hbDtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgVVJMLCByZXR1cm5zIGEgbGlzdCBvZiBgUm91dGVNYXRjaGBlcywgd2hpY2ggYXJlIHBhcnRpYWwgcmVjb2duaXRpb25zIGZvciBzb21lIHJvdXRlLlxuICAgICAqL1xuICAgIFJ1bGVTZXQucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uICh1cmxQYXJzZSkge1xuICAgICAgICB2YXIgc29sdXRpb25zID0gW107XG4gICAgICAgIHRoaXMucnVsZXMuZm9yRWFjaChmdW5jdGlvbiAocm91dGVSZWNvZ25pemVyKSB7XG4gICAgICAgICAgICB2YXIgcGF0aE1hdGNoID0gcm91dGVSZWNvZ25pemVyLnJlY29nbml6ZSh1cmxQYXJzZSk7XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KHBhdGhNYXRjaCkpIHtcbiAgICAgICAgICAgICAgICBzb2x1dGlvbnMucHVzaChwYXRoTWF0Y2gpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgLy8gaGFuZGxlIGNhc2VzIHdoZXJlIHdlIGFyZSByb3V0aW5nIGp1c3QgdG8gYW4gYXV4IHJvdXRlXG4gICAgICAgIGlmIChzb2x1dGlvbnMubGVuZ3RoID09IDAgJiYgaXNQcmVzZW50KHVybFBhcnNlKSAmJiB1cmxQYXJzZS5hdXhpbGlhcnkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtQcm9taXNlV3JhcHBlci5yZXNvbHZlKG5ldyBydWxlc18xLlBhdGhNYXRjaChudWxsLCBudWxsLCB1cmxQYXJzZS5hdXhpbGlhcnkpKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNvbHV0aW9ucztcbiAgICB9O1xuICAgIFJ1bGVTZXQucHJvdG90eXBlLnJlY29nbml6ZUF1eGlsaWFyeSA9IGZ1bmN0aW9uICh1cmxQYXJzZSkge1xuICAgICAgICB2YXIgcm91dGVSZWNvZ25pemVyID0gdGhpcy5hdXhSdWxlc0J5UGF0aC5nZXQodXJsUGFyc2UucGF0aCk7XG4gICAgICAgIGlmIChpc1ByZXNlbnQocm91dGVSZWNvZ25pemVyKSkge1xuICAgICAgICAgICAgcmV0dXJuIFtyb3V0ZVJlY29nbml6ZXIucmVjb2duaXplKHVybFBhcnNlKV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFtQcm9taXNlV3JhcHBlci5yZXNvbHZlKG51bGwpXTtcbiAgICB9O1xuICAgIFJ1bGVTZXQucHJvdG90eXBlLmhhc1JvdXRlID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIHRoaXMucnVsZXNCeU5hbWUuaGFzKG5hbWUpOyB9O1xuICAgIFJ1bGVTZXQucHJvdG90eXBlLmNvbXBvbmVudExvYWRlZCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhc1JvdXRlKG5hbWUpICYmIGlzUHJlc2VudCh0aGlzLnJ1bGVzQnlOYW1lLmdldChuYW1lKS5oYW5kbGVyLmNvbXBvbmVudFR5cGUpO1xuICAgIH07XG4gICAgUnVsZVNldC5wcm90b3R5cGUubG9hZENvbXBvbmVudCA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnJ1bGVzQnlOYW1lLmdldChuYW1lKS5oYW5kbGVyLnJlc29sdmVDb21wb25lbnRUeXBlKCk7XG4gICAgfTtcbiAgICBSdWxlU2V0LnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChuYW1lLCBwYXJhbXMpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSB0aGlzLnJ1bGVzQnlOYW1lLmdldChuYW1lKTtcbiAgICAgICAgaWYgKGlzQmxhbmsocnVsZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBydWxlLmdlbmVyYXRlKHBhcmFtcyk7XG4gICAgfTtcbiAgICBSdWxlU2V0LnByb3RvdHlwZS5nZW5lcmF0ZUF1eGlsaWFyeSA9IGZ1bmN0aW9uIChuYW1lLCBwYXJhbXMpIHtcbiAgICAgICAgdmFyIHJ1bGUgPSB0aGlzLmF1eFJ1bGVzQnlOYW1lLmdldChuYW1lKTtcbiAgICAgICAgaWYgKGlzQmxhbmsocnVsZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBydWxlLmdlbmVyYXRlKHBhcmFtcyk7XG4gICAgfTtcbiAgICBSdWxlU2V0LnByb3RvdHlwZS5fYXNzZXJ0Tm9IYXNoQ29sbGlzaW9uID0gZnVuY3Rpb24gKGhhc2gsIHBhdGgpIHtcbiAgICAgICAgdGhpcy5ydWxlcy5mb3JFYWNoKGZ1bmN0aW9uIChydWxlKSB7XG4gICAgICAgICAgICBpZiAoaGFzaCA9PSBydWxlLmhhc2gpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkNvbmZpZ3VyYXRpb24gJ1wiICsgcGF0aCArIFwiJyBjb25mbGljdHMgd2l0aCBleGlzdGluZyByb3V0ZSAnXCIgKyBydWxlLnBhdGggKyBcIidcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgUnVsZVNldC5wcm90b3R5cGUuX2dldFJvdXRlUGF0aCA9IGZ1bmN0aW9uIChjb25maWcpIHtcbiAgICAgICAgaWYgKGlzUHJlc2VudChjb25maWcucmVnZXgpKSB7XG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjb25maWcuc2VyaWFsaXplcikpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJlZ2V4X3JvdXRlX3BhdGhfMS5SZWdleFJvdXRlUGF0aChjb25maWcucmVnZXgsIGNvbmZpZy5zZXJpYWxpemVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUm91dGUgcHJvdmlkZXMgYSByZWdleCBwcm9wZXJ0eSwgJ1wiICsgY29uZmlnLnJlZ2V4ICsgXCInLCBidXQgbm8gc2VyaWFsaXplciBwcm9wZXJ0eVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNQcmVzZW50KGNvbmZpZy5wYXRoKSkge1xuICAgICAgICAgICAgLy8gQXV4aWxpYXJ5IHJvdXRlcyBkbyBub3QgaGF2ZSBhIHNsYXNoIGF0IHRoZSBzdGFydFxuICAgICAgICAgICAgdmFyIHBhdGggPSAoY29uZmlnIGluc3RhbmNlb2Ygcm91dGVfY29uZmlnX2ltcGxfMS5BdXhSb3V0ZSAmJiBjb25maWcucGF0aC5zdGFydHNXaXRoKCcvJykpID9cbiAgICAgICAgICAgICAgICBjb25maWcucGF0aC5zdWJzdHJpbmcoMSkgOlxuICAgICAgICAgICAgICAgIGNvbmZpZy5wYXRoO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBwYXJhbV9yb3V0ZV9wYXRoXzEuUGFyYW1Sb3V0ZVBhdGgocGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oJ1JvdXRlIG11c3QgcHJvdmlkZSBlaXRoZXIgYSBwYXRoIG9yIHJlZ2V4IHByb3BlcnR5Jyk7XG4gICAgfTtcbiAgICByZXR1cm4gUnVsZVNldDtcbn0pKCk7XG5leHBvcnRzLlJ1bGVTZXQgPSBSdWxlU2V0O1xudmFyIE1hdGNoZWRVcmwgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIE1hdGNoZWRVcmwodXJsUGF0aCwgdXJsUGFyYW1zLCBhbGxQYXJhbXMsIGF1eGlsaWFyeSwgcmVzdCkge1xuICAgICAgICB0aGlzLnVybFBhdGggPSB1cmxQYXRoO1xuICAgICAgICB0aGlzLnVybFBhcmFtcyA9IHVybFBhcmFtcztcbiAgICAgICAgdGhpcy5hbGxQYXJhbXMgPSBhbGxQYXJhbXM7XG4gICAgICAgIHRoaXMuYXV4aWxpYXJ5ID0gYXV4aWxpYXJ5O1xuICAgICAgICB0aGlzLnJlc3QgPSByZXN0O1xuICAgIH1cbiAgICByZXR1cm4gTWF0Y2hlZFVybDtcbn0pKCk7XG5leHBvcnRzLk1hdGNoZWRVcmwgPSBNYXRjaGVkVXJsO1xudmFyIEdlbmVyYXRlZFVybCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gR2VuZXJhdGVkVXJsKHVybFBhdGgsIHVybFBhcmFtcykge1xuICAgICAgICB0aGlzLnVybFBhdGggPSB1cmxQYXRoO1xuICAgICAgICB0aGlzLnVybFBhcmFtcyA9IHVybFBhcmFtcztcbiAgICB9XG4gICAgcmV0dXJuIEdlbmVyYXRlZFVybDtcbn0pKCk7XG5leHBvcnRzLkdlbmVyYXRlZFVybCA9IEdlbmVyYXRlZFVybDtcbnZhciB1dGlsc18xID0gcmVxdWlyZSgnLi4vLi4vdXRpbHMnKTtcbnZhciB1cmxfcGFyc2VyXzEgPSByZXF1aXJlKCcuLi8uLi91cmxfcGFyc2VyJyk7XG52YXIgcm91dGVfcGF0aF8xID0gcmVxdWlyZSgnLi9yb3V0ZV9wYXRoJyk7XG4vKipcbiAqIElkZW50aWZpZWQgYnkgYSBgLi4uYCBVUkwgc2VnbWVudC4gVGhpcyBpbmRpY2F0ZXMgdGhhdCB0aGVcbiAqIFJvdXRlIHdpbGwgY29udGludWUgdG8gYmUgbWF0Y2hlZCBieSBjaGlsZCBgUm91dGVyYHMuXG4gKi9cbnZhciBDb250aW51YXRpb25QYXRoU2VnbWVudCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gQ29udGludWF0aW9uUGF0aFNlZ21lbnQoKSB7XG4gICAgICAgIHRoaXMubmFtZSA9ICcnO1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gJyc7XG4gICAgICAgIHRoaXMuaGFzaCA9ICcuLi4nO1xuICAgIH1cbiAgICBDb250aW51YXRpb25QYXRoU2VnbWVudC5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAocGFyYW1zKSB7IHJldHVybiAnJzsgfTtcbiAgICBDb250aW51YXRpb25QYXRoU2VnbWVudC5wcm90b3R5cGUubWF0Y2ggPSBmdW5jdGlvbiAocGF0aCkgeyByZXR1cm4gdHJ1ZTsgfTtcbiAgICByZXR1cm4gQ29udGludWF0aW9uUGF0aFNlZ21lbnQ7XG59KSgpO1xuLyoqXG4gKiBJZGVudGlmaWVkIGJ5IGEgc3RyaW5nIG5vdCBzdGFydGluZyB3aXRoIGEgYDpgIG9yIGAqYC5cbiAqIE9ubHkgbWF0Y2hlcyB0aGUgVVJMIHNlZ21lbnRzIHRoYXQgZXF1YWwgdGhlIHNlZ21lbnQgcGF0aFxuICovXG52YXIgU3RhdGljUGF0aFNlZ21lbnQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFN0YXRpY1BhdGhTZWdtZW50KHBhdGgpIHtcbiAgICAgICAgdGhpcy5wYXRoID0gcGF0aDtcbiAgICAgICAgdGhpcy5uYW1lID0gJyc7XG4gICAgICAgIHRoaXMuc3BlY2lmaWNpdHkgPSAnMic7XG4gICAgICAgIHRoaXMuaGFzaCA9IHBhdGg7XG4gICAgfVxuICAgIFN0YXRpY1BhdGhTZWdtZW50LnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uIChwYXRoKSB7IHJldHVybiBwYXRoID09IHRoaXMucGF0aDsgfTtcbiAgICBTdGF0aWNQYXRoU2VnbWVudC5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAocGFyYW1zKSB7IHJldHVybiB0aGlzLnBhdGg7IH07XG4gICAgcmV0dXJuIFN0YXRpY1BhdGhTZWdtZW50O1xufSkoKTtcbi8qKlxuICogSWRlbnRpZmllZCBieSBhIHN0cmluZyBzdGFydGluZyB3aXRoIGA6YC4gSW5kaWNhdGVzIGEgc2VnbWVudFxuICogdGhhdCBjYW4gY29udGFpbiBhIHZhbHVlIHRoYXQgd2lsbCBiZSBleHRyYWN0ZWQgYW5kIHByb3ZpZGVkIHRvXG4gKiBhIG1hdGNoaW5nIGBJbnN0cnVjdGlvbmAuXG4gKi9cbnZhciBEeW5hbWljUGF0aFNlZ21lbnQgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIER5bmFtaWNQYXRoU2VnbWVudChuYW1lKSB7XG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgICAgIHRoaXMuc3BlY2lmaWNpdHkgPSAnMSc7XG4gICAgICAgIHRoaXMuaGFzaCA9ICc6JztcbiAgICB9XG4gICAgRHluYW1pY1BhdGhTZWdtZW50LnByb3RvdHlwZS5tYXRjaCA9IGZ1bmN0aW9uIChwYXRoKSB7IHJldHVybiBwYXRoLmxlbmd0aCA+IDA7IH07XG4gICAgRHluYW1pY1BhdGhTZWdtZW50LnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHtcbiAgICAgICAgaWYgKCFTdHJpbmdNYXBXcmFwcGVyLmNvbnRhaW5zKHBhcmFtcy5tYXAsIHRoaXMubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUm91dGUgZ2VuZXJhdG9yIGZvciAnXCIgKyB0aGlzLm5hbWUgKyBcIicgd2FzIG5vdCBpbmNsdWRlZCBpbiBwYXJhbWV0ZXJzIHBhc3NlZC5cIik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHV0aWxzXzEubm9ybWFsaXplU3RyaW5nKHBhcmFtcy5nZXQodGhpcy5uYW1lKSk7XG4gICAgfTtcbiAgICBEeW5hbWljUGF0aFNlZ21lbnQucGFyYW1NYXRjaGVyID0gL146KFteXFwvXSspJC9nO1xuICAgIHJldHVybiBEeW5hbWljUGF0aFNlZ21lbnQ7XG59KSgpO1xuLyoqXG4gKiBJZGVudGlmaWVkIGJ5IGEgc3RyaW5nIHN0YXJ0aW5nIHdpdGggYCpgIEluZGljYXRlcyB0aGF0IGFsbCB0aGUgZm9sbG93aW5nXG4gKiBzZWdtZW50cyBtYXRjaCB0aGlzIHJvdXRlIGFuZCB0aGF0IHRoZSB2YWx1ZSBvZiB0aGVzZSBzZWdtZW50cyBzaG91bGRcbiAqIGJlIHByb3ZpZGVkIHRvIGEgbWF0Y2hpbmcgYEluc3RydWN0aW9uYC5cbiAqL1xudmFyIFN0YXJQYXRoU2VnbWVudCA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gU3RhclBhdGhTZWdtZW50KG5hbWUpIHtcbiAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgdGhpcy5zcGVjaWZpY2l0eSA9ICcwJztcbiAgICAgICAgdGhpcy5oYXNoID0gJyonO1xuICAgIH1cbiAgICBTdGFyUGF0aFNlZ21lbnQucHJvdG90eXBlLm1hdGNoID0gZnVuY3Rpb24gKHBhdGgpIHsgcmV0dXJuIHRydWU7IH07XG4gICAgU3RhclBhdGhTZWdtZW50LnByb3RvdHlwZS5nZW5lcmF0ZSA9IGZ1bmN0aW9uIChwYXJhbXMpIHsgcmV0dXJuIHV0aWxzXzEubm9ybWFsaXplU3RyaW5nKHBhcmFtcy5nZXQodGhpcy5uYW1lKSk7IH07XG4gICAgU3RhclBhdGhTZWdtZW50LndpbGRjYXJkTWF0Y2hlciA9IC9eXFwqKFteXFwvXSspJC9nO1xuICAgIHJldHVybiBTdGFyUGF0aFNlZ21lbnQ7XG59KSgpO1xuLyoqXG4gKiBQYXJzZXMgYSBVUkwgc3RyaW5nIHVzaW5nIGEgZ2l2ZW4gbWF0Y2hlciBEU0wsIGFuZCBnZW5lcmF0ZXMgVVJMcyBmcm9tIHBhcmFtIG1hcHNcbiAqL1xudmFyIFBhcmFtUm91dGVQYXRoID0gKGZ1bmN0aW9uICgpIHtcbiAgICAvKipcbiAgICAgKiBUYWtlcyBhIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIG1hdGNoZXIgRFNMXG4gICAgICovXG4gICAgZnVuY3Rpb24gUGFyYW1Sb3V0ZVBhdGgocm91dGVQYXRoKSB7XG4gICAgICAgIHRoaXMucm91dGVQYXRoID0gcm91dGVQYXRoO1xuICAgICAgICB0aGlzLnRlcm1pbmFsID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5fYXNzZXJ0VmFsaWRQYXRoKHJvdXRlUGF0aCk7XG4gICAgICAgIHRoaXMuX3BhcnNlUGF0aFN0cmluZyhyb3V0ZVBhdGgpO1xuICAgICAgICB0aGlzLnNwZWNpZmljaXR5ID0gdGhpcy5fY2FsY3VsYXRlU3BlY2lmaWNpdHkoKTtcbiAgICAgICAgdGhpcy5oYXNoID0gdGhpcy5fY2FsY3VsYXRlSGFzaCgpO1xuICAgICAgICB2YXIgbGFzdFNlZ21lbnQgPSB0aGlzLl9zZWdtZW50c1t0aGlzLl9zZWdtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgICAgdGhpcy50ZXJtaW5hbCA9ICEobGFzdFNlZ21lbnQgaW5zdGFuY2VvZiBDb250aW51YXRpb25QYXRoU2VnbWVudCk7XG4gICAgfVxuICAgIFBhcmFtUm91dGVQYXRoLnByb3RvdHlwZS5tYXRjaFVybCA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgdmFyIG5leHRVcmxTZWdtZW50ID0gdXJsO1xuICAgICAgICB2YXIgY3VycmVudFVybFNlZ21lbnQ7XG4gICAgICAgIHZhciBwb3NpdGlvbmFsUGFyYW1zID0ge307XG4gICAgICAgIHZhciBjYXB0dXJlZCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NlZ21lbnRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICB2YXIgcGF0aFNlZ21lbnQgPSB0aGlzLl9zZWdtZW50c1tpXTtcbiAgICAgICAgICAgIGN1cnJlbnRVcmxTZWdtZW50ID0gbmV4dFVybFNlZ21lbnQ7XG4gICAgICAgICAgICBpZiAocGF0aFNlZ21lbnQgaW5zdGFuY2VvZiBDb250aW51YXRpb25QYXRoU2VnbWVudCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChjdXJyZW50VXJsU2VnbWVudCkpIHtcbiAgICAgICAgICAgICAgICAvLyB0aGUgc3RhciBzZWdtZW50IGNvbnN1bWVzIGFsbCBvZiB0aGUgcmVtYWluaW5nIFVSTCwgaW5jbHVkaW5nIG1hdHJpeCBwYXJhbXNcbiAgICAgICAgICAgICAgICBpZiAocGF0aFNlZ21lbnQgaW5zdGFuY2VvZiBTdGFyUGF0aFNlZ21lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb25hbFBhcmFtc1twYXRoU2VnbWVudC5uYW1lXSA9IGN1cnJlbnRVcmxTZWdtZW50LnRvU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGNhcHR1cmVkLnB1c2goY3VycmVudFVybFNlZ21lbnQudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICAgICAgICAgIG5leHRVcmxTZWdtZW50ID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNhcHR1cmVkLnB1c2goY3VycmVudFVybFNlZ21lbnQucGF0aCk7XG4gICAgICAgICAgICAgICAgaWYgKHBhdGhTZWdtZW50IGluc3RhbmNlb2YgRHluYW1pY1BhdGhTZWdtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uYWxQYXJhbXNbcGF0aFNlZ21lbnQubmFtZV0gPSBjdXJyZW50VXJsU2VnbWVudC5wYXRoO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIGlmICghcGF0aFNlZ21lbnQubWF0Y2goY3VycmVudFVybFNlZ21lbnQucGF0aCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG5leHRVcmxTZWdtZW50ID0gY3VycmVudFVybFNlZ21lbnQuY2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmICghcGF0aFNlZ21lbnQubWF0Y2goJycpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMudGVybWluYWwgJiYgaXNQcmVzZW50KG5leHRVcmxTZWdtZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHVybFBhdGggPSBjYXB0dXJlZC5qb2luKCcvJyk7XG4gICAgICAgIHZhciBhdXhpbGlhcnkgPSBbXTtcbiAgICAgICAgdmFyIHVybFBhcmFtcyA9IFtdO1xuICAgICAgICB2YXIgYWxsUGFyYW1zID0gcG9zaXRpb25hbFBhcmFtcztcbiAgICAgICAgaWYgKGlzUHJlc2VudChjdXJyZW50VXJsU2VnbWVudCkpIHtcbiAgICAgICAgICAgIC8vIElmIHRoaXMgaXMgdGhlIHJvb3QgY29tcG9uZW50LCByZWFkIHF1ZXJ5IHBhcmFtcy4gT3RoZXJ3aXNlLCByZWFkIG1hdHJpeCBwYXJhbXMuXG4gICAgICAgICAgICB2YXIgcGFyYW1zU2VnbWVudCA9IHVybCBpbnN0YW5jZW9mIHVybF9wYXJzZXJfMS5Sb290VXJsID8gdXJsIDogY3VycmVudFVybFNlZ21lbnQ7XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KHBhcmFtc1NlZ21lbnQucGFyYW1zKSkge1xuICAgICAgICAgICAgICAgIGFsbFBhcmFtcyA9IFN0cmluZ01hcFdyYXBwZXIubWVyZ2UocGFyYW1zU2VnbWVudC5wYXJhbXMsIHBvc2l0aW9uYWxQYXJhbXMpO1xuICAgICAgICAgICAgICAgIHVybFBhcmFtcyA9IHVybF9wYXJzZXJfMS5jb252ZXJ0VXJsUGFyYW1zVG9BcnJheShwYXJhbXNTZWdtZW50LnBhcmFtcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBhbGxQYXJhbXMgPSBwb3NpdGlvbmFsUGFyYW1zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXV4aWxpYXJ5ID0gY3VycmVudFVybFNlZ21lbnQuYXV4aWxpYXJ5O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgcm91dGVfcGF0aF8xLk1hdGNoZWRVcmwodXJsUGF0aCwgdXJsUGFyYW1zLCBhbGxQYXJhbXMsIGF1eGlsaWFyeSwgbmV4dFVybFNlZ21lbnQpO1xuICAgIH07XG4gICAgUGFyYW1Sb3V0ZVBhdGgucHJvdG90eXBlLmdlbmVyYXRlVXJsID0gZnVuY3Rpb24gKHBhcmFtcykge1xuICAgICAgICB2YXIgcGFyYW1Ub2tlbnMgPSBuZXcgdXRpbHNfMS5Ub3VjaE1hcChwYXJhbXMpO1xuICAgICAgICB2YXIgcGF0aCA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX3NlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IHRoaXMuX3NlZ21lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKCEoc2VnbWVudCBpbnN0YW5jZW9mIENvbnRpbnVhdGlvblBhdGhTZWdtZW50KSkge1xuICAgICAgICAgICAgICAgIHBhdGgucHVzaChzZWdtZW50LmdlbmVyYXRlKHBhcmFtVG9rZW5zKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHVybFBhdGggPSBwYXRoLmpvaW4oJy8nKTtcbiAgICAgICAgdmFyIG5vblBvc2l0aW9uYWxQYXJhbXMgPSBwYXJhbVRva2Vucy5nZXRVbnVzZWQoKTtcbiAgICAgICAgdmFyIHVybFBhcmFtcyA9IG5vblBvc2l0aW9uYWxQYXJhbXM7XG4gICAgICAgIHJldHVybiBuZXcgcm91dGVfcGF0aF8xLkdlbmVyYXRlZFVybCh1cmxQYXRoLCB1cmxQYXJhbXMpO1xuICAgIH07XG4gICAgUGFyYW1Sb3V0ZVBhdGgucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5yb3V0ZVBhdGg7IH07XG4gICAgUGFyYW1Sb3V0ZVBhdGgucHJvdG90eXBlLl9wYXJzZVBhdGhTdHJpbmcgPSBmdW5jdGlvbiAocm91dGVQYXRoKSB7XG4gICAgICAgIC8vIG5vcm1hbGl6ZSByb3V0ZSBhcyBub3Qgc3RhcnRpbmcgd2l0aCBhIFwiL1wiLiBSZWNvZ25pdGlvbiB3aWxsXG4gICAgICAgIC8vIGFsc28gbm9ybWFsaXplLlxuICAgICAgICBpZiAocm91dGVQYXRoLnN0YXJ0c1dpdGgoXCIvXCIpKSB7XG4gICAgICAgICAgICByb3V0ZVBhdGggPSByb3V0ZVBhdGguc3Vic3RyaW5nKDEpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBzZWdtZW50U3RyaW5ncyA9IHJvdXRlUGF0aC5zcGxpdCgnLycpO1xuICAgICAgICB0aGlzLl9zZWdtZW50cyA9IFtdO1xuICAgICAgICB2YXIgbGltaXQgPSBzZWdtZW50U3RyaW5ncy5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8PSBsaW1pdDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgc2VnbWVudCA9IHNlZ21lbnRTdHJpbmdzW2ldLCBtYXRjaDtcbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQobWF0Y2ggPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2goRHluYW1pY1BhdGhTZWdtZW50LnBhcmFtTWF0Y2hlciwgc2VnbWVudCkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2VnbWVudHMucHVzaChuZXcgRHluYW1pY1BhdGhTZWdtZW50KG1hdGNoWzFdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChpc1ByZXNlbnQobWF0Y2ggPSBSZWdFeHBXcmFwcGVyLmZpcnN0TWF0Y2goU3RhclBhdGhTZWdtZW50LndpbGRjYXJkTWF0Y2hlciwgc2VnbWVudCkpKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2VnbWVudHMucHVzaChuZXcgU3RhclBhdGhTZWdtZW50KG1hdGNoWzFdKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChzZWdtZW50ID09ICcuLi4nKSB7XG4gICAgICAgICAgICAgICAgaWYgKGkgPCBsaW1pdCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIlVuZXhwZWN0ZWQgXFxcIi4uLlxcXCIgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIHBhdGggZm9yIFxcXCJcIiArIHJvdXRlUGF0aCArIFwiXFxcIi5cIik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRoaXMuX3NlZ21lbnRzLnB1c2gobmV3IENvbnRpbnVhdGlvblBhdGhTZWdtZW50KCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fc2VnbWVudHMucHVzaChuZXcgU3RhdGljUGF0aFNlZ21lbnQoc2VnbWVudCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICBQYXJhbVJvdXRlUGF0aC5wcm90b3R5cGUuX2NhbGN1bGF0ZVNwZWNpZmljaXR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAvLyBUaGUgXCJzcGVjaWZpY2l0eVwiIG9mIGEgcGF0aCBpcyB1c2VkIHRvIGRldGVybWluZSB3aGljaCByb3V0ZSBpcyB1c2VkIHdoZW4gbXVsdGlwbGUgcm91dGVzXG4gICAgICAgIC8vIG1hdGNoXG4gICAgICAgIC8vIGEgVVJMLiBTdGF0aWMgc2VnbWVudHMgKGxpa2UgXCIvZm9vXCIpIGFyZSB0aGUgbW9zdCBzcGVjaWZpYywgZm9sbG93ZWQgYnkgZHluYW1pYyBzZWdtZW50c1xuICAgICAgICAvLyAobGlrZVxuICAgICAgICAvLyBcIi86aWRcIikuIFN0YXIgc2VnbWVudHMgYWRkIG5vIHNwZWNpZmljaXR5LiBTZWdtZW50cyBhdCB0aGUgc3RhcnQgb2YgdGhlIHBhdGggYXJlIG1vcmVcbiAgICAgICAgLy8gc3BlY2lmaWNcbiAgICAgICAgLy8gdGhhbiBwcm9jZWVkaW5nIG9uZXMuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIFRoZSBjb2RlIGJlbG93IHVzZXMgcGxhY2UgdmFsdWVzIHRvIGNvbWJpbmUgdGhlIGRpZmZlcmVudCB0eXBlcyBvZiBzZWdtZW50cyBpbnRvIGEgc2luZ2xlXG4gICAgICAgIC8vIHN0cmluZyB0aGF0IHdlIGNhbiBzb3J0IGxhdGVyLiBFYWNoIHN0YXRpYyBzZWdtZW50IGlzIG1hcmtlZCBhcyBhIHNwZWNpZmljaXR5IG9mIFwiMixcIiBlYWNoXG4gICAgICAgIC8vIGR5bmFtaWMgc2VnbWVudCBpcyB3b3J0aCBcIjFcIiBzcGVjaWZpY2l0eSwgYW5kIHN0YXJzIGFyZSB3b3J0aCBcIjBcIiBzcGVjaWZpY2l0eS5cbiAgICAgICAgdmFyIGksIGxlbmd0aCA9IHRoaXMuX3NlZ21lbnRzLmxlbmd0aCwgc3BlY2lmaWNpdHk7XG4gICAgICAgIGlmIChsZW5ndGggPT0gMCkge1xuICAgICAgICAgICAgLy8gYSBzaW5nbGUgc2xhc2ggKG9yIFwiZW1wdHkgc2VnbWVudFwiIGlzIGFzIHNwZWNpZmljIGFzIGEgc3RhdGljIHNlZ21lbnRcbiAgICAgICAgICAgIHNwZWNpZmljaXR5ICs9ICcyJztcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHNwZWNpZmljaXR5ID0gJyc7XG4gICAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBzcGVjaWZpY2l0eSArPSB0aGlzLl9zZWdtZW50c1tpXS5zcGVjaWZpY2l0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gc3BlY2lmaWNpdHk7XG4gICAgfTtcbiAgICBQYXJhbVJvdXRlUGF0aC5wcm90b3R5cGUuX2NhbGN1bGF0ZUhhc2ggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIC8vIHRoaXMgZnVuY3Rpb24gaXMgdXNlZCB0byBkZXRlcm1pbmUgd2hldGhlciBhIHJvdXRlIGNvbmZpZyBwYXRoIGxpa2UgYC9mb28vOmlkYCBjb2xsaWRlcyB3aXRoXG4gICAgICAgIC8vIGAvZm9vLzpuYW1lYFxuICAgICAgICB2YXIgaSwgbGVuZ3RoID0gdGhpcy5fc2VnbWVudHMubGVuZ3RoO1xuICAgICAgICB2YXIgaGFzaFBhcnRzID0gW107XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaGFzaFBhcnRzLnB1c2godGhpcy5fc2VnbWVudHNbaV0uaGFzaCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhc2hQYXJ0cy5qb2luKCcvJyk7XG4gICAgfTtcbiAgICBQYXJhbVJvdXRlUGF0aC5wcm90b3R5cGUuX2Fzc2VydFZhbGlkUGF0aCA9IGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICAgIGlmIChTdHJpbmdXcmFwcGVyLmNvbnRhaW5zKHBhdGgsICcjJykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiUGF0aCBcXFwiXCIgKyBwYXRoICsgXCJcXFwiIHNob3VsZCBub3QgaW5jbHVkZSBcXFwiI1xcXCIuIFVzZSBcXFwiSGFzaExvY2F0aW9uU3RyYXRlZ3lcXFwiIGluc3RlYWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBpbGxlZ2FsQ2hhcmFjdGVyID0gUmVnRXhwV3JhcHBlci5maXJzdE1hdGNoKFBhcmFtUm91dGVQYXRoLlJFU0VSVkVEX0NIQVJTLCBwYXRoKTtcbiAgICAgICAgaWYgKGlzUHJlc2VudChpbGxlZ2FsQ2hhcmFjdGVyKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJQYXRoIFxcXCJcIiArIHBhdGggKyBcIlxcXCIgY29udGFpbnMgXFxcIlwiICsgaWxsZWdhbENoYXJhY3RlclswXSArIFwiXFxcIiB3aGljaCBpcyBub3QgYWxsb3dlZCBpbiBhIHJvdXRlIGNvbmZpZy5cIik7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIFBhcmFtUm91dGVQYXRoLlJFU0VSVkVEX0NIQVJTID0gUmVnRXhwV3JhcHBlci5jcmVhdGUoJy8vfFxcXFwofFxcXFwpfDt8XFxcXD98PScpO1xuICAgIHJldHVybiBQYXJhbVJvdXRlUGF0aDtcbn0pKCk7XG5leHBvcnRzLlBhcmFtUm91dGVQYXRoID0gUGFyYW1Sb3V0ZVBhdGg7XG52YXIgcm91dGVfcGF0aF8xID0gcmVxdWlyZSgnLi9yb3V0ZV9wYXRoJyk7XG52YXIgUmVnZXhSb3V0ZVBhdGggPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJlZ2V4Um91dGVQYXRoKF9yZVN0cmluZywgX3NlcmlhbGl6ZXIpIHtcbiAgICAgICAgdGhpcy5fcmVTdHJpbmcgPSBfcmVTdHJpbmc7XG4gICAgICAgIHRoaXMuX3NlcmlhbGl6ZXIgPSBfc2VyaWFsaXplcjtcbiAgICAgICAgdGhpcy50ZXJtaW5hbCA9IHRydWU7XG4gICAgICAgIHRoaXMuc3BlY2lmaWNpdHkgPSAnMic7XG4gICAgICAgIHRoaXMuaGFzaCA9IHRoaXMuX3JlU3RyaW5nO1xuICAgICAgICB0aGlzLl9yZWdleCA9IFJlZ0V4cFdyYXBwZXIuY3JlYXRlKHRoaXMuX3JlU3RyaW5nKTtcbiAgICB9XG4gICAgUmVnZXhSb3V0ZVBhdGgucHJvdG90eXBlLm1hdGNoVXJsID0gZnVuY3Rpb24gKHVybCkge1xuICAgICAgICB2YXIgdXJsUGF0aCA9IHVybC50b1N0cmluZygpO1xuICAgICAgICB2YXIgcGFyYW1zID0ge307XG4gICAgICAgIHZhciBtYXRjaGVyID0gUmVnRXhwV3JhcHBlci5tYXRjaGVyKHRoaXMuX3JlZ2V4LCB1cmxQYXRoKTtcbiAgICAgICAgdmFyIG1hdGNoID0gUmVnRXhwTWF0Y2hlcldyYXBwZXIubmV4dChtYXRjaGVyKTtcbiAgICAgICAgaWYgKGlzQmxhbmsobWF0Y2gpKSB7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1hdGNoLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgICBwYXJhbXNbaS50b1N0cmluZygpXSA9IG1hdGNoW2ldO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgcm91dGVfcGF0aF8xLk1hdGNoZWRVcmwodXJsUGF0aCwgW10sIHBhcmFtcywgW10sIG51bGwpO1xuICAgIH07XG4gICAgUmVnZXhSb3V0ZVBhdGgucHJvdG90eXBlLmdlbmVyYXRlVXJsID0gZnVuY3Rpb24gKHBhcmFtcykgeyByZXR1cm4gdGhpcy5fc2VyaWFsaXplcihwYXJhbXMpOyB9O1xuICAgIFJlZ2V4Um91dGVQYXRoLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXMuX3JlU3RyaW5nOyB9O1xuICAgIHJldHVybiBSZWdleFJvdXRlUGF0aDtcbn0pKCk7XG5leHBvcnRzLlJlZ2V4Um91dGVQYXRoID0gUmVnZXhSb3V0ZVBhdGg7XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbi8qKlxuICogYFJvdXRlUGFyYW1zYCBpcyBhbiBpbW11dGFibGUgbWFwIG9mIHBhcmFtZXRlcnMgZm9yIHRoZSBnaXZlbiByb3V0ZVxuICogYmFzZWQgb24gdGhlIHVybCBtYXRjaGVyIGFuZCBvcHRpb25hbCBwYXJhbWV0ZXJzIGZvciB0aGF0IHJvdXRlLlxuICpcbiAqIFlvdSBjYW4gaW5qZWN0IGBSb3V0ZVBhcmFtc2AgaW50byB0aGUgY29uc3RydWN0b3Igb2YgYSBjb21wb25lbnQgdG8gdXNlIGl0LlxuICpcbiAqICMjIyBFeGFtcGxlXG4gKlxuICogYGBgXG4gKiBpbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG4gKiBpbXBvcnQge2Jvb3RzdHJhcH0gZnJvbSAnYW5ndWxhcjIvcGxhdGZvcm0vYnJvd3Nlcic7XG4gKiBpbXBvcnQge1JvdXRlciwgUk9VVEVSX0RJUkVDVElWRVMsIFJPVVRFUl9QUk9WSURFUlMsIFJvdXRlQ29uZmlnLCBSb3V0ZVBhcmFtc30gZnJvbVxuICogJ2FuZ3VsYXIyL3JvdXRlcic7XG4gKlxuICogQENvbXBvbmVudCh7ZGlyZWN0aXZlczogW1JPVVRFUl9ESVJFQ1RJVkVTXX0pXG4gKiBAUm91dGVDb25maWcoW1xuICogIHtwYXRoOiAnL3VzZXIvOmlkJywgY29tcG9uZW50OiBVc2VyQ21wLCBuYW1lOiAnVXNlckNtcCd9LFxuICogXSlcbiAqIGNsYXNzIEFwcENtcCB7fVxuICpcbiAqIEBDb21wb25lbnQoeyB0ZW1wbGF0ZTogJ3VzZXI6IHt7aWR9fScgfSlcbiAqIGNsYXNzIFVzZXJDbXAge1xuICogICBpZDogc3RyaW5nO1xuICogICBjb25zdHJ1Y3RvcihwYXJhbXM6IFJvdXRlUGFyYW1zKSB7XG4gKiAgICAgdGhpcy5pZCA9IHBhcmFtcy5nZXQoJ2lkJyk7XG4gKiAgIH1cbiAqIH1cbiAqXG4gKiBib290c3RyYXAoQXBwQ21wLCBST1VURVJfUFJPVklERVJTKTtcbiAqIGBgYFxuICovXG52YXIgUm91dGVQYXJhbXMgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJvdXRlUGFyYW1zKHBhcmFtcykge1xuICAgICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcztcbiAgICB9XG4gICAgUm91dGVQYXJhbXMucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChwYXJhbSkgeyByZXR1cm4gbm9ybWFsaXplQmxhbmsoU3RyaW5nTWFwV3JhcHBlci5nZXQodGhpcy5wYXJhbXMsIHBhcmFtKSk7IH07XG4gICAgcmV0dXJuIFJvdXRlUGFyYW1zO1xufSkoKTtcbmV4cG9ydHMuUm91dGVQYXJhbXMgPSBSb3V0ZVBhcmFtcztcbi8qKlxuICogYFJvdXRlRGF0YWAgaXMgYW4gaW1tdXRhYmxlIG1hcCBvZiBhZGRpdGlvbmFsIGRhdGEgeW91IGNhbiBjb25maWd1cmUgaW4geW91ciB7QGxpbmsgUm91dGV9LlxuICpcbiAqIFlvdSBjYW4gaW5qZWN0IGBSb3V0ZURhdGFgIGludG8gdGhlIGNvbnN0cnVjdG9yIG9mIGEgY29tcG9uZW50IHRvIHVzZSBpdC5cbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogaW1wb3J0IHtDb21wb25lbnR9IGZyb20gJ2FuZ3VsYXIyL2NvcmUnO1xuICogaW1wb3J0IHtib290c3RyYXB9IGZyb20gJ2FuZ3VsYXIyL3BsYXRmb3JtL2Jyb3dzZXInO1xuICogaW1wb3J0IHtSb3V0ZXIsIFJPVVRFUl9ESVJFQ1RJVkVTLCBST1VURVJfUFJPVklERVJTLCBSb3V0ZUNvbmZpZywgUm91dGVEYXRhfSBmcm9tXG4gKiAnYW5ndWxhcjIvcm91dGVyJztcbiAqXG4gKiBAQ29tcG9uZW50KHtkaXJlY3RpdmVzOiBbUk9VVEVSX0RJUkVDVElWRVNdfSlcbiAqIEBSb3V0ZUNvbmZpZyhbXG4gKiAge3BhdGg6ICcvdXNlci86aWQnLCBjb21wb25lbnQ6IFVzZXJDbXAsIG5hbWU6ICdVc2VyQ21wJywgZGF0YToge2lzQWRtaW46IHRydWV9fSxcbiAqIF0pXG4gKiBjbGFzcyBBcHBDbXAge31cbiAqXG4gKiBAQ29tcG9uZW50KHsuLi59KVxuICogQFZpZXcoeyB0ZW1wbGF0ZTogJ3VzZXI6IHt7aXNBZG1pbn19JyB9KVxuICogY2xhc3MgVXNlckNtcCB7XG4gKiAgIHN0cmluZzogaXNBZG1pbjtcbiAqICAgY29uc3RydWN0b3IoZGF0YTogUm91dGVEYXRhKSB7XG4gKiAgICAgdGhpcy5pc0FkbWluID0gZGF0YS5nZXQoJ2lzQWRtaW4nKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGJvb3RzdHJhcChBcHBDbXAsIFJPVVRFUl9QUk9WSURFUlMpO1xuICogYGBgXG4gKi9cbnZhciBSb3V0ZURhdGEgPSAoZnVuY3Rpb24gKCkge1xuICAgIGZ1bmN0aW9uIFJvdXRlRGF0YShkYXRhKSB7XG4gICAgICAgIGlmIChkYXRhID09PSB2b2lkIDApIHsgZGF0YSA9IENPTlNUX0VYUFIoe30pOyB9XG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgfVxuICAgIFJvdXRlRGF0YS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkgeyByZXR1cm4gbm9ybWFsaXplQmxhbmsoU3RyaW5nTWFwV3JhcHBlci5nZXQodGhpcy5kYXRhLCBrZXkpKTsgfTtcbiAgICByZXR1cm4gUm91dGVEYXRhO1xufSkoKTtcbmV4cG9ydHMuUm91dGVEYXRhID0gUm91dGVEYXRhO1xuZXhwb3J0cy5CTEFOS19ST1VURV9EQVRBID0gbmV3IFJvdXRlRGF0YSgpO1xuLyoqXG4gKiBgSW5zdHJ1Y3Rpb25gIGlzIGEgdHJlZSBvZiB7QGxpbmsgQ29tcG9uZW50SW5zdHJ1Y3Rpb259cyB3aXRoIGFsbCB0aGUgaW5mb3JtYXRpb24gbmVlZGVkXG4gKiB0byB0cmFuc2l0aW9uIGVhY2ggY29tcG9uZW50IGluIHRoZSBhcHAgdG8gYSBnaXZlbiByb3V0ZSwgaW5jbHVkaW5nIGFsbCBhdXhpbGlhcnkgcm91dGVzLlxuICpcbiAqIGBJbnN0cnVjdGlvbmBzIGNhbiBiZSBjcmVhdGVkIHVzaW5nIHtAbGluayBSb3V0ZXIjZ2VuZXJhdGV9LCBhbmQgY2FuIGJlIHVzZWQgdG9cbiAqIHBlcmZvcm0gcm91dGUgY2hhbmdlcyB3aXRoIHtAbGluayBSb3V0ZXIjbmF2aWdhdGVCeUluc3RydWN0aW9ufS5cbiAqXG4gKiAjIyMgRXhhbXBsZVxuICpcbiAqIGBgYFxuICogaW1wb3J0IHtDb21wb25lbnR9IGZyb20gJ2FuZ3VsYXIyL2NvcmUnO1xuICogaW1wb3J0IHtib290c3RyYXB9IGZyb20gJ2FuZ3VsYXIyL3BsYXRmb3JtL2Jyb3dzZXInO1xuICogaW1wb3J0IHtSb3V0ZXIsIFJPVVRFUl9ESVJFQ1RJVkVTLCBST1VURVJfUFJPVklERVJTLCBSb3V0ZUNvbmZpZ30gZnJvbSAnYW5ndWxhcjIvcm91dGVyJztcbiAqXG4gKiBAQ29tcG9uZW50KHtkaXJlY3RpdmVzOiBbUk9VVEVSX0RJUkVDVElWRVNdfSlcbiAqIEBSb3V0ZUNvbmZpZyhbXG4gKiAgey4uLn0sXG4gKiBdKVxuICogY2xhc3MgQXBwQ21wIHtcbiAqICAgY29uc3RydWN0b3Iocm91dGVyOiBSb3V0ZXIpIHtcbiAqICAgICB2YXIgaW5zdHJ1Y3Rpb24gPSByb3V0ZXIuZ2VuZXJhdGUoWycvTXlSb3V0ZSddKTtcbiAqICAgICByb3V0ZXIubmF2aWdhdGVCeUluc3RydWN0aW9uKGluc3RydWN0aW9uKTtcbiAqICAgfVxuICogfVxuICpcbiAqIGJvb3RzdHJhcChBcHBDbXAsIFJPVVRFUl9QUk9WSURFUlMpO1xuICogYGBgXG4gKi9cbnZhciBJbnN0cnVjdGlvbiA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gSW5zdHJ1Y3Rpb24oY29tcG9uZW50LCBjaGlsZCwgYXV4SW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnQ7XG4gICAgICAgIHRoaXMuY2hpbGQgPSBjaGlsZDtcbiAgICAgICAgdGhpcy5hdXhJbnN0cnVjdGlvbiA9IGF1eEluc3RydWN0aW9uO1xuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLCBcInVybFBhdGhcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkgPyB0aGlzLmNvbXBvbmVudC51cmxQYXRoIDogJyc7IH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShJbnN0cnVjdGlvbi5wcm90b3R5cGUsIFwidXJsUGFyYW1zXCIsIHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7IHJldHVybiBpc1ByZXNlbnQodGhpcy5jb21wb25lbnQpID8gdGhpcy5jb21wb25lbnQudXJsUGFyYW1zIDogW107IH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShJbnN0cnVjdGlvbi5wcm90b3R5cGUsIFwic3BlY2lmaWNpdHlcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciB0b3RhbCA9ICcnO1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSB0aGlzLmNvbXBvbmVudC5zcGVjaWZpY2l0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5jaGlsZCkpIHtcbiAgICAgICAgICAgICAgICB0b3RhbCArPSB0aGlzLmNoaWxkLnNwZWNpZmljaXR5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRvdGFsO1xuICAgICAgICB9LFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9KTtcbiAgICAvKipcbiAgICAgKiBjb252ZXJ0cyB0aGUgaW5zdHJ1Y3Rpb24gaW50byBhIFVSTCBzdHJpbmdcbiAgICAgKi9cbiAgICBJbnN0cnVjdGlvbi5wcm90b3R5cGUudG9Sb290VXJsID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy50b1VybFBhdGgoKSArIHRoaXMudG9VcmxRdWVyeSgpOyB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBJbnN0cnVjdGlvbi5wcm90b3R5cGUuX3RvTm9uUm9vdFVybCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXhQcmVmaXhlZCgpICtcbiAgICAgICAgICAgIChpc1ByZXNlbnQodGhpcy5jaGlsZCkgPyB0aGlzLmNoaWxkLl90b05vblJvb3RVcmwoKSA6ICcnKTtcbiAgICB9O1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS50b1VybFF1ZXJ5ID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy51cmxQYXJhbXMubGVuZ3RoID4gMCA/ICgnPycgKyB0aGlzLnVybFBhcmFtcy5qb2luKCcmJykpIDogJyc7IH07XG4gICAgLyoqXG4gICAgICogUmV0dXJucyBhIG5ldyBpbnN0cnVjdGlvbiB0aGF0IHNoYXJlcyB0aGUgc3RhdGUgb2YgdGhlIGV4aXN0aW5nIGluc3RydWN0aW9uLCBidXQgd2l0aFxuICAgICAqIHRoZSBnaXZlbiBjaGlsZCB7QGxpbmsgSW5zdHJ1Y3Rpb259IHJlcGxhY2luZyB0aGUgZXhpc3RpbmcgY2hpbGQuXG4gICAgICovXG4gICAgSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLnJlcGxhY2VDaGlsZCA9IGZ1bmN0aW9uIChjaGlsZCkge1xuICAgICAgICByZXR1cm4gbmV3IFJlc29sdmVkSW5zdHJ1Y3Rpb24odGhpcy5jb21wb25lbnQsIGNoaWxkLCB0aGlzLmF1eEluc3RydWN0aW9uKTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIElmIHRoZSBmaW5hbCBVUkwgZm9yIHRoZSBpbnN0cnVjdGlvbiBpcyBgYFxuICAgICAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS50b1VybFBhdGggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlBdXgoKSArXG4gICAgICAgICAgICAoaXNQcmVzZW50KHRoaXMuY2hpbGQpID8gdGhpcy5jaGlsZC5fdG9Ob25Sb290VXJsKCkgOiAnJyk7XG4gICAgfTtcbiAgICAvLyBkZWZhdWx0IGluc3RydWN0aW9ucyBvdmVycmlkZSB0aGVzZVxuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS50b0xpbmtVcmwgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlBdXgoKSArXG4gICAgICAgICAgICAoaXNQcmVzZW50KHRoaXMuY2hpbGQpID8gdGhpcy5jaGlsZC5fdG9MaW5rVXJsKCkgOiAnJyk7XG4gICAgfTtcbiAgICAvLyB0aGlzIGlzIHRoZSBub24tcm9vdCB2ZXJzaW9uIChjYWxsZWQgcmVjdXJzaXZlbHkpXG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS5fdG9MaW5rVXJsID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fc3RyaW5naWZ5UGF0aE1hdHJpeEF1eFByZWZpeGVkKCkgK1xuICAgICAgICAgICAgKGlzUHJlc2VudCh0aGlzLmNoaWxkKSA/IHRoaXMuY2hpbGQuX3RvTGlua1VybCgpIDogJycpO1xuICAgIH07XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS5fc3RyaW5naWZ5UGF0aE1hdHJpeEF1eFByZWZpeGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcHJpbWFyeSA9IHRoaXMuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXgoKTtcbiAgICAgICAgaWYgKHByaW1hcnkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcHJpbWFyeSA9ICcvJyArIHByaW1hcnk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByaW1hcnk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLl9zdHJpbmdpZnlNYXRyaXhQYXJhbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhcmFtcy5sZW5ndGggPiAwID8gKCc7JyArIHRoaXMudXJsUGFyYW1zLmpvaW4oJzsnKSkgOiAnJztcbiAgICB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBJbnN0cnVjdGlvbi5wcm90b3R5cGUuX3N0cmluZ2lmeVBhdGhNYXRyaXhBdXggPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChpc0JsYW5rKHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnVybFBhdGggKyB0aGlzLl9zdHJpbmdpZnlNYXRyaXhQYXJhbXMoKSArIHRoaXMuX3N0cmluZ2lmeUF1eCgpO1xuICAgIH07XG4gICAgLyoqIEBpbnRlcm5hbCAqL1xuICAgIEluc3RydWN0aW9uLnByb3RvdHlwZS5fc3RyaW5naWZ5QXV4ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcm91dGVzID0gW107XG4gICAgICAgIFN0cmluZ01hcFdyYXBwZXIuZm9yRWFjaCh0aGlzLmF1eEluc3RydWN0aW9uLCBmdW5jdGlvbiAoYXV4SW5zdHJ1Y3Rpb24sIF8pIHtcbiAgICAgICAgICAgIHJvdXRlcy5wdXNoKGF1eEluc3RydWN0aW9uLl9zdHJpbmdpZnlQYXRoTWF0cml4QXV4KCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHJvdXRlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gJygnICsgcm91dGVzLmpvaW4oJy8vJykgKyAnKSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH07XG4gICAgcmV0dXJuIEluc3RydWN0aW9uO1xufSkoKTtcbmV4cG9ydHMuSW5zdHJ1Y3Rpb24gPSBJbnN0cnVjdGlvbjtcbi8qKlxuICogYSByZXNvbHZlZCBpbnN0cnVjdGlvbiBoYXMgYW4gb3V0bGV0IGluc3RydWN0aW9uIGZvciBpdHNlbGYsIGJ1dCBtYXliZSBub3QgZm9yLi4uXG4gKi9cbnZhciBSZXNvbHZlZEluc3RydWN0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUmVzb2x2ZWRJbnN0cnVjdGlvbiwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSZXNvbHZlZEluc3RydWN0aW9uKGNvbXBvbmVudCwgY2hpbGQsIGF1eEluc3RydWN0aW9uKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGNvbXBvbmVudCwgY2hpbGQsIGF1eEluc3RydWN0aW9uKTtcbiAgICB9XG4gICAgUmVzb2x2ZWRJbnN0cnVjdGlvbi5wcm90b3R5cGUucmVzb2x2ZUNvbXBvbmVudCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLnJlc29sdmUodGhpcy5jb21wb25lbnQpO1xuICAgIH07XG4gICAgcmV0dXJuIFJlc29sdmVkSW5zdHJ1Y3Rpb247XG59KShJbnN0cnVjdGlvbik7XG5leHBvcnRzLlJlc29sdmVkSW5zdHJ1Y3Rpb24gPSBSZXNvbHZlZEluc3RydWN0aW9uO1xuLyoqXG4gKiBSZXByZXNlbnRzIGEgcmVzb2x2ZWQgZGVmYXVsdCByb3V0ZVxuICovXG52YXIgRGVmYXVsdEluc3RydWN0aW9uID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoRGVmYXVsdEluc3RydWN0aW9uLCBfc3VwZXIpO1xuICAgIGZ1bmN0aW9uIERlZmF1bHRJbnN0cnVjdGlvbihjb21wb25lbnQsIGNoaWxkKSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGNvbXBvbmVudCwgY2hpbGQsIHt9KTtcbiAgICB9XG4gICAgRGVmYXVsdEluc3RydWN0aW9uLnByb3RvdHlwZS50b0xpbmtVcmwgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnJzsgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgRGVmYXVsdEluc3RydWN0aW9uLnByb3RvdHlwZS5fdG9MaW5rVXJsID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJyc7IH07XG4gICAgcmV0dXJuIERlZmF1bHRJbnN0cnVjdGlvbjtcbn0pKFJlc29sdmVkSW5zdHJ1Y3Rpb24pO1xuZXhwb3J0cy5EZWZhdWx0SW5zdHJ1Y3Rpb24gPSBEZWZhdWx0SW5zdHJ1Y3Rpb247XG4vKipcbiAqIFJlcHJlc2VudHMgYSBjb21wb25lbnQgdGhhdCBtYXkgbmVlZCB0byBkbyBzb21lIHJlZGlyZWN0aW9uIG9yIGxhenkgbG9hZGluZyBhdCBhIGxhdGVyIHRpbWUuXG4gKi9cbnZhciBVbnJlc29sdmVkSW5zdHJ1Y3Rpb24gPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhVbnJlc29sdmVkSW5zdHJ1Y3Rpb24sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gVW5yZXNvbHZlZEluc3RydWN0aW9uKF9yZXNvbHZlciwgX3VybFBhdGgsIF91cmxQYXJhbXMpIHtcbiAgICAgICAgaWYgKF91cmxQYXRoID09PSB2b2lkIDApIHsgX3VybFBhdGggPSAnJzsgfVxuICAgICAgICBpZiAoX3VybFBhcmFtcyA9PT0gdm9pZCAwKSB7IF91cmxQYXJhbXMgPSBDT05TVF9FWFBSKFtdKTsgfVxuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCBudWxsLCBudWxsLCB7fSk7XG4gICAgICAgIHRoaXMuX3Jlc29sdmVyID0gX3Jlc29sdmVyO1xuICAgICAgICB0aGlzLl91cmxQYXRoID0gX3VybFBhdGg7XG4gICAgICAgIHRoaXMuX3VybFBhcmFtcyA9IF91cmxQYXJhbXM7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShVbnJlc29sdmVkSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLCBcInVybFBhdGhcIiwge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5jb21wb25lbnQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29tcG9uZW50LnVybFBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX3VybFBhdGgpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3VybFBhdGg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShVbnJlc29sdmVkSW5zdHJ1Y3Rpb24ucHJvdG90eXBlLCBcInVybFBhcmFtc1wiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5jb21wb25lbnQudXJsUGFyYW1zO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl91cmxQYXJhbXMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX3VybFBhcmFtcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfSxcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgVW5yZXNvbHZlZEluc3RydWN0aW9uLnByb3RvdHlwZS5yZXNvbHZlQ29tcG9uZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuY29tcG9uZW50KSkge1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLnJlc29sdmUodGhpcy5jb21wb25lbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLl9yZXNvbHZlcigpLnRoZW4oZnVuY3Rpb24gKHJlc29sdXRpb24pIHtcbiAgICAgICAgICAgIF90aGlzLmNoaWxkID0gcmVzb2x1dGlvbi5jaGlsZDtcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5jb21wb25lbnQgPSByZXNvbHV0aW9uLmNvbXBvbmVudDtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICByZXR1cm4gVW5yZXNvbHZlZEluc3RydWN0aW9uO1xufSkoSW5zdHJ1Y3Rpb24pO1xuZXhwb3J0cy5VbnJlc29sdmVkSW5zdHJ1Y3Rpb24gPSBVbnJlc29sdmVkSW5zdHJ1Y3Rpb247XG52YXIgUmVkaXJlY3RJbnN0cnVjdGlvbiA9IChmdW5jdGlvbiAoX3N1cGVyKSB7XG4gICAgX19leHRlbmRzKFJlZGlyZWN0SW5zdHJ1Y3Rpb24sIF9zdXBlcik7XG4gICAgZnVuY3Rpb24gUmVkaXJlY3RJbnN0cnVjdGlvbihjb21wb25lbnQsIGNoaWxkLCBhdXhJbnN0cnVjdGlvbiwgX3NwZWNpZmljaXR5KSB7XG4gICAgICAgIF9zdXBlci5jYWxsKHRoaXMsIGNvbXBvbmVudCwgY2hpbGQsIGF1eEluc3RydWN0aW9uKTtcbiAgICAgICAgdGhpcy5fc3BlY2lmaWNpdHkgPSBfc3BlY2lmaWNpdHk7XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWRpcmVjdEluc3RydWN0aW9uLnByb3RvdHlwZSwgXCJzcGVjaWZpY2l0eVwiLCB7XG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpcy5fc3BlY2lmaWNpdHk7IH0sXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIHJldHVybiBSZWRpcmVjdEluc3RydWN0aW9uO1xufSkoUmVzb2x2ZWRJbnN0cnVjdGlvbik7XG5leHBvcnRzLlJlZGlyZWN0SW5zdHJ1Y3Rpb24gPSBSZWRpcmVjdEluc3RydWN0aW9uO1xuLyoqXG4gKiBBIGBDb21wb25lbnRJbnN0cnVjdGlvbmAgcmVwcmVzZW50cyB0aGUgcm91dGUgc3RhdGUgZm9yIGEgc2luZ2xlIGNvbXBvbmVudC5cbiAqXG4gKiBgQ29tcG9uZW50SW5zdHJ1Y3Rpb25zYCBpcyBhIHB1YmxpYyBBUEkuIEluc3RhbmNlcyBvZiBgQ29tcG9uZW50SW5zdHJ1Y3Rpb25gIGFyZSBwYXNzZWRcbiAqIHRvIHJvdXRlIGxpZmVjeWNsZSBob29rcywgbGlrZSB7QGxpbmsgQ2FuQWN0aXZhdGV9LlxuICpcbiAqIGBDb21wb25lbnRJbnN0cnVjdGlvbmBzIGFyZSBbaGFzaCBjb25zZWRdKGh0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0hhc2hfY29uc2luZykuIFlvdSBzaG91bGRcbiAqIG5ldmVyIGNvbnN0cnVjdCBvbmUgeW91cnNlbGYgd2l0aCBcIm5ldy5cIiBJbnN0ZWFkLCByZWx5IG9uIHtAbGluayBSb3V0ZXIvUm91dGVSZWNvZ25pemVyfSB0b1xuICogY29uc3RydWN0IGBDb21wb25lbnRJbnN0cnVjdGlvbmBzLlxuICpcbiAqIFlvdSBzaG91bGQgbm90IG1vZGlmeSB0aGlzIG9iamVjdC4gSXQgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgaW1tdXRhYmxlLlxuICovXG52YXIgQ29tcG9uZW50SW5zdHJ1Y3Rpb24gPSAoZnVuY3Rpb24gKCkge1xuICAgIC8qKlxuICAgICAqIEBpbnRlcm5hbFxuICAgICAqL1xuICAgIGZ1bmN0aW9uIENvbXBvbmVudEluc3RydWN0aW9uKHVybFBhdGgsIHVybFBhcmFtcywgZGF0YSwgY29tcG9uZW50VHlwZSwgdGVybWluYWwsIHNwZWNpZmljaXR5LCBwYXJhbXMpIHtcbiAgICAgICAgaWYgKHBhcmFtcyA9PT0gdm9pZCAwKSB7IHBhcmFtcyA9IG51bGw7IH1cbiAgICAgICAgdGhpcy51cmxQYXRoID0gdXJsUGF0aDtcbiAgICAgICAgdGhpcy51cmxQYXJhbXMgPSB1cmxQYXJhbXM7XG4gICAgICAgIHRoaXMuY29tcG9uZW50VHlwZSA9IGNvbXBvbmVudFR5cGU7XG4gICAgICAgIHRoaXMudGVybWluYWwgPSB0ZXJtaW5hbDtcbiAgICAgICAgdGhpcy5zcGVjaWZpY2l0eSA9IHNwZWNpZmljaXR5O1xuICAgICAgICB0aGlzLnBhcmFtcyA9IHBhcmFtcztcbiAgICAgICAgdGhpcy5yZXVzZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJvdXRlRGF0YSA9IGlzUHJlc2VudChkYXRhKSA/IGRhdGEgOiBleHBvcnRzLkJMQU5LX1JPVVRFX0RBVEE7XG4gICAgfVxuICAgIHJldHVybiBDb21wb25lbnRJbnN0cnVjdGlvbjtcbn0pKCk7XG5leHBvcnRzLkNvbXBvbmVudEluc3RydWN0aW9uID0gQ29tcG9uZW50SW5zdHJ1Y3Rpb247XG52YXIgY29yZV8xID0gcmVxdWlyZSgnYW5ndWxhcjIvY29yZScpO1xudmFyIHJvdXRlX2NvbmZpZ19pbXBsXzEgPSByZXF1aXJlKCcuL3JvdXRlX2NvbmZpZy9yb3V0ZV9jb25maWdfaW1wbCcpO1xudmFyIHJ1bGVzXzEgPSByZXF1aXJlKCcuL3J1bGVzL3J1bGVzJyk7XG52YXIgcnVsZV9zZXRfMSA9IHJlcXVpcmUoJy4vcnVsZXMvcnVsZV9zZXQnKTtcbnZhciBpbnN0cnVjdGlvbl8xID0gcmVxdWlyZSgnLi9pbnN0cnVjdGlvbicpO1xudmFyIHJvdXRlX2NvbmZpZ19ub3JtYWxpemVyXzEgPSByZXF1aXJlKCcuL3JvdXRlX2NvbmZpZy9yb3V0ZV9jb25maWdfbm9ybWFsaXplcicpO1xudmFyIHVybF9wYXJzZXJfMSA9IHJlcXVpcmUoJy4vdXJsX3BhcnNlcicpO1xudmFyIF9yZXNvbHZlVG9OdWxsID0gUHJvbWlzZVdyYXBwZXIucmVzb2x2ZShudWxsKTtcbi8vIEEgTGlua0l0ZW1BcnJheSBpcyBhbiBhcnJheSwgd2hpY2ggZGVzY3JpYmVzIGEgc2V0IG9mIHJvdXRlc1xuLy8gVGhlIGl0ZW1zIGluIHRoZSBhcnJheSBhcmUgZm91bmQgaW4gZ3JvdXBzOlxuLy8gLSB0aGUgZmlyc3QgaXRlbSBpcyB0aGUgbmFtZSBvZiB0aGUgcm91dGVcbi8vIC0gdGhlIG5leHQgaXRlbXMgYXJlOlxuLy8gICAtIGFuIG9iamVjdCBjb250YWluaW5nIHBhcmFtZXRlcnNcbi8vICAgLSBvciBhbiBhcnJheSBkZXNjcmliaW5nIGFuIGF1eCByb3V0ZVxuLy8gZXhwb3J0IHR5cGUgTGlua1JvdXRlSXRlbSA9IHN0cmluZyB8IE9iamVjdDtcbi8vIGV4cG9ydCB0eXBlIExpbmtJdGVtID0gTGlua1JvdXRlSXRlbSB8IEFycmF5PExpbmtSb3V0ZUl0ZW0+O1xuLy8gZXhwb3J0IHR5cGUgTGlua0l0ZW1BcnJheSA9IEFycmF5PExpbmtJdGVtPjtcbi8qKlxuICogVG9rZW4gdXNlZCB0byBiaW5kIHRoZSBjb21wb25lbnQgd2l0aCB0aGUgdG9wLWxldmVsIHtAbGluayBSb3V0ZUNvbmZpZ31zIGZvciB0aGVcbiAqIGFwcGxpY2F0aW9uLlxuICpcbiAqICMjIyBFeGFtcGxlIChbbGl2ZSBkZW1vXShodHRwOi8vcGxua3IuY28vZWRpdC9pUlVQOEI1T1VieENXUTNBY0lEbSkpXG4gKlxuICogYGBgXG4gKiBpbXBvcnQge0NvbXBvbmVudH0gZnJvbSAnYW5ndWxhcjIvY29yZSc7XG4gKiBpbXBvcnQge1xuICogICBST1VURVJfRElSRUNUSVZFUyxcbiAqICAgUk9VVEVSX1BST1ZJREVSUyxcbiAqICAgUm91dGVDb25maWdcbiAqIH0gZnJvbSAnYW5ndWxhcjIvcm91dGVyJztcbiAqXG4gKiBAQ29tcG9uZW50KHtkaXJlY3RpdmVzOiBbUk9VVEVSX0RJUkVDVElWRVNdfSlcbiAqIEBSb3V0ZUNvbmZpZyhbXG4gKiAgey4uLn0sXG4gKiBdKVxuICogY2xhc3MgQXBwQ21wIHtcbiAqICAgLy8gLi4uXG4gKiB9XG4gKlxuICogYm9vdHN0cmFwKEFwcENtcCwgW1JPVVRFUl9QUk9WSURFUlNdKTtcbiAqIGBgYFxuICovXG5leHBvcnRzLlJPVVRFUl9QUklNQVJZX0NPTVBPTkVOVCA9IENPTlNUX0VYUFIobmV3IGNvcmVfMS5PcGFxdWVUb2tlbignUm91dGVyUHJpbWFyeUNvbXBvbmVudCcpKTtcbi8qKlxuICogVGhlIFJvdXRlUmVnaXN0cnkgaG9sZHMgcm91dGUgY29uZmlndXJhdGlvbnMgZm9yIGVhY2ggY29tcG9uZW50IGluIGFuIEFuZ3VsYXIgYXBwLlxuICogSXQgaXMgcmVzcG9uc2libGUgZm9yIGNyZWF0aW5nIEluc3RydWN0aW9ucyBmcm9tIFVSTHMsIGFuZCBnZW5lcmF0aW5nIFVSTHMgYmFzZWQgb24gcm91dGUgYW5kXG4gKiBwYXJhbWV0ZXJzLlxuICovXG52YXIgUm91dGVSZWdpc3RyeSA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUm91dGVSZWdpc3RyeShfcm9vdENvbXBvbmVudCkge1xuICAgICAgICB0aGlzLl9yb290Q29tcG9uZW50ID0gX3Jvb3RDb21wb25lbnQ7XG4gICAgICAgIHRoaXMuX3J1bGVzID0gbmV3IE1hcCgpO1xuICAgIH1cbiAgICAvKipcbiAgICAgKiBHaXZlbiBhIGNvbXBvbmVudCBhbmQgYSBjb25maWd1cmF0aW9uIG9iamVjdCwgYWRkIHRoZSByb3V0ZSB0byB0aGlzIHJlZ2lzdHJ5XG4gICAgICovXG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuY29uZmlnID0gZnVuY3Rpb24gKHBhcmVudENvbXBvbmVudCwgY29uZmlnKSB7XG4gICAgICAgIGNvbmZpZyA9IHJvdXRlX2NvbmZpZ19ub3JtYWxpemVyXzEubm9ybWFsaXplUm91dGVDb25maWcoY29uZmlnLCB0aGlzKTtcbiAgICAgICAgLy8gdGhpcyBpcyBoZXJlIGJlY2F1c2UgRGFydCB0eXBlIGd1YXJkIHJlYXNvbnNcbiAgICAgICAgaWYgKGNvbmZpZyBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuUm91dGUpIHtcbiAgICAgICAgICAgIHJvdXRlX2NvbmZpZ19ub3JtYWxpemVyXzEuYXNzZXJ0Q29tcG9uZW50RXhpc3RzKGNvbmZpZy5jb21wb25lbnQsIGNvbmZpZy5wYXRoKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLkF1eFJvdXRlKSB7XG4gICAgICAgICAgICByb3V0ZV9jb25maWdfbm9ybWFsaXplcl8xLmFzc2VydENvbXBvbmVudEV4aXN0cyhjb25maWcuY29tcG9uZW50LCBjb25maWcucGF0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5fcnVsZXMuZ2V0KHBhcmVudENvbXBvbmVudCk7XG4gICAgICAgIGlmIChpc0JsYW5rKHJ1bGVzKSkge1xuICAgICAgICAgICAgcnVsZXMgPSBuZXcgcnVsZV9zZXRfMS5SdWxlU2V0KCk7XG4gICAgICAgICAgICB0aGlzLl9ydWxlcy5zZXQocGFyZW50Q29tcG9uZW50LCBydWxlcyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRlcm1pbmFsID0gcnVsZXMuY29uZmlnKGNvbmZpZyk7XG4gICAgICAgIGlmIChjb25maWcgaW5zdGFuY2VvZiByb3V0ZV9jb25maWdfaW1wbF8xLlJvdXRlKSB7XG4gICAgICAgICAgICBpZiAodGVybWluYWwpIHtcbiAgICAgICAgICAgICAgICBhc3NlcnRUZXJtaW5hbENvbXBvbmVudChjb25maWcuY29tcG9uZW50LCBjb25maWcucGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ0Zyb21Db21wb25lbnQoY29uZmlnLmNvbXBvbmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlYWRzIHRoZSBhbm5vdGF0aW9ucyBvZiBhIGNvbXBvbmVudCBhbmQgY29uZmlndXJlcyB0aGUgcmVnaXN0cnkgYmFzZWQgb24gdGhlbVxuICAgICAqL1xuICAgIFJvdXRlUmVnaXN0cnkucHJvdG90eXBlLmNvbmZpZ0Zyb21Db21wb25lbnQgPSBmdW5jdGlvbiAoY29tcG9uZW50KSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmICghaXNUeXBlKGNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBEb24ndCByZWFkIHRoZSBhbm5vdGF0aW9ucyBmcm9tIGEgdHlwZSBtb3JlIHRoYW4gb25jZSDigJNcbiAgICAgICAgLy8gdGhpcyBwcmV2ZW50cyBhbiBpbmZpbml0ZSBsb29wIGlmIGEgY29tcG9uZW50IHJvdXRlcyByZWN1cnNpdmVseS5cbiAgICAgICAgaWYgKHRoaXMuX3J1bGVzLmhhcyhjb21wb25lbnQpKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGFubm90YXRpb25zID0gcmVmbGVjdG9yLmFubm90YXRpb25zKGNvbXBvbmVudCk7XG4gICAgICAgIGlmIChpc1ByZXNlbnQoYW5ub3RhdGlvbnMpKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFubm90YXRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIGFubm90YXRpb24gPSBhbm5vdGF0aW9uc1tpXTtcbiAgICAgICAgICAgICAgICBpZiAoYW5ub3RhdGlvbiBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuUm91dGVDb25maWcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJvdXRlQ2ZncyA9IGFubm90YXRpb24uY29uZmlncztcbiAgICAgICAgICAgICAgICAgICAgcm91dGVDZmdzLmZvckVhY2goZnVuY3Rpb24gKGNvbmZpZykgeyByZXR1cm4gX3RoaXMuY29uZmlnKGNvbXBvbmVudCwgY29uZmlnKTsgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBHaXZlbiBhIFVSTCBhbmQgYSBwYXJlbnQgY29tcG9uZW50LCByZXR1cm4gdGhlIG1vc3Qgc3BlY2lmaWMgaW5zdHJ1Y3Rpb24gZm9yIG5hdmlnYXRpbmdcbiAgICAgKiB0aGUgYXBwbGljYXRpb24gaW50byB0aGUgc3RhdGUgc3BlY2lmaWVkIGJ5IHRoZSB1cmxcbiAgICAgKi9cbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5yZWNvZ25pemUgPSBmdW5jdGlvbiAodXJsLCBhbmNlc3Rvckluc3RydWN0aW9ucykge1xuICAgICAgICB2YXIgcGFyc2VkVXJsID0gdXJsX3BhcnNlcl8xLnBhcnNlci5wYXJzZSh1cmwpO1xuICAgICAgICByZXR1cm4gdGhpcy5fcmVjb2duaXplKHBhcnNlZFVybCwgW10pO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogUmVjb2duaXplcyBhbGwgcGFyZW50LWNoaWxkIHJvdXRlcywgYnV0IGNyZWF0ZXMgdW5yZXNvbHZlZCBhdXhpbGlhcnkgcm91dGVzXG4gICAgICovXG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuX3JlY29nbml6ZSA9IGZ1bmN0aW9uIChwYXJzZWRVcmwsIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLCBfYXV4KSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChfYXV4ID09PSB2b2lkIDApIHsgX2F1eCA9IGZhbHNlOyB9XG4gICAgICAgIHZhciBwYXJlbnRJbnN0cnVjdGlvbiA9IExpc3RXcmFwcGVyLmxhc3QoYW5jZXN0b3JJbnN0cnVjdGlvbnMpO1xuICAgICAgICB2YXIgcGFyZW50Q29tcG9uZW50ID0gaXNQcmVzZW50KHBhcmVudEluc3RydWN0aW9uKSA/IHBhcmVudEluc3RydWN0aW9uLmNvbXBvbmVudC5jb21wb25lbnRUeXBlIDpcbiAgICAgICAgICAgIHRoaXMuX3Jvb3RDb21wb25lbnQ7XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX3J1bGVzLmdldChwYXJlbnRDb21wb25lbnQpO1xuICAgICAgICBpZiAoaXNCbGFuayhydWxlcykpIHtcbiAgICAgICAgICAgIHJldHVybiBfcmVzb2x2ZVRvTnVsbDtcbiAgICAgICAgfVxuICAgICAgICAvLyBNYXRjaGVzIHNvbWUgYmVnaW5uaW5nIHBhcnQgb2YgdGhlIGdpdmVuIFVSTFxuICAgICAgICB2YXIgcG9zc2libGVNYXRjaGVzID0gX2F1eCA/IHJ1bGVzLnJlY29nbml6ZUF1eGlsaWFyeShwYXJzZWRVcmwpIDogcnVsZXMucmVjb2duaXplKHBhcnNlZFVybCk7XG4gICAgICAgIHZhciBtYXRjaFByb21pc2VzID0gcG9zc2libGVNYXRjaGVzLm1hcChmdW5jdGlvbiAoY2FuZGlkYXRlKSB7IHJldHVybiBjYW5kaWRhdGUudGhlbihmdW5jdGlvbiAoY2FuZGlkYXRlKSB7XG4gICAgICAgICAgICBpZiAoY2FuZGlkYXRlIGluc3RhbmNlb2YgcnVsZXNfMS5QYXRoTWF0Y2gpIHtcbiAgICAgICAgICAgICAgICB2YXIgYXV4UGFyZW50SW5zdHJ1Y3Rpb25zID0gYW5jZXN0b3JJbnN0cnVjdGlvbnMubGVuZ3RoID4gMCA/IFtMaXN0V3JhcHBlci5sYXN0KGFuY2VzdG9ySW5zdHJ1Y3Rpb25zKV0gOiBbXTtcbiAgICAgICAgICAgICAgICB2YXIgYXV4SW5zdHJ1Y3Rpb25zID0gX3RoaXMuX2F1eFJvdXRlc1RvVW5yZXNvbHZlZChjYW5kaWRhdGUucmVtYWluaW5nQXV4LCBhdXhQYXJlbnRJbnN0cnVjdGlvbnMpO1xuICAgICAgICAgICAgICAgIHZhciBpbnN0cnVjdGlvbiA9IG5ldyBpbnN0cnVjdGlvbl8xLlJlc29sdmVkSW5zdHJ1Y3Rpb24oY2FuZGlkYXRlLmluc3RydWN0aW9uLCBudWxsLCBhdXhJbnN0cnVjdGlvbnMpO1xuICAgICAgICAgICAgICAgIGlmIChpc0JsYW5rKGNhbmRpZGF0ZS5pbnN0cnVjdGlvbikgfHwgY2FuZGlkYXRlLmluc3RydWN0aW9uLnRlcm1pbmFsKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgdmFyIG5ld0FuY2VzdG9ySW5zdHJ1Y3Rpb25zID0gYW5jZXN0b3JJbnN0cnVjdGlvbnMuY29uY2F0KFtpbnN0cnVjdGlvbl0pO1xuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fcmVjb2duaXplKGNhbmRpZGF0ZS5yZW1haW5pbmcsIG5ld0FuY2VzdG9ySW5zdHJ1Y3Rpb25zKVxuICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoY2hpbGRJbnN0cnVjdGlvbikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNCbGFuayhjaGlsZEluc3RydWN0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gcmVkaXJlY3QgaW5zdHJ1Y3Rpb25zIGFyZSBhbHJlYWR5IGFic29sdXRlXG4gICAgICAgICAgICAgICAgICAgIGlmIChjaGlsZEluc3RydWN0aW9uIGluc3RhbmNlb2YgaW5zdHJ1Y3Rpb25fMS5SZWRpcmVjdEluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGRJbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpbnN0cnVjdGlvbi5jaGlsZCA9IGNoaWxkSW5zdHJ1Y3Rpb247XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjYW5kaWRhdGUgaW5zdGFuY2VvZiBydWxlc18xLlJlZGlyZWN0TWF0Y2gpIHtcbiAgICAgICAgICAgICAgICB2YXIgaW5zdHJ1Y3Rpb24gPSBfdGhpcy5nZW5lcmF0ZShjYW5kaWRhdGUucmVkaXJlY3RUbywgYW5jZXN0b3JJbnN0cnVjdGlvbnMuY29uY2F0KFtudWxsXSkpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgaW5zdHJ1Y3Rpb25fMS5SZWRpcmVjdEluc3RydWN0aW9uKGluc3RydWN0aW9uLmNvbXBvbmVudCwgaW5zdHJ1Y3Rpb24uY2hpbGQsIGluc3RydWN0aW9uLmF1eEluc3RydWN0aW9uLCBjYW5kaWRhdGUuc3BlY2lmaWNpdHkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTsgfSk7XG4gICAgICAgIGlmICgoaXNCbGFuayhwYXJzZWRVcmwpIHx8IHBhcnNlZFVybC5wYXRoID09ICcnKSAmJiBwb3NzaWJsZU1hdGNoZXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5yZXNvbHZlKHRoaXMuZ2VuZXJhdGVEZWZhdWx0KHBhcmVudENvbXBvbmVudCkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5hbGwobWF0Y2hQcm9taXNlcykudGhlbihtb3N0U3BlY2lmaWMpO1xuICAgIH07XG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuX2F1eFJvdXRlc1RvVW5yZXNvbHZlZCA9IGZ1bmN0aW9uIChhdXhSb3V0ZXMsIHBhcmVudEluc3RydWN0aW9ucykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICB2YXIgdW5yZXNvbHZlZEF1eEluc3RydWN0aW9ucyA9IHt9O1xuICAgICAgICBhdXhSb3V0ZXMuZm9yRWFjaChmdW5jdGlvbiAoYXV4VXJsKSB7XG4gICAgICAgICAgICB1bnJlc29sdmVkQXV4SW5zdHJ1Y3Rpb25zW2F1eFVybC5wYXRoXSA9IG5ldyBpbnN0cnVjdGlvbl8xLlVucmVzb2x2ZWRJbnN0cnVjdGlvbihmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5fcmVjb2duaXplKGF1eFVybCwgcGFyZW50SW5zdHJ1Y3Rpb25zLCB0cnVlKTsgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdW5yZXNvbHZlZEF1eEluc3RydWN0aW9ucztcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIEdpdmVuIGEgbm9ybWFsaXplZCBsaXN0IHdpdGggY29tcG9uZW50IG5hbWVzIGFuZCBwYXJhbXMgbGlrZTogYFsndXNlcicsIHtpZDogMyB9XWBcbiAgICAgKiBnZW5lcmF0ZXMgYSB1cmwgd2l0aCBhIGxlYWRpbmcgc2xhc2ggcmVsYXRpdmUgdG8gdGhlIHByb3ZpZGVkIGBwYXJlbnRDb21wb25lbnRgLlxuICAgICAqXG4gICAgICogSWYgdGhlIG9wdGlvbmFsIHBhcmFtIGBfYXV4YCBpcyBgdHJ1ZWAsIHRoZW4gd2UgZ2VuZXJhdGUgc3RhcnRpbmcgYXQgYW4gYXV4aWxpYXJ5XG4gICAgICogcm91dGUgYm91bmRhcnkuXG4gICAgICovXG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuZ2VuZXJhdGUgPSBmdW5jdGlvbiAobGlua1BhcmFtcywgYW5jZXN0b3JJbnN0cnVjdGlvbnMsIF9hdXgpIHtcbiAgICAgICAgaWYgKF9hdXggPT09IHZvaWQgMCkgeyBfYXV4ID0gZmFsc2U7IH1cbiAgICAgICAgdmFyIHBhcmFtcyA9IHNwbGl0QW5kRmxhdHRlbkxpbmtQYXJhbXMobGlua1BhcmFtcyk7XG4gICAgICAgIHZhciBwcmV2SW5zdHJ1Y3Rpb247XG4gICAgICAgIC8vIFRoZSBmaXJzdCBzZWdtZW50IHNob3VsZCBiZSBlaXRoZXIgJy4nIChnZW5lcmF0ZSBmcm9tIHBhcmVudCkgb3IgJycgKGdlbmVyYXRlIGZyb20gcm9vdCkuXG4gICAgICAgIC8vIFdoZW4gd2Ugbm9ybWFsaXplIGFib3ZlLCB3ZSBzdHJpcCBhbGwgdGhlIHNsYXNoZXMsICcuLycgYmVjb21lcyAnLicgYW5kICcvJyBiZWNvbWVzICcnLlxuICAgICAgICBpZiAoTGlzdFdyYXBwZXIuZmlyc3QocGFyYW1zKSA9PSAnJykge1xuICAgICAgICAgICAgcGFyYW1zLnNoaWZ0KCk7XG4gICAgICAgICAgICBwcmV2SW5zdHJ1Y3Rpb24gPSBMaXN0V3JhcHBlci5maXJzdChhbmNlc3Rvckluc3RydWN0aW9ucyk7XG4gICAgICAgICAgICBhbmNlc3Rvckluc3RydWN0aW9ucyA9IFtdO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcHJldkluc3RydWN0aW9uID0gYW5jZXN0b3JJbnN0cnVjdGlvbnMubGVuZ3RoID4gMCA/IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLnBvcCgpIDogbnVsbDtcbiAgICAgICAgICAgIGlmIChMaXN0V3JhcHBlci5maXJzdChwYXJhbXMpID09ICcuJykge1xuICAgICAgICAgICAgICAgIHBhcmFtcy5zaGlmdCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSBpZiAoTGlzdFdyYXBwZXIuZmlyc3QocGFyYW1zKSA9PSAnLi4nKSB7XG4gICAgICAgICAgICAgICAgd2hpbGUgKExpc3RXcmFwcGVyLmZpcnN0KHBhcmFtcykgPT0gJy4uJykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoYW5jZXN0b3JJbnN0cnVjdGlvbnMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiTGluayBcXFwiXCIgKyBMaXN0V3JhcHBlci50b0pTT04obGlua1BhcmFtcykgKyBcIlxcXCIgaGFzIHRvbyBtYW55IFxcXCIuLi9cXFwiIHNlZ21lbnRzLlwiKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBwcmV2SW5zdHJ1Y3Rpb24gPSBhbmNlc3Rvckluc3RydWN0aW9ucy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1zID0gTGlzdFdyYXBwZXIuc2xpY2UocGFyYW1zLCAxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyB3ZSBtdXN0IG9ubHkgcGVhayBhdCB0aGUgbGluayBwYXJhbSwgYW5kIG5vdCBjb25zdW1lIGl0XG4gICAgICAgICAgICAgICAgdmFyIHJvdXRlTmFtZSA9IExpc3RXcmFwcGVyLmZpcnN0KHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgdmFyIHBhcmVudENvbXBvbmVudFR5cGUgPSB0aGlzLl9yb290Q29tcG9uZW50O1xuICAgICAgICAgICAgICAgIHZhciBncmFuZHBhcmVudENvbXBvbmVudFR5cGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIGlmIChhbmNlc3Rvckluc3RydWN0aW9ucy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBwYXJlbnRDb21wb25lbnRJbnN0cnVjdGlvbiA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zW2FuY2VzdG9ySW5zdHJ1Y3Rpb25zLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ3JhbmRDb21wb25lbnRJbnN0cnVjdGlvbiA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zW2FuY2VzdG9ySW5zdHJ1Y3Rpb25zLmxlbmd0aCAtIDJdO1xuICAgICAgICAgICAgICAgICAgICBwYXJlbnRDb21wb25lbnRUeXBlID0gcGFyZW50Q29tcG9uZW50SW5zdHJ1Y3Rpb24uY29tcG9uZW50LmNvbXBvbmVudFR5cGU7XG4gICAgICAgICAgICAgICAgICAgIGdyYW5kcGFyZW50Q29tcG9uZW50VHlwZSA9IGdyYW5kQ29tcG9uZW50SW5zdHJ1Y3Rpb24uY29tcG9uZW50LmNvbXBvbmVudFR5cGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLmxlbmd0aCA9PSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcmVudENvbXBvbmVudFR5cGUgPSBhbmNlc3Rvckluc3RydWN0aW9uc1swXS5jb21wb25lbnQuY29tcG9uZW50VHlwZTtcbiAgICAgICAgICAgICAgICAgICAgZ3JhbmRwYXJlbnRDb21wb25lbnRUeXBlID0gdGhpcy5fcm9vdENvbXBvbmVudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gRm9yIGEgbGluayB3aXRoIG5vIGxlYWRpbmcgYC4vYCwgYC9gLCBvciBgLi4vYCwgd2UgbG9vayBmb3IgYSBzaWJsaW5nIGFuZCBjaGlsZC5cbiAgICAgICAgICAgICAgICAvLyBJZiBib3RoIGV4aXN0LCB3ZSB0aHJvdy4gT3RoZXJ3aXNlLCB3ZSBwcmVmZXIgd2hpY2hldmVyIGV4aXN0cy5cbiAgICAgICAgICAgICAgICB2YXIgY2hpbGRSb3V0ZUV4aXN0cyA9IHRoaXMuaGFzUm91dGUocm91dGVOYW1lLCBwYXJlbnRDb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICB2YXIgcGFyZW50Um91dGVFeGlzdHMgPSBpc1ByZXNlbnQoZ3JhbmRwYXJlbnRDb21wb25lbnRUeXBlKSAmJlxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhc1JvdXRlKHJvdXRlTmFtZSwgZ3JhbmRwYXJlbnRDb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgICAgICBpZiAocGFyZW50Um91dGVFeGlzdHMgJiYgY2hpbGRSb3V0ZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbXNnID0gXCJMaW5rIFxcXCJcIiArIExpc3RXcmFwcGVyLnRvSlNPTihsaW5rUGFyYW1zKSArIFwiXFxcIiBpcyBhbWJpZ3VvdXMsIHVzZSBcXFwiLi9cXFwiIG9yIFxcXCIuLi9cXFwiIHRvIGRpc2FtYmlndWF0ZS5cIjtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24obXNnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHBhcmVudFJvdXRlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHByZXZJbnN0cnVjdGlvbiA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb25zLnBvcCgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocGFyYW1zW3BhcmFtcy5sZW5ndGggLSAxXSA9PSAnJykge1xuICAgICAgICAgICAgcGFyYW1zLnBvcCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbXMubGVuZ3RoID4gMCAmJiBwYXJhbXNbMF0gPT0gJycpIHtcbiAgICAgICAgICAgIHBhcmFtcy5zaGlmdCgpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwYXJhbXMubGVuZ3RoIDwgMSkge1xuICAgICAgICAgICAgdmFyIG1zZyA9IFwiTGluayBcXFwiXCIgKyBMaXN0V3JhcHBlci50b0pTT04obGlua1BhcmFtcykgKyBcIlxcXCIgbXVzdCBpbmNsdWRlIGEgcm91dGUgbmFtZS5cIjtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKG1zZyk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGdlbmVyYXRlZEluc3RydWN0aW9uID0gdGhpcy5fZ2VuZXJhdGUocGFyYW1zLCBhbmNlc3Rvckluc3RydWN0aW9ucywgcHJldkluc3RydWN0aW9uLCBfYXV4LCBsaW5rUGFyYW1zKTtcbiAgICAgICAgLy8gd2UgZG9uJ3QgY2xvbmUgdGhlIGZpcnN0IChyb290KSBlbGVtZW50XG4gICAgICAgIGZvciAodmFyIGkgPSBhbmNlc3Rvckluc3RydWN0aW9ucy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgdmFyIGFuY2VzdG9ySW5zdHJ1Y3Rpb24gPSBhbmNlc3Rvckluc3RydWN0aW9uc1tpXTtcbiAgICAgICAgICAgIGlmIChpc0JsYW5rKGFuY2VzdG9ySW5zdHJ1Y3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBnZW5lcmF0ZWRJbnN0cnVjdGlvbiA9IGFuY2VzdG9ySW5zdHJ1Y3Rpb24ucmVwbGFjZUNoaWxkKGdlbmVyYXRlZEluc3RydWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZ2VuZXJhdGVkSW5zdHJ1Y3Rpb247XG4gICAgfTtcbiAgICAvKlxuICAgICAqIEludGVybmFsIGhlbHBlciB0aGF0IGRvZXMgbm90IG1ha2UgYW55IGFzc2VydGlvbnMgYWJvdXQgdGhlIGJlZ2lubmluZyBvZiB0aGUgbGluayBEU0wuXG4gICAgICogYGFuY2VzdG9ySW5zdHJ1Y3Rpb25zYCBhcmUgcGFyZW50cyB0aGF0IHdpbGwgYmUgY2xvbmVkLlxuICAgICAqIGBwcmV2SW5zdHJ1Y3Rpb25gIGlzIHRoZSBleGlzdGluZyBpbnN0cnVjdGlvbiB0aGF0IHdvdWxkIGJlIHJlcGxhY2VkLCBidXQgd2hpY2ggbWlnaHQgaGF2ZVxuICAgICAqIGF1eCByb3V0ZXMgdGhhdCBuZWVkIHRvIGJlIGNsb25lZC5cbiAgICAgKi9cbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5fZ2VuZXJhdGUgPSBmdW5jdGlvbiAobGlua1BhcmFtcywgYW5jZXN0b3JJbnN0cnVjdGlvbnMsIHByZXZJbnN0cnVjdGlvbiwgX2F1eCwgX29yaWdpbmFsTGluaykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAoX2F1eCA9PT0gdm9pZCAwKSB7IF9hdXggPSBmYWxzZTsgfVxuICAgICAgICB2YXIgcGFyZW50Q29tcG9uZW50VHlwZSA9IHRoaXMuX3Jvb3RDb21wb25lbnQ7XG4gICAgICAgIHZhciBjb21wb25lbnRJbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIHZhciBhdXhJbnN0cnVjdGlvbnMgPSB7fTtcbiAgICAgICAgdmFyIHBhcmVudEluc3RydWN0aW9uID0gTGlzdFdyYXBwZXIubGFzdChhbmNlc3Rvckluc3RydWN0aW9ucyk7XG4gICAgICAgIGlmIChpc1ByZXNlbnQocGFyZW50SW5zdHJ1Y3Rpb24pICYmIGlzUHJlc2VudChwYXJlbnRJbnN0cnVjdGlvbi5jb21wb25lbnQpKSB7XG4gICAgICAgICAgICBwYXJlbnRDb21wb25lbnRUeXBlID0gcGFyZW50SW5zdHJ1Y3Rpb24uY29tcG9uZW50LmNvbXBvbmVudFR5cGU7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGxpbmtQYXJhbXMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIHZhciBkZWZhdWx0SW5zdHJ1Y3Rpb24gPSB0aGlzLmdlbmVyYXRlRGVmYXVsdChwYXJlbnRDb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGlmIChpc0JsYW5rKGRlZmF1bHRJbnN0cnVjdGlvbikpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkxpbmsgXFxcIlwiICsgTGlzdFdyYXBwZXIudG9KU09OKF9vcmlnaW5hbExpbmspICsgXCJcXFwiIGRvZXMgbm90IHJlc29sdmUgdG8gYSB0ZXJtaW5hbCBpbnN0cnVjdGlvbi5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZGVmYXVsdEluc3RydWN0aW9uO1xuICAgICAgICB9XG4gICAgICAgIC8vIGZvciBub24tYXV4IHJvdXRlcywgd2Ugd2FudCB0byByZXVzZSB0aGUgcHJlZGVjZXNzb3IncyBleGlzdGluZyBwcmltYXJ5IGFuZCBhdXggcm91dGVzXG4gICAgICAgIC8vIGFuZCBvbmx5IG92ZXJyaWRlIHJvdXRlcyBmb3Igd2hpY2ggdGhlIGdpdmVuIGxpbmsgRFNMIHByb3ZpZGVzXG4gICAgICAgIGlmIChpc1ByZXNlbnQocHJldkluc3RydWN0aW9uKSAmJiAhX2F1eCkge1xuICAgICAgICAgICAgYXV4SW5zdHJ1Y3Rpb25zID0gU3RyaW5nTWFwV3JhcHBlci5tZXJnZShwcmV2SW5zdHJ1Y3Rpb24uYXV4SW5zdHJ1Y3Rpb24sIGF1eEluc3RydWN0aW9ucyk7XG4gICAgICAgICAgICBjb21wb25lbnRJbnN0cnVjdGlvbiA9IHByZXZJbnN0cnVjdGlvbi5jb21wb25lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHJ1bGVzID0gdGhpcy5fcnVsZXMuZ2V0KHBhcmVudENvbXBvbmVudFR5cGUpO1xuICAgICAgICBpZiAoaXNCbGFuayhydWxlcykpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiQ29tcG9uZW50IFxcXCJcIiArIGdldFR5cGVOYW1lRm9yRGVidWdnaW5nKHBhcmVudENvbXBvbmVudFR5cGUpICsgXCJcXFwiIGhhcyBubyByb3V0ZSBjb25maWcuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaW5rUGFyYW1JbmRleCA9IDA7XG4gICAgICAgIHZhciByb3V0ZVBhcmFtcyA9IHt9O1xuICAgICAgICAvLyBmaXJzdCwgcmVjb2duaXplIHRoZSBwcmltYXJ5IHJvdXRlIGlmIG9uZSBpcyBwcm92aWRlZFxuICAgICAgICBpZiAobGlua1BhcmFtSW5kZXggPCBsaW5rUGFyYW1zLmxlbmd0aCAmJiBpc1N0cmluZyhsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XSkpIHtcbiAgICAgICAgICAgIHZhciByb3V0ZU5hbWUgPSBsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XTtcbiAgICAgICAgICAgIGlmIChyb3V0ZU5hbWUgPT0gJycgfHwgcm91dGVOYW1lID09ICcuJyB8fCByb3V0ZU5hbWUgPT0gJy4uJykge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiXFxcIlwiICsgcm91dGVOYW1lICsgXCIvXFxcIiBpcyBvbmx5IGFsbG93ZWQgYXQgdGhlIGJlZ2lubmluZyBvZiBhIGxpbmsgRFNMLlwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxpbmtQYXJhbUluZGV4ICs9IDE7XG4gICAgICAgICAgICBpZiAobGlua1BhcmFtSW5kZXggPCBsaW5rUGFyYW1zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHZhciBsaW5rUGFyYW0gPSBsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XTtcbiAgICAgICAgICAgICAgICBpZiAoaXNTdHJpbmdNYXAobGlua1BhcmFtKSAmJiAhaXNBcnJheShsaW5rUGFyYW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJvdXRlUGFyYW1zID0gbGlua1BhcmFtO1xuICAgICAgICAgICAgICAgICAgICBsaW5rUGFyYW1JbmRleCArPSAxO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHZhciByb3V0ZVJlY29nbml6ZXIgPSAoX2F1eCA/IHJ1bGVzLmF1eFJ1bGVzQnlOYW1lIDogcnVsZXMucnVsZXNCeU5hbWUpLmdldChyb3V0ZU5hbWUpO1xuICAgICAgICAgICAgaWYgKGlzQmxhbmsocm91dGVSZWNvZ25pemVyKSkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwiQ29tcG9uZW50IFxcXCJcIiArIGdldFR5cGVOYW1lRm9yRGVidWdnaW5nKHBhcmVudENvbXBvbmVudFR5cGUpICsgXCJcXFwiIGhhcyBubyByb3V0ZSBuYW1lZCBcXFwiXCIgKyByb3V0ZU5hbWUgKyBcIlxcXCIuXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQ3JlYXRlIGFuIFwidW5yZXNvbHZlZCBpbnN0cnVjdGlvblwiIGZvciBhc3luYyByb3V0ZXNcbiAgICAgICAgICAgIC8vIHdlJ2xsIGZpZ3VyZSBvdXQgdGhlIHJlc3Qgb2YgdGhlIHJvdXRlIHdoZW4gd2UgcmVzb2x2ZSB0aGUgaW5zdHJ1Y3Rpb24gYW5kXG4gICAgICAgICAgICAvLyBwZXJmb3JtIGEgbmF2aWdhdGlvblxuICAgICAgICAgICAgaWYgKGlzQmxhbmsocm91dGVSZWNvZ25pemVyLmhhbmRsZXIuY29tcG9uZW50VHlwZSkpIHtcbiAgICAgICAgICAgICAgICB2YXIgZ2VuZXJhdGVkVXJsID0gcm91dGVSZWNvZ25pemVyLmdlbmVyYXRlQ29tcG9uZW50UGF0aFZhbHVlcyhyb3V0ZVBhcmFtcyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBpbnN0cnVjdGlvbl8xLlVucmVzb2x2ZWRJbnN0cnVjdGlvbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByb3V0ZVJlY29nbml6ZXIuaGFuZGxlci5yZXNvbHZlQ29tcG9uZW50VHlwZSgpLnRoZW4oZnVuY3Rpb24gKF8pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fZ2VuZXJhdGUobGlua1BhcmFtcywgYW5jZXN0b3JJbnN0cnVjdGlvbnMsIHByZXZJbnN0cnVjdGlvbiwgX2F1eCwgX29yaWdpbmFsTGluayk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0sIGdlbmVyYXRlZFVybC51cmxQYXRoLCB1cmxfcGFyc2VyXzEuY29udmVydFVybFBhcmFtc1RvQXJyYXkoZ2VuZXJhdGVkVXJsLnVybFBhcmFtcykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29tcG9uZW50SW5zdHJ1Y3Rpb24gPSBfYXV4ID8gcnVsZXMuZ2VuZXJhdGVBdXhpbGlhcnkocm91dGVOYW1lLCByb3V0ZVBhcmFtcykgOlxuICAgICAgICAgICAgICAgIHJ1bGVzLmdlbmVyYXRlKHJvdXRlTmFtZSwgcm91dGVQYXJhbXMpO1xuICAgICAgICB9XG4gICAgICAgIC8vIE5leHQsIHJlY29nbml6ZSBhdXhpbGlhcnkgaW5zdHJ1Y3Rpb25zLlxuICAgICAgICAvLyBJZiB3ZSBoYXZlIGFuIGFuY2VzdG9yIGluc3RydWN0aW9uLCB3ZSBwcmVzZXJ2ZSB3aGF0ZXZlciBhdXggcm91dGVzIGFyZSBhY3RpdmUgZnJvbSBpdC5cbiAgICAgICAgd2hpbGUgKGxpbmtQYXJhbUluZGV4IDwgbGlua1BhcmFtcy5sZW5ndGggJiYgaXNBcnJheShsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XSkpIHtcbiAgICAgICAgICAgIHZhciBhdXhQYXJlbnRJbnN0cnVjdGlvbiA9IFtwYXJlbnRJbnN0cnVjdGlvbl07XG4gICAgICAgICAgICB2YXIgYXV4SW5zdHJ1Y3Rpb24gPSB0aGlzLl9nZW5lcmF0ZShsaW5rUGFyYW1zW2xpbmtQYXJhbUluZGV4XSwgYXV4UGFyZW50SW5zdHJ1Y3Rpb24sIG51bGwsIHRydWUsIF9vcmlnaW5hbExpbmspO1xuICAgICAgICAgICAgLy8gVE9ETzogdGhpcyB3aWxsIG5vdCB3b3JrIGZvciBhdXggcm91dGVzIHdpdGggcGFyYW1ldGVycyBvciBtdWx0aXBsZSBzZWdtZW50c1xuICAgICAgICAgICAgYXV4SW5zdHJ1Y3Rpb25zW2F1eEluc3RydWN0aW9uLmNvbXBvbmVudC51cmxQYXRoXSA9IGF1eEluc3RydWN0aW9uO1xuICAgICAgICAgICAgbGlua1BhcmFtSW5kZXggKz0gMTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaW5zdHJ1Y3Rpb24gPSBuZXcgaW5zdHJ1Y3Rpb25fMS5SZXNvbHZlZEluc3RydWN0aW9uKGNvbXBvbmVudEluc3RydWN0aW9uLCBudWxsLCBhdXhJbnN0cnVjdGlvbnMpO1xuICAgICAgICAvLyBJZiB0aGUgY29tcG9uZW50IGlzIHN5bmMsIHdlIGNhbiBnZW5lcmF0ZSByZXNvbHZlZCBjaGlsZCByb3V0ZSBpbnN0cnVjdGlvbnNcbiAgICAgICAgLy8gSWYgbm90LCB3ZSdsbCByZXNvbHZlIHRoZSBpbnN0cnVjdGlvbnMgYXQgbmF2aWdhdGlvbiB0aW1lXG4gICAgICAgIGlmIChpc1ByZXNlbnQoY29tcG9uZW50SW5zdHJ1Y3Rpb24pICYmIGlzUHJlc2VudChjb21wb25lbnRJbnN0cnVjdGlvbi5jb21wb25lbnRUeXBlKSkge1xuICAgICAgICAgICAgdmFyIGNoaWxkSW5zdHJ1Y3Rpb24gPSBudWxsO1xuICAgICAgICAgICAgaWYgKGNvbXBvbmVudEluc3RydWN0aW9uLnRlcm1pbmFsKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmtQYXJhbUluZGV4ID49IGxpbmtQYXJhbXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGNoaWxkQW5jZXN0b3JDb21wb25lbnRzID0gYW5jZXN0b3JJbnN0cnVjdGlvbnMuY29uY2F0KFtpbnN0cnVjdGlvbl0pO1xuICAgICAgICAgICAgICAgIHZhciByZW1haW5pbmdMaW5rUGFyYW1zID0gbGlua1BhcmFtcy5zbGljZShsaW5rUGFyYW1JbmRleCk7XG4gICAgICAgICAgICAgICAgY2hpbGRJbnN0cnVjdGlvbiA9IHRoaXMuX2dlbmVyYXRlKHJlbWFpbmluZ0xpbmtQYXJhbXMsIGNoaWxkQW5jZXN0b3JDb21wb25lbnRzLCBudWxsLCBmYWxzZSwgX29yaWdpbmFsTGluayk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpbnN0cnVjdGlvbi5jaGlsZCA9IGNoaWxkSW5zdHJ1Y3Rpb247XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGluc3RydWN0aW9uO1xuICAgIH07XG4gICAgUm91dGVSZWdpc3RyeS5wcm90b3R5cGUuaGFzUm91dGUgPSBmdW5jdGlvbiAobmFtZSwgcGFyZW50Q29tcG9uZW50KSB7XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX3J1bGVzLmdldChwYXJlbnRDb21wb25lbnQpO1xuICAgICAgICBpZiAoaXNCbGFuayhydWxlcykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcnVsZXMuaGFzUm91dGUobmFtZSk7XG4gICAgfTtcbiAgICBSb3V0ZVJlZ2lzdHJ5LnByb3RvdHlwZS5nZW5lcmF0ZURlZmF1bHQgPSBmdW5jdGlvbiAoY29tcG9uZW50Q3Vyc29yKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChpc0JsYW5rKGNvbXBvbmVudEN1cnNvcikpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBydWxlcyA9IHRoaXMuX3J1bGVzLmdldChjb21wb25lbnRDdXJzb3IpO1xuICAgICAgICBpZiAoaXNCbGFuayhydWxlcykgfHwgaXNCbGFuayhydWxlcy5kZWZhdWx0UnVsZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHZhciBkZWZhdWx0Q2hpbGQgPSBudWxsO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHJ1bGVzLmRlZmF1bHRSdWxlLmhhbmRsZXIuY29tcG9uZW50VHlwZSkpIHtcbiAgICAgICAgICAgIHZhciBjb21wb25lbnRJbnN0cnVjdGlvbiA9IHJ1bGVzLmRlZmF1bHRSdWxlLmdlbmVyYXRlKHt9KTtcbiAgICAgICAgICAgIGlmICghcnVsZXMuZGVmYXVsdFJ1bGUudGVybWluYWwpIHtcbiAgICAgICAgICAgICAgICBkZWZhdWx0Q2hpbGQgPSB0aGlzLmdlbmVyYXRlRGVmYXVsdChydWxlcy5kZWZhdWx0UnVsZS5oYW5kbGVyLmNvbXBvbmVudFR5cGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG5ldyBpbnN0cnVjdGlvbl8xLkRlZmF1bHRJbnN0cnVjdGlvbihjb21wb25lbnRJbnN0cnVjdGlvbiwgZGVmYXVsdENoaWxkKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IGluc3RydWN0aW9uXzEuVW5yZXNvbHZlZEluc3RydWN0aW9uKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBydWxlcy5kZWZhdWx0UnVsZS5oYW5kbGVyLnJlc29sdmVDb21wb25lbnRUeXBlKCkudGhlbihmdW5jdGlvbiAoXykgeyByZXR1cm4gX3RoaXMuZ2VuZXJhdGVEZWZhdWx0KGNvbXBvbmVudEN1cnNvcik7IH0pO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIHJldHVybiBSb3V0ZVJlZ2lzdHJ5O1xufSkoKTtcbmV4cG9ydHMuUm91dGVSZWdpc3RyeSA9IFJvdXRlUmVnaXN0cnk7XG4vKlxuICogR2l2ZW46IFsnL2EvYicsIHtjOiAyfV1cbiAqIFJldHVybnM6IFsnJywgJ2EnLCAnYicsIHtjOiAyfV1cbiAqL1xuZnVuY3Rpb24gc3BsaXRBbmRGbGF0dGVuTGlua1BhcmFtcyhsaW5rUGFyYW1zKSB7XG4gICAgdmFyIGFjY3VtdWxhdGlvbiA9IFtdO1xuICAgIGxpbmtQYXJhbXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICBpZiAoaXNTdHJpbmcoaXRlbSkpIHtcbiAgICAgICAgICAgIHZhciBzdHJJdGVtID0gaXRlbTtcbiAgICAgICAgICAgIGFjY3VtdWxhdGlvbiA9IGFjY3VtdWxhdGlvbi5jb25jYXQoc3RySXRlbS5zcGxpdCgnLycpKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIGFjY3VtdWxhdGlvbi5wdXNoKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGFjY3VtdWxhdGlvbjtcbn1cbi8qXG4gKiBHaXZlbiBhIGxpc3Qgb2YgaW5zdHJ1Y3Rpb25zLCByZXR1cm5zIHRoZSBtb3N0IHNwZWNpZmljIGluc3RydWN0aW9uXG4gKi9cbmZ1bmN0aW9uIG1vc3RTcGVjaWZpYyhpbnN0cnVjdGlvbnMpIHtcbiAgICBpbnN0cnVjdGlvbnMgPSBpbnN0cnVjdGlvbnMuZmlsdGVyKGZ1bmN0aW9uIChpbnN0cnVjdGlvbikgeyByZXR1cm4gaXNQcmVzZW50KGluc3RydWN0aW9uKTsgfSk7XG4gICAgaWYgKGluc3RydWN0aW9ucy5sZW5ndGggPT0gMCkge1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gICAgaWYgKGluc3RydWN0aW9ucy5sZW5ndGggPT0gMSkge1xuICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb25zWzBdO1xuICAgIH1cbiAgICB2YXIgZmlyc3QgPSBpbnN0cnVjdGlvbnNbMF07XG4gICAgdmFyIHJlc3QgPSBpbnN0cnVjdGlvbnMuc2xpY2UoMSk7XG4gICAgcmV0dXJuIHJlc3QucmVkdWNlKGZ1bmN0aW9uIChpbnN0cnVjdGlvbiwgY29udGVuZGVyKSB7XG4gICAgICAgIGlmIChjb21wYXJlU3BlY2lmaWNpdHlTdHJpbmdzKGNvbnRlbmRlci5zcGVjaWZpY2l0eSwgaW5zdHJ1Y3Rpb24uc3BlY2lmaWNpdHkpID09IC0xKSB7XG4gICAgICAgICAgICByZXR1cm4gY29udGVuZGVyO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpbnN0cnVjdGlvbjtcbiAgICB9LCBmaXJzdCk7XG59XG4vKlxuICogRXhwZWN0cyBzdHJpbmdzIHRvIGJlIGluIHRoZSBmb3JtIG9mIFwiWzAtMl0rXCJcbiAqIFJldHVybnMgLTEgaWYgc3RyaW5nIEEgc2hvdWxkIGJlIHNvcnRlZCBhYm92ZSBzdHJpbmcgQiwgMSBpZiBpdCBzaG91bGQgYmUgc29ydGVkIGFmdGVyLFxuICogb3IgMCBpZiB0aGV5IGFyZSB0aGUgc2FtZS5cbiAqL1xuZnVuY3Rpb24gY29tcGFyZVNwZWNpZmljaXR5U3RyaW5ncyhhLCBiKSB7XG4gICAgdmFyIGwgPSBNYXRoLm1pbihhLmxlbmd0aCwgYi5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSArPSAxKSB7XG4gICAgICAgIHZhciBhaSA9IFN0cmluZ1dyYXBwZXIuY2hhckNvZGVBdChhLCBpKTtcbiAgICAgICAgdmFyIGJpID0gU3RyaW5nV3JhcHBlci5jaGFyQ29kZUF0KGIsIGkpO1xuICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IGJpIC0gYWk7XG4gICAgICAgIGlmIChkaWZmZXJlbmNlICE9IDApIHtcbiAgICAgICAgICAgIHJldHVybiBkaWZmZXJlbmNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBhLmxlbmd0aCAtIGIubGVuZ3RoO1xufVxuZnVuY3Rpb24gYXNzZXJ0VGVybWluYWxDb21wb25lbnQoY29tcG9uZW50LCBwYXRoKSB7XG4gICAgaWYgKCFpc1R5cGUoY29tcG9uZW50KSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciBhbm5vdGF0aW9ucyA9IHJlZmxlY3Rvci5hbm5vdGF0aW9ucyhjb21wb25lbnQpO1xuICAgIGlmIChpc1ByZXNlbnQoYW5ub3RhdGlvbnMpKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBhbm5vdGF0aW9uID0gYW5ub3RhdGlvbnNbaV07XG4gICAgICAgICAgICBpZiAoYW5ub3RhdGlvbiBpbnN0YW5jZW9mIHJvdXRlX2NvbmZpZ19pbXBsXzEuUm91dGVDb25maWcpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgQmFzZUV4Y2VwdGlvbihcIkNoaWxkIHJvdXRlcyBhcmUgbm90IGFsbG93ZWQgZm9yIFxcXCJcIiArIHBhdGggKyBcIlxcXCIuIFVzZSBcXFwiLi4uXFxcIiBvbiB0aGUgcGFyZW50J3Mgcm91dGUgcGF0aC5cIik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59XG52YXIgX19leHRlbmRzID0gKHRoaXMgJiYgdGhpcy5fX2V4dGVuZHMpIHx8IGZ1bmN0aW9uIChkLCBiKSB7XG4gICAgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07XG4gICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XG4gICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xufTtcbnZhciByb3V0ZV9saWZlY3ljbGVfcmVmbGVjdG9yXzEgPSByZXF1aXJlKCcuL2xpZmVjeWNsZS9yb3V0ZV9saWZlY3ljbGVfcmVmbGVjdG9yJyk7XG52YXIgX3Jlc29sdmVUb1RydWUgPSBQcm9taXNlV3JhcHBlci5yZXNvbHZlKHRydWUpO1xudmFyIF9yZXNvbHZlVG9GYWxzZSA9IFByb21pc2VXcmFwcGVyLnJlc29sdmUoZmFsc2UpO1xuLyoqXG4gKiBUaGUgYFJvdXRlcmAgaXMgcmVzcG9uc2libGUgZm9yIG1hcHBpbmcgVVJMcyB0byBjb21wb25lbnRzLlxuICpcbiAqIFlvdSBjYW4gc2VlIHRoZSBzdGF0ZSBvZiB0aGUgcm91dGVyIGJ5IGluc3BlY3RpbmcgdGhlIHJlYWQtb25seSBmaWVsZCBgcm91dGVyLm5hdmlnYXRpbmdgLlxuICogVGhpcyBtYXkgYmUgdXNlZnVsIGZvciBzaG93aW5nIGEgc3Bpbm5lciwgZm9yIGluc3RhbmNlLlxuICpcbiAqICMjIENvbmNlcHRzXG4gKlxuICogUm91dGVycyBhbmQgY29tcG9uZW50IGluc3RhbmNlcyBoYXZlIGEgMToxIGNvcnJlc3BvbmRlbmNlLlxuICpcbiAqIFRoZSByb3V0ZXIgaG9sZHMgcmVmZXJlbmNlIHRvIGEgbnVtYmVyIG9mIHtAbGluayBSb3V0ZXJPdXRsZXR9LlxuICogQW4gb3V0bGV0IGlzIGEgcGxhY2Vob2xkZXIgdGhhdCB0aGUgcm91dGVyIGR5bmFtaWNhbGx5IGZpbGxzIGluIGRlcGVuZGluZyBvbiB0aGUgY3VycmVudCBVUkwuXG4gKlxuICogV2hlbiB0aGUgcm91dGVyIG5hdmlnYXRlcyBmcm9tIGEgVVJMLCBpdCBtdXN0IGZpcnN0IHJlY29nbml6ZSBpdCBhbmQgc2VyaWFsaXplIGl0IGludG8gYW5cbiAqIGBJbnN0cnVjdGlvbmAuXG4gKiBUaGUgcm91dGVyIHVzZXMgdGhlIGBSb3V0ZVJlZ2lzdHJ5YCB0byBnZXQgYW4gYEluc3RydWN0aW9uYC5cbiAqL1xudmFyIFJvdXRlciA9IChmdW5jdGlvbiAoKSB7XG4gICAgZnVuY3Rpb24gUm91dGVyKHJlZ2lzdHJ5LCBwYXJlbnQsIGhvc3RDb21wb25lbnQpIHtcbiAgICAgICAgdGhpcy5yZWdpc3RyeSA9IHJlZ2lzdHJ5O1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICAgICAgdGhpcy5ob3N0Q29tcG9uZW50ID0gaG9zdENvbXBvbmVudDtcbiAgICAgICAgdGhpcy5uYXZpZ2F0aW5nID0gZmFsc2U7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uID0gX3Jlc29sdmVUb1RydWU7XG4gICAgICAgIHRoaXMuX291dGxldCA9IG51bGw7XG4gICAgICAgIHRoaXMuX2F1eFJvdXRlcnMgPSBuZXcgTWFwKCk7XG4gICAgICAgIHRoaXMuX3N1YmplY3QgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG4gICAgfVxuICAgIC8qKlxuICAgICAqIENvbnN0cnVjdHMgYSBjaGlsZCByb3V0ZXIuIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIHVzZSB0aGlzIHVubGVzcyB5b3UncmUgd3JpdGluZyBhIHJldXNhYmxlXG4gICAgICogY29tcG9uZW50LlxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuY2hpbGRSb3V0ZXIgPSBmdW5jdGlvbiAoaG9zdENvbXBvbmVudCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRSb3V0ZXIgPSBuZXcgQ2hpbGRSb3V0ZXIodGhpcywgaG9zdENvbXBvbmVudCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBDb25zdHJ1Y3RzIGEgY2hpbGQgcm91dGVyLiBZb3UgcHJvYmFibHkgZG9uJ3QgbmVlZCB0byB1c2UgdGhpcyB1bmxlc3MgeW91J3JlIHdyaXRpbmcgYSByZXVzYWJsZVxuICAgICAqIGNvbXBvbmVudC5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLmF1eFJvdXRlciA9IGZ1bmN0aW9uIChob3N0Q29tcG9uZW50KSB7IHJldHVybiBuZXcgQ2hpbGRSb3V0ZXIodGhpcywgaG9zdENvbXBvbmVudCk7IH07XG4gICAgLyoqXG4gICAgICogUmVnaXN0ZXIgYW4gb3V0bGV0IHRvIGJlIG5vdGlmaWVkIG9mIHByaW1hcnkgcm91dGUgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIHVzZSB0aGlzIHVubGVzcyB5b3UncmUgd3JpdGluZyBhIHJldXNhYmxlIGNvbXBvbmVudC5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLnJlZ2lzdGVyUHJpbWFyeU91dGxldCA9IGZ1bmN0aW9uIChvdXRsZXQpIHtcbiAgICAgICAgaWYgKGlzUHJlc2VudChvdXRsZXQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwicmVnaXN0ZXJQcmltYXJ5T3V0bGV0IGV4cGVjdHMgdG8gYmUgY2FsbGVkIHdpdGggYW4gdW5uYW1lZCBvdXRsZXQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5fb3V0bGV0KSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEJhc2VFeGNlcHRpb24oXCJQcmltYXJ5IG91dGxldCBpcyBhbHJlYWR5IHJlZ2lzdGVyZWQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX291dGxldCA9IG91dGxldDtcbiAgICAgICAgaWYgKGlzUHJlc2VudCh0aGlzLl9jdXJyZW50SW5zdHJ1Y3Rpb24pKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb21taXQodGhpcy5fY3VycmVudEluc3RydWN0aW9uLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIF9yZXNvbHZlVG9UcnVlO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogVW5yZWdpc3RlciBhbiBvdXRsZXQgKGJlY2F1c2UgaXQgd2FzIGRlc3Ryb3llZCwgZXRjKS5cbiAgICAgKlxuICAgICAqIFlvdSBwcm9iYWJseSBkb24ndCBuZWVkIHRvIHVzZSB0aGlzIHVubGVzcyB5b3UncmUgd3JpdGluZyBhIGN1c3RvbSBvdXRsZXQgaW1wbGVtZW50YXRpb24uXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyUHJpbWFyeU91dGxldCA9IGZ1bmN0aW9uIChvdXRsZXQpIHtcbiAgICAgICAgaWYgKGlzUHJlc2VudChvdXRsZXQubmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwicmVnaXN0ZXJQcmltYXJ5T3V0bGV0IGV4cGVjdHMgdG8gYmUgY2FsbGVkIHdpdGggYW4gdW5uYW1lZCBvdXRsZXQuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuX291dGxldCA9IG51bGw7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBSZWdpc3RlciBhbiBvdXRsZXQgdG8gbm90aWZpZWQgb2YgYXV4aWxpYXJ5IHJvdXRlIGNoYW5nZXMuXG4gICAgICpcbiAgICAgKiBZb3UgcHJvYmFibHkgZG9uJ3QgbmVlZCB0byB1c2UgdGhpcyB1bmxlc3MgeW91J3JlIHdyaXRpbmcgYSByZXVzYWJsZSBjb21wb25lbnQuXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5yZWdpc3RlckF1eE91dGxldCA9IGZ1bmN0aW9uIChvdXRsZXQpIHtcbiAgICAgICAgdmFyIG91dGxldE5hbWUgPSBvdXRsZXQubmFtZTtcbiAgICAgICAgaWYgKGlzQmxhbmsob3V0bGV0TmFtZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBCYXNlRXhjZXB0aW9uKFwicmVnaXN0ZXJBdXhPdXRsZXQgZXhwZWN0cyB0byBiZSBjYWxsZWQgd2l0aCBhbiBvdXRsZXQgd2l0aCBhIG5hbWUuXCIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciByb3V0ZXIgPSB0aGlzLmF1eFJvdXRlcih0aGlzLmhvc3RDb21wb25lbnQpO1xuICAgICAgICB0aGlzLl9hdXhSb3V0ZXJzLnNldChvdXRsZXROYW1lLCByb3V0ZXIpO1xuICAgICAgICByb3V0ZXIuX291dGxldCA9IG91dGxldDtcbiAgICAgICAgdmFyIGF1eEluc3RydWN0aW9uO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbikgJiZcbiAgICAgICAgICAgIGlzUHJlc2VudChhdXhJbnN0cnVjdGlvbiA9IHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbi5hdXhJbnN0cnVjdGlvbltvdXRsZXROYW1lXSkpIHtcbiAgICAgICAgICAgIHJldHVybiByb3V0ZXIuY29tbWl0KGF1eEluc3RydWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gX3Jlc29sdmVUb1RydWU7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBHaXZlbiBhbiBpbnN0cnVjdGlvbiwgcmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGluc3RydWN0aW9uIGlzIGN1cnJlbnRseSBhY3RpdmUsXG4gICAgICogb3RoZXJ3aXNlIGBmYWxzZWAuXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5pc1JvdXRlQWN0aXZlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgIHZhciByb3V0ZXIgPSB0aGlzO1xuICAgICAgICB3aGlsZSAoaXNQcmVzZW50KHJvdXRlci5wYXJlbnQpICYmIGlzUHJlc2VudChpbnN0cnVjdGlvbi5jaGlsZCkpIHtcbiAgICAgICAgICAgIHJvdXRlciA9IHJvdXRlci5wYXJlbnQ7XG4gICAgICAgICAgICBpbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uLmNoaWxkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpc1ByZXNlbnQodGhpcy5fY3VycmVudEluc3RydWN0aW9uKSAmJlxuICAgICAgICAgICAgdGhpcy5fY3VycmVudEluc3RydWN0aW9uLmNvbXBvbmVudCA9PSBpbnN0cnVjdGlvbi5jb21wb25lbnQ7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBEeW5hbWljYWxseSB1cGRhdGUgdGhlIHJvdXRpbmcgY29uZmlndXJhdGlvbiBhbmQgdHJpZ2dlciBhIG5hdmlnYXRpb24uXG4gICAgICpcbiAgICAgKiAjIyMgVXNhZ2VcbiAgICAgKlxuICAgICAqIGBgYFxuICAgICAqIHJvdXRlci5jb25maWcoW1xuICAgICAqICAgeyAncGF0aCc6ICcvJywgJ2NvbXBvbmVudCc6IEluZGV4Q29tcCB9LFxuICAgICAqICAgeyAncGF0aCc6ICcvdXNlci86aWQnLCAnY29tcG9uZW50JzogVXNlckNvbXAgfSxcbiAgICAgKiBdKTtcbiAgICAgKiBgYGBcbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLmNvbmZpZyA9IGZ1bmN0aW9uIChkZWZpbml0aW9ucykge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBkZWZpbml0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChyb3V0ZURlZmluaXRpb24pIHsgX3RoaXMucmVnaXN0cnkuY29uZmlnKF90aGlzLmhvc3RDb21wb25lbnQsIHJvdXRlRGVmaW5pdGlvbik7IH0pO1xuICAgICAgICByZXR1cm4gdGhpcy5yZW5hdmlnYXRlKCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBOYXZpZ2F0ZSBiYXNlZCBvbiB0aGUgcHJvdmlkZWQgUm91dGUgTGluayBEU0wuIEl0J3MgcHJlZmVycmVkIHRvIG5hdmlnYXRlIHdpdGggdGhpcyBtZXRob2RcbiAgICAgKiBvdmVyIGBuYXZpZ2F0ZUJ5VXJsYC5cbiAgICAgKlxuICAgICAqICMjIyBVc2FnZVxuICAgICAqXG4gICAgICogVGhpcyBtZXRob2QgdGFrZXMgYW4gYXJyYXkgcmVwcmVzZW50aW5nIHRoZSBSb3V0ZSBMaW5rIERTTDpcbiAgICAgKiBgYGBcbiAgICAgKiBbJy4vTXlDbXAnLCB7cGFyYW06IDN9XVxuICAgICAqIGBgYFxuICAgICAqIFNlZSB0aGUge0BsaW5rIFJvdXRlckxpbmt9IGRpcmVjdGl2ZSBmb3IgbW9yZS5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLm5hdmlnYXRlID0gZnVuY3Rpb24gKGxpbmtQYXJhbXMpIHtcbiAgICAgICAgdmFyIGluc3RydWN0aW9uID0gdGhpcy5nZW5lcmF0ZShsaW5rUGFyYW1zKTtcbiAgICAgICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeUluc3RydWN0aW9uKGluc3RydWN0aW9uLCBmYWxzZSk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBOYXZpZ2F0ZSB0byBhIFVSTC4gUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIG5hdmlnYXRpb24gaXMgY29tcGxldGUuXG4gICAgICogSXQncyBwcmVmZXJyZWQgdG8gbmF2aWdhdGUgd2l0aCBgbmF2aWdhdGVgIGluc3RlYWQgb2YgdGhpcyBtZXRob2QsIHNpbmNlIFVSTHMgYXJlIG1vcmUgYnJpdHRsZS5cbiAgICAgKlxuICAgICAqIElmIHRoZSBnaXZlbiBVUkwgYmVnaW5zIHdpdGggYSBgL2AsIHJvdXRlciB3aWxsIG5hdmlnYXRlIGFic29sdXRlbHkuXG4gICAgICogSWYgdGhlIGdpdmVuIFVSTCBkb2VzIG5vdCBiZWdpbiB3aXRoIGAvYCwgdGhlIHJvdXRlciB3aWxsIG5hdmlnYXRlIHJlbGF0aXZlIHRvIHRoaXMgY29tcG9uZW50LlxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUubmF2aWdhdGVCeVVybCA9IGZ1bmN0aW9uICh1cmwsIF9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKF9za2lwTG9jYXRpb25DaGFuZ2UgPT09IHZvaWQgMCkgeyBfc2tpcExvY2F0aW9uQ2hhbmdlID0gZmFsc2U7IH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uID0gdGhpcy5fY3VycmVudE5hdmlnYXRpb24udGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgX3RoaXMubGFzdE5hdmlnYXRpb25BdHRlbXB0ID0gdXJsO1xuICAgICAgICAgICAgX3RoaXMuX3N0YXJ0TmF2aWdhdGluZygpO1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9hZnRlclByb21pc2VGaW5pc2hOYXZpZ2F0aW5nKF90aGlzLnJlY29nbml6ZSh1cmwpLnRoZW4oZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgaWYgKGlzQmxhbmsoaW5zdHJ1Y3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9uYXZpZ2F0ZShpbnN0cnVjdGlvbiwgX3NraXBMb2NhdGlvbkNoYW5nZSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgIH0pO1xuICAgIH07XG4gICAgLyoqXG4gICAgICogTmF2aWdhdGUgdmlhIHRoZSBwcm92aWRlZCBpbnN0cnVjdGlvbi4gUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIG5hdmlnYXRpb24gaXNcbiAgICAgKiBjb21wbGV0ZS5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLm5hdmlnYXRlQnlJbnN0cnVjdGlvbiA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbiwgX3NraXBMb2NhdGlvbkNoYW5nZSkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAoX3NraXBMb2NhdGlvbkNoYW5nZSA9PT0gdm9pZCAwKSB7IF9za2lwTG9jYXRpb25DaGFuZ2UgPSBmYWxzZTsgfVxuICAgICAgICBpZiAoaXNCbGFuayhpbnN0cnVjdGlvbikpIHtcbiAgICAgICAgICAgIHJldHVybiBfcmVzb2x2ZVRvRmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMuX2N1cnJlbnROYXZpZ2F0aW9uID0gdGhpcy5fY3VycmVudE5hdmlnYXRpb24udGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgX3RoaXMuX3N0YXJ0TmF2aWdhdGluZygpO1xuICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9hZnRlclByb21pc2VGaW5pc2hOYXZpZ2F0aW5nKF90aGlzLl9uYXZpZ2F0ZShpbnN0cnVjdGlvbiwgX3NraXBMb2NhdGlvbkNoYW5nZSkpO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLl9zZXR0bGVJbnN0cnVjdGlvbiA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb24ucmVzb2x2ZUNvbXBvbmVudCgpLnRoZW4oZnVuY3Rpb24gKF8pIHtcbiAgICAgICAgICAgIHZhciB1bnNldHRsZWRJbnN0cnVjdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIGlmIChpc1ByZXNlbnQoaW5zdHJ1Y3Rpb24uY29tcG9uZW50KSkge1xuICAgICAgICAgICAgICAgIGluc3RydWN0aW9uLmNvbXBvbmVudC5yZXVzZSA9IGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChpbnN0cnVjdGlvbi5jaGlsZCkpIHtcbiAgICAgICAgICAgICAgICB1bnNldHRsZWRJbnN0cnVjdGlvbnMucHVzaChfdGhpcy5fc2V0dGxlSW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24uY2hpbGQpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFN0cmluZ01hcFdyYXBwZXIuZm9yRWFjaChpbnN0cnVjdGlvbi5hdXhJbnN0cnVjdGlvbiwgZnVuY3Rpb24gKGluc3RydWN0aW9uLCBfKSB7XG4gICAgICAgICAgICAgICAgdW5zZXR0bGVkSW5zdHJ1Y3Rpb25zLnB1c2goX3RoaXMuX3NldHRsZUluc3RydWN0aW9uKGluc3RydWN0aW9uKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlV3JhcHBlci5hbGwodW5zZXR0bGVkSW5zdHJ1Y3Rpb25zKTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5fbmF2aWdhdGUgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcmV0dXJuIHRoaXMuX3NldHRsZUluc3RydWN0aW9uKGluc3RydWN0aW9uKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKF8pIHsgcmV0dXJuIF90aGlzLl9yb3V0ZXJDYW5SZXVzZShpbnN0cnVjdGlvbik7IH0pXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoXykgeyByZXR1cm4gX3RoaXMuX2NhbkFjdGl2YXRlKGluc3RydWN0aW9uKTsgfSlcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9yb3V0ZXJDYW5EZWFjdGl2YXRlKGluc3RydWN0aW9uKVxuICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5jb21taXQoaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpXG4gICAgICAgICAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoXykge1xuICAgICAgICAgICAgICAgICAgICAgICAgX3RoaXMuX2VtaXROYXZpZ2F0aW9uRmluaXNoKGluc3RydWN0aW9uLnRvUm9vdFVybCgpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBSb3V0ZXIucHJvdG90eXBlLl9lbWl0TmF2aWdhdGlvbkZpbmlzaCA9IGZ1bmN0aW9uICh1cmwpIHsgT2JzZXJ2YWJsZVdyYXBwZXIuY2FsbEVtaXQodGhpcy5fc3ViamVjdCwgdXJsKTsgfTtcbiAgICBSb3V0ZXIucHJvdG90eXBlLl9hZnRlclByb21pc2VGaW5pc2hOYXZpZ2F0aW5nID0gZnVuY3Rpb24gKHByb21pc2UpIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgcmV0dXJuIFByb21pc2VXcmFwcGVyLmNhdGNoRXJyb3IocHJvbWlzZS50aGVuKGZ1bmN0aW9uIChfKSB7IHJldHVybiBfdGhpcy5fZmluaXNoTmF2aWdhdGluZygpOyB9KSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgX3RoaXMuX2ZpbmlzaE5hdmlnYXRpbmcoKTtcbiAgICAgICAgICAgIHRocm93IGVycjtcbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICAvKlxuICAgICAqIFJlY3Vyc2l2ZWx5IHNldCByZXVzZSBmbGFnc1xuICAgICAqL1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLl9yb3V0ZXJDYW5SZXVzZSA9IGZ1bmN0aW9uIChpbnN0cnVjdGlvbikge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBpZiAoaXNCbGFuayh0aGlzLl9vdXRsZXQpKSB7XG4gICAgICAgICAgICByZXR1cm4gX3Jlc29sdmVUb0ZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0JsYW5rKGluc3RydWN0aW9uLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHJldHVybiBfcmVzb2x2ZVRvVHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy5fb3V0bGV0LnJvdXRlckNhblJldXNlKGluc3RydWN0aW9uLmNvbXBvbmVudClcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChyZXN1bHQpIHtcbiAgICAgICAgICAgIGluc3RydWN0aW9uLmNvbXBvbmVudC5yZXVzZSA9IHJlc3VsdDtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgJiYgaXNQcmVzZW50KF90aGlzLl9jaGlsZFJvdXRlcikgJiYgaXNQcmVzZW50KGluc3RydWN0aW9uLmNoaWxkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBfdGhpcy5fY2hpbGRSb3V0ZXIuX3JvdXRlckNhblJldXNlKGluc3RydWN0aW9uLmNoaWxkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfTtcbiAgICBSb3V0ZXIucHJvdG90eXBlLl9jYW5BY3RpdmF0ZSA9IGZ1bmN0aW9uIChuZXh0SW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGNhbkFjdGl2YXRlT25lKG5leHRJbnN0cnVjdGlvbiwgdGhpcy5fY3VycmVudEluc3RydWN0aW9uKTtcbiAgICB9O1xuICAgIFJvdXRlci5wcm90b3R5cGUuX3JvdXRlckNhbkRlYWN0aXZhdGUgPSBmdW5jdGlvbiAoaW5zdHJ1Y3Rpb24pIHtcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcbiAgICAgICAgaWYgKGlzQmxhbmsodGhpcy5fb3V0bGV0KSkge1xuICAgICAgICAgICAgcmV0dXJuIF9yZXNvbHZlVG9UcnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBuZXh0O1xuICAgICAgICB2YXIgY2hpbGRJbnN0cnVjdGlvbiA9IG51bGw7XG4gICAgICAgIHZhciByZXVzZSA9IGZhbHNlO1xuICAgICAgICB2YXIgY29tcG9uZW50SW5zdHJ1Y3Rpb24gPSBudWxsO1xuICAgICAgICBpZiAoaXNQcmVzZW50KGluc3RydWN0aW9uKSkge1xuICAgICAgICAgICAgY2hpbGRJbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uLmNoaWxkO1xuICAgICAgICAgICAgY29tcG9uZW50SW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbi5jb21wb25lbnQ7XG4gICAgICAgICAgICByZXVzZSA9IGlzQmxhbmsoaW5zdHJ1Y3Rpb24uY29tcG9uZW50KSB8fCBpbnN0cnVjdGlvbi5jb21wb25lbnQucmV1c2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHJldXNlKSB7XG4gICAgICAgICAgICBuZXh0ID0gX3Jlc29sdmVUb1RydWU7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBuZXh0ID0gdGhpcy5fb3V0bGV0LnJvdXRlckNhbkRlYWN0aXZhdGUoY29tcG9uZW50SW5zdHJ1Y3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IGF1eCByb3V0ZSBsaWZlY3ljbGUgaG9va3NcbiAgICAgICAgcmV0dXJuIG5leHQudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzdWx0ID09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChfdGhpcy5fY2hpbGRSb3V0ZXIpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9jaGlsZFJvdXRlci5fcm91dGVyQ2FuRGVhY3RpdmF0ZShjaGlsZEluc3RydWN0aW9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhpcyByb3V0ZXIgYW5kIGFsbCBkZXNjZW5kYW50IHJvdXRlcnMgYWNjb3JkaW5nIHRvIHRoZSBnaXZlbiBpbnN0cnVjdGlvblxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUuY29tbWl0ID0gZnVuY3Rpb24gKGluc3RydWN0aW9uLCBfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChfc2tpcExvY2F0aW9uQ2hhbmdlID09PSB2b2lkIDApIHsgX3NraXBMb2NhdGlvbkNoYW5nZSA9IGZhbHNlOyB9XG4gICAgICAgIHRoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uO1xuICAgICAgICB2YXIgbmV4dCA9IF9yZXNvbHZlVG9UcnVlO1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX291dGxldCkgJiYgaXNQcmVzZW50KGluc3RydWN0aW9uLmNvbXBvbmVudCkpIHtcbiAgICAgICAgICAgIHZhciBjb21wb25lbnRJbnN0cnVjdGlvbiA9IGluc3RydWN0aW9uLmNvbXBvbmVudDtcbiAgICAgICAgICAgIGlmIChjb21wb25lbnRJbnN0cnVjdGlvbi5yZXVzZSkge1xuICAgICAgICAgICAgICAgIG5leHQgPSB0aGlzLl9vdXRsZXQucmV1c2UoY29tcG9uZW50SW5zdHJ1Y3Rpb24pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbmV4dCA9XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVhY3RpdmF0ZShpbnN0cnVjdGlvbikudGhlbihmdW5jdGlvbiAoXykgeyByZXR1cm4gX3RoaXMuX291dGxldC5hY3RpdmF0ZShjb21wb25lbnRJbnN0cnVjdGlvbik7IH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGlzUHJlc2VudChpbnN0cnVjdGlvbi5jaGlsZCkpIHtcbiAgICAgICAgICAgICAgICBuZXh0ID0gbmV4dC50aGVuKGZ1bmN0aW9uIChfKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc1ByZXNlbnQoX3RoaXMuX2NoaWxkUm91dGVyKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF90aGlzLl9jaGlsZFJvdXRlci5jb21taXQoaW5zdHJ1Y3Rpb24uY2hpbGQpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByb21pc2VzID0gW107XG4gICAgICAgIHRoaXMuX2F1eFJvdXRlcnMuZm9yRWFjaChmdW5jdGlvbiAocm91dGVyLCBuYW1lKSB7XG4gICAgICAgICAgICBpZiAoaXNQcmVzZW50KGluc3RydWN0aW9uLmF1eEluc3RydWN0aW9uW25hbWVdKSkge1xuICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2gocm91dGVyLmNvbW1pdChpbnN0cnVjdGlvbi5hdXhJbnN0cnVjdGlvbltuYW1lXSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIG5leHQudGhlbihmdW5jdGlvbiAoXykgeyByZXR1cm4gUHJvbWlzZVdyYXBwZXIuYWxsKHByb21pc2VzKTsgfSk7XG4gICAgfTtcbiAgICAvKiogQGludGVybmFsICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5fc3RhcnROYXZpZ2F0aW5nID0gZnVuY3Rpb24gKCkgeyB0aGlzLm5hdmlnYXRpbmcgPSB0cnVlOyB9O1xuICAgIC8qKiBAaW50ZXJuYWwgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLl9maW5pc2hOYXZpZ2F0aW5nID0gZnVuY3Rpb24gKCkgeyB0aGlzLm5hdmlnYXRpbmcgPSBmYWxzZTsgfTtcbiAgICAvKipcbiAgICAgKiBTdWJzY3JpYmUgdG8gVVJMIHVwZGF0ZXMgZnJvbSB0aGUgcm91dGVyXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAob25OZXh0KSB7XG4gICAgICAgIHJldHVybiBPYnNlcnZhYmxlV3JhcHBlci5zdWJzY3JpYmUodGhpcy5fc3ViamVjdCwgb25OZXh0KTtcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIFJlbW92ZXMgdGhlIGNvbnRlbnRzIG9mIHRoaXMgcm91dGVyJ3Mgb3V0bGV0IGFuZCBhbGwgZGVzY2VuZGFudCBvdXRsZXRzXG4gICAgICovXG4gICAgUm91dGVyLnByb3RvdHlwZS5kZWFjdGl2YXRlID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIHZhciBjaGlsZEluc3RydWN0aW9uID0gbnVsbDtcbiAgICAgICAgdmFyIGNvbXBvbmVudEluc3RydWN0aW9uID0gbnVsbDtcbiAgICAgICAgaWYgKGlzUHJlc2VudChpbnN0cnVjdGlvbikpIHtcbiAgICAgICAgICAgIGNoaWxkSW5zdHJ1Y3Rpb24gPSBpbnN0cnVjdGlvbi5jaGlsZDtcbiAgICAgICAgICAgIGNvbXBvbmVudEluc3RydWN0aW9uID0gaW5zdHJ1Y3Rpb24uY29tcG9uZW50O1xuICAgICAgICB9XG4gICAgICAgIHZhciBuZXh0ID0gX3Jlc29sdmVUb1RydWU7XG4gICAgICAgIGlmIChpc1ByZXNlbnQodGhpcy5fY2hpbGRSb3V0ZXIpKSB7XG4gICAgICAgICAgICBuZXh0ID0gdGhpcy5fY2hpbGRSb3V0ZXIuZGVhY3RpdmF0ZShjaGlsZEluc3RydWN0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX291dGxldCkpIHtcbiAgICAgICAgICAgIG5leHQgPSBuZXh0LnRoZW4oZnVuY3Rpb24gKF8pIHsgcmV0dXJuIF90aGlzLl9vdXRsZXQuZGVhY3RpdmF0ZShjb21wb25lbnRJbnN0cnVjdGlvbik7IH0pO1xuICAgICAgICB9XG4gICAgICAgIC8vIFRPRE86IGhhbmRsZSBhdXggcm91dGVzXG4gICAgICAgIHJldHVybiBuZXh0O1xuICAgIH07XG4gICAgLyoqXG4gICAgICogR2l2ZW4gYSBVUkwsIHJldHVybnMgYW4gaW5zdHJ1Y3Rpb24gcmVwcmVzZW50aW5nIHRoZSBjb21wb25lbnQgZ3JhcGhcbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLnJlY29nbml6ZSA9IGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgdmFyIGFuY2VzdG9yQ29tcG9uZW50cyA9IHRoaXMuX2dldEFuY2VzdG9ySW5zdHJ1Y3Rpb25zKCk7XG4gICAgICAgIHJldHVybiB0aGlzLnJlZ2lzdHJ5LnJlY29nbml6ZSh1cmwsIGFuY2VzdG9yQ29tcG9uZW50cyk7XG4gICAgfTtcbiAgICBSb3V0ZXIucHJvdG90eXBlLl9nZXRBbmNlc3Rvckluc3RydWN0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zID0gW3RoaXMuX2N1cnJlbnRJbnN0cnVjdGlvbl07XG4gICAgICAgIHZhciBhbmNlc3RvclJvdXRlciA9IHRoaXM7XG4gICAgICAgIHdoaWxlIChpc1ByZXNlbnQoYW5jZXN0b3JSb3V0ZXIgPSBhbmNlc3RvclJvdXRlci5wYXJlbnQpKSB7XG4gICAgICAgICAgICBhbmNlc3Rvckluc3RydWN0aW9ucy51bnNoaWZ0KGFuY2VzdG9yUm91dGVyLl9jdXJyZW50SW5zdHJ1Y3Rpb24pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhbmNlc3Rvckluc3RydWN0aW9ucztcbiAgICB9O1xuICAgIC8qKlxuICAgICAqIE5hdmlnYXRlcyB0byBlaXRoZXIgdGhlIGxhc3QgVVJMIHN1Y2Nlc3NmdWxseSBuYXZpZ2F0ZWQgdG8sIG9yIHRoZSBsYXN0IFVSTCByZXF1ZXN0ZWQgaWYgdGhlXG4gICAgICogcm91dGVyIGhhcyB5ZXQgdG8gc3VjY2Vzc2Z1bGx5IG5hdmlnYXRlLlxuICAgICAqL1xuICAgIFJvdXRlci5wcm90b3R5cGUucmVuYXZpZ2F0ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGlzQmxhbmsodGhpcy5sYXN0TmF2aWdhdGlvbkF0dGVtcHQpKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fY3VycmVudE5hdmlnYXRpb247XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMubmF2aWdhdGVCeVVybCh0aGlzLmxhc3ROYXZpZ2F0aW9uQXR0ZW1wdCk7XG4gICAgfTtcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBhbiBgSW5zdHJ1Y3Rpb25gIGJhc2VkIG9uIHRoZSBwcm92aWRlZCBSb3V0ZSBMaW5rIERTTC5cbiAgICAgKi9cbiAgICBSb3V0ZXIucHJvdG90eXBlLmdlbmVyYXRlID0gZnVuY3Rpb24gKGxpbmtQYXJhbXMpIHtcbiAgICAgICAgdmFyIGFuY2VzdG9ySW5zdHJ1Y3Rpb25zID0gdGhpcy5fZ2V0QW5jZXN0b3JJbnN0cnVjdGlvbnMoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVnaXN0cnkuZ2VuZXJhdGUobGlua1BhcmFtcywgYW5jZXN0b3JJbnN0cnVjdGlvbnMpO1xuICAgIH07XG4gICAgcmV0dXJuIFJvdXRlcjtcbn0pKCk7XG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcbnZhciBSb290Um91dGVyID0gKGZ1bmN0aW9uIChfc3VwZXIpIHtcbiAgICBfX2V4dGVuZHMoUm9vdFJvdXRlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBSb290Um91dGVyKHJlZ2lzdHJ5LCBsb2NhdGlvbiwgcHJpbWFyeUNvbXBvbmVudCkge1xuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgICAgICBfc3VwZXIuY2FsbCh0aGlzLCByZWdpc3RyeSwgbnVsbCwgcHJpbWFyeUNvbXBvbmVudCk7XG4gICAgICAgIHRoaXMuX2xvY2F0aW9uID0gbG9jYXRpb247XG4gICAgICAgIHRoaXMuX2xvY2F0aW9uU3ViID0gdGhpcy5fbG9jYXRpb24uc3Vic2NyaWJlKGZ1bmN0aW9uIChjaGFuZ2UpIHtcbiAgICAgICAgICAgIC8vIHdlIGNhbGwgcmVjb2duaXplIG91cnNlbHZlc1xuICAgICAgICAgICAgX3RoaXMucmVjb2duaXplKGNoYW5nZVsndXJsJ10pXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgX3RoaXMubmF2aWdhdGVCeUluc3RydWN0aW9uKGluc3RydWN0aW9uLCBpc1ByZXNlbnQoY2hhbmdlWydwb3AnXSkpXG4gICAgICAgICAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uIChfKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMgaXMgYSBwb3BzdGF0ZSBldmVudDsgbm8gbmVlZCB0byBjaGFuZ2UgdGhlIFVSTFxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNQcmVzZW50KGNoYW5nZVsncG9wJ10pICYmIGNoYW5nZVsndHlwZSddICE9ICdoYXNoY2hhbmdlJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHZhciBlbWl0UGF0aCA9IGluc3RydWN0aW9uLnRvVXJsUGF0aCgpO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZW1pdFF1ZXJ5ID0gaW5zdHJ1Y3Rpb24udG9VcmxRdWVyeSgpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZW1pdFBhdGgubGVuZ3RoID4gMCAmJiBlbWl0UGF0aFswXSAhPSAnLycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVtaXRQYXRoID0gJy8nICsgZW1pdFBhdGg7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgLy8gQmVjYXVzZSB3ZSd2ZSBvcHRlZCB0byB1c2UgQWxsIGhhc2hjaGFuZ2UgZXZlbnRzIG9jY3VyIG91dHNpZGUgQW5ndWxhci5cbiAgICAgICAgICAgICAgICAgICAgLy8gSG93ZXZlciwgYXBwcyB0aGF0IGFyZSBtaWdyYXRpbmcgbWlnaHQgaGF2ZSBoYXNoIGxpbmtzIHRoYXQgb3BlcmF0ZSBvdXRzaWRlXG4gICAgICAgICAgICAgICAgICAgIC8vIGFuZ3VsYXIgdG8gd2hpY2ggcm91dGluZyBtdXN0IHJlc3BvbmQuXG4gICAgICAgICAgICAgICAgICAgIC8vIFRvIHN1cHBvcnQgdGhlc2UgY2FzZXMgd2hlcmUgd2UgcmVzcG9uZCB0byBoYXNoY2hhbmdlcyBhbmQgcmVkaXJlY3QgYXMgYVxuICAgICAgICAgICAgICAgICAgICAvLyByZXN1bHQsIHdlIG5lZWQgdG8gcmVwbGFjZSB0aGUgdG9wIGl0ZW0gb24gdGhlIHN0YWNrLlxuICAgICAgICAgICAgICAgICAgICBpZiAoY2hhbmdlWyd0eXBlJ10gPT0gJ2hhc2hjaGFuZ2UnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5zdHJ1Y3Rpb24udG9Sb290VXJsKCkgIT0gX3RoaXMuX2xvY2F0aW9uLnBhdGgoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF90aGlzLl9sb2NhdGlvbi5yZXBsYWNlU3RhdGUoZW1pdFBhdGgsIGVtaXRRdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBfdGhpcy5fbG9jYXRpb24uZ28oZW1pdFBhdGgsIGVtaXRRdWVyeSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5yZWdpc3RyeS5jb25maWdGcm9tQ29tcG9uZW50KHByaW1hcnlDb21wb25lbnQpO1xuICAgICAgICB0aGlzLm5hdmlnYXRlQnlVcmwobG9jYXRpb24ucGF0aCgpKTtcbiAgICB9XG4gICAgUm9vdFJvdXRlci5wcm90b3R5cGUuY29tbWl0ID0gZnVuY3Rpb24gKGluc3RydWN0aW9uLCBfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XG4gICAgICAgIGlmIChfc2tpcExvY2F0aW9uQ2hhbmdlID09PSB2b2lkIDApIHsgX3NraXBMb2NhdGlvbkNoYW5nZSA9IGZhbHNlOyB9XG4gICAgICAgIHZhciBlbWl0UGF0aCA9IGluc3RydWN0aW9uLnRvVXJsUGF0aCgpO1xuICAgICAgICB2YXIgZW1pdFF1ZXJ5ID0gaW5zdHJ1Y3Rpb24udG9VcmxRdWVyeSgpO1xuICAgICAgICBpZiAoZW1pdFBhdGgubGVuZ3RoID4gMCAmJiBlbWl0UGF0aFswXSAhPSAnLycpIHtcbiAgICAgICAgICAgIGVtaXRQYXRoID0gJy8nICsgZW1pdFBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHByb21pc2UgPSBfc3VwZXIucHJvdG90eXBlLmNvbW1pdC5jYWxsKHRoaXMsIGluc3RydWN0aW9uKTtcbiAgICAgICAgaWYgKCFfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgICAgICBwcm9taXNlID0gcHJvbWlzZS50aGVuKGZ1bmN0aW9uIChfKSB7IF90aGlzLl9sb2NhdGlvbi5nbyhlbWl0UGF0aCwgZW1pdFF1ZXJ5KTsgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfTtcbiAgICBSb290Um91dGVyLnByb3RvdHlwZS5kaXNwb3NlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoaXNQcmVzZW50KHRoaXMuX2xvY2F0aW9uU3ViKSkge1xuICAgICAgICAgICAgT2JzZXJ2YWJsZVdyYXBwZXIuZGlzcG9zZSh0aGlzLl9sb2NhdGlvblN1Yik7XG4gICAgICAgICAgICB0aGlzLl9sb2NhdGlvblN1YiA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9O1xuICAgIHJldHVybiBSb290Um91dGVyO1xufSkoUm91dGVyKTtcbmV4cG9ydHMuUm9vdFJvdXRlciA9IFJvb3RSb3V0ZXI7XG52YXIgQ2hpbGRSb3V0ZXIgPSAoZnVuY3Rpb24gKF9zdXBlcikge1xuICAgIF9fZXh0ZW5kcyhDaGlsZFJvdXRlciwgX3N1cGVyKTtcbiAgICBmdW5jdGlvbiBDaGlsZFJvdXRlcihwYXJlbnQsIGhvc3RDb21wb25lbnQpIHtcbiAgICAgICAgX3N1cGVyLmNhbGwodGhpcywgcGFyZW50LnJlZ2lzdHJ5LCBwYXJlbnQsIGhvc3RDb21wb25lbnQpO1xuICAgICAgICB0aGlzLnBhcmVudCA9IHBhcmVudDtcbiAgICB9XG4gICAgQ2hpbGRSb3V0ZXIucHJvdG90eXBlLm5hdmlnYXRlQnlVcmwgPSBmdW5jdGlvbiAodXJsLCBfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgIGlmIChfc2tpcExvY2F0aW9uQ2hhbmdlID09PSB2b2lkIDApIHsgX3NraXBMb2NhdGlvbkNoYW5nZSA9IGZhbHNlOyB9XG4gICAgICAgIC8vIERlbGVnYXRlIG5hdmlnYXRpb24gdG8gdGhlIHJvb3Qgcm91dGVyXG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5uYXZpZ2F0ZUJ5VXJsKHVybCwgX3NraXBMb2NhdGlvbkNoYW5nZSk7XG4gICAgfTtcbiAgICBDaGlsZFJvdXRlci5wcm90b3R5cGUubmF2aWdhdGVCeUluc3RydWN0aW9uID0gZnVuY3Rpb24gKGluc3RydWN0aW9uLCBfc2tpcExvY2F0aW9uQ2hhbmdlKSB7XG4gICAgICAgIGlmIChfc2tpcExvY2F0aW9uQ2hhbmdlID09PSB2b2lkIDApIHsgX3NraXBMb2NhdGlvbkNoYW5nZSA9IGZhbHNlOyB9XG4gICAgICAgIC8vIERlbGVnYXRlIG5hdmlnYXRpb24gdG8gdGhlIHJvb3Qgcm91dGVyXG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudC5uYXZpZ2F0ZUJ5SW5zdHJ1Y3Rpb24oaW5zdHJ1Y3Rpb24sIF9za2lwTG9jYXRpb25DaGFuZ2UpO1xuICAgIH07XG4gICAgcmV0dXJuIENoaWxkUm91dGVyO1xufSkoUm91dGVyKTtcbmZ1bmN0aW9uIGNhbkFjdGl2YXRlT25lKG5leHRJbnN0cnVjdGlvbiwgcHJldkluc3RydWN0aW9uKSB7XG4gICAgdmFyIG5leHQgPSBfcmVzb2x2ZVRvVHJ1ZTtcbiAgICBpZiAoaXNCbGFuayhuZXh0SW5zdHJ1Y3Rpb24uY29tcG9uZW50KSkge1xuICAgICAgICByZXR1cm4gbmV4dDtcbiAgICB9XG4gICAgaWYgKGlzUHJlc2VudChuZXh0SW5zdHJ1Y3Rpb24uY2hpbGQpKSB7XG4gICAgICAgIG5leHQgPSBjYW5BY3RpdmF0ZU9uZShuZXh0SW5zdHJ1Y3Rpb24uY2hpbGQsIGlzUHJlc2VudChwcmV2SW5zdHJ1Y3Rpb24pID8gcHJldkluc3RydWN0aW9uLmNoaWxkIDogbnVsbCk7XG4gICAgfVxuICAgIHJldHVybiBuZXh0LnRoZW4oZnVuY3Rpb24gKHJlc3VsdCkge1xuICAgICAgICBpZiAocmVzdWx0ID09IGZhbHNlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5leHRJbnN0cnVjdGlvbi5jb21wb25lbnQucmV1c2UpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHZhciBob29rID0gcm91dGVfbGlmZWN5Y2xlX3JlZmxlY3Rvcl8xLmdldENhbkFjdGl2YXRlSG9vayhuZXh0SW5zdHJ1Y3Rpb24uY29tcG9uZW50LmNvbXBvbmVudFR5cGUpO1xuICAgICAgICBpZiAoaXNQcmVzZW50KGhvb2spKSB7XG4gICAgICAgICAgICByZXR1cm4gaG9vayhuZXh0SW5zdHJ1Y3Rpb24uY29tcG9uZW50LCBpc1ByZXNlbnQocHJldkluc3RydWN0aW9uKSA/IHByZXZJbnN0cnVjdGlvbi5jb21wb25lbnQgOiBudWxsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcbn1cblxuXG4gIC8vVE9ETzogdGhpcyBpcyBhIGhhY2sgdG8gcmVwbGFjZSB0aGUgZXhpdGluZyBpbXBsZW1lbnRhdGlvbiBhdCBydW4tdGltZVxuICBleHBvcnRzLmdldENhbkFjdGl2YXRlSG9vayA9IGZ1bmN0aW9uIChkaXJlY3RpdmVOYW1lKSB7XG4gICAgdmFyIGZhY3RvcnkgPSAkJGRpcmVjdGl2ZUludHJvc3BlY3Rvci5nZXRUeXBlQnlOYW1lKGRpcmVjdGl2ZU5hbWUpO1xuICAgIHJldHVybiBmYWN0b3J5ICYmIGZhY3RvcnkuJGNhbkFjdGl2YXRlICYmIGZ1bmN0aW9uIChuZXh0LCBwcmV2KSB7XG4gICAgICByZXR1cm4gJGluamVjdG9yLmludm9rZShmYWN0b3J5LiRjYW5BY3RpdmF0ZSwgbnVsbCwge1xuICAgICAgICAkbmV4dEluc3RydWN0aW9uOiBuZXh0LFxuICAgICAgICAkcHJldkluc3RydWN0aW9uOiBwcmV2XG4gICAgICB9KTtcbiAgICB9O1xuICB9O1xuXG4gIC8vIFRoaXMgaGFjayByZW1vdmVzIGFzc2VydGlvbnMgYWJvdXQgdGhlIHR5cGUgb2YgdGhlIFwiY29tcG9uZW50XCJcbiAgLy8gcHJvcGVydHkgaW4gYSByb3V0ZSBjb25maWdcbiAgZXhwb3J0cy5hc3NlcnRDb21wb25lbnRFeGlzdHMgPSBmdW5jdGlvbiAoKSB7fTtcblxuICBhbmd1bGFyLnN0cmluZ2lmeUluc3RydWN0aW9uID0gZnVuY3Rpb24gKGluc3RydWN0aW9uKSB7XG4gICAgcmV0dXJuIGluc3RydWN0aW9uLnRvUm9vdFVybCgpO1xuICB9O1xuXG4gIHZhciBSb3V0ZVJlZ2lzdHJ5ID0gZXhwb3J0cy5Sb3V0ZVJlZ2lzdHJ5O1xuICB2YXIgUm9vdFJvdXRlciA9IGV4cG9ydHMuUm9vdFJvdXRlcjtcblxuICB2YXIgcmVnaXN0cnkgPSBuZXcgUm91dGVSZWdpc3RyeSgkcm91dGVyUm9vdENvbXBvbmVudCk7XG4gIHZhciBsb2NhdGlvbiA9IG5ldyBMb2NhdGlvbigpO1xuXG4gICQkZGlyZWN0aXZlSW50cm9zcGVjdG9yKGZ1bmN0aW9uIChuYW1lLCBmYWN0b3J5KSB7XG4gICAgaWYgKGFuZ3VsYXIuaXNBcnJheShmYWN0b3J5LiRyb3V0ZUNvbmZpZykpIHtcbiAgICAgIGZhY3RvcnkuJHJvdXRlQ29uZmlnLmZvckVhY2goZnVuY3Rpb24gKGNvbmZpZykge1xuICAgICAgICByZWdpc3RyeS5jb25maWcobmFtZSwgY29uZmlnKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgdmFyIHJvdXRlciA9IG5ldyBSb290Um91dGVyKHJlZ2lzdHJ5LCBsb2NhdGlvbiwgJHJvdXRlclJvb3RDb21wb25lbnQpO1xuICAkcm9vdFNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7IHJldHVybiAkbG9jYXRpb24udXJsKCk7IH0sIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgaWYgKHJvdXRlci5sYXN0TmF2aWdhdGlvbkF0dGVtcHQgIT09IHBhdGgpIHtcbiAgICAgIHJvdXRlci5uYXZpZ2F0ZUJ5VXJsKHBhdGgpO1xuICAgIH1cbiAgfSk7XG5cbiAgcm91dGVyLnN1YnNjcmliZShmdW5jdGlvbiAoKSB7XG4gICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCckcm91dGVDaGFuZ2VTdWNjZXNzJywge30pO1xuICB9KTtcblxuICByZXR1cm4gcm91dGVyO1xufVxuXG59KCkpO1xuIl19
