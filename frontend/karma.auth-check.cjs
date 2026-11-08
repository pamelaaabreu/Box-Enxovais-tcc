// Isolated component rendering; no requests to the application backend.
module.exports = function (config) {
  // Window sizes account for the Karma runner on Windows. Tests log innerWidth/innerHeight.
  const sizes = {
    Desktop1366: '1399,920',
    Desktop1440: '1473,1052',
    Desktop1920: '1953,1232',
    Tablet: '853,1332',
    Mobile: '500,996',
  };
  const customLaunchers = {};
  for (const [name, size] of Object.entries(sizes)) {
    customLaunchers[name] = {
      base: 'ChromeHeadless',
      flags: ['--window-size=' + size, '--force-device-scale-factor=1'],
    };
  }
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    reporters: ['progress'],
    browsers: Object.keys(customLaunchers),
    customLaunchers,
    concurrency: 1,
    singleRun: true,
  });
};
