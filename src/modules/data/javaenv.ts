import * as cp from 'child_process';
import * as expandHomeDir from 'expand-home-dir';
import * as findJavaHome from 'find-java-home';
import * as pathExists from 'path-exists';

const path = require('path');

const isWindows = process.platform.indexOf('win') === 0;

export interface JavaEnv {
    java_home: string;
    java_version: number;
}


export async function resolveJava(): Promise<JavaEnv> {
    let java_home = await checkJavaRuntime();
    let javaVersion = await checkJavaVersion(java_home);
    return Promise.resolve({ 'java_home': java_home, 'java_version': javaVersion });
}

function checkJavaRuntime(): Promise<string> {
    return new Promise((resolve, reject) => {
        let source: string;

        let javaHome: string | null = null;

        {
            javaHome = process.env['JDK_HOME'];
            if (javaHome) {
                source = 'The JDK_HOME environment variable';
            } else {
                javaHome = process.env['JAVA_HOME'];
                source = 'The JAVA_HOME environment variable';
            }
        }

        if (javaHome) {
            javaHome = expandHomeDir(javaHome);
            if (!pathExists.sync(<string>javaHome)) {
                openJDKDownload(reject, source + ' points to a missing folder');
            }

            return resolve(<string>javaHome);
        }

        //No settings, let's try to detect as last resort.
        findJavaHome(function (err: string, home: string) {
            if (err) {
                openJDKDownload(reject, 'Java runtime could not be located');
            }
            else {
                resolve(home);
            }
        });
    });
}

function openJDKDownload(a, message: string) {
    console.error(message);
}


function checkJavaVersion(java_home: string): Promise<number> {
    return new Promise((resolve, reject) => {
        cp.execFile(java_home + '/bin/java', ['-version'], {}, (error, stdout, stderr) => {
            let javaVersion = parseMajorVersion(stderr);
            if (javaVersion < 8) {
                openJDKDownload(reject, 'Java 8 or more recent is required to run. Please download and install a recent JRE');
            } else {
                resolve(javaVersion);
            }
        });
    });
}


export function parseMajorVersion(content: string): number {
    let regexp = /version "(.*)"/g;
    let match = regexp.exec(content);
    if (!match) {
        return 0;
    }
    let version = match[1];
    //Ignore '1.' prefix for legacy Java versions
    if (version.startsWith('1.')) {
        version = version.substring(2);
    }

    //look into the interesting bits now
    regexp = /\d+/g;
    match = regexp.exec(version);
    let javaVersion = 0;
    if (match) {
        javaVersion = parseInt(match[0]);
    }
    return javaVersion;
}

const JARNAME = "kt-advance-xml-2.3-jar-with-dependencies.jar";

export function getJarName(appPath: string) {

    console.info("appPath=\t" + appPath);
    let jarname = path.join(path.dirname(appPath), "app.asar.unpacked", "java", JARNAME);

    if (!pathExists.sync(jarname)) {
        //DEV MODE
        console.info(jarname + " does not exist");
        jarname = path.join(appPath, "java", JARNAME);
    }
    //PRODUCTION MODE (archived)
    if (!pathExists.sync(jarname)) {
        throw (jarname + " does not exist");
    }
    return jarname;
}