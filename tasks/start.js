var childProcess = require('child_process');
var electron = require('electron');
var gulp = require('gulp');


gulp.task('_run', () => {

    childProcess.spawn(electron, ['.'], {
        stdio: 'inherit'
    })
        .on('close', () => {
            // User closed the app. Kill the host process.
            process.exit();
        });
});

gulp.task('start', gulp.series('build', gulp.parallel('watch', '_run')));