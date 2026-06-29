# AutoPub V1 ? ??????

> ????: 2026-06-29
> ??: ?????????API???

---

## ??Vercel ??

| ?? | ? |
|---|---|
| ?? | autopub.cn / www.autopub.cn |
| DNS | Cloudflare -> CNAME cname.vercel-dns.com / A 76.76.21.21 |
| ?? | https://github.com/lyu14348-lgtm/autopub |
| Vercel Team | lyu14348-6611s-projects |
| Project ID | prj_QnTIva5hRoak9FF6X4DDRc0mDECR |
| **vercel.json ??** | ?? `{"buildCommand":"npm run build","outputDirectory":"dist/web"}` ? ?? functions/rewrites????????? |

## ??Vercel ??????????

```
NEXT_PUBLIC_SUPABASE_URL=https://sokbfhxlwrxiorgepflu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_***
SUPABASE_SERVICE_ROLE_KEY=sb_secret_***
AUTH_SESSION_SECRET=local-dev-auth-session-secret
APP_BASE_URL=https://autopub.cn
MOCK_MODE=false
creem_***
creem_***
creem_***
creem_***
AI_PROVIDER_API_KEY=sk-ws-***
AI_PROVIDER_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
AI_PROVIDER_MODEL=qwen-plus
```

## ??Supabase

| ?? | ? |
|---|---|
| Project ID | sokbfhxlwrxiorgepflu |
| DB Host | db.sokbfhxlwrxiorgepflu.supabase.co |
| DB Password | liu2017..psy |
| Anon Key | sb_publishable_*** |
| Service Role | sb_secret_*** |

### Supabase ??
- 9??+3????spend_credits_for_ai, complete_ai_task, process_creem_***
- RLS?????
- Email Provider: ??????Confirm email = OFF?
- Google Provider: ???
- URL Configuration: Site URL=https://autopub.cn, Redirect=https://autopub.cn/**
- SMTP: ?????????

## ??Google OAuth

| ?? | ? |
|---|---|
| Google Cloud Project | autopub-500911 |
| Client ID | 338919001765-femhcnao9mnk9v5o2da2cjo98a8dnsil.apps.googleusercontent.com |
| Client Secret | GOCSPX-*** |
| ???? | ??????????? |
| ??? URI | https://sokbfhxlwrxiorgepflu.supabase.co/auth/v1/callback |

## ??Creem ??

| ?? | ? |
|---|---|
| API Key | creem_*** |
| Pro Product ID | prod_6cKWbgSDGgw4iQPunkb1oM ($19/?, 500cr) |
| Pro Plus Product ID | prod_4JNCX7MQ3BQRuHWUL7LOvY ($49/?, 2000cr) |
| Webhook Secret | whsec_*** |
| Webhook URL | https://autopub.cn/api/creem/webhook |

## ??Cloudflare DNS

- NS: byron.ns.cloudflare.com, ryleigh.ns.cloudflare.com
- www: CNAME -> cname.vercel-dns.com (??)
- @: A -> 76.76.21.21 (??)
- ?????MX/TXT?????

## ??GitHub

| ?? | ? |
|---|---|
| ?? | lyu14348-lgtm/autopub |
| SSH?? | git@github.com:lyu14348-lgtm/autopub.git (??) |
| HTTPS?? | ??????GFW???SSH |
| PAT | github_pat_*** |

## ?????????

- `packages/db/supabase.js`: signUpWithPassword ? user.id ??????????
- `packages/auth/session.js`: ???? plan=anonymous credits=3
- `apps/web/login.html`: Google OAuth?? + ???? + onclick??
- `apps/web/register.html`: ??????? + Google?? + onclick??
- `apps/visual-extension/*`: ???????????????????????
- `packages/ai/provider.js`: style_transfer task (5cr) + ?????
- `vercel.json`: ???? (?functions??)
- ??????UTF-8 BOM

## ??????

- Vercel API?? FUNCTION_INVOCATION_FAILED (???)
- SMTP??????????
- ??????(Google Secret, Supabase Service Role?)???

## ??????

- Vercel: https://vercel.com/lyu14348-6611s-projects/autopub
- Supabase: https://supabase.com/dashboard/project/sokbfhxlwrxiorgepflu
- Cloudflare: https://dash.cloudflare.com (autopub.cn)
- GitHub: https://github.com/lyu14348-lgtm/autopub
- Google Cloud Console: https://console.cloud.google.com (autopub-500911)
- Creem: https://creem.io/dashboard
- ???????: https://qiye.aliyun.com
