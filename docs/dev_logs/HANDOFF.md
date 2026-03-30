🕐 Last updated: 2026-03-30 21:28
🌿 Branch: codex/min-105-saas-shell

## 当前状态
- 当前主线已经从 Railway 默认域名推进到 `gc.mindhikers.com` 正式域名收口
- `mindhikers.com` 已正式接入 Cloudflare，zone 状态为 `active`
- `gc.mindhikers.com` 已挂到 Railway `golden-crucible-saas` 服务，DNS 与证书已打通
- Railway 生产环境中的域名变量已切到 `https://gc.mindhikers.com`

## 本轮关键结果
- Cloudflare：
  - 已导入并保留 `mindhikers.com` 现有网站记录
  - 已补齐 `gc` 的 `CNAME`
  - 已补齐 Railway 验证 `TXT`
  - 已补齐邮件相关记录：
    - `MX x2`
    - `SPF TXT`
    - `DKIM TXT`
    - `_autodiscover._tcp SRV`
  - 已补齐 `Thunderbolt` 的 `TXT`
- Spaceship：
  - `mindhikers.com` nameserver 已切到：
    - `celeste.ns.cloudflare.com`
    - `jimmy.ns.cloudflare.com`
- Railway：
  - 生产变量已更新：
    - `APP_BASE_URL=https://gc.mindhikers.com`
    - `BETTER_AUTH_URL=https://gc.mindhikers.com`
    - `CORS_ORIGIN=https://gc.mindhikers.com`
  - 变量更新已触发一次新的生产 redeploy，状态 `SUCCESS`

## 线上验收结果
- `dig NS mindhikers.com +short` 已返回：
  - `jimmy.ns.cloudflare.com.`
  - `celeste.ns.cloudflare.com.`
- `https://gc.mindhikers.com/api/account/status` 当前返回：
  - `authEnabled: true`
  - `googleEnabled: true`
  - `baseUrl: https://gc.mindhikers.com`
  - `usingDefaultSecret: false`
- `https://gc.mindhikers.com` 已不再证书报错
- `gc.mindhikers.com` 首页登录壳已可正常渲染，不再白屏

## 当前剩余事项
- 还没做 `gc.mindhikers.com` 下的完整真人 smoke：
  - Google 登录
  - 邮箱注册/登录
  - 登录后进入 SaaS
  - `3 * 10` 免费额度
  - BYOK 切换
- 坩埚真实回答链路的生产资源阻塞仍未解除：
  - `DEEPSEEK_API_KEY` 缺失仍可能影响真实回答

## 新窗口最建议起点
1. 先在 `gc.mindhikers.com` 做一轮 Google 登录 smoke
2. 再做邮箱注册/登录 smoke
3. 补一轮登录后产品主链验收：
   - 发送真实对话
   - 检查 `3 * 10` 免费额度
   - 检查 BYOK 提示与切换
4. 最后检查坩埚真实回答链路；若仍失败，优先回到 `DEEPSEEK_API_KEY` 补齐
