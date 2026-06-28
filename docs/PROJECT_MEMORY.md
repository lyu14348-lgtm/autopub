# AutoPub V1 — 项目记忆文档

> 最后更新: 2026-06-27
> 状态: 代码完成，等待第三方接入

---

## 一、已完成清单

### 1. 官网 (apps/web/) ✅ 完成

| 页面 | 语言 | 状态 |
|---|---|---|
| 首页 index.html | 英文 | ✅ 完整产品页：Hero → 4扩展特性 → 流程 → 定价 → SaaS专区 → FAQ |
| 定价页 pricing.html | 英文 | ✅ 含对比表和注册信用说明 |
| SaaS页 saas.html | 英文 | ✅ 功能介绍 + 早期定价 + 邮件收集 |
| FAQ页 faq.html | 英文 | ✅ 三组分类：Extensions / SaaS / Account & Billing |
| 博客中心 blog.html | 英文 | ✅ 含插件博客和SaaS博客入口 |
| 插件博客 plugin-blog.html | 英文 | ✅ 6篇扩展使用文章 |
| SaaS博客 saas-blog.html | 英文 | ✅ 6篇SaaS未来文章 |
| 注册页 register.html | 英文 | ✅ 完整表单 + Google SSO按钮 |
| 登录页 login.html | 英文 | ✅ 完整表单 + Google SSO按钮 + 忘记密码 |
| 隐私页 privacy.html | 英文 | ✅ 完整隐私政策 |
| 条款页 terms.html | 英文 | ✅ 完整服务条款 |
| 支持页 support.html | 英文 | ✅ 含报告指引 |
| 测试页 test-page.html | 英文 | ✅ 扩展本地测试用 |
| 样式 styles.css | — | ✅ 完整设计系统（浅色/深色主题） |
| 脚本 app.js | — | ✅ 等待列表提交 + 百炼SaaS预留 + 结账跳转 |

### 2. Chrome扩展 (apps/*-extension/) ✅ 代码完成

| 扩展 | MV3清单 | 内容脚本 | 四态UI | AI积分门控 | 升级入口 | 图标(SVG) | ZIP就绪 |
|---|---|---|---|---|---|---|---|
| Visual Saver | ✅ | ✅ 扫描图片+CSS背景 | ✅ loading/empty/error/results | ✅ | ✅ | ✅ 青色 | ✅ |
| Video Analyzer | ✅ | ✅ 检测video+og:video | ✅ same | ✅ | ✅ | ✅ 蓝色 | ✅ |
| SEO Auditor | ✅ | ✅ 审计title/desc/h1/alt/canonical | ✅ same | ✅ | ✅ | ✅ 琥珀 | ✅ |
| Competitor Monitor | ✅ | ✅ 捕获title/price/CTA/h1 | ✅ same | ✅ | ✅ | ✅ 紫色 | ✅ |

### 3. 共享基础 (packages/) ✅ 完成

| 包 | 功能 | 状态 |
|---|---|---|
| shared/config.js | 套餐限制、扩展名注册、V2预留字段、未来扩展注册 | ✅ |
| auth/session.js | 匿名身份、Mock用户、权益结构 | ✅ |
| ai/provider.js | AI任务门面 → **阿里云百炼** (qwen-plus)，无Key回退Mock | ✅ |
| billing/creem.js | Creem Checkout + Webhook签名验证 + 事件标准化 | ✅ |
| credits/credits.js | 消费、每日发放、试用、套餐授予 | ✅ |
| db/supabase.js | Supabase REST适配器 | ✅ |
| extension/core.js | 共享运行时：showState、refreshEntitlements、runAiTask、导航 | ✅ |
| analytics/logging.js | 使用/错误日志结构 | ✅ |

### 4. API路由 (api/) ✅ 完成

| 路由 | 状态 |
|---|---|
| POST /api/auth/anonymous | ✅ |
| GET /api/auth/me | ✅ |
| POST /api/auth/exchange-extension-code | ✅ 代码路径已实现；真实Supabase表/RLS/联调待做 |
| POST /api/auth/logout | ✅ |
| GET /api/entitlements | ✅ |
| POST /api/waitlist | ✅ |
| POST /api/ai/run-task | ✅ 积分门控 → 百炼 |
| POST /api/billing/create-checkout | ✅ Mock + 生产Creem路径 |
| POST /api/creem/webhook | ✅ 签名验证 + 幂等 + Supabase同步 |

### 5. 积分模型 ✅ 已修正

| 用户类型 | 月积分 | 每日刷新 | 说明 |
|---|---|---|---|
| 匿名（未注册） | 3（一次性试用） | 0 | 用完即止 |
| 免费（已注册） | 0 | **3/天** | 每天刷新，封顶3，不累积 |
| Pro | 500 | 0 | 月额度 |
| Pro Plus | 2000 | 0 | 月额度 |

### 6. 未来扩展预留 ✅ 已注册

| 预留扩展名 | AI任务 | 积分 |
|---|---|---|
| keyword-research-extension | keyword_research | 2 |
| backlink-monitor-extension | backlink_check | 3 |
| content-planner-extension | content_plan | 5 |
| social-analyzer-extension | social_breakdown | 4 |
| schema-generator-extension | schema_gen | 2 |

### 7. 扩展模板 ✅

`apps/_template/` — 8个文件，5步即可添加新扩展。

### 8. 脚本 ✅

