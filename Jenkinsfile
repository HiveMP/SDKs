stage("Generate") {
    node('windows') {
        checkout poll: false, changelog: false, scm: scm
        bat 'yarn'
        bat 'yarn run getsdk'
        parallel (
            "CSharp-4.5" : {
                bat 'yarn run generator -- generate -c CSharp-4.5 dist/CSharp-4.5'
            },
            "CSharp-3.5" : {
                bat 'yarn run generator -- generate -c CSharp-3.5 dist/CSharp-3.5'
            },
            "Unity" : {
                bat 'yarn run generator -- generate -c Unity dist/Unity'
            }
        )
        stash includes: 'dist/**', name: 'sdks'
        archiveArtifacts 'dist/**'
    }
}