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

angular.module('app.admin', []).component('admin', {
	templateUrl: 'routes/admin/admin.html',
	$routeConfig: [
		{ path: '/dashboard', component: 'dashboard', name: 'Dashboard' }
	]
});

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

angular.module('app.404', []).component('notfound', {
	template: 'Page Not Found'
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvYXBwL2FwcC5qcyIsImNvbXBvbmVudHMvbmF2YmFyL25hdmJhci5qcyIsInJvdXRlcy9hYm91dC9hYm91dC5qcyIsInJvdXRlcy9hZG1pbi9hZG1pbi5qcyIsInJvdXRlcy9kYXNoYm9hcmQvZGFzaGJvYXJkLmpzIiwicm91dGVzL2hvbWUvaG9tZS5qcyIsInJvdXRlcy9ub3Rmb3VuZC9ub3Rmb3VuZC5qcyIsInJvdXRlcy9sb2dpbi9sb2dpbi5qcyIsInNlcnZpY2VzL2F1dGgvYXV0aC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnbXlBcHAnLCBbXHJcblx0J25nQ29tcG9uZW50Um91dGVyJyxcclxuXHQnYXBwLnRlbXBsYXRlcycsXHJcblx0J2FwcC5ob21lJyxcclxuXHQnYXBwLm5hdmJhcicsXHJcblx0J2FwcC5hYm91dCcsXHJcblx0J2FwcC5sb2dpbicsXHJcblx0J2FwcC5hZG1pbicsXHJcblx0J2FwcC5hZG1pbi5kYXNoYm9hcmQnLFxyXG5cdCdhcHAuNDA0J1xyXG5dKTtcclxuXHJcbmFwcC52YWx1ZSgnJHJvdXRlclJvb3RDb21wb25lbnQnLCAnYXBwJyk7XHJcbmFwcC5jb21wb25lbnQoJ2FwcCcsIHtcclxuXHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvYXBwL2FwcC5odG1sJyxcclxuXHQkcm91dGVDb25maWc6IFtcclxuXHRcdHsgcGF0aDogJy8nLCBjb21wb25lbnQ6ICdob21lJywgbmFtZTogJ0hvbWUnIH0sXHJcblx0XHR7IHBhdGg6ICcvYWJvdXQvOm5hbWUnLCBjb21wb25lbnQ6ICdhYm91dCcsIG5hbWU6ICdBYm91dCcgfSxcclxuXHRcdHsgcGF0aDogJy9sb2dpbicsIGNvbXBvbmVudDogJ2xvZ2luJywgbmFtZTogJ0xvZ2luJyB9LFxyXG5cdFx0eyBwYXRoOiAnL2FkbWluLy4uLicsIGNvbXBvbmVudDogJ2FkbWluJywgbmFtZTogJ0FkbWluJyB9LFxyXG5cdFx0eyBwYXRoOiAnLyoqJywgY29tcG9uZW50OiAnbm90Zm91bmQnLCBuYW1lOiAnTm90Rm91bmQnIH1cclxuXHRdXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLm5hdmJhcicsIFtdKS5jb21wb25lbnQoJ25hdkJhcicsIHtcclxuICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbmF2YmFyL25hdmJhci5odG1sJyxcclxuICBjb250cm9sbGVyQXM6ICd2bScsXHJcbiAgY29udHJvbGxlcjogWydBdXRoJywgJyRyb290Um91dGVyJywgZnVuY3Rpb24oQXV0aCwgJHJvb3RSb3V0ZXIpIHtcclxuICAgIHZhciB2bSA9IHRoaXM7XHJcblxyXG4gICAgdm0uQXV0aCA9IEF1dGg7XHJcblxyXG4gICAgdm0ubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZtLkF1dGgubG9nb3V0KCk7XHJcbiAgICAgICRyb290Um91dGVyLm5hdmlnYXRlKFsnL0hvbWUnXSk7XHJcbiAgICB9XHJcbiAgfV1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWJvdXQnLCBbXSkuY29tcG9uZW50KCdhYm91dCcsIHtcclxuICB0ZW1wbGF0ZVVybDogJ3JvdXRlcy9hYm91dC9hYm91dC5odG1sJyxcclxuICBjb250cm9sbGVyQXM6ICd2bScsXHJcbiAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdm0gPSB0aGlzO1xyXG5cclxuICAgIHZtLiRyb3V0ZXJPbkFjdGl2YXRlID0gZnVuY3Rpb24odG9Sb3V0ZSwgZnJvbVJvdXRlKSB7XHJcbiAgICBcdHRoaXMubmFtZSA9IHRvUm91dGUucGFyYW1zLm5hbWU7XHJcbiAgICB9O1xyXG4gIH1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWRtaW4nLCBbXSkuY29tcG9uZW50KCdhZG1pbicsIHtcclxuXHR0ZW1wbGF0ZVVybDogJ3JvdXRlcy9hZG1pbi9hZG1pbi5odG1sJyxcclxuXHQkcm91dGVDb25maWc6IFtcclxuXHRcdHsgcGF0aDogJy9kYXNoYm9hcmQnLCBjb21wb25lbnQ6ICdkYXNoYm9hcmQnLCBuYW1lOiAnRGFzaGJvYXJkJyB9XHJcblx0XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5hZG1pbi5kYXNoYm9hcmQnLCBbXSkuY29tcG9uZW50KCdkYXNoYm9hcmQnLCB7XHJcbiAgdGVtcGxhdGVVcmw6ICdyb3V0ZXMvZGFzaGJvYXJkL2Rhc2hib2FyZC5odG1sJyxcclxuICAkY2FuQWN0aXZhdGU6IFsnQXV0aCcsICckcm9vdFJvdXRlcicsIGZ1bmN0aW9uKEF1dGgsICRyb290Um91dGVyKSB7XHJcbiAgICByZXR1cm4gQXV0aC5jaGVjaygpLnRoZW4oZnVuY3Rpb24oYXV0aCkge1xyXG4gICAgICBpZiAoYXV0aCkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgICRyb290Um91dGVyLm5hdmlnYXRlKFsnL0xvZ2luJ10pO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfV1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuaG9tZScsIFtdKS5jb21wb25lbnQoJ2hvbWUnLCB7XHJcbiAgdGVtcGxhdGVVcmw6ICdyb3V0ZXMvaG9tZS9ob21lLmh0bWwnXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLjQwNCcsIFtdKS5jb21wb25lbnQoJ25vdGZvdW5kJywge1xyXG5cdHRlbXBsYXRlOiAnUGFnZSBOb3QgRm91bmQnXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmxvZ2luJywgWydhcHAuc2VydmljZXMuYXV0aCddKS5jb21wb25lbnQoJ2xvZ2luJywge1xyXG5cdHRlbXBsYXRlVXJsOiAncm91dGVzL2xvZ2luL2xvZ2luLmh0bWwnLFxyXG5cdGNvbnRyb2xsZXI6IFsnQXV0aCcsIExvZ2luQ29udHJvbGxlcl0sXHJcblx0Y29udHJvbGxlckFzOiAndm0nXHJcbn0pO1xyXG5cclxuZnVuY3Rpb24gTG9naW5Db250cm9sbGVyKEF1dGgpIHtcclxuXHR2YXIgdm0gPSB0aGlzO1xyXG5cclxuXHR2bS5BdXRoID0gQXV0aDtcclxuXHJcblx0dm0ubG9naW4gPSBmdW5jdGlvbigpIHtcclxuXHRcdHZtLkF1dGguYXV0aCh0aGlzLnVzZXJuYW1lLCB0aGlzLnBhc3N3b3JkKTtcclxuXHR9XHJcbn1cclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5zZXJ2aWNlcy5hdXRoJywgW10pLnNlcnZpY2UoJ0F1dGgnLCBbJyRxJywgQXV0aF0pO1xyXG5cclxuZnVuY3Rpb24gQXV0aCgkcSkge1xyXG5cdHRoaXMubG9nZ2VkSW4gPSBmYWxzZTtcclxuXHR0aGlzLiRxID0gJHE7XHJcbn1cclxuXHJcbkF1dGgucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpIHtcclxuXHR0aGlzLmxvZ2dlZEluID0gdHJ1ZTtcclxuXHJcblx0cmV0dXJuIHRoaXMuY2hlY2soKTtcclxufVxyXG5cclxuQXV0aC5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgX3RoaXMgPSB0aGlzO1xyXG5cdHJldHVybiB0aGlzLiRxKGZ1bmN0aW9uKHJlc29sdmUpIHtcclxuXHRcdHJlc29sdmUoX3RoaXMubG9nZ2VkSW4pO1xyXG5cdH0pO1xyXG59XHJcblxyXG5BdXRoLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmxvZ2dlZEluID0gZmFsc2U7XHJcbn1cclxuIl19