| 命令 | 状态 |
|---|---|
| npm run lint | ✅ 通过 |
| npm run test | ✅ 通过 |
| npm run test:billing | ✅ 通过 |
| npm run test:creem-webhook | ✅ 通过 |
| npm run build | ✅ 通过（4扩展 + web） |
| npm run package:visual | ✅ ZIP就绪 |
| npm run package:video | ✅ ZIP就绪 |
| npm run package:seo | ✅ ZIP就绪 |
| npm run package:competitor | ✅ ZIP就绪 |
| npm run dev:web | ✅ localhost:4173 |
| npm run dev:api | ✅ localhost:4174 |

### 9. 文档 ✅

| 文档 | 内容 |
|---|---|
| AGENTS.md | 项目范围和规则 |
| docs/V1_V2_SCOPE.md | V1/V2边界 |
| docs/TECH_ARCHITECTURE.md | 技术架构 |
| docs/FOUNDATION_BASE.md | 共享基础说明 |
| docs/PLUGIN_MATRIX.md | 扩展矩阵 + 未来预留 |
| docs/AUTH_FLOW.md | 认证流程 |
| docs/CREEM_PAYMENT_FLOW.md | 支付流程 |
| docs/INFRASTRUCTURE.md | 基础设施 |
| docs/SUPABASE_SETUP.md | 数据库DDL（9张表） |
| docs/VERCEL_DEPLOYMENT.md | Vercel部署指南 |
| docs/ENVIRONMENT_VARIABLES.md | 环境变量 |
| docs/DEPLOYMENT_CHECKLIST.md | **完整部署清单** |
| docs/QA_REPORT.md | QA报告 |
| docs/BUG_REPORT.md | Bug报告 |
| docs/RELEASE_CHECKLIST.md | 发布清单 |
| docs/FINAL_DELIVERY_REPORT.md | 交付报告 |
| docs/SELF_ACCEPTANCE_REPORT.md | 自验收报告 |
| docs/chrome-store/*.md | 4个扩展的商店文案 |

---

## 二、当前状态

**一句话：代码全部完成，等待第三方平台接入。**

能本地跑的：
- ✅ 官网所有页面正常渲染
- ✅ 4个扩展可构建、可打包、可lint
- ✅ 积分系统完整（匿名→每日免费→Pro→Pro Plus）
- ✅ API路由全部就绪（除extension login bridge需要Supabase）
- ✅ AI Provider已接入阿里云百炼协议，缺Key时回退Mock

需要第三方配合的：
- 🔑 Supabase — 创建项目、执行DDL、配置Auth/RLS
- 🔑 Creem — 创建产品、获取Key、注册Webhook
- 🔑 阿里云百炼 — 获取API Key
- 🔑 Vercel — 绑定仓库、配置域名和环境变量
- 🔑 Chrome商店 — 转换图标为PNG、截图、提交审核

---

## 三、接下来做什么

### 立即（现在就可以）

| 优先级 | 任务 | 需要什么 |
|---|---|---|
| **P0** | 获取百炼API Key → 填入.env → 测试真实AI调用 | 你去百炼控制台创建Key |
| **P0** | 创建Supabase项目 → 执行DDL建表 → 测Auth | 你去Supabase创建项目 |
| **P0** | 联调 extension login bridge | 代码已接 `extension_login_codes`；Supabase项目/RLS/真实code生成流程就绪后测试 |

### 短期（Supabase + AI就绪后）

| 任务 | 说明 |
|---|---|
| 扩展真实Chrome加载测试 | 在Chrome开发者模式加载4个扩展，验证popup/内容脚本/AI调用 |
| 端到端支付闭环测试 | 注册 → 升级 → Creem Checkout → Webhook → 扩展解锁Pro |
| Chrome商店截图 | 生成4个扩展的产品截图 |
| 图标转PNG | SVG → 16/48/128 PNG |

### 中期（部署上线）

| 任务 | 说明 |
|---|---|
| Vercel部署 | 设置全部12个环境变量，部署生产环境 |
| 生产扩展打包 | AUTOPUB_APP_BASE_URL指向生产域名 |
| Chrome商店提交 | 4个扩展逐个提交 |
| 生产冒烟测试 | 按DEPLOYMENT_CHECKLIST.md第7节逐项验收 |

### 远期（V1.1 / V2）

| 任务 | 说明 |
|---|---|
| 激活未来扩展 | 从FUTURE_EXTENSIONS移到EXTENSIONS，复制模板 |
| AI Provider升级 | 支持多模型切换、流式输出 |
| 分析埋点实现 | logging.js接入真实管道 |
| V2 SaaS开发 | 自动规划/写作/配图/发布/优化平台 |

---

## 四、你需要配合的行动清单

| 序号 | 行动 | 链接 |
|---|---|---|
| 1 | 阿里云百炼 → 创建API Key | https://bailian.console.aliyun.com |
| 2 | Supabase → 创建项目 | https://supabase.com |
| 3 | Supabase → 执行 docs/SUPABASE_SETUP.md 的DDL |
| 4 | Supabase → 开启Email + Google OAuth认证 |
| 5 | Google Cloud → 创建OAuth客户端 |
| 6 | Creem → 创建Pro和Pro Plus产品 | https://creem.io |
| 7 | Vercel → 绑定仓库 + 配置域名 | https://vercel.com |
| 8 | Chrome开发者 → 准备提交扩展 | https://chrome.google.com/webstore/devconsole |
