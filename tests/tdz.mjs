import { chromium } from 'playwright';
const b=await chromium.launch();const p=await b.newPage();
p.on('pageerror',e=>console.log('PAGEERROR:',e.message));
await p.goto('file:///home/user/planner/index.html');await p.waitForTimeout(400);
console.log('page usable:',await p.evaluate(()=>typeof window.startWizard));
