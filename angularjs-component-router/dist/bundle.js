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

angular.module('app.404', []).component('notfound', {
	template: 'Page Not Found'
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbXBvbmVudHMvYXBwL2FwcC5qcyIsImNvbXBvbmVudHMvbmF2YmFyL25hdmJhci5qcyIsInJvdXRlcy9hYm91dC9hYm91dC5qcyIsInJvdXRlcy9hZG1pbi9hZG1pbi5qcyIsInJvdXRlcy9ob21lL2hvbWUuanMiLCJyb3V0ZXMvbG9naW4vbG9naW4uanMiLCJyb3V0ZXMvZGFzaGJvYXJkL2Rhc2hib2FyZC5qcyIsInJvdXRlcy9ub3Rmb3VuZC9ub3Rmb3VuZC5qcyIsInNlcnZpY2VzL2F1dGgvYXV0aC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FDSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImJ1bmRsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnbXlBcHAnLCBbXHJcblx0J25nQ29tcG9uZW50Um91dGVyJyxcclxuXHQnYXBwLnRlbXBsYXRlcycsXHJcblx0J2FwcC5ob21lJyxcclxuXHQnYXBwLm5hdmJhcicsXHJcblx0J2FwcC5hYm91dCcsXHJcblx0J2FwcC5sb2dpbicsXHJcblx0J2FwcC5hZG1pbicsXHJcblx0J2FwcC5hZG1pbi5kYXNoYm9hcmQnLFxyXG5cdCdhcHAuNDA0J1xyXG5dKTtcclxuXHJcbmFwcC52YWx1ZSgnJHJvdXRlclJvb3RDb21wb25lbnQnLCAnYXBwJyk7XHJcbmFwcC5jb21wb25lbnQoJ2FwcCcsIHtcclxuXHR0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvYXBwL2FwcC5odG1sJyxcclxuXHQkcm91dGVDb25maWc6IFtcclxuXHRcdHsgcGF0aDogJy8nLCBjb21wb25lbnQ6ICdob21lJywgbmFtZTogJ0hvbWUnIH0sXHJcblx0XHR7IHBhdGg6ICcvYWJvdXQvOm5hbWUnLCBjb21wb25lbnQ6ICdhYm91dCcsIG5hbWU6ICdBYm91dCcgfSxcclxuXHRcdHsgcGF0aDogJy9sb2dpbicsIGNvbXBvbmVudDogJ2xvZ2luJywgbmFtZTogJ0xvZ2luJyB9LFxyXG5cdFx0eyBwYXRoOiAnL2FkbWluLy4uLicsIGNvbXBvbmVudDogJ2FkbWluJywgbmFtZTogJ0FkbWluJyB9LFxyXG5cdFx0eyBwYXRoOiAnLyoqJywgY29tcG9uZW50OiAnbm90Zm91bmQnLCBuYW1lOiAnTm90Rm91bmQnIH1cclxuXHRdXHJcbn0pO1xyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLm5hdmJhcicsIFtdKS5jb21wb25lbnQoJ25hdkJhcicsIHtcclxuICB0ZW1wbGF0ZVVybDogJ2NvbXBvbmVudHMvbmF2YmFyL25hdmJhci5odG1sJyxcclxuICBjb250cm9sbGVyQXM6ICd2bScsXHJcbiAgY29udHJvbGxlcjogWydBdXRoJywgJyRyb290Um91dGVyJywgZnVuY3Rpb24oQXV0aCwgJHJvb3RSb3V0ZXIpIHtcclxuICAgIHZhciB2bSA9IHRoaXM7XHJcblxyXG4gICAgdm0uQXV0aCA9IEF1dGg7XHJcblxyXG4gICAgdm0ubG9nb3V0ID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgIHZtLkF1dGgubG9nb3V0KCk7XHJcbiAgICAgICRyb290Um91dGVyLm5hdmlnYXRlKFsnL0hvbWUnXSk7XHJcbiAgICB9XHJcbiAgfV1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWJvdXQnLCBbXSkuY29tcG9uZW50KCdhYm91dCcsIHtcclxuICB0ZW1wbGF0ZVVybDogJ3JvdXRlcy9hYm91dC9hYm91dC5odG1sJyxcclxuICBjb250cm9sbGVyQXM6ICd2bScsXHJcbiAgY29udHJvbGxlcjogZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgdm0gPSB0aGlzO1xyXG5cclxuICAgIHZtLiRyb3V0ZXJPbkFjdGl2YXRlID0gZnVuY3Rpb24odG9Sb3V0ZSwgZnJvbVJvdXRlKSB7XHJcbiAgICBcdHRoaXMubmFtZSA9IHRvUm91dGUucGFyYW1zLm5hbWU7XHJcbiAgICB9O1xyXG4gIH1cclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAuYWRtaW4nLCBbXSkuY29tcG9uZW50KCdhZG1pbicsIHtcclxuXHR0ZW1wbGF0ZVVybDogJ3JvdXRlcy9hZG1pbi9hZG1pbi5odG1sJyxcclxuXHQkcm91dGVDb25maWc6IFtcclxuXHRcdHsgcGF0aDogJy9kYXNoYm9hcmQnLCBjb21wb25lbnQ6ICdkYXNoYm9hcmQnLCBuYW1lOiAnRGFzaGJvYXJkJyB9XHJcblx0XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5ob21lJywgW10pLmNvbXBvbmVudCgnaG9tZScsIHtcclxuICB0ZW1wbGF0ZVVybDogJ3JvdXRlcy9ob21lL2hvbWUuaHRtbCdcclxufSk7XHJcbiIsImFuZ3VsYXIubW9kdWxlKCdhcHAubG9naW4nLCBbJ2FwcC5zZXJ2aWNlcy5hdXRoJ10pLmNvbXBvbmVudCgnbG9naW4nLCB7XHJcblx0dGVtcGxhdGVVcmw6ICdyb3V0ZXMvbG9naW4vbG9naW4uaHRtbCcsXHJcblx0Y29udHJvbGxlcjogWydBdXRoJywgTG9naW5Db250cm9sbGVyXSxcclxuXHRjb250cm9sbGVyQXM6ICd2bSdcclxufSk7XHJcblxyXG5mdW5jdGlvbiBMb2dpbkNvbnRyb2xsZXIoQXV0aCkge1xyXG5cdHZhciB2bSA9IHRoaXM7XHJcblxyXG5cdHZtLkF1dGggPSBBdXRoO1xyXG5cclxuXHR2bS5sb2dpbiA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dm0uQXV0aC5hdXRoKHRoaXMudXNlcm5hbWUsIHRoaXMucGFzc3dvcmQpO1xyXG5cdH1cclxufVxyXG4iLCJhbmd1bGFyLm1vZHVsZSgnYXBwLmFkbWluLmRhc2hib2FyZCcsIFtdKS5jb21wb25lbnQoJ2Rhc2hib2FyZCcsIHtcclxuICB0ZW1wbGF0ZVVybDogJ3JvdXRlcy9kYXNoYm9hcmQvZGFzaGJvYXJkLmh0bWwnLFxyXG4gICRjYW5BY3RpdmF0ZTogWydBdXRoJywgJyRyb290Um91dGVyJywgZnVuY3Rpb24oQXV0aCwgJHJvb3RSb3V0ZXIpIHtcclxuICAgIHJldHVybiBBdXRoLmNoZWNrKCkudGhlbihmdW5jdGlvbihhdXRoKSB7XHJcbiAgICAgIGlmIChhdXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgJHJvb3RSb3V0ZXIubmF2aWdhdGUoWycvTG9naW4nXSk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XVxyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC40MDQnLCBbXSkuY29tcG9uZW50KCdub3Rmb3VuZCcsIHtcclxuXHR0ZW1wbGF0ZTogJ1BhZ2UgTm90IEZvdW5kJ1xyXG59KTtcclxuIiwiYW5ndWxhci5tb2R1bGUoJ2FwcC5zZXJ2aWNlcy5hdXRoJywgW10pLnNlcnZpY2UoJ0F1dGgnLCBbJyRxJywgQXV0aF0pO1xyXG5cclxuZnVuY3Rpb24gQXV0aCgkcSkge1xyXG5cdHRoaXMubG9nZ2VkSW4gPSBmYWxzZTtcclxuXHR0aGlzLiRxID0gJHE7XHJcbn1cclxuXHJcbkF1dGgucHJvdG90eXBlLmF1dGggPSBmdW5jdGlvbih1c2VybmFtZSwgcGFzc3dvcmQpIHtcclxuXHR0aGlzLmxvZ2dlZEluID0gdHJ1ZTtcclxuXHJcblx0cmV0dXJuIHRoaXMuY2hlY2soKTtcclxufVxyXG5cclxuQXV0aC5wcm90b3R5cGUuY2hlY2sgPSBmdW5jdGlvbigpIHtcclxuXHR2YXIgX3RoaXMgPSB0aGlzO1xyXG5cdHJldHVybiB0aGlzLiRxKGZ1bmN0aW9uKHJlc29sdmUpIHtcclxuXHRcdHJlc29sdmUoX3RoaXMubG9nZ2VkSW4pO1xyXG5cdH0pO1xyXG59XHJcblxyXG5BdXRoLnByb3RvdHlwZS5sb2dvdXQgPSBmdW5jdGlvbigpIHtcclxuXHR0aGlzLmxvZ2dlZEluID0gZmFsc2U7XHJcbn1cclxuIl19
