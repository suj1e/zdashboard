// 本地 mock 禅道(仅 zview-dashboard 测试用):tokens + 产品 bug 列表两个只读端点
const http = require('http');

const BUGS = [
  { id: 101, title: '登录后偶发白屏', severity: 1, pri: 1, status: 'active', assignedTo: { account: 'test', realname: '苏杰' }, openedBy: 'qa' },
  { id: 102, title: '导出报表时间格式错误', severity: 3, pri: 2, status: 'resolved', assignedTo: { realname: '苏杰' }, resolvedBy: 'dev1', openedBy: 'qa' },
  { id: 103, title: '旧链接 404 未跳转', severity: 4, pri: 3, status: 'closed', assignedTo: 'closed', openedBy: 'pm' },
  { id: 104, title: '搜索结果分页丢失关键词', severity: 2, pri: 1, status: 'active', assignedTo: { account: 'test', realname: '苏杰' }, openedBy: 'pm' },
];

http
  .createServer((req, res) => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    if (req.method === 'POST' && req.url.startsWith('/api.php/v1/tokens')) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const { account, password } = JSON.parse(body || '{}');
        if (account && password) send(200, { token: 'mock-token' });
        else send(401, { error: 'auth failed' });
      });
      return;
    }
    if (req.method === 'GET' && /\/api\.php\/v1\/products\/\d+\/bugs/.test(req.url)) {
      if (req.headers.token !== 'mock-token') return send(401, { error: 'unauthorized' });
      return send(200, { page: 1, total: BUGS.length, limit: 100, bugs: BUGS });
    }
    send(404, { error: 'not found' });
  })
  .listen(4189, () => console.log('[mock-zentao] http://localhost:4189'));
