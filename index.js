const core = require('@actions/core');
const github = require('@actions/github');

try {
  // `who-to-greet` input defined in action metadata file
  //const nameToGreet = core.getInput('who-to-greet');
  //console.log(`Hello ${nameToGreet}!`);
  //const time = (new Date()).toTimeString();
  //core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  //const payload = JSON.stringify(github.context.payload, undefined, 2)
  //console.log(`The event payload: ${payload}`);
  const fs = require('fs')

  fs.readFile('repos.txt', 'utf8' , (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    // split the contents by new line
    const lines = data.split(/\r?\n/);

    for (let repo of lines) {
      if (repo.length == 0) { continue; }
      console.log(repo.length)
    }
  })

} catch (error) {
  core.setFailed(error.message);
}
