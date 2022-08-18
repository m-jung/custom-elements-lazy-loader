/** @type {import('@jest/types').Config.InitialOptions} */
export default {
    testEnvironment: 'jsdom',
    transform      : {},
    testMatch      : [ '/test/**/*.(m)js', '**/?(*.)+(spec|test).(m)js' ],
    verbose        : true,
};