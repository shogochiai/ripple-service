var gulp = require('gulp'),
connect = require('gulp-connect');
run = require('gulp-run'),
plumber = require('gulp-plumber'),
cmq = require('gulp-combine-media-queries'),
prefix = require('gulp-autoprefixer'),
csslint = require('gulp-csslint'),
minifyHTML = require('gulp-minify-html'),
minifyCSS = require('gulp-minify-css'),
rename = require("gulp-rename"),
uglify = require('gulp-uglify'),
rev = require('gulp-rev'),
usemin = require('gulp-usemin'),
gutil = require('gulp-util'),
rimraf = require('rimraf'),
revOutdated = require('gulp-rev-outdated'),
path = require('path'),
through = require('through2'),
bower = require('gulp-bower'),
flatten = require('gulp-flatten'),
cond   = require('gulp-if');
var isRelease = true;

gulp.task('webserver', function() {
  return connect.server({
    root: 'release',
    port : 18000,
    livereload: true
  });
});

gulp.task('watch',function(){
    gulp.watch("release/**/*.*",["clean"]);
    gulp.watch("develop/js/**/*.js",["usemin"]);
    gulp.watch("develop/lib/**/*.js",["usemin"]);
    gulp.watch("develop/css/**/*.css",["usemin"]);
    return gulp.watch("develop/html/*.html",["usemin"]);
});

gulp.task("pic-task",function(){
  return gulp.src("develop/pic/**")
    .pipe(gulp.dest("release/pic"))
    .pipe(connect.reload());
})

gulp.task('usemin', function() {
  return gulp.src('develop/html/*.html')
    .pipe(usemin({
        html: [minifyHTML({empty: true})],
        css: [minifyCSS(), 'concat', rev()],
        js:[uglify(), rev()]
    }))
    .pipe(gulp.dest('release/'))
    .pipe(connect.reload());
});

gulp.task('clean', function() {
    gulp.src( ['release/**/*.*'], {read: false})
        .pipe( revOutdated(2) )
        .pipe( cleaner() );
    return;
});

gulp.task('default', ['all', 'webserver', 'watch']);
gulp.task('all', ['pic-task', 'usemin', 'clean']);

function cleaner() {
    return through.obj(function(file, enc, cb){
        rimraf( path.resolve( (file.cwd || process.cwd()), file.path), function (err) {
            if (err) {
                this.emit('error', new gutil.PluginError('Cleanup old files', err));
            }
            this.push(file);
            cb();
        }.bind(this));
    });
}
