const gulp = require('gulp');
const del = require('del');
const scss = require('gulp-sass');
const watch = require('gulp-watch');
const batch = require('gulp-batch');
const ts = require('gulp-typescript');
const rename = require('gulp-rename');
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

let tsPaths = require("../tsconfig.json").files[0];



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


gulp.task('_bundle', () => {
    var scripts = [tempDir + '/**/*.js', '!' + tempDir + '/components/**'];
    return gulp.src(scripts).pipe(gulp.dest('app'));
});

gulp.task('bundle', gulp.series('ts', '_bundle'));



gulp.task('scss', () => {
    return gulp.src(srcDir.path('sass/styles.scss'))
        .pipe(plumber())
        .pipe(scss())
        .pipe(gulp.dest(destDir.path('css')));
});

gulp.task('environment', () => {
    let configFile = 'config/env_' + utils.getEnvName() + '.json';
    console.log("configFile=" + configFile);
    return gulp.src([configFile]).pipe(rename('env.json')).pipe(gulp.dest('./app'));
});

gulp.task('watch', () => {
    

    gulp.watch([tsPaths, '!./src/version.ts'], gulp.series('vulcanize', 'bundle'));
    gulp.watch('./src/**/*.scss', gulp.series('scss'));
    
 
});



gulp.task('_vulcanize', () => {
    console.log("vulcanize");
    return gulp.src([tempDir + '/main-components.html', tempDir + '/splash-screen-components.html'])
        .pipe(vulcanize({
            stripComments: true,
            inlineScripts: true,
            inlineCss: true,
            // excludes: ["./bower_components/polymer/polymer.html"],
        }))
        .pipe(gulp.dest('app'));
});


gulp.task('vulcanize', gulp.series('ts', '_vulcanize'));




// gulp.task('clean', runsequence('clean:dist'));
gulp.task('build', gulp.series('scss', 'vulcanize', 'bundle', 'environment'));
