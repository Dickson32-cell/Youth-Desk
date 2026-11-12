const net = require('net');
const hosts = ['ep-cool-base-be8pjir6.c-9.us-east-2.aws.neon.tech', 'ep-cool-base-be8pjir6-pooler.c-9.us-east-2.aws.neon.tech'];
(async () => {
  for (const x of hosts) {
    await new Promise((res) => {
      const s = net.connect(5432, x, () => { console.log(x.slice(0, 34), 'TCP OK'); s.end(); res(); });
      s.setTimeout(8000, () => s.destroy(new Error('timeout')));
      s.on('error', (e) => { console.log(x.slice(0, 34), 'TCP FAIL', e.code); res(); });
    });
  }
})();
