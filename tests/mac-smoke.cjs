// Run with: node tests/mac-smoke.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../mac/index.html'), 'utf8');
assert(!/<script[^>]+src=|<link[^>]+(?:stylesheet|preload)/i.test(html.replace(/<script>[\s\S]*?<\/script>/g,'')));
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(source);
const data = new Map([['gitsim-state', 'windows-progress']]);
const context = vm.createContext({assert, console, TextEncoder, localStorage: {
  getItem: k => data.get(k), setItem: (k,v) => data.set(k,v)
}, document: {querySelector: () => ({hidden:true})}, setTimeout: fn => {fn();}});
// Run the real interpreter and lesson progression; mock only window rendering and delays.
const runner = source.slice(0, source.indexOf('function renderPractice(){')) + `
function renderPractice(){} function renderExp(){} function placeTour(){} function toast(){} function openGH(){}
function openNote(){} function openExplorer(){} function vim(){return Promise.resolve()}
out=()=>{};lineH=()=>({});seq=async()=>{};progress=async()=>{};
(async()=>{
  assert.equal(pstr(HOME()),'/Users/friend');
  assert.equal(pstr(resolve('/')), '/');
  assert.equal(pstr(resolve('~/Documents')), '/Users/friend/Documents');
  assert.deepEqual(tok("git commit -m 'docs: hello world'"),['git','commit','-m','docs: hello world']);
  assert.throws(()=>tok('git commit -m "unfinished'),/따옴표/);
  assert.equal((await exec('dir')).t,'error');
  assert.equal((await exec('open missing.txt')).t,'error');
  S.termOpened=true;S.signedIn=true;evaluate(null);
  let iterations=0;
  async function lesson(){
    const before=S.step,st=STEPS[before];
    if(st.title==='GitHub 초대 수락하기'){S.invited=true;evaluate(null)}
    else {
      const commands=st.cmds?st.cmds():[typeof st.cmd==='function'?st.cmd():st.cmd];
      for(const command of commands){
        if(command.startsWith('open -e')){
          const ev=await exec(command);assert.equal(ev.t,'notepad');
          const file=nodeAt(S.git.path).ch['readme.md'];
          if(S.bonus&&S.step===MAIN_N){const l=file.content.split('\\n');l[S.tIdx]='나의 새 소개';file.content=l.join('\\n')}
          else if(S.git.rebase){file.content=file.content.split('\\n').filter(l=>!MARK.test(l)).join('\\n')}
          else file.content+='\\n- friend: Git 실습 '+S.step+'\\n';
          evaluate({t:'note-save'});
        } else {const ev=await exec(command);evaluate({...ev,raw:command})}
      }
    }
    assert(S.step>before,'Lesson stalled at '+before+': '+st.title+' '+S.warn);
    assert(++iterations<40);
  }
  while(S.step<MAIN_N)await lesson();
  assert.equal(aheadBehind().ahead,0);
  S.bonus=true;STEPS[MAIN_N].onEnter();
  while(S.step<STEPS.length)await lesson();
  assert.equal(S.git.rebase,null);assert.equal(aheadBehind().ahead,0);
  await exec('cd');assert.equal(pstr(S.cwd),'/Users/friend');
  await exec('cd /Users/friend/dev/our-project');assert(inRepo());
  await exec('open -e /Users/friend/dev/our-project/README.md');
  assert.equal(S.step,28);save();
  console.log('PASS: 22 lessons + 6 conflict lessons, macOS paths, quoting, persistence isolation, inline assets');
})()
}`;
(async()=>{await vm.runInContext(runner,context);assert.equal(data.get('gitsim-state'),'windows-progress');assert(data.has('gitsim-mac-state'));})().catch(e=>{console.error(e);process.exitCode=1});
