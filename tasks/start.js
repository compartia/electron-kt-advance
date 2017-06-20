var childProcess = require('child_process');
var electron = require('electron');
var gulp = require('gulp');

gulp.task('start', ['build', 'watch'], () => {
    childProcess.spawn(electron, ['.'], {
            stdio: 'inherit'
        })
        .on('close', () => {
            // User closed the app. Kill the host process.
            process.exit();
        });
});
