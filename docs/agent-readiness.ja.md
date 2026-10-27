# AIファーストの公開サイトとAgent Readiness

2026-10-28。Cloudflareの現行名称はAgent Readiness。公開サイトは検索、回答時の参照、
モデル学習をすべて許可する。`search=yes, ai-input=yes, ai-train=yes`をrobots.txtと
Content-Signalヘッダーで一致させる。これは公開情報の利用方針であり、管理APIの権限ではない。
非公開原文・下書き・資格情報は公開selectionから除外する。

## 基本構成

同じ公開済みMDC一覧からHTML、標準Markdown、llms.txt、sitemap.xmlを生成する。
robots.txtは全体と主要AIクローラーにAllowを宣言し、正規originのsitemapを案内する。
`_headers`はsitemap・llmsのLink、Content-Signal、nosniff、各形式のContent-Typeを設定する。
ページごとのMarkdown alternateはHTMLにも含める。robotsやllmsの存在だけでは
本文の取得成功、引用増加、学習への採用を証明しない。

`@nuxtjp/localized-site/documents/worker`の`createDocumentWorker`は、同じ公開一覧を
使って`Accept: text/markdown`を処理する。HTML変換APIやProプランを必要とせず、
生成済みのMarkdownをASSETSから読む。ワイルドカードだけならHTML、明示したMarkdownの
優先度がHTML以上ならMarkdownを選ぶ。q=0、HEAD、形式別ETagと304、Vary: Accept、
HTMLへの誤フォールバック、公開されていないURLを検証する。Cache APIを使わず、
ASSETSへの取得URLをHTMLとMarkdownで分け、形式を共通のキャッシュキーへ格納しない。

```js
// 配備用entry。public/には置かず、ソースとともにhashを固定する。
import { createDocumentWorker } from '@nuxtjp/localized-site/documents/worker'
import delivery from './delivery.json' with { type: 'json' }
export default createDocumentWorker(delivery)
```

`documentDelivery(new URL('./site/', import.meta.url))`でビルド時の正規originと公開route/raw
対応を得る。ASSETS binding、Workerのmainと公開ページの`assets.run_worker_first`が必要。
静的assetのみを配備する既存経路では`_headers`によるAcceptの切り替えはできない。
このアダプターの試験合格と、実際のCloudflare Worker配備は別の受入である。
専用のMCP proxy、認証サーバー、公開refresh操作は追加しない。

## mcp-gatewayとの連携

`zixcel/zixcel-mcp-gateway`が公開済みmetadataと文書参照の読み取り専用MCPを担当する。
Nuxt側にJSON-RPC dispatcherや認証権限を複製しない。gatewayのHTTP featureは
loopbackの`/mcp`を提供し、公開HTTPSの終端とingress制限は運用側が担当する。
Rustの実行バイナリは、そのままWorkersのJavaScript実行環境で動作するものではない。

gatewayの`/.well-known/mcp/server-card.json`は実際のinitializeと同じidentity・capabilities・
protocolVersionを返す。Server CardはSEP-1649の発見用profileとして扱い、
MCPの最新revision全体への準拠を主張しない。現実装の交渉対象は2025-06-18である。
サイトにリンクやAPI Catalogを配置するのは、対象の正規HTTPS endpointを受け入れ、
initializeとtools/listを読戻した後とする。架空のendpointやOAuth metadataを作らない。

匿名公開文書への接続ではOAuthは不要。将来の非公開データや更新機能には別の認可設計と
RFC 8414/9728 discoveryを必要とする。OriginやUser-Agentの一致を認証にしない。
WebMCP、A2A、決済、スキル配布は、実際に提供する機能がある場合にだけ宣言する。

## 実測と受入

Cloudflareは発見性、Markdown、bot方針、API/MCP等の発見、決済を検査する。
サイトの用途に対応する検査を選び、対象外の機能を偽装して点数を上げない。
ダッシュボードの診断はzone権限で保護される。ローカル試験や独自HTTP観測を
Cloudflareの点数、署名されたbotでのアクセス成功、正式な審査合格と表示しない。

配備後は、正規originから次を記録する。

- robots.txtの200、text/plain、Allowと3つのyes、正しいSitemap URL。
- sitemapの全公開locale routeと下書きの除外、llmsとraw Markdownの200と正しいMIME。
- 同じページのHTML/Markdown/HEAD/304、Vary、各形式のvalidator、欠落原文での503。
- MCPを提供する場合は公開HTTPS Card、initialize、tools/listの整合と、管理面の非公開。
- Cloudflare診断の日時・検査名・pass/fail/neutral・根拠。独自測定とは別に保存する。

Cloudflare Managed robots.txtはoriginのrobotsへ内容を前置する場合がある。
Bot Preference Sync、AI Crawl Control、WAFの拒否・challengeと学習拒否設定が
この明示的な許可方針を上書きしないか、実配信で確認する。サイト側のファイルだけで
アカウント側の設定変更を完了したとしない。資格情報や署名検証のない一括解除もしない。

## 参照

- [Cloudflare公開検査項目](https://isitagentready.com/)
- [Cloudflareダッシュボードのscannerと公開範囲](https://web-bot-auth.chambers.cfdata.org/)
- [Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
- [Managed robots.txt](https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/)
- [MCP Server Cardsの提案](https://github.com/modelcontextprotocol/modelcontextprotocol/issues/1649)
- [gateway HTTP契約](https://github.com/zixcel/zixcel-mcp-gateway/blob/main/docs/http.md)
