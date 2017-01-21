angular.module('ng').run(['$rootScope', function($rootScope) {
  $rootScope.safeApply = function safeApply(operation) {
    var phase = this.$root.$$phase;
    if (phase !== '$apply' && phase !== '$digest') {
      this.$apply(operation);
      return;
    }

    if (operation && typeof operation === 'function')
      operation();
  };
}]);
var app = angular.module("pulpitRobot", ['LocalStorageModule', 'ui.bootstrap', 'rzModule']);
app.controller("pulpitControl", function($scope, localStorageService) {
    $scope.products = ["Milk", "Bread", "Cheese"];
    $scope.lcd = {'l1': "Pulpit Robot v1.0", "l2": "Ready", "backlight": true};
    $scope.slider = {
      value: 255,
      options: {
        floor: 0,
        ceil: 255
      }
    };
    $scope.streaming = false;
    $scope.keycodes = {
        65: 'a',
        83: 's',
        68: 'd',
        87: 'w',
        38: 'right',
        40: 'left',
        37: 'up',
        39: 'down'
    };
    $scope.validKeys = [];
    for( var i in $scope.keycodes ) {
      $scope.validKeys.push($scope.keycodes[i]);
    }
    $scope.forward = 1;
    $scope.neutral = 0;
    $scope.reverse = 2;

    $scope.uuid = function() {
return 0;
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    $scope.collapsible = true;
    $scope.maximizable = true;
    $scope.output = [];
    $scope.socket = io('http://172.16.1.10:3000');
    $scope.socket.on('output', function(data) {
      $scope.safeApply(function() {
        $scope.output.push($scope.commandParser(data));
      });
      console.log($scope.commandParser(data));
      var textarea = document.getElementById('terminal');
      textarea.scrollTop = textarea.scrollHeight;
    });
    $scope.socket.on('liveStream', function(url) {
      $('#stream').attr('src', url);
      $('.start').hide();
    });

    $scope.startstream = function() {
      $scope.socket.emit('start-stream');
      $scope.streaming = true;
    };

    $scope.runCommand = function(command) {
        $scope.socket.emit('command', command);
    };

    $scope.motor = function(id, speed, direction) {
        var uuid = $scope.uuid();
        var command = "M " + uuid + " " + id + " " + speed + " " + direction;
        $scope.runCommand(command);
    };

    $scope.commandBuild = function(code, args) {
      var uuid = $scope.uuid();
      var command = code + " " + uuid + " " + args.join(" ");
      $scope.runCommand(command);
    };

    $scope.commandParser = function(command) {
      var parts = command.split(" ");
      var type = 'transmit';
      if( parts[0] == 'R' ) {
        parts.splice(0, 1);
        type = 'receive';
      }
      var ar = {'code': parts[0], 'id': parts[1], 'rest': parts.slice(2, parts.length), 'type': type};
      return ar;
    };

    $scope.lcdWrite = function(line, message) {
      var args = [0, line, message.replace(/ /g, "_")];
      $scope.commandBuild('LW', args);
    };
    $scope.lcdLight = function(value) {
      var i = 0;
      if( $scope.lcd.backlight === true ) {
        i = 1;
      }
      $scope.commandBuild('LB', [i]);
    };
    $scope.lcdBacklight = function() {
      $scope.lcd.backlight = !$scope.lcd.backlight;
    };

    $scope.keyDown = function($event) {
        var kc = $scope.keycodes[$event.keyCode];
        if ($scope.kbControl && !$scope.key_down &&  $scope.validKeys.indexOf(kc) !== -1 ) {
            $scope.key_down = true;
		$scope.slider.values = 255;
		if( $scope.slider.value != 255 ) {
			$scope.slider.values = $scope.slider.value / 2;
		}
            if( kc == 'w' || kc == 'up') {
                $scope.motor(1, $scope.slider.value, $scope.forward);
                $scope.motor(2, $scope.slider.value, $scope.forward);
                $scope.motor(3, $scope.slider.value, $scope.forward);
                $scope.motor(4, $scope.slider.value, $scope.forward);
            } else if( kc == 'a' || kc == 'left' ) {
                $scope.motor(1, $scope.slider.values, $scope.reverse);
                $scope.motor(2, $scope.slider.values, $scope.forward);
                $scope.motor(3, $scope.slider.values, $scope.forward);
                $scope.motor(4, $scope.slider.values, $scope.reverse);
            } else if( kc == 'd' || kc == 'right' ) {
                $scope.motor(1, $scope.slider.values, $scope.forward);
                $scope.motor(2, $scope.slider.values, $scope.reverse);
                $scope.motor(3, $scope.slider.values, $scope.reverse);
                $scope.motor(4, $scope.slider.values, $scope.forward);
            } else if( kc == 's' || kc == 'down' ) {
                $scope.motor(1, $scope.slider.value, $scope.reverse);
                $scope.motor(2, $scope.slider.value, $scope.reverse);
                $scope.motor(3, $scope.slider.value, $scope.reverse);
                $scope.motor(4, $scope.slider.value, $scope.reverse);
            }
        }
    };
    $scope.keyUp = function($event) {
        var kc = $scope.keycodes[$event.keyCode];
        if ($scope.kbControl && $scope.validKeys.indexOf(kc) !== -1 ) {
            $scope.key_down = false;
            console.log($scope.keycodes[$event.keyCode]);
            $scope.motor(1, 0, $scope.forward);
            $scope.motor(2, 0, $scope.forward);
            $scope.motor(3, 0, $scope.forward);
            $scope.motor(4, 0, $scope.forward);
        }
    };

    $scope.$watch('lcd', function(newv, oldv) {
      if( oldv.l1 != newv.l1 ) {
      $scope.commandBuild('LC', []);
        $scope.lcdWrite(0, newv.l1);
        $scope.lcdWrite(1, newv.l2);
      }
      if( oldv.l2 != newv.l2 ) {
      $scope.commandBuild('LC', []);
        $scope.lcdWrite(0, newv.l1);
        $scope.lcdWrite(1, newv.l2);
      }
      if( oldv.backlight != newv.backlight ) {
        $scope.lcdLight(newv.backlight);
      }
    }, true);
    $scope.$watch('lcd_2', function(newv, oldv) {
      if( oldv != newv ) {
        $scope.lcdWrite(2, newv);
      }
    });
});
