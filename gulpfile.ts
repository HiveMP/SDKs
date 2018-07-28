import * as gulp from 'gulp';
import { spawn } from 'child_process';
import { resolve } from 'path';
import * as path from 'path';
import * as fs from 'fs';
import * as which from 'which';

const supportedUnityVersions = {
  "5.4.1f": [
    "Linux32",
    "Linux64",
    "Mac32",
    "Mac64",
    "Win32",
    "Win64",
  ],
  "2017.1.1f1": [
    "Linux32",
    "Linux64",
    "Mac32",
    "Mac64",
    "Win32",
    "Win64",
  ],
  "2017.2.0f3": [
    "Linux32",
    "Linux64",
    "Mac32",
    "Mac64",
    "Win32",
    "Win64",
  ],
  "2017.3.0f3": [
    "Linux64",
    "MacUniversal",
    "Win32",
    "Win64",
  ],
  "2018.1.7f1": [
    "Linux64",
    "MacUniversal",
    "Win32",
    "Win64",
  ],
};
const supportedUnrealVersions = {
  "4.18": [
    "Win64",
  ],
  "4.19": [
    "Win64",
  ],
  "4.20": [
    "Win64",
  ],
}

async function execAsync(command: string, args: string[], cwd?: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cp = spawn(command, args, {
      cwd: cwd,
      stdio: ['ignore', process.stdout, process.stderr]
    });
    cp.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error('Got exit code: ' + code));
      } else {
        resolve();
      }
    });
  })
}

gulp.task('build-client-connect-init', async () => {
  await execAsync('pwsh', [ 'client_connect\\Build-Init.ps1' ]);
});

gulp.task('build-client-connect-win32', async () => {
  await execAsync('pwsh', [ 'client_connect\\Build-Arch.ps1', 'Win32' ]);
});

gulp.task('build-client-connect-win64', async () => {
  await execAsync('pwsh', [ 'client_connect\\Build-Arch.ps1', 'Win64' ]);
});

const restoreRepo = async (name: string) => {
  if (!fs.existsSync(`client_connect/${name}/.git/index`)) {
    // is a submodule, but we need to copy the actual Git repo directory over
    try {
      await execAsync('ubuntu1804', [ 'run', 'ssh', 'Build@172.25.218.188', 'mkdir', '-pv', `/Users/build/cc-dev-build/client_connect/${name}/.gitreal` ]);
    } catch (e) { }
    const gitPath = `client_connect/${name}/` + fs.readFileSync(`client_connect/${name}/.git`, 'utf8').substr(8).trim() + '/*';
    console.log(gitPath);
    await execAsync('ubuntu1804', [ 'run', 'rsync', '-av', gitPath, `Build@172.25.218.188:/Users/build/cc-dev-build/client_connect/${name}/.gitreal/` ]);
    await execAsync('ubuntu1804', [ 'run', 'ssh', 'Build@172.25.218.188', 'pwsh', '/Users/build/cc-dev-build/client_connect/Restore-Repo.ps1', name ]);
  }
};

gulp.task('build-client-connect-mac64', async () => {
  console.log('Copying source files to macOS...');
  await execAsync('ubuntu1804', [ 'run', 'rsync', '-av', '--include-from=rsync-mac.list', '--exclude=*', './', 'Build@172.25.218.188:/Users/build/cc-dev-build/' ]);
  await restoreRepo('curl');
  await restoreRepo('log_c');
  await execAsync('ubuntu1804', [ 'run', 'ssh', 'Build@172.25.218.188', 'pwsh', '/Users/build/cc-dev-build/client_connect/patch.ps1', '-Force' ]);
  console.log('Running build remotely...');
  await execAsync('ubuntu1804', [ 'run', 'ssh', 'Build@172.25.218.188', 'pwsh', '/Users/build/cc-dev-build/client_connect/Build-Arch.ps1', 'Mac64' ]);
  console.log('Copying compiled files from macOS...');
  await execAsync('ubuntu1804', [ 'run', 'rsync', '-av', 'Build@172.25.218.188:/Users/build/cc-dev-build/client_connect/sdk/*', './client_connect/sdk/',  ]);
});

gulp.task('build-client-connect-linux32', async () => {
  await execAsync('ubuntu1804', [ 'run', 'pwsh', 'client_connect/Build-Arch.ps1', 'Linux32' ]);
});

gulp.task('build-client-connect-linux64', async () => {
  await execAsync('ubuntu1804', [ 'run', 'pwsh', 'client_connect/Build-Arch.ps1', 'Linux64' ]);
});

