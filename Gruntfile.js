module.exports = function(grunt) {

    var vendorDir = 'src/main/resources/public/assets/vendor',
        nodeDir = 'node_modules';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        sass: {
            dist: {
                files: {
                    'app/css/styles.css': 'src/main/sass/styles.scss'
                }
            }
        },

        watch: {

            css: {
                files: 'src/main/sass/*.scss',
                tasks: ['sass']
            }

        }
    });


    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');

};
