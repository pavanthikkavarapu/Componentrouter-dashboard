var app = angular.module('myApp', [
	'ngComponentRouter',
	'app.templates',
	'app.home',
	'app.navbar',
	'app.about',
	'app.login',
	'app.admin',
	'app.admin.dashboard',
	'app.404'
]);

app.value('$routerRootComponent', 'app');
app.component('app', {
	templateUrl: 'components/app/app.html',
	$routeConfig: [
		{ path: '/', component: 'home', name: 'Home' },
		{ path: '/about/:name', component: 'about', name: 'About' },
		{ path: '/login', component: 'login', name: 'Login' },
		{ path: '/admin/...', component: 'admin', name: 'Admin' },
		{ path: '/**', component: 'notfound', name: 'NotFound' }
	]
});

angular.module('app.navbar', []).component('navBar', {
  templateUrl: 'components/navbar/navbar.html',
  controllerAs: 'vm',
  controller: ['Auth', '$rootRouter', function(Auth, $rootRouter) {
    var vm = this;

    vm.Auth = Auth;

    vm.logout = function() {
      vm.Auth.logout();
      $rootRouter.navigate(['/Home']);
    }
  }]
});

angular.module('app.admin', []).component('admin', {
	templateUrl: 'routes/admin/admin.html',
	$routeConfig: [
		{ path: '/dashboard', component: 'dashboard', name: 'Dashboard' }
	]
});

angular.module('app.about', []).component('about', {
  templateUrl: 'routes/about/about.html',
  controllerAs: 'vm',
  controller: function() {
    var vm = this;

    vm.$routerOnActivate = function(toRoute, fromRoute) {
    	this.name = toRoute.params.name;
    };
  }
});

angular.module('app.services.auth', []).service('Auth', ['$q', Auth]);

function Auth($q) {
	this.loggedIn = false;
	this.$q = $q;
}

Auth.prototype.auth = function(username, password) {
	this.loggedIn = true;

	return this.check();
}

Auth.prototype.check = function() {
	var _this = this;
	return this.$q(function(resolve) {
		resolve(_this.loggedIn);
	});
}

Auth.prototype.logout = function() {
	this.loggedIn = false;
}

angular.module('app.admin.dashboard', []).component('dashboard', {
  templateUrl: 'routes/dashboard/dashboard.html',
  $canActivate: ['Auth', '$rootRouter', function(Auth, $rootRouter) {
    return Auth.check().then(function(auth) {
      if (auth) {
        return true;
      } else {
        $rootRouter.navigate(['/Login']);
        return false;
      }
    });
  }]
});

angular.module('app.home', []).component('home', {
  templateUrl: 'routes/home/home.html'
});

angular.module('app.login', ['app.services.auth']).component('login', {
	templateUrl: 'routes/login/login.html',
	controller: ['Auth', LoginController],
	controllerAs: 'vm'
});

function LoginController(Auth) {
	var vm = this;

	vm.Auth = Auth;

	vm.login = function() {
		vm.Auth.auth(this.username, this.password);
	}
}