gulp.task('build-client-connect', gulp.series(
  'build-client-connect-init',
  gulp.parallel(
    'build-client-connect-win32',
    'build-client-connect-win64',
    'build-client-connect-mac64',
    'build-client-connect-linux32',
    'build-client-connect-linux64'
  )
));

const yarnPath = which.sync('yarn');

gulp.task('generate-csharp-4.5', async () => {
  await execAsync(yarnPath, [
    'run',
    'generator',
    'generate',
    '--client-connect-sdk-path',
    'client_connect/sdk',
    '-c',
    'CSharp-4.5',
    'dist/CSharp-4.5'
  ]);
  await execAsync('dotnet', [ 'restore', 'HiveMP.sln' ], 'dist/CSharp-4.5');
  await execAsync('dotnet', [ 'build', '-c', 'Release', 'HiveMP.sln' ], 'dist/CSharp-4.5');
});

gulp.task('generate-csharp-3.5', async () => {
  await execAsync(yarnPath, [
    'run',
    'generator',
    'generate',
    '--client-connect-sdk-path',
    'client_connect/sdk',
    '-c',
    'CSharp-3.5',
    'dist/CSharp-3.5'
  ]);
  await execAsync('pwsh', [ 'util/Fetch-NuGet.ps1' ]);
  await execAsync('nuget', [ 'restore' ], 'dist/CSharp-3.5');
  const msbuildPath = path.join(process.env.WINDIR, 'Microsoft.NET\\Framework64\\v4.0.30319\\msbuild.exe');
  await execAsync(msbuildPath, [ '/p:Configuration=Release', '/m', 'HiveMP.sln' ], 'dist/CSharp-3.5');
});

gulp.task('generate-unity', async () => {
  await execAsync(yarnPath, [
    'run',
    'generator',
    'generate',
    '--client-connect-sdk-path',
    'client_connect/sdk',
    '-c',
    'Unity',
    'dist/Unity'
  ]);
});

let isRunningCCEmbed = false;
gulp.task('generate-cc-embed', async () => {
  if (!fs.existsSync('client_connect\\cchost\\embed.cpp')) {
    if (isRunningCCEmbed) {
      while (!fs.existsSync('client_connect\\cchost\\embed.cpp') && isRunningCCEmbed) {
        await new Promise((resolve, reject) => {
          setTimeout(resolve, 1000);
        });
      }
      if (!fs.existsSync('client_connect\\cchost\\embed.cpp')) {
        throw new Error('client_connect\\cchost\\embed.cpp still didn\'t appear after parallel generation');
      }
    } else {
      isRunningCCEmbed = true;
      try {
        await execAsync('pwsh', [ 'client_connect\\cchost\\embed.ps1' ]);
      } finally {
        isRunningCCEmbed = false;
      }
    }
  }
});

const generateUe4Tasks: string[] = [];
for (const version of Object.keys(supportedUnrealVersions)) {
  generateUe4Tasks.push('generate-ue' + version);
  gulp.task('generate-ue' + version + '-internal', async () => {
    await execAsync(yarnPath, [
      'run',
      'generator',
      'generate',
      '--client-connect-sdk-path',
      'client_connect/sdk',
      '-c',
      'UnrealEngine-' + version,
      'dist/UnrealEngine-' + version
    ]);
  });
  gulp.task('generate-ue' + version, gulp.series('generate-cc-embed', 'generate-ue' + version + '-internal'));
}

gulp.task('generate', gulp.parallel([
  'generate-csharp-4.5',
  'generate-csharp-3.5',
  'generate-unity'
].concat(generateUe4Tasks)));

gulp.task('package-csharp', async () => {
  await execAsync('pwsh', [ 'util/Fetch-NuGet-4.5.ps1' ]);
  await execAsync('nuget', [ 'pack', '-Version', '1.0.0-DEV', '-NonInteractive', 'HiveMP.nuspec' ], 'dist/CSharp-4.5');
});

gulp.task('package-unity', async () => {
  await execAsync('pwsh', [ 'util/Unity-Package.ps1', '-SdkVersion', '1.0.0-DEV' ]);
});

const packageUe4Tasks: string[] = [];
for (const version of Object.keys(supportedUnrealVersions)) {
  packageUe4Tasks.push('package-ue' + version);
  gulp.task('package-ue' + version, async () => {
    await execAsync('pwsh', [
      'util/UE4-Package.ps1',
      '-UeVersion',
      version,
      '-SdkVersion',
      '1.0.0-DEV'
    ]);
  });
}

