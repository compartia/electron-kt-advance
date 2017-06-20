const gulp = require('gulp');
const del = require('del');
const scss = require('gulp-sass');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const ts = require('gulp-typescript');
const plumber = require('gulp-plumber');
const jetpack = require('fs-jetpack');
const runsequence = require('run-sequence');

const bundle = require('./bundle');
const utils = require('./utils');

const projectDir = jetpack;
const srcDir = jetpack.cwd('./src');
const distDir = jetpack.cwd('./app');
const destDir = jetpack.cwd('./app');
const vulcanize = require('gulp-vulcanize');
const tsProject = ts.createProject('tsconfig.json');


const tempDir = 'temp.js';


gulp.task('clean:dist', () => {
    // return del([
    //     'dist',
    //     'app/css',
    //     'app/components.html',
    //     'temp.js',
    //     'app/**/*.js'
    // ]);
});


gulp.task('ts', () => {

    var appManifest = jetpack.read('./package.json', 'json');
    console.error(appManifest.version);
    var versionString = "export const KT_VERSION='" + appManifest.version + "';"
    jetpack.write(srcDir.path("version.ts"), versionString);

    // gulp.src(['src/**/*.html']).pipe(gulp.dest(tempDir));

    gulp.src(srcDir.path('**/*.html')).pipe(gulp.dest(tempDir));
    const tsResult = gulp.src(['src/**/*.ts', '!src/**/*.spec.ts']).pipe(tsProject());
    return tsResult.js.pipe(gulp.dest(tempDir));
});


gulp.task('bundle', ['ts'], () => {
    var scripts = [tempDir + '/**/*.js', '!' + tempDir + '/components/**'];
    return gulp.src(scripts).pipe(gulp.dest('app'));
});



gulp.task('scss', () => {
    return gulp.src(srcDir.path('sass/styles.scss'))
        .pipe(plumber())
        .pipe(scss())
        .pipe(gulp.dest(destDir.path('css')));
});

gulp.task('environment', () => {
    const configFile = 'config/env_' + utils.getEnvName() + '.json';
    projectDir.copy(configFile, destDir.path('env.json'), {
        overwrite: true
    });
});

gulp.task('watch', () => {
    const beepOnError = (done) => {
        return (err) => {
            if (err) {
                utils.beepSound();
            }
            done(err);
        };
    };

    watch(['./src/**/*.ts', '!./src/version.ts'], batch((events, done) => {
        // runsequence('ts', 'bundle', done);
        gulp.start('vulcanize', beepOnError(done));
        gulp.start('bundle', beepOnError(done));
    }));
    watch('src/**/*.scss', batch((events, done) => {
        gulp.start('scss', beepOnError(done));
    }));
});

gulp.task('vulcanize', ['ts'], () => {
    return gulp.src([tempDir + '/main-components.html', tempDir + '/splash-screen-components.html'])
        .pipe(vulcanize({
            stripComments: true,
            inlineScripts: true,
            inlineCss: true,
            // excludes: ["./bower_components/polymer/polymer.html"],
        }))
        .pipe(gulp.dest('app'));
});


// gulp.task('clean', runsequence('clean:dist'));
gulp.task('build', runsequence('scss', 'vulcanize', 'bundle', 'environment'));