angular.module('app.404', []).component('notfound', {
	template: 'Page Not Found'
});

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvYXBwL2FwcC5qcyIsImNvbXBvbmVudHMvbmF2YmFyL25hdmJhci5qcyIsInJvdXRlcy9hZG1pbi9hZG1pbi5qcyIsInJvdXRlcy9hYm91dC9hYm91dC5qcyIsInNlcnZpY2VzL2F1dGgvYXV0aC5qcyIsInJvdXRlcy9kYXNoYm9hcmQvZGFzaGJvYXJkLmpzIiwicm91dGVzL2hvbWUvaG9tZS5qcyIsInJvdXRlcy9sb2dpbi9sb2dpbi5qcyIsInJvdXRlcy9ub3Rmb3VuZC9ub3Rmb3VuZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNmQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJidW5kbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ215QXBwJywgW1xyXG5cdCduZ0NvbXBvbmVudFJvdXRlcicsXHJcblx0J2FwcC50ZW1wbGF0ZXMnLFxyXG5cdCdhcHAuaG9tZScsXHJcblx0J2FwcC5uYXZiYXInLFxyXG5cdCdhcHAuYWJvdXQnLFxyXG5cdCdhcHAubG9naW4nLFxyXG5cdCdhcHAuYWRtaW4nLFxyXG5cdCdhcHAuYWRtaW4uZGFzaGJvYXJkJyxcclxuXHQnYXBwLjQwNCdcclxuXSk7XHJcblxyXG5hcHAudmFsdWUoJyRyb3V0ZXJSb290Q29tcG9uZW50JywgJ2FwcCcpO1xyXG5hcHAuY29tcG9uZW50KCdhcHAnLCB7XHJcblx0dGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL2FwcC9hcHAuaHRtbCcsXHJcblx0JHJvdXRlQ29uZmlnOiBbXHJcblx0XHR7IHBhdGg6ICcvJywgY29tcG9uZW50OiAnaG9tZScsIG5hbWU6ICdIb21lJyB9LFxyXG5cdFx0eyBwYXRoOiAnL2Fib3V0LzpuYW1lJywgY29tcG9uZW50OiAnYWJvdXQnLCBuYW1lOiAnQWJvdXQnIH0sXHJcblx0XHR7IHBhdGg6ICcvbG9naW4nLCBjb21wb25lbnQ6ICdsb2dpbicsIG5hbWU6ICdMb2dpbicgfSxcclxuXHRcdHsgcGF0aDogJy9hZG1pbi8uLi4nLCBjb21wb25lbnQ6ICdhZG1pbicsIG5hbWU6ICdBZG1pbicgfSxcclxuXHRcdHsgcGF0aDogJy8qKicsIGNvbXBvbmVudDogJ25vdGZvdW5kJywgbmFtZTogJ05vdEZvdW5kJyB9XHJcblx0XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5uYXZiYXInLCBbXSkuY29tcG9uZW50KCduYXZCYXInLCB7XHJcbiAgdGVtcGxhdGVVcmw6ICdjb21wb25lbnRzL25hdmJhci9uYXZiYXIuaHRtbCcsXHJcbiAgY29udHJvbGxlckFzOiAndm0nLFxyXG4gIGNvbnRyb2xsZXI6IFsnQXV0aCcsICckcm9vdFJvdXRlcicsIGZ1bmN0aW9uKEF1dGgsICRyb290Um91dGVyKSB7XHJcbiAgICB2YXIgdm0gPSB0aGlzO1xyXG5cclxuICAgIHZtLkF1dGggPSBBdXRoO1xyXG5cclxuICAgIHZtLmxvZ291dCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICB2bS5BdXRoLmxvZ291dCgpO1xyXG4gICAgICAkcm9vdFJvdXRlci5uYXZpZ2F0ZShbJy9Ib21lJ10pO1xyXG4gICAgfVxyXG4gIH1dXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmFkbWluJywgW10pLmNvbXBvbmVudCgnYWRtaW4nLCB7XHJcblx0dGVtcGxhdGVVcmw6ICdyb3V0ZXMvYWRtaW4vYWRtaW4uaHRtbCcsXHJcblx0JHJvdXRlQ29uZmlnOiBbXHJcblx0XHR7IHBhdGg6ICcvZGFzaGJvYXJkJywgY29tcG9uZW50OiAnZGFzaGJvYXJkJywgbmFtZTogJ0Rhc2hib2FyZCcgfVxyXG5cdF1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWJvdXQnLCBbXSkuY29tcG9uZW50KCdhYm91dCcsIHtcclxuICB0ZW1wbGF0ZVVybDogJ3JvdXRlcy9hYm91dC9hYm91dC5odG1sJyxcclxuICBjb250cm9sbGVyQXM6ICd2bScsXHJcbiAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdm0gPSB0aGlzO1xyXG5cclxuICAgIHZtLiRyb3V0ZXJPbkFjdGl2YXRlID0gZnVuY3Rpb24odG9Sb3V0ZSwgZnJvbVJvdXRlKSB7XHJcbiAgICBcdHRoaXMubmFtZSA9IHRvUm91dGUucGFyYW1zLm5hbWU7XHJcbiAgICB9O1xyXG4gIH1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuc2VydmljZXMuYXV0aCcsIFtdKS5zZXJ2aWNlKCdBdXRoJywgWyckcScsIEF1dGhdKTtcclxuXHJcbmZ1bmN0aW9uIEF1dGgoJHEpIHtcclxuXHR0aGlzLmxvZ2dlZEluID0gZmFsc2U7XHJcblx0dGhpcy4kcSA9ICRxO1xyXG59XHJcblxyXG5BdXRoLnByb3RvdHlwZS5hdXRoID0gZnVuY3Rpb24odXNlcm5hbWUsIHBhc3N3b3JkKSB7XHJcblx0dGhpcy5sb2dnZWRJbiA9IHRydWU7XHJcblxyXG5cdHJldHVybiB0aGlzLmNoZWNrKCk7XHJcbn1cclxuXHJcbkF1dGgucHJvdG90eXBlLmNoZWNrID0gZnVuY3Rpb24oKSB7XHJcblx0dmFyIF90aGlzID0gdGhpcztcclxuXHRyZXR1cm4gdGhpcy4kcShmdW5jdGlvbihyZXNvbHZlKSB7XHJcblx0XHRyZXNvbHZlKF90aGlzLmxvZ2dlZEluKTtcclxuXHR9KTtcclxufVxyXG5cclxuQXV0aC5wcm90b3R5cGUubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcblx0dGhpcy5sb2dnZWRJbiA9IGZhbHNlO1xyXG59XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWRtaW4uZGFzaGJvYXJkJywgW10pLmNvbXBvbmVudCgnZGFzaGJvYXJkJywge1xyXG4gIHRlbXBsYXRlVXJsOiAncm91dGVzL2Rhc2hib2FyZC9kYXNoYm9hcmQuaHRtbCcsXHJcbiAgJGNhbkFjdGl2YXRlOiBbJ0F1dGgnLCAnJHJvb3RSb3V0ZXInLCBmdW5jdGlvbihBdXRoLCAkcm9vdFJvdXRlcikge1xyXG4gICAgcmV0dXJuIEF1dGguY2hlY2soKS50aGVuKGZ1bmN0aW9uKGF1dGgpIHtcclxuICAgICAgaWYgKGF1dGgpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAkcm9vdFJvdXRlci5uYXZpZ2F0ZShbJy9Mb2dpbiddKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1dXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmhvbWUnLCBbXSkuY29tcG9uZW50KCdob21lJywge1xyXG4gIHRlbXBsYXRlVXJsOiAncm91dGVzL2hvbWUvaG9tZS5odG1sJ1xyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5sb2dpbicsIFsnYXBwLnNlcnZpY2VzLmF1dGgnXSkuY29tcG9uZW50KCdsb2dpbicsIHtcclxuXHR0ZW1wbGF0ZVVybDogJ3JvdXRlcy9sb2dpbi9sb2dpbi5odG1sJyxcclxuXHRjb250cm9sbGVyOiBbJ0F1dGgnLCBMb2dpbkNvbnRyb2xsZXJdLFxyXG5cdGNvbnRyb2xsZXJBczogJ3ZtJ1xyXG59KTtcclxuXHJcbmZ1bmN0aW9uIExvZ2luQ29udHJvbGxlcihBdXRoKSB7XHJcblx0dmFyIHZtID0gdGhpcztcclxuXHJcblx0dm0uQXV0aCA9IEF1dGg7XHJcblxyXG5cdHZtLmxvZ2luID0gZnVuY3Rpb24oKSB7XHJcblx0XHR2bS5BdXRoLmF1dGgodGhpcy51c2VybmFtZSwgdGhpcy5wYXNzd29yZCk7XHJcblx0fVxyXG59XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuNDA0JywgW10pLmNvbXBvbmVudCgnbm90Zm91bmQnLCB7XHJcblx0dGVtcGxhdGU6ICdQYWdlIE5vdCBGb3VuZCdcclxufSk7XHJcbiJdfQ==