gulp.task('package', gulp.parallel([
  'package-csharp',
  'package-unity'
].concat(packageUe4Tasks)));

const generateTestsTasks: string[] = [];
for (const version of Object.keys(supportedUnityVersions)) {
  generateTestsTasks.push('generate-test-unity-' + version);
  gulp.task('generate-test-unity-' + version, async () => {
    await execAsync('pwsh', [
      'tests/Generate-UnityTests.ps1',
      '-Version',
      version,
      '-SdkVersion',
      '1.0.0-DEV'
    ]);
  });
}
for (const version of Object.keys(supportedUnrealVersions)) {
  generateTestsTasks.push('generate-test-ue' + version);
  gulp.task('generate-test-ue' + version, async () => {
    await execAsync('pwsh', [
      'tests/Generate-UE4Tests.ps1',
      '-Version',
      version,
      '-SdkVersion',
      '1.0.0-DEV'
    ]);
  });
}

gulp.task('generate-tests', gulp.parallel(generateTestsTasks));

const buildTestsTasks: string[] = [];
for (const version of Object.keys(supportedUnityVersions)) {
  const platformBuildTestsTasks: string[] = [];
  for (const platform of supportedUnityVersions[version]) {
    const unityPath = ('C:\\Program Files\\Unity_' + version + '\\Editor\\Unity.exe');
    if (fs.existsSync(unityPath)) {
      platformBuildTestsTasks.push('build-test-unity-' + version + '-' + platform);
      gulp.task('build-test-unity-' + version + '-' + platform, async () => {
        await execAsync('pwsh', [
          './Build-UnityTest.ps1',
          '-Version',
          version,
          '-Target',
          platform
        ], 'tests/UnityTest-' + version);
      });
    }
  }
  if (platformBuildTestsTasks.length > 0) {
    buildTestsTasks.push('build-test-unity-' + version);
    gulp.task('build-test-unity-' + version, gulp.series(platformBuildTestsTasks));
  }
}
for (const version of Object.keys(supportedUnrealVersions)) {
  const platformBuildTestsTasks: string[] = [];
  for (const platform of supportedUnrealVersions[version]) {
    const unityPath = ('C:\\Program Files\\Epic Games\\UE_' + version);
    if (fs.existsSync(unityPath)) {
      platformBuildTestsTasks.push('build-test-unreal-' + version + '-' + platform);
      gulp.task('build-test-unreal-' + version + '-' + platform, async () => {
        await execAsync('pwsh', [
          './Build-UE4Test.ps1',
          '-Version',
          version,
          '-Target',
          platform
        ], 'tests/UnrealTest-' + version);
      });
    }
  }
  if (platformBuildTestsTasks.length > 0) {
    buildTestsTasks.push('build-test-unreal-' + version);
    gulp.task('build-test-unreal-' + version, gulp.series(platformBuildTestsTasks));
  }
}

gulp.task('build-tests', gulp.parallel(buildTestsTasks));

const runTestsTasks: string[] = [];
for (const version of Object.keys(supportedUnityVersions)) {
  const platformRunTestsTasks: string[] = [];
  for (const platform of supportedUnityVersions[version]) {
    // TODO
  }
  if (platformRunTestsTasks.length > 0) {
    /*
    runTestsTasks.push('run-test-unity-' + version);
    gulp.task('run-test-unity-' + version, gulp.series(platformRunTestsTasks));
    */
  }
}
for (const version of Object.keys(supportedUnrealVersions)) {
  const platformRunTestsTasks: string[] = [];
  for (const platform of supportedUnrealVersions[version]) {
    platformRunTestsTasks.push('run-test-unreal-' + version + '-' + platform);
    gulp.task('run-test-unreal-' + version + '-' + platform, async () => {
      const testPath = 'tests/UnrealBuilds-' + version + '/Win64/WindowsNoEditor/UnrealTest' + version.replace(/\./g, '') + '.exe';
      if (fs.existsSync(testPath)) {
        await execAsync('pwsh', [
          './Run-UE4Test.ps1',
          '-Version',
          version,
          '-Platform',
          platform
        ], 'tests');
      }
    });
  }
  if (platformRunTestsTasks.length > 0) {
    runTestsTasks.push('run-test-unreal-' + version);
    gulp.task('run-test-unreal-' + version, gulp.series(platformRunTestsTasks));
  }
}

gulp.task('run-tests', gulp.parallel(runTestsTasks));

gulp.task('default', gulp.series(
  'build-client-connect',
  'generate',
  'package',
  'generate-tests',
  'build-tests',
  'run-tests'
));